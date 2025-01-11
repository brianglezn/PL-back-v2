import type { Response } from 'express';
import { ObjectId } from 'mongodb';

import { client } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { ITransaction } from '../models/types';
import { DATE_REGEX, toUTCDate, getCurrentUTCDate } from '../utils/dateUtils';

const transactionsCollection = client.db(process.env.DB_NAME).collection('movements');

export const getAllTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        const transactions = await transactionsCollection.aggregate([
            { $match: { user_id: new ObjectId(userId) } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $project: {
                    _id: 1,
                    date: 1,
                    description: 1,
                    amount: 1,
                    category: '$categoryInfo.name',
                    categoryColor: '$categoryInfo.color'
                }
            }
        ]).toArray();

        res.status(200).json({
            success: true,
            data: transactions
        });
    } catch (error) {
        console.error('❌ Error getting transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

export const getTransactionsByYear = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { year } = req.params;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        const transactions = await transactionsCollection.aggregate([
            {
                $match: {
                    user_id: new ObjectId(userId),
                    date: { $regex: `^${year}` }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $project: {
                    _id: 1,
                    date: 1,
                    description: 1,
                    amount: 1,
                    category: '$categoryInfo.name',
                    categoryColor: '$categoryInfo.color'
                }
            }
        ]).toArray();

        res.status(200).json({
            success: true,
            data: transactions
        });
    } catch (error) {
        console.error('❌ Error getting transactions by year:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

export const getTransactionsByYearAndMonth = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { year, month } = req.params;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        const monthRegex = month ? `-${month}` : "";
        
        const transactions = await transactionsCollection.aggregate([
            {
                $match: {
                    user_id: new ObjectId(userId),
                    date: { $regex: `^${year}${monthRegex}` }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            },
            { $unwind: '$categoryInfo' },
            {
                $project: {
                    _id: 1,
                    date: 1,
                    description: 1,
                    amount: 1,
                    category: '$categoryInfo.name',
                    categoryColor: '$categoryInfo.color'
                }
            }
        ]).toArray();

        res.status(200).json({
            success: true,
            data: transactions
        });
    } catch (error) {
        console.error('❌ Error getting transactions by year and month:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { date, description, amount, category } = req.body;

        if (!ObjectId.isValid(userId) || !ObjectId.isValid(category)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        if (typeof amount !== 'number') {
            res.status(400).json({
                success: false,
                message: 'Amount must be a number',
                error: 'INVALID_AMOUNT'
            });
            return;
        }

        if (typeof description !== 'string' || !description.trim()) {
            res.status(400).json({
                success: false,
                message: 'Description is required',
                error: 'INVALID_DESCRIPTION'
            });
            return;
        }

        if (!DATE_REGEX.test(date)) {
            res.status(400).json({
                success: false,
                message: 'Date must be in format YYYY-MM-DDTHH:mm:ss.sssZ',
                error: 'INVALID_DATE_FORMAT'
            });
            return;
        }

        const newTransaction: ITransaction = {
            user_id: new ObjectId(userId),
            date: toUTCDate(date),
            description: description.trim(),
            amount,
            category: new ObjectId(category),
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        };

        const result = await transactionsCollection.insertOne(newTransaction);

        if (!result.acknowledged) {
            res.status(500).json({
                success: false,
                message: 'Failed to create transaction',
                error: 'DATABASE_ERROR'
            });
            return;
        }

        res.status(201).json({
            success: true,
            message: 'Transaction created successfully',
            data: { ...newTransaction, _id: result.insertedId }
        });
    } catch (error) {
        console.error('❌ Error creating transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;
        const { date, description, amount, category } = req.body;

        if (!ObjectId.isValid(id) || !ObjectId.isValid(category)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        const result = await transactionsCollection.findOneAndUpdate(
            {
                _id: new ObjectId(id),
                user_id: new ObjectId(userId)
            },
            {
                $set: {
                    date: toUTCDate(date),
                    description,
                    amount,
                    category: new ObjectId(category),
                    updatedAt: getCurrentUTCDate()
                }
            },
            { returnDocument: 'after' }
        );

        if (!result) {
            res.status(404).json({
                success: false,
                message: 'Transaction not found or does not belong to the user',
                error: 'NOT_FOUND'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Transaction updated successfully',
            data: result
        });
    } catch (error) {
        console.error('❌ Error updating transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid transaction ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        const result = await transactionsCollection.deleteOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        if (result.deletedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'Transaction not found or does not belong to the user',
                error: 'NOT_FOUND'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Transaction deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};