import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Extend the Request interface to include user information from the decoded token
export interface AuthRequest extends Request {
    user: {
        userId: string;
        email: string;
        username: string;
    };
}

/**
 * Middleware for authentication.
 * Validates the presence and validity of a JWT token in the request cookies.
 *
 * @param req - The incoming HTTP request.
 * @param res - The outgoing HTTP response.
 * @param next - The next middleware function in the pipeline.
 */
export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        console.log('📨 Headers received:', req.headers);
        console.log('🍪 Cookies received:', req.cookies);
        console.log('🔑 Cookie token:', req.cookies.token);
        
        const token = req.cookies.token;
        
        if (!token) {
            console.log('❌ No token found in cookies');
            res.status(401).json({
                success: false,
                message: 'No authentication token provided',
                error: 'UNAUTHORIZED'
            });
            return;
        }

        console.log('🔑 Token found, attempting to verify...');
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: string;
            email: string;
            username: string;
        };
        console.log('✅ Token verified successfully');

        (req as AuthRequest).user = decoded;
        next();
    } catch (error) {
        console.error('❌ Error in auth middleware:', error);
        // Handle specific JWT errors
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
                error: 'INVALID_TOKEN'
            });
            return;
        }

        // Handle any other errors
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};
