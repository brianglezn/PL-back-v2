import type { Response } from 'express';
import { ObjectId } from 'mongodb';

import { client } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { IAccount } from '../types/models/IAccount';
import { getCurrentUTCDate } from '../utils/dateUtils';

// MongoDB accounts collection
const accountsCollection = client.db(process.env.DB_NAME).collection('accounts');

/**
 * Get all accounts for the authenticated user.
 */
export const getAllAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
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

        // Fetch accounts from the database
        const accounts = await accountsCollection.aggregate([
            { $match: { user_id: new ObjectId(userId) } },
            {
                $project: {
                    _id: 1,
                    accountName: 1,
                    records: 1,
                    configuration: 1
                }
            }
        ]).toArray();

        // Return success message
        res.status(200).json({
            success: true,
            data: accounts
        });
    } catch (error) {
        console.error('❌ Error getting accounts:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

/**
 * Get accounts by year for the authenticated user.
 */
export const getAccountsByYear = async (req: AuthRequest, res: Response): Promise<void> => {
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

        // Fetch accounts from the database
        const accounts = await accountsCollection.aggregate([
            { $match: { user_id: new ObjectId(userId) } },
            {
                $project: {
                    _id: 1,
                    accountName: 1,
                    records: {
                        $filter: {
                            input: '$records',
                            as: 'record',
                            cond: { $eq: ['$$record.year', parseInt(year)] }
                        }
                    },
                    configuration: 1
                }
            }
        ]).toArray();

        // Return success message
        res.status(200).json({
            success: true,
            data: accounts
        });
    } catch (error) {
        console.error('❌ Error getting accounts by year:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

/**
 * Create a new account for the authenticated user.
 */
export const createAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { accountName, configuration } = req.body;

        const currentYear = new Date().getFullYear();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const records = months.map(month => ({
            year: currentYear,
            month,
            value: 0
        }));
        if (!accountName || !configuration) {
            res.status(400).json({
                success: false,
                message: 'Missing required fields',
                error: 'VALIDATION_ERROR'
            });
            return;
        }

        // Create new account
        const newAccount = {
            user_id: new ObjectId(userId),
            accountName,
            records: records || [],
            configuration: {
                ...configuration,
                isActive: configuration.isActive ?? true
            },
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        };

        // Insert new account into the database
        const result = await accountsCollection.insertOne(newAccount);

        // Return success message
        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: { ...newAccount, _id: result.insertedId }
        });
    } catch (error) {
        console.error('❌ Error creating account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

/**
 * Update an existing account for the authenticated user.
 */
export const updateAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;
        const { accountName, configuration, records } = req.body;

        // Validate ID format
        if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        // Check if the account exists
        const account = await accountsCollection.findOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });
        if (!account) {
            console.error('❌ Account not found during verification:', { id, userId });
            res.status(404).json({
                success: false,
                message: 'Account not found or unauthorized',
                error: 'ACCOUNT_NOT_FOUND'
            });
            return;
        }

        // Prepare update data
        const updateData: Partial<IAccount> = {
            updatedAt: getCurrentUTCDate()
        };

        // Update fields if provided
        if (accountName !== undefined) updateData.accountName = accountName;
        if (configuration !== undefined) updateData.configuration = configuration;
        if (records !== undefined) updateData.records = records;

        // Update account in the database
        const result = await accountsCollection.findOneAndUpdate(
            {
                _id: new ObjectId(id),
                user_id: new ObjectId(userId)
            },
            { $set: updateData },
            {
                returnDocument: 'after'
            }
        );

        // Check if update was successful
        if (!result || !result.value) {
            console.error('❌ Error en la actualización:', result);
            res.status(404).json({
                success: false,
                message: 'Account not found or could not be updated',
                error: 'ACCOUNT_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Prepare the updated account for response
        const updatedAccount = {
            ...result.value,
            _id: result.value._id.toString(),
            user_id: result.value.user_id.toString()
        };

        // Return success message
        res.status(200).json({
            success: true,
            message: 'Account updated successfully',
            data: updatedAccount
        });
    } catch (error) {
        console.error('❌ Error updating account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

/**
 * Delete an existing account for the authenticated user.
 */
export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;

        // Validate ID format
        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid account ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        // Delete account from the database
        const result = await accountsCollection.deleteOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        // Check if deletion was successful
        if (result.deletedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'Account not found or does not belong to the user',
                error: 'ACCOUNT_NOT_FOUND'
            });
            return;
        }

        // Return success message
        res.status(200).json({
            success: true,
            message: 'Account deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};
