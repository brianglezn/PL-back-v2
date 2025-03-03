import type { Response } from 'express';
import { ObjectId } from 'mongodb';

// Database
import { client } from '../config/database';

// Types
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { IAccount, IYearRecord, YearRecord } from '../types/models/IAccount';

// Utils
import { getCurrentUTCDate, DATE_REGEX } from '../utils/dateUtils';
import { createEncryptedYearRecord, decryptAccountRecords, encryptYearRecord } from '../utils/accountEncryption';

// MongoDB accounts collection
const accountsCollection = client.db(process.env.DB_NAME).collection<IAccount>('accounts');

/**
 * Retrieve all accounts associated with the authenticated user.
 */
export const getAllAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const accounts = await accountsCollection.find({ user_id: new ObjectId(userId) }).toArray();

        const decryptedAccounts = accounts.map(account => ({
            ...account,
            _id: account._id.toString(),
            user_id: account.user_id.toString(),
            records: decryptAccountRecords(account)
        }));

        res.status(200).json({
            success: true,
            data: decryptedAccounts,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error while retrieving accounts:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error occurred while retrieving accounts',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Retrieve accounts for a specific year associated with the authenticated user.
 */
export const getAccountsByYear = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { year } = req.params;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format provided',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        const accounts = await accountsCollection.aggregate([
            { $match: { user_id: new ObjectId(userId) } },
            {
                $project: {
                    _id: 1,
                    accountName: 1,
                    configuration: 1,
                    records: {
                        $ifNull: [
                            { $getField: { field: year, input: "$records" } },
                            {
                                jan: 0, feb: 0, mar: 0, apr: 0,
                                may: 0, jun: 0, jul: 0, aug: 0,
                                sep: 0, oct: 0, nov: 0, dec: 0
                            }
                        ]
                    }
                }
            }
        ]).toArray();

        const decryptedAccounts = accounts.map(account => ({
            ...account,
            records: decryptAccountRecords(account as IAccount)
        }));

        res.status(200).json({
            success: true,
            data: decryptedAccounts,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error while retrieving accounts by year:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error occurred while retrieving accounts by year',
            error: 'DATABASE_ERROR',
            statusCode: 500
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

        if (!accountName || !configuration) {
            res.status(400).json({
                success: false,
                message: 'Required fields are missing',
                error: 'VALIDATION_ERROR',
                statusCode: 400
            });
            return;
        }

        const currentYear = new Date().getFullYear();
        const records: Record<string, IYearRecord> = {
            [currentYear.toString()]: createEncryptedYearRecord()
        };

        // Create new account with UTC ISO dates
        const newAccount = {
            user_id: new ObjectId(userId),
            accountName,
            records,
            configuration: {
                ...configuration,
                isActive: configuration.isActive ?? true
            },
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        };

        const result = await accountsCollection.insertOne(newAccount);

        if (!result.acknowledged) {
            throw new Error('Error occurred while creating account');
        }

        // Frontend will handle UTC ISO to local time conversion
        const decryptedAccount = {
            ...newAccount,
            _id: result.insertedId.toString(),
            records: decryptAccountRecords(newAccount)
        };

        res.status(201).json({
            success: true,
            message: 'Account created successfully',
            data: decryptedAccount,
            statusCode: 201
        });
    } catch (error) {
        console.error('❌ Error while creating account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error occurred while creating account',
            error: 'DATABASE_ERROR',
            statusCode: 500
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

        // Validate the ID format
        if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format provided',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Prepare the data for the update with UTC ISO date
        const updateData: Partial<IAccount> = {
            updatedAt: getCurrentUTCDate()
        };

        if (accountName !== undefined) updateData.accountName = accountName;
        if (configuration !== undefined) updateData.configuration = configuration;
        if (records !== undefined) {
            const encryptedRecords: Record<string, IYearRecord> = {};
            Object.entries(records).forEach(([year, yearRecord]) => {
                encryptedRecords[year] = encryptYearRecord(yearRecord as YearRecord);
            });
            updateData.records = encryptedRecords;
        }

        // Update the account in the database
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

        // Check if the update was successful
        if (!result) {
            console.error('Error during update: Account not found');
            res.status(404).json({
                success: false,
                message: 'Account not found',
                error: 'ACCOUNT_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Frontend will handle UTC ISO to local time conversion
        const decryptedAccount = {
            ...result,
            _id: result._id.toString(),
            user_id: result.user_id.toString(),
            records: decryptAccountRecords(result)
        };

        res.status(200).json({
            success: true,
            message: 'Account updated successfully',
            data: decryptedAccount,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error while updating account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error occurred while updating account',
            error: 'DATABASE_ERROR',
            statusCode: 500
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

        // Validate the ID format
        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid account ID format provided',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Remove the account from the database
        const result = await accountsCollection.deleteOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        // Check if the deletion was successful
        if (result.deletedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'Account not found or does not belong to the user',
                error: 'ACCOUNT_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Return a success message
        res.status(200).json({
            success: true,
            message: 'Account deleted successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error while deleting account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error occurred while deleting account',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};
