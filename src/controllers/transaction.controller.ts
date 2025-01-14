import type { Response } from 'express';
import { ObjectId } from 'mongodb';

import { client } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { ITransaction } from '../types/models/ITransaction';
import { DATE_REGEX, toUTCDate, getCurrentUTCDate } from '../utils/dateUtils';

// MongoDB transactions collection
const transactionsCollection = client.db(process.env.DB_NAME).collection('movements');

/**
 * Get all transactions for the authenticated user.
 */
export const getAllTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        // Validate user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        // Fetch transactions from the database
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

        // Return transactions
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

/**
 * Get transactions by year for the authenticated user.
 */
export const getTransactionsByYear = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { year } = req.params;

        // Validate user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        // Fetch transactions from the database
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

        // Return transactions
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

/**
 * Get transactions by year and month for the authenticated user.
 */
export const getTransactionsByYearAndMonth = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { year, month } = req.params;

        // Validate user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        const monthRegex = month ? `-${month}` : '';

        // Fetch transactions from the database
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

        // Return transactions
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

/**
 * Create a new transaction for the authenticated user.
 */
export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { date, description, amount, category } = req.body;

        // Validate user ID and category ID format
        if (!ObjectId.isValid(userId) || !ObjectId.isValid(category)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Validate amount format
        if (typeof amount !== 'number') {
            res.status(400).json({
                success: false,
                message: 'Amount must be a number',
                error: 'INVALID_AMOUNT',
                statusCode: 400
            });
            return;
        }

        // Validate description format
        if (typeof description !== 'string' || !description.trim()) {
            res.status(400).json({
                success: false,
                message: 'Description is required',
                error: 'INVALID_DESCRIPTION',
                statusCode: 400
            });
            return;
        }

        // Validate date format
        if (!DATE_REGEX.test(date)) {
            res.status(400).json({
                success: false,
                message: 'Date must be in format YYYY-MM-DDTHH:mm:ss.sssZ',
                error: 'INVALID_DATE_FORMAT',
                statusCode: 400
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

        res.status(201).json({
            success: true,
            message: 'Transaction created successfully',
            data: { ...newTransaction, _id: result.insertedId },
            statusCode: 201
        });
    } catch (error) {
        console.error('❌ Error creating transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Update an existing transaction for the authenticated user.
 */
export const updateTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;
        const { date, description, amount, category } = req.body;

        // Validate ID format
        if (!ObjectId.isValid(id) || !ObjectId.isValid(category)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        // Update transaction in the database
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

        // Check if update was successful
        if (!result) {
            res.status(404).json({
                success: false,
                message: 'Transaction not found or does not belong to the user',
                error: 'TRANSACTION_NOT_FOUND'
            });
            return;
        }

        // Return success message
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

/**
 * Delete an existing transaction for the authenticated user.
 */
export const deleteTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;

        // Validate ID format
        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid transaction ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        // Delete transaction from the database
        const result = await transactionsCollection.deleteOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        // Check if deletion was successful
        if (result.deletedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'Transaction not found or does not belong to the user',
                error: 'TRANSACTION_NOT_FOUND'
            });
            return;
        }

        // Return success message
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