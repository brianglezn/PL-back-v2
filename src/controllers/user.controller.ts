import type { Response } from 'express';
import { ObjectId } from 'mongodb';
import { client } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';

const usersCollection = client.db(process.env.DB_NAME).collection('users');

export const getUserData = async (req: AuthRequest, res: Response) => {
    try {
        const { userId } = req.user;

        if (!ObjectId.isValid(userId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_FORMAT'
            });
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        if (!user) {
            return res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'NOT_FOUND'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'User data retrieved successfully',
            user: {
                _id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                surname: user.surname,
                profileImage: user.profileImage,
                accountsOrder: user.accountsOrder,
                language: user.language || 'en',
                currency: user.currency || 'USD',
                dateFormat: user.dateFormat || 'DD/MM/YYYY',
                timeFormat: user.timeFormat || '24h',
            }
        });
    } catch (error) {
        console.error('❌ Error getting user data:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
}; 