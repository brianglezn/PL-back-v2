import type { Response } from 'express';
import { ObjectId } from 'mongodb';

import { client } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { IAccount, IYearRecord, YearRecord } from '../types/models/IAccount';
import { getCurrentUTCDate, DATE_REGEX } from '../utils/dateUtils';
import { encryptNumber, decryptNumber, encryptText } from '../utils/encryption';

// MongoDB accounts collection
const accountsCollection = client.db(process.env.DB_NAME).collection('accounts');

/**
 * Get all accounts for the authenticated user.
 */
export const getAllAccounts = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const accounts = await accountsCollection.find({ user_id: new ObjectId(userId) }).toArray();

        const decryptedAccounts = accounts.map(account => ({
            ...account,
            _id: account._id.toString(),
            user_id: account.user_id.toString(),
            records: Object.entries(account.records).reduce((acc, [year, yearRecord]) => ({
                ...acc,
                [year]: decryptYearRecord(yearRecord as IYearRecord)
            }), {})
        }));

        res.status(200).json({
            success: true,
            data: decryptedAccounts,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error getting accounts:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
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

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
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
            records: decryptYearRecord(account.records as IYearRecord)
        }));

        res.status(200).json({
            success: true,
            data: decryptedAccounts,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error getting accounts by year:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
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
                message: 'Missing required fields',
                error: 'VALIDATION_ERROR',
                statusCode: 400
            });
            return;
        }

        const currentYear = new Date().getFullYear();
        const records: Record<string, IYearRecord> = {
            [currentYear.toString()]: createEncryptedYearRecord()
        };

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

        // Validate date format
        if (!DATE_REGEX.test(newAccount.createdAt) || !DATE_REGEX.test(newAccount.updatedAt)) {
            res.status(400).json({
                success: false,
                message: 'Invalid date format',
                error: 'INVALID_DATE_FORMAT',
                statusCode: 400
            });
            return;
        }

        const result = await accountsCollection.insertOne(newAccount);

        if (!result.acknowledged) {
            throw new Error('Error creating account');
        }

        const decryptedAccount = {
            ...newAccount,
            _id: result.insertedId.toString(),
            records: Object.entries(records).reduce((acc, [year, yearRecord]) => ({
                ...acc,
                [year]: decryptYearRecord(yearRecord)
            }), {})
        };

        res.status(201).json({
            success: true,
            data: decryptedAccount,
            statusCode: 201
        });
    } catch (error) {
        console.error('❌ Error creating account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
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

        // Validate ID format
        if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Prepare update data
        const updateData: Partial<IAccount> = {
            updatedAt: getCurrentUTCDate()
        };

        if (accountName !== undefined) updateData.accountName = accountName;
        if (configuration !== undefined) updateData.configuration = configuration;
        if (records !== undefined) {
            const encryptedRecords: Record<string, IYearRecord> = {};
            Object.entries(records as Record<string, IYearRecord>).forEach(([year, yearRecord]) => {
                encryptedRecords[year] = {
                    jan: encryptText(yearRecord.jan.toString()),
                    feb: encryptText(yearRecord.feb.toString()),
                    mar: encryptText(yearRecord.mar.toString()),
                    apr: encryptText(yearRecord.apr.toString()),
                    may: encryptText(yearRecord.may.toString()),
                    jun: encryptText(yearRecord.jun.toString()),
                    jul: encryptText(yearRecord.jul.toString()),
                    aug: encryptText(yearRecord.aug.toString()),
                    sep: encryptText(yearRecord.sep.toString()),
                    oct: encryptText(yearRecord.oct.toString()),
                    nov: encryptText(yearRecord.nov.toString()),
                    dec: encryptText(yearRecord.dec.toString())
                };
            });
            updateData.records = encryptedRecords;
        }

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
        if (!result) {
            console.error('❌ Error in the update: Account not found');
            res.status(404).json({
                success: false,
                message: 'Account not found',
                error: 'ACCOUNT_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Modificar la respuesta para enviar datos decriptados
        const decryptedAccount = {
            ...result,
            _id: result._id.toString(),
            user_id: result.user_id.toString(),
            records: Object.entries(result.records).reduce((acc, [year, yearRecord]) => ({
                ...acc,
                [year]: decryptYearRecord(yearRecord as IYearRecord)
            }), {})
        };

        res.status(200).json({
            success: true,
            message: 'Account updated successfully',
            data: decryptedAccount,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error updating account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
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

        // Validate ID format
        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid account ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
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
                error: 'ACCOUNT_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Return success message
        res.status(200).json({
            success: true,
            message: 'Account deleted successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error deleting account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

const createEncryptedYearRecord = (): IYearRecord => {
    return {
        jan: encryptText('0'),
        feb: encryptText('0'),
        mar: encryptText('0'),
        apr: encryptText('0'),
        may: encryptText('0'),
        jun: encryptText('0'),
        jul: encryptText('0'),
        aug: encryptText('0'),
        sep: encryptText('0'),
        oct: encryptText('0'),
        nov: encryptText('0'),
        dec: encryptText('0')
    };
};

const decryptYearRecord = (yearRecord: IYearRecord): YearRecord => {
    return {
        jan: decryptNumber(yearRecord.jan),
        feb: decryptNumber(yearRecord.feb),
        mar: decryptNumber(yearRecord.mar),
        apr: decryptNumber(yearRecord.apr),
        may: decryptNumber(yearRecord.may),
        jun: decryptNumber(yearRecord.jun),
        jul: decryptNumber(yearRecord.jul),
        aug: decryptNumber(yearRecord.aug),
        sep: decryptNumber(yearRecord.sep),
        oct: decryptNumber(yearRecord.oct),
        nov: decryptNumber(yearRecord.nov),
        dec: decryptNumber(yearRecord.dec)
    };
};
