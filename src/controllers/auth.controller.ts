import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { client } from '../config/database';

const usersCollection = client.db(process.env.DB_NAME).collection('users');

interface LoginRequest extends Request {
    body: {
        identifier: string;
        password: string;
    };
}

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
        res.cookie('token', token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 24 * 60 * 60 * 1000 // 24 hours
        });

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

export const logout = async (_: Request, res: Response) => {
    res.clearCookie('token');
    return res.status(200).json({
        success: true,
        message: 'Logout successful'
    });
}; 