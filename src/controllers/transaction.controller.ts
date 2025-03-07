import type { Response } from 'express';
import { ObjectId } from 'mongodb';

// Database
import { client } from '../config/database';

// Types
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { ITransaction, RecurrenceType } from '../types/models/ITransaction';

// Utils
import { DATE_REGEX, toUTCDate, getCurrentUTCDate, fromUTCString, localToUTC } from '../utils/dateUtils';
import { encryptAmount, decryptTransactionsAmounts } from '../utils/transactionEncryption';
import { createUTCMonthRange } from '../utils/dateUtils';

// MongoDB transactions collection
const transactionsCollection = client.db(process.env.DB_NAME).collection('transactions');

/**
 * Retrieve all transactions associated with the authenticated user.
 */
export const getAllTransactions = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        // Validate the user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Retrieve transactions from the database
        const transactions = await transactionsCollection.aggregate([
            { $match: { user_id: new ObjectId(userId) } },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryData'
                }
            },
            { $unwind: '$categoryData' },
            {
                $project: {
                    _id: 1,
                    date: 1,
                    description: 1,
                    amount: 1,
                    category: '$categoryData.name',
                    categoryColor: '$categoryData.color',
                    isRecurrent: 1,
                    recurrenceType: 1,
                    recurrenceEndDate: 1,
                    recurrenceId: 1,
                    isOriginalRecurrence: 1
                }
            },
            { $sort: { date: -1 } }
        ]).toArray();

        // Decrypt the amount field for all transactions
        const decryptedTransactions = decryptTransactionsAmounts(transactions);

        // Respond with the retrieved transactions
        res.status(200).json({
            success: true,
            data: decryptedTransactions
        });
    } catch (error) {
        console.error('❌ Error occurred while retrieving transactions:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Retrieve transactions for the authenticated user filtered by year.
 */
export const getTransactionsByYear = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { year } = req.params;

        // Validate the user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Retrieve transactions from the database filtered by year
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

        // Decrypt the amount field for all transactions
        const decryptedTransactions = decryptTransactionsAmounts(transactions);

        // Respond with the retrieved transactions
        res.status(200).json({
            success: true,
            data: decryptedTransactions,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error occurred while retrieving transactions by year:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Retrieve transactions for the authenticated user filtered by both year and month.
 */
export const getTransactionsByYearAndMonth = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { year, month } = req.params;

        // Validate the user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Get UTC date range for the month
        const { start: startOfMonth, end: endOfMonth } = createUTCMonthRange(
            parseInt(year),
            parseInt(month)
        );

        // Retrieve transactions from the database filtered by year and month
        const transactions = await transactionsCollection.aggregate([
            {
                $match: {
                    user_id: new ObjectId(userId),
                    date: {
                        $gte: startOfMonth,
                        $lte: endOfMonth
                    }
                }
            },
            {
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryData'
                }
            },
            { $unwind: '$categoryData' },
            {
                $project: {
                    _id: 1,
                    date: 1, // Will be in UTC ISO format
                    description: 1,
                    amount: 1,
                    category: '$categoryData.name',
                    categoryColor: '$categoryData.color',
                    isRecurrent: 1,
                    recurrenceType: 1,
                    recurrenceEndDate: 1,
                    recurrenceId: 1,
                    isOriginalRecurrence: 1
                }
            },
            { $sort: { date: -1 } }
        ]).toArray();

        // Decrypt the amount field for all transactions
        const decryptedTransactions = decryptTransactionsAmounts(transactions);

        // Frontend will convert the UTC ISO dates to local time
        res.status(200).json({
            success: true,
            data: decryptedTransactions,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error occurred while retrieving transactions by year and month:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Helper function to generate recurrent dates based on the specified recurrence type.
 * Uses the date utilities to ensure consistent date handling.
 * 
 * @param startDate - The start date for recurrence
 * @param endDate - The end date for recurrence
 * @param recurrenceType - The type of recurrence (weekly, monthly, yearly)
 * @returns An array of Date objects representing the recurrence dates
 */
const generateRecurrentDates = (
    startDate: Date,
    endDate: Date,
    recurrenceType: RecurrenceType
): Date[] => {
    // Convert dates to ISO UTC format and then back to Date objects
    // to ensure consistency in date handling
    const startISOString = toUTCDate(startDate);
    const endISOString = toUTCDate(endDate);
    
    const startDateNormalized = fromUTCString(startISOString);
    const endDateNormalized = fromUTCString(endISOString);
    
    const dates: Date[] = [];
    let currentDate = new Date(startDateNormalized.getTime());

    while (currentDate <= endDateNormalized) {
        // Create a copy of the current date to add to the list
        dates.push(new Date(currentDate.getTime()));

        // Calculate the next date based on the recurrence type
        const nextDate = new Date(currentDate.getTime());
        switch (recurrenceType) {
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
            default:
                return dates;
        }
        currentDate = nextDate;
    }

    return dates;
};

/**
 * Validate the transaction data to ensure all required fields are correct.
 */
const validateTransactionData = (data: Partial<ITransaction>): { isValid: boolean; error?: { message: string; code: string; } } => {
    if (data.amount !== undefined && typeof data.amount !== 'number') {
        return {
            isValid: false,
            error: {
                message: 'Amount must be a number',
                code: 'INVALID_AMOUNT'
            }
        };
    }

    if (data.description !== undefined && (typeof data.description !== 'string' || !data.description.trim())) {
        return {
            isValid: false,
            error: {
                message: 'Description is required',
                code: 'INVALID_DESCRIPTION'
            }
        };
    }

    if (data.date !== undefined && !DATE_REGEX.test(data.date)) {
        return {
            isValid: false,
            error: {
                message: 'Date must be in format YYYY-MM-DDTHH:mm:ss.sssZ',
                code: 'INVALID_DATE_FORMAT'
            }
        };
    }

    if (data.isRecurrent) {
        if (!data.recurrenceType || !data.recurrenceEndDate) {
            return {
                isValid: false,
                error: {
                    message: 'Recurrence type and end date are required',
                    code: 'INVALID_RECURRENCE_DATA'
                }
            };
        }

        const startDate = new Date(data.date || '');
        const endDate = new Date(data.recurrenceEndDate);
        if (endDate <= startDate) {
            return {
                isValid: false,
                error: {
                    message: 'End date must be after start date',
                    code: 'INVALID_DATE_RANGE'
                }
            };
        }
    }

    return { isValid: true };
};

/**
 * Create a new transaction for the authenticated user.
 */
export const createTransaction = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const {
            date, // This will be in LocalTime from frontend
            description,
            amount,
            category,
            isRecurrent,
            recurrenceType,
            recurrenceEndDate // This will be in LocalTime from frontend
        } = req.body;

        // Validate the user ID and category ID formats
        if (!ObjectId.isValid(userId) || !ObjectId.isValid(category)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Convert LocalTime to UTC ISO
        const utcDate = localToUTC(date);
        const utcEndDate = recurrenceEndDate ? localToUTC(recurrenceEndDate) : undefined;

        // Validate the amount format
        if (typeof amount !== 'number') {
            res.status(400).json({
                success: false,
                message: 'Amount must be a number',
                error: 'INVALID_AMOUNT',
                statusCode: 400
            });
            return;
        }

        // Validate the description format
        if (typeof description !== 'string' || !description.trim()) {
            res.status(400).json({
                success: false,
                message: 'Description is required',
                error: 'INVALID_DESCRIPTION',
                statusCode: 400
            });
            return;
        }

        if (isRecurrent && (!recurrenceType || !utcEndDate)) {
            res.status(400).json({
                success: false,
                message: 'Recurrence type and end date are required for recurrent transactions',
                error: 'INVALID_DATA',
                statusCode: 400
            });
            return;
        }

        const validation = validateTransactionData(req.body);
        if (!validation.isValid) {
            res.status(400).json({
                success: false,
                message: validation.error!.message,
                error: validation.error!.code,
                statusCode: 400
            });
            return;
        }

        // Encrypt the amount before storing it
        const encryptedAmount = encryptAmount(amount);

        if (isRecurrent) {
            const startDate = fromUTCString(utcDate);
            const endDate = fromUTCString(utcEndDate!);
            
            // Ensure the end date is after the start date
            if (endDate <= startDate) {
                res.status(400).json({
                    success: false,
                    message: 'End date must be after start date',
                    error: 'INVALID_DATE_RANGE',
                    statusCode: 400
                });
                return;
            }

            const recurrenceId = new ObjectId().toString();
            const recurrentDates = generateRecurrentDates(startDate, endDate, recurrenceType);

            const recurrentTransactions = recurrentDates.map((date, index) => ({
                user_id: new ObjectId(userId),
                date: toUTCDate(date),
                description: description.trim(),
                amount: encryptedAmount,
                category: new ObjectId(category),
                createdAt: getCurrentUTCDate(),
                updatedAt: getCurrentUTCDate(),
                isRecurrent: true,
                recurrenceType,
                recurrenceId,
                isOriginalRecurrence: index === 0
            }));

            const result = await transactionsCollection.insertMany(recurrentTransactions);

            res.status(201).json({
                success: true,
                message: 'Recurrent transactions created successfully',
                data: { insertedCount: result.insertedCount },
                statusCode: 201
            });
        } else {
            const baseTransaction: ITransaction = {
                user_id: new ObjectId(userId),
                date: utcDate,
                description: description.trim(),
                amount: encryptedAmount,
                category: new ObjectId(category),
                createdAt: getCurrentUTCDate(),
                updatedAt: getCurrentUTCDate(),
                isRecurrent: false
            };

            const result = await transactionsCollection.insertOne(baseTransaction);

            // Decrypt the amount for the response
            const responseTransaction = {
                ...baseTransaction,
                _id: result.insertedId,
                amount: amount // Return the original amount
            };

            res.status(201).json({
                success: true,
                message: 'Transaction created successfully',
                data: responseTransaction,
                statusCode: 201
            });
        }
    } catch (error) {
        console.error('❌ Error occurred while creating transaction:', error);
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
        const { updateAll, category, date, amount, ...updateData } = req.body;

        // Convert LocalTime to UTC ISO if date is provided
        const utcDate = date ? localToUTC(date) : undefined;

        // Prepare the final update data, encrypting the amount if provided
        const finalUpdateData = {
            ...updateData,
            ...(category && { category: new ObjectId(category) }),
            ...(utcDate && { date: utcDate }),
            ...(amount !== undefined && { amount: encryptAmount(amount) }),
            updatedAt: getCurrentUTCDate()
        };

        const transaction = await transactionsCollection.findOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        if (!transaction) {
            res.status(404).json({
                success: false,
                message: 'Transaction not found',
                error: 'TRANSACTION_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // If the transaction is recurrent and updateAll is true, maintain the temporal spacing
        if (updateAll && transaction.recurrenceId && transaction.recurrenceType) {
            const transactions = await transactionsCollection
                .find({
                    recurrenceId: transaction.recurrenceId,
                    date: { $gte: transaction.date }
                })
                .sort({ date: 1 })
                .toArray();

            // Update each transaction while maintaining the temporal spacing
            const updatePromises = transactions.map((tx, index) => {
                if (index === 0 && utcDate) {
                    // Only update the date of the first transaction if provided
                    return transactionsCollection.updateOne(
                        { _id: tx._id },
                        { $set: finalUpdateData }
                    );
                }
                // For the rest, update everything except the date
                const { date: _, ...dataWithoutDate } = finalUpdateData;
                return transactionsCollection.updateOne(
                    { _id: tx._id },
                    { $set: dataWithoutDate }
                );
            });

            await Promise.all(updatePromises);
        } else {
            // Normal update of a single transaction
            await transactionsCollection.updateOne(
                { _id: new ObjectId(id) },
                { $set: finalUpdateData }
            );
        }

        res.status(200).json({
            success: true,
            message: 'Transaction(s) updated successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error occurred while updating transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
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
        const { deleteAll } = req.body;

        const transaction = await transactionsCollection.findOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        if (!transaction) {
            res.status(404).json({
                success: false,
                message: 'Transaction not found',
                error: 'TRANSACTION_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Determine the delete query based on whether to delete all recurrent transactions
        const deleteQuery = deleteAll && transaction.recurrenceId
            ? { 
                recurrenceId: transaction.recurrenceId,
                date: { $gte: transaction.date }
            }
            : { _id: new ObjectId(id) };

        const result = await transactionsCollection.deleteMany(deleteQuery);

        res.status(200).json({
            success: true,
            message: 'Transaction(s) deleted successfully',
            data: { deletedCount: result.deletedCount },
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error occurred while deleting transaction:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};