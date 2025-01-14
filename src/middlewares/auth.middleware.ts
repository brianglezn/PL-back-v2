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
        // Extract the token from cookies
        const token = req.cookies.token;

        // Check if the token exists
        if (!token) {
            res.status(401).json({
                success: false,
                message: 'No authentication token provided',
                error: 'UNAUTHORIZED'
            });
            return;
        }

        // Verify and decode the JWT token
        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: string;
            email: string;
            username: string;
        };

        // Attach the decoded user information to the request object
        (req as AuthRequest).user = decoded;

        // Call the next middleware or route handler
        next();
    } catch (error) {
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
        console.error('❌ Error in auth middleware:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};
