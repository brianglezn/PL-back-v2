import type { Request, Response, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { client } from '../config/database';
import type { AuthRequest } from './auth.middleware';
import type { IUser } from '../types/models/IUser';

/**
 * Middleware to check if the user has admin role.
 * This middleware should be used after the auth middleware.
 *
 * @param req - The incoming HTTP request
 * @param res - The outgoing HTTP response
 * @param next - The next middleware function in the pipeline
 */
export const isAdmin = async (
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> => {
    try {
        const authReq = req as AuthRequest;
        const { userId } = authReq.user;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        // Get user from database to check role
        const usersCollection = client.db(process.env.DB_NAME).collection<IUser>('users');
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user || !user.role || user.role !== 'admin') {
            res.status(403).json({
                success: false,
                message: 'Access denied. Admin privileges required.',
                error: 'FORBIDDEN'
            });
            return;
        }

        next();
    } catch (error) {
        console.error('❌ Error in admin middleware:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
}; 