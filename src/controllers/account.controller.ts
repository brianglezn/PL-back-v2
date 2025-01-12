import type { Response } from 'express';
import { ObjectId } from 'mongodb';

import { client } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { IAccount } from '../models/types';
import { getCurrentUTCDate } from '../utils/dateUtils';

const accountsCollection = client.db(process.env.DB_NAME).collection('accounts');

export const getAllAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
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

export const getAccountsByYear = async (req: AuthRequest, res: Response): Promise<void> => {
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

        const accounts = await accountsCollection.aggregate([
            { $match: { user_id: new ObjectId(userId) } },
            {
                $project: {
                    _id: 1,
                    accountName: 1,
                    records: {
                        $filter: {
                            input: "$records",
                            as: "record",
                            cond: { $eq: ["$$record.year", parseInt(year)] }
                        }
                    },
                    configuration: 1
                }
            }
        ]).toArray();

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

export const createAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { accountName, configuration } = req.body;
        
        // Solo crear records para el año actual
        const currentYear = new Date().getFullYear();
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const records = months.map(month => ({
            year: currentYear,
            month,
            value: 0
        }));

        const newAccount = {
            user_id: new ObjectId(userId),
            accountName,
            records,
            configuration: {
                ...configuration,
                isActive: true
            },
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        };

        const result = await accountsCollection.insertOne(newAccount);

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

export const updateAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;
        const { accountName, configuration, records } = req.body;

        console.log('Update request:', {
            userId,
            accountId: id,
            accountName,
            configuration,
            records
        });

        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid account ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        const updateData: any = {
            updatedAt: getCurrentUTCDate()
        };

        if (accountName) updateData.accountName = accountName;
        if (configuration) updateData.configuration = configuration;
        if (records) updateData.records = records;

        console.log('Update data:', updateData);

        const result = await accountsCollection.findOneAndUpdate(
            { _id: new ObjectId(id), user_id: new ObjectId(userId) },
            { $set: updateData },
            { returnDocument: 'after' }
        );

        console.log('Update result:', result);

        if (!result || !result.value) {
            res.status(404).json({
                success: false,
                message: 'Account not found or does not belong to the user',
                error: 'NOT_FOUND'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Account updated successfully',
            data: result.value
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

export const deleteAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid account ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        const result = await accountsCollection.deleteOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        if (result.deletedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'Account not found or does not belong to the user',
                error: 'NOT_FOUND'
            });
            return;
        }

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
