import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';

import { client } from '../config/database';
import { IUser } from '../types/models/IUser';
import { getWelcomeEmailTemplate } from '../utils/emailTemplates';
import { getCurrentUTCDate } from '../utils/dateUtils';

// MongoDB users collection
const usersCollection = client.db(process.env.DB_NAME).collection('users');

interface RegisterRequest extends Request {
    body: {
        username: string;
        email: string;
        password: string;
        name: string;
        surname: string;
    };
}
interface LoginRequest extends Request {
    body: {
        identifier: string;
        password: string;
    };
}

/**
 * Set a cookie in the response.
 */
function setCookie(res: Response, token: string) {
    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none' as const,
        maxAge: 24 * 60 * 60 * 1000,
        path: '/',
        domain: undefined
    };
    res.cookie('token', token, cookieOptions);
}

/**
 * Register a new user.
 */
export const register = async (req: RegisterRequest, res: Response) => {
    try {
        const { username, email, password, name, surname } = req.body;

        // Validate required fields
        if (!username || !email || !password || !name || !surname) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
                error: 'MISSING_FIELDS'
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format',
                error: 'INVALID_FORMAT'
            });
        }

        // Validate username format (only letters, numbers and hyphens)
        const usernameRegex = /^[a-zA-Z0-9_-]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: 'The username must be between 3 and 20 characters and can only contain letters, numbers and hyphens',
                error: 'INVALID_FORMAT'
            });
        }

        // Validate strong password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'The password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter and one number',
                error: 'PASSWORD_TOO_WEAK'
            });
        }

        // Check if the email already exists
        const existingEmail = await usersCollection.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: 'The email is already registered',
                error: 'EMAIL_EXISTS'
            });
        }

        // Check if the username already exists
        const existingUsername = await usersCollection.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
            return res.status(409).json({
                success: false,
                message: 'The username is already in use',
                error: 'USERNAME_EXISTS'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create new user
        const newUser: IUser = {
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            surname,
            language: 'enUS',
            currency: 'USD',
            dateFormat: 'MM/DD/YYYY',
            timeFormat: '12h',
            accountsOrder: [],
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        };

        const result = await usersCollection.insertOne(newUser);

        // Generate JWT
        const token = jwt.sign(
            {
                userId: result.insertedId,
                email: newUser.email,
                username: newUser.username
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        // Set cookie
        setCookie(res, token);

        // Enviar correo de bienvenida
        const transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: 'no-reply@profit-lost.com',
                pass: process.env.EMAIL_PASSWORD
            }
        });

        transporter.sendMail({
            from: '"Profit-Lost" <no-reply@profit-lost.com>',
            to: newUser.email,
            subject: 'Welcome to Profit-Lost!',
            html: getWelcomeEmailTemplate(newUser.name, 'https://profit-lost.com/dashboard')
        }, (error, info) => {
            if (error) {
                console.error('Error sending welcome email:', error);
            } else {
                console.log('Welcome email sent:', info.messageId);
            }
        });

        // Send response
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: result.insertedId,
                username: newUser.username,
                email: newUser.email,
                name: newUser.name,
                language: newUser.language,
                currency: newUser.currency
            }
        });

    } catch (error) {
        console.error('❌ Error in registration:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Login a user.
 */
export const login = async (req: LoginRequest, res: Response) => {
    try {
        const { identifier, password } = req.body;

        // Validate required fields
        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'The email/username and password are required',
                error: 'MISSING_FIELDS'
            });
        }

        // Validate input format
        if (typeof identifier !== 'string' || typeof password !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Invalid data format',
                error: 'INVALID_FORMAT'
            });
        }

        // Find user
        const user = await usersCollection.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { username: identifier.toLowerCase() }
            ]
        });

        // Check if user exists
        if (!user) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                error: 'INVALID_CREDENTIALS'
            });
        }

        // Verify if the account is active
        if (user.status === 'inactive') {
            return res.status(403).json({
                success: false,
                message: 'Account deactivated',
                error: 'ACCOUNT_INACTIVE'
            });
        }

        // Verify if the account is blocked
        if (user.loginAttempts >= 5) {
            const lockoutTime = 15 * 60 * 1000; // 15 minutes
            const lastAttemptTime = user.lastLoginAttempt || 0;

            if (Date.now() - lastAttemptTime < lockoutTime) {
                return res.status(429).json({
                    success: false,
                    message: 'Account blocked temporarily. Try again later',
                    error: 'ACCOUNT_LOCKED',
                    remainingTime: lockoutTime - (Date.now() - lastAttemptTime)
                });
            } else {
                // Reset attempts if the lockout time has passed
                await usersCollection.updateOne(
                    { _id: user._id },
                    { $set: { loginAttempts: 0, lastLoginAttempt: null } }
                );
            }
        }

        // Verify password
        const isValidPassword = await bcrypt.compare(password, user.password);

        // Check if password is valid
        if (!isValidPassword) {
            // Increment attempts
            await usersCollection.updateOne(
                { _id: user._id },
                {
                    $inc: { loginAttempts: 1 },
                    $set: { lastLoginAttempt: Date.now() }
                }
            );

            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                error: 'INVALID_CREDENTIALS',
                remainingAttempts: 5 - ((user.loginAttempts || 0) + 1)
            });
        }

        // Reset attempts after successful login
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    loginAttempts: 0,
                    lastLoginAttempt: null,
                    lastLogin: new Date()
                }
            }
        );

        // Generate JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                username: user.username
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        // Set HTTP-only cookie
        setCookie(res, token);

        // Send response
        return res.status(200).json({
            success: true,
            message: 'Login successful',
            user: {
                id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                language: user.language,
                currency: user.currency
            }
        });

    } catch (error) {
        console.error('❌ Error in login:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Logout the user.
 */
export const logout = async (_: Request, res: Response) => {
    res.clearCookie('token');
    return res.status(200).json({
        success: true,
        message: 'Logout successful'
    });
}; 