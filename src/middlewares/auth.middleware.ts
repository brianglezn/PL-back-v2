import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user: {
        userId: string;
        email: string;
        username: string;
    };
}

export const authMiddleware = (
    req: Request,
    res: Response,
    next: NextFunction
): void => {
    try {
        const token = req.cookies.token;

        if (!token) {
            res.status(401).json({
                success: false,
                message: 'No authentication token provided',
                error: 'UNAUTHORIZED'
            });
            return;
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
            userId: string;
            email: string;
            username: string;
        };

        (req as AuthRequest).user = decoded;
        next();
    } catch (error) {
        if (error instanceof jwt.JsonWebTokenError) {
            res.status(401).json({
                success: false,
                message: 'Invalid or expired token',
                error: 'INVALID_TOKEN'
            });
            return;
        }

        console.error('❌ Error in auth middleware:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
}; 