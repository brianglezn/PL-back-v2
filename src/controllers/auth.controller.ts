import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import nodemailer from 'nodemailer';
import { OAuth2Client } from 'google-auth-library';

import { client } from '../config/database';
import { IUser } from '../types/models/IUser';
import { getWelcomeEmailTemplate, getPasswordResetEmailTemplate, getPasswordChangeEmailTemplate } from '../utils/emailTemplates';
import { getCurrentUTCDate } from '../utils/dateUtils';

// MongoDB users collection
const usersCollection = client.db(process.env.DB_NAME).collection('users');

const oAuthClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

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
 * Sets a cookie in the response with the provided token.
 */
function setCookie(res: Response, token: string) {
    const cookieOptions = {
        httpOnly: true,
        secure: true,
        sameSite: 'none' as const,
        maxAge: 24 * 60 * 60 * 1000,
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000),
        path: '/',
        domain: undefined
    };
    res.cookie('token', token, cookieOptions);
}

/**
 * Registers a new user by validating input and creating a new user record.
 */
export const register = async (req: RegisterRequest, res: Response) => {
    try {
        const { username, email, password, name, surname } = req.body;

        // Validate required fields
        if (!username || !email || !password || !name || !surname) {
            return res.status(400).json({
                success: false,
                message: 'All fields are required',
                error: 'MISSING_FIELDS',
                statusCode: 400
            });
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid email format',
                error: 'INVALID_FORMAT',
                statusCode: 400
            });
        }

        // Validate username format (only lowercase letters and numbers)
        const usernameRegex = /^[a-z0-9]{3,20}$/;
        if (!usernameRegex.test(username)) {
            return res.status(400).json({
                success: false,
                message: 'Username must be between 3 and 20 characters and can only contain lowercase letters and numbers',
                error: 'INVALID_FORMAT',
                statusCode: 400
            });
        }

        // Validate strong password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
        if (!passwordRegex.test(password)) {
            return res.status(400).json({
                success: false,
                message: 'The password must be at least 8 characters long, contain at least one uppercase letter, one lowercase letter and one number',
                error: 'PASSWORD_TOO_WEAK',
                statusCode: 400
            });
        }

        // Check if the email already exists
        const existingEmail = await usersCollection.findOne({ email: email.toLowerCase() });
        if (existingEmail) {
            return res.status(409).json({
                success: false,
                message: 'The email is already registered',
                error: 'EMAIL_EXISTS',
                statusCode: 409
            });
        }

        // Check if the username already exists
        const existingUsername = await usersCollection.findOne({ username: username.toLowerCase() });
        if (existingUsername) {
            return res.status(409).json({
                success: false,
                message: 'The username is already in use',
                error: 'USERNAME_EXISTS',
                statusCode: 409
            });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create a new user object
        const newUser: IUser = {
            username: username.toLowerCase(),
            email: email.toLowerCase(),
            password: hashedPassword,
            name,
            surname,
            preferences: {
                language: 'enUS',
                currency: 'USD',
                dateFormat: 'MM/DD/YYYY',
                timeFormat: '12h',
                theme: 'light',
                viewMode: 'fullYear'
            },
            accountsOrder: [],
            lastLogin: getCurrentUTCDate(),
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        };

        const result = await usersCollection.insertOne(newUser);

        // Generate a JWT token
        const token = jwt.sign(
            {
                userId: result.insertedId,
                email: newUser.email,
                username: newUser.username
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        // Set the cookie with the token
        setCookie(res, token);

        // Send a welcome email to the new user
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

        // Send a successful registration response
        return res.status(201).json({
            success: true,
            message: 'User registered successfully',
            user: {
                id: result.insertedId,
                username: newUser.username,
                email: newUser.email,
                name: newUser.name,
                preferences: newUser.preferences
            },
            statusCode: 201
        });

    } catch (error) {
        console.error('❌ Error in registration:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Authenticates a user by logging them in with their credentials.
 */
export const login = async (req: LoginRequest, res: Response) => {
    try {
        const { identifier, password } = req.body;

        // Validate required fields
        if (!identifier || !password) {
            return res.status(400).json({
                success: false,
                message: 'The email/username and password are required',
                error: 'MISSING_FIELDS',
                statusCode: 400
            });
        }

        // Validate input format
        if (typeof identifier !== 'string' || typeof password !== 'string') {
            return res.status(400).json({
                success: false,
                message: 'Invalid data format',
                error: 'INVALID_FORMAT',
                statusCode: 400
            });
        }

        // Find the user by email or username
        const user = await usersCollection.findOne({
            $or: [
                { email: identifier.toLowerCase() },
                { username: identifier.toLowerCase() }
            ]
        });

        // Check if the user exists and verify the password
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                success: false,
                message: 'Invalid credentials',
                error: 'INVALID_CREDENTIALS',
                statusCode: 401
            });
        }

        // Update the last login timestamp
        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    lastLogin: getCurrentUTCDate()
                }
            }
        );

        // Generate a JWT token for the user
        const jwtToken = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                username: user.username
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        // Set the HTTP-only cookie with the token
        setCookie(res, jwtToken);

        // Send a successful login response
        res.status(200).json({
            success: true,
            message: 'Login successful',
            statusCode: 200,
            token: jwtToken,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('❌ Error in login:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Logs out the user by clearing the authentication cookie.
 */
export const logout = async (_: Request, res: Response): Promise<void> => {
    try {
        res.clearCookie('token', {
            httpOnly: true,
            secure: true,
            sameSite: 'none',
            path: '/',
        });

        res.status(200).json({
            success: true,
            message: 'Logout successful',
            statusCode: 200
        });
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({
            success: false,
            message: 'Error during logout',
            error: 'LOGOUT_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Initiates the password recovery process by sending a recovery code to the user's email.
 */
export const forgotPassword = async (req: Request, res: Response) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({
                success: false,
                message: 'Email is required',
                error: 'MISSING_FIELDS',
                statusCode: 400
            });
        }

        const user = await usersCollection.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'Email not found',
                error: 'EMAIL_NOT_FOUND',
                statusCode: 404
            });
        }

        // Generate a 6-digit reset token
        const resetToken = Math.floor(100000 + Math.random() * 900000).toString();
        const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    resetToken: resetToken,
                    resetTokenExpiry: resetTokenExpiry.toISOString()
                }
            }
        );

        const transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: 'no-reply@profit-lost.com',
                pass: process.env.EMAIL_PASSWORD
            }
        });

        await transporter.sendMail({
            from: '"Profit-Lost" <no-reply@profit-lost.com>',
            to: user.email,
            subject: user.language === 'esES' ? 'Código de recuperación de contraseña' : 'Password Recovery Code',
            html: getPasswordResetEmailTemplate(user.name, resetToken, user.language)
        });

        return res.status(200).json({
            success: true,
            message: 'Recovery code sent successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error in forgot password:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Verifies the provided password reset token for validity.
 */
export const verifyResetToken = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Token is required',
                error: 'MISSING_FIELDS',
                statusCode: 400
            });
        }

        const user = await usersCollection.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: getCurrentUTCDate() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token',
                error: 'INVALID_RESET_TOKEN',
                statusCode: 400
            });
        }

        res.status(200).json({
            success: true,
            message: 'Token verified successfully',
            statusCode: 200
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Resets the user's password using the provided token and new password.
 */
export const resetPassword = async (req: Request, res: Response) => {
    try {
        const { token, newPassword } = req.body;

        if (!token || !newPassword) {
            return res.status(400).json({
                success: false,
                message: 'Token and new password are required',
                error: 'MISSING_FIELDS',
                statusCode: 400
            });
        }

        const user = await usersCollection.findOne({
            resetToken: token,
            resetTokenExpiry: { $gt: getCurrentUTCDate() }
        });

        if (!user) {
            return res.status(400).json({
                success: false,
                message: 'Invalid or expired token',
                error: 'INVALID_RESET_TOKEN',
                statusCode: 400
            });
        }

        // Validate strong password
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            return res.status(400).json({
                success: false,
                message: 'Password is too weak',
                error: 'PASSWORD_TOO_WEAK',
                statusCode: 400
            });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);

        await usersCollection.updateOne(
            { _id: user._id },
            {
                $set: {
                    password: hashedPassword,
                    resetToken: null,
                    resetTokenExpiry: null,
                    updatedAt: getCurrentUTCDate()
                }
            }
        );

        // Set up the email transporter
        const transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: 'no-reply@profit-lost.com',
                pass: process.env.EMAIL_PASSWORD
            }
        });

        // Send a notification email about the password change
        await transporter.sendMail({
            from: '"Profit-Lost" <no-reply@profit-lost.com>',
            to: user.email,
            subject: user.language === 'esES' ? 'Contraseña actualizada con éxito' : 'Password Changed Successfully',
            html: getPasswordChangeEmailTemplate(user.name, user.language)
        });

        res.status(200).json({
            success: true,
            message: 'Password reset successfully',
            statusCode: 200
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Authenticates a user using Google OAuth.
 */
export const googleAuth = async (req: Request, res: Response) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({
                success: false,
                message: 'Google token not provided',
                error: 'MISSING_FIELDS',
                statusCode: 400
            });
        }

        const ticket = await oAuthClient.verifyIdToken({
            idToken: token,
            audience: process.env.GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        if (!payload) {
            return res.status(400).json({
                success: false,
                message: 'Invalid token',
                error: 'INVALID_GOOGLE_TOKEN',
                statusCode: 400
            });
        }

        const { email, name, given_name, family_name, picture, sub: googleId } = payload;

        let user = await usersCollection.findOne({ email }) as IUser | null;

        if (user) {
            if (!user.googleId) {
                await usersCollection.updateOne(
                    { _id: user._id },
                    {
                        $set: {
                            googleId,
                            profileImage: picture || user.profileImage,
                            updatedAt: getCurrentUTCDate()
                        }
                    }
                );
            }
        } else {
            const username = email!.split('@')[0].toLowerCase();
            const newUser: IUser = {
                username,
                email: email!.toLowerCase(),
                name: given_name || name!.split(' ')[0],
                surname: family_name || name!.split(' ').slice(1).join(' '),
                googleId,
                profileImage: picture,
                preferences: {
                    language: 'enUS',
                    currency: 'USD',
                    dateFormat: 'MM/DD/YYYY',
                    timeFormat: '12h',
                    viewMode: 'fullYear',
                    theme: 'light'
                },
                accountsOrder: [],
                lastLogin: getCurrentUTCDate(),
                createdAt: getCurrentUTCDate(),
                updatedAt: getCurrentUTCDate()
            };

            const result = await usersCollection.insertOne(newUser);
            user = {
                ...newUser,
                _id: result.insertedId
            };
        }

        const jwtToken = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                username: user.username
            },
            process.env.JWT_SECRET as string,
            { expiresIn: '24h' }
        );

        setCookie(res, jwtToken);

        res.status(200).json({
            success: true,
            message: 'Google authentication successful',
            statusCode: 200,
            token: jwtToken
        });
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(500).json({
            success: false,
            message: 'Error in Google authentication',
            error: 'GOOGLE_AUTH_ERROR',
            statusCode: 500
        });
    }
};
