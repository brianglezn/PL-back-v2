import { Request, Response } from 'express';
import { client } from '../config/database';
import { toUTCDate, getCurrentUTCDate } from '../utils/dateUtils';

// Types
import { IUserMetrics, ITransactionMetrics, ITransactionHistory, IUserMetricsHistory } from '../types/models/IAnalytics';

// MongoDB collections
const db = client.db(process.env.DB_NAME);
const usersCollection = db.collection('users');
const userMetricsHistoryCollection = db.collection('userMetricsHistory');
const transactionsCollection = db.collection('transactions');

/**
 * Save the current user metrics to history.
 * This function should be invoked by a daily cron job at the end of each day or manually.
 * @param isManualSave - Indicates if this is a manual save (true) or an automated cron save (false).
 */
export const saveUserMetricsHistory = async (isManualSave: boolean = false): Promise<boolean> => {
    try {
        console.log(`🔄 Starting user metrics save... (${isManualSave ? 'manual' : 'automated'} save)`);

        const now = getCurrentUTCDate();
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const startOfTodayUTC = toUTCDate(startOfToday);

        // Determine the start of the month in UTC
        const startOfMonth = new Date();
        startOfMonth.setUTCDate(1);
        startOfMonth.setUTCHours(0, 0, 0, 0);
        const startOfMonthUTC = toUTCDate(startOfMonth);
        
        // Determine the end of the month in UTC
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0); // Last day of the month
        endOfMonth.setUTCHours(23, 59, 59, 999);
        const endOfMonthUTC = toUTCDate(endOfMonth);
        
        // Calculate the number of active users for the day (unique users who logged in today)
        const dailyActive = await usersCollection.countDocuments({
            lastLogin: {
                $gte: startOfTodayUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        // Calculate unique monthly active users (users who logged in at least once this month)
        // This query counts each user only once, even if they logged in multiple times.
        const monthlyActive = await usersCollection.countDocuments({
            lastLogin: {
                $gte: startOfMonthUTC,
                $lte: endOfMonthUTC
            }
        });

        // Create the metrics object
        const metricsData: IUserMetricsHistory = {
            // For manual saves, use the exact date and time.
            // For automated saves (cron), use the start of the day.
            date: isManualSave ? now : startOfTodayUTC,
            dailyActive,
            monthlyActive
        };

        // If it's a manual save, add the flag.
        if (isManualSave) {
            metricsData.isManualSave = true;
        }

        // Save metrics to history.
        await userMetricsHistoryCollection.insertOne(metricsData);

        console.log('✅ User metrics successfully saved for date:', metricsData.date);
        return true;
    } catch (error) {
        console.error('❌ An error occurred while saving user metrics:', error);
        throw error; // Rethrow the error to be captured by the cron job.
    }
};

/**
 * Retrieve user metrics including active users, new users, and retention.
 */
export const getUserMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = getCurrentUTCDate();

        // Determine the start of today in UTC.
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const startOfTodayUTC = toUTCDate(startOfToday);

        // Determine the end of today in UTC.
        const endOfToday = new Date(startOfToday);
        endOfToday.setUTCHours(23, 59, 59, 999);
        const endOfTodayUTC = toUTCDate(endOfToday);

        // Determine the start of the month in UTC.
        const startOfMonth = new Date();
        startOfMonth.setUTCDate(1);
        startOfMonth.setUTCHours(0, 0, 0, 0);
        const startOfMonthUTC = toUTCDate(startOfMonth);

        // Determine the end of the month in UTC.
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setDate(0); // Last day of the month
        endOfMonth.setUTCHours(23, 59, 59, 999);
        const endOfMonthUTC = toUTCDate(endOfMonth);

        // Retrieve previous day's metrics from history - find the most recent metric from the previous day.
        const yesterday = new Date(startOfToday);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setUTCHours(0, 0, 0, 0);
        const yesterdayStartUTC = toUTCDate(yesterday);

        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setUTCHours(23, 59, 59, 999);
        const yesterdayEndUTC = toUTCDate(yesterdayEnd);

        // Find the most recent metric from the previous day.
        const previousDayMetrics = await userMetricsHistoryCollection
            .find({
                date: {
                    $gte: yesterdayStartUTC,
                    $lte: yesterdayEndUTC
                }
            })
            .sort({ date: -1 }) // Sort by date descending to get the most recent.
            .limit(1)
            .toArray();

        // Retrieve previous month's metrics from history.
        const previousMonth = new Date(startOfMonth);
        previousMonth.setMonth(previousMonth.getMonth() - 1);
        previousMonth.setUTCHours(0, 0, 0, 0);
        const previousMonthStartUTC = toUTCDate(previousMonth);

        const previousMonthEnd = new Date(previousMonth);
        previousMonthEnd.setMonth(previousMonthEnd.getMonth() + 1);
        previousMonthEnd.setDate(0); // Last day of the previous month.
        previousMonthEnd.setUTCHours(23, 59, 59, 999);
        const previousMonthEndUTC = toUTCDate(previousMonthEnd);

        // Find the most recent metric from the previous month.
        const previousMonthMetrics = await userMetricsHistoryCollection
            .find({
                date: {
                    $gte: previousMonthStartUTC,
                    $lte: previousMonthEndUTC
                }
            })
            .sort({ date: -1 }) // Sort by date descending to get the most recent.
            .limit(1)
            .toArray();

        // Get current active users for today (unique users who logged in today).
        const dailyActive = await usersCollection.countDocuments({
            lastLogin: {
                $gte: startOfTodayUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        // Get unique monthly active users (users who logged in at least once this month).
        // MongoDB's countDocuments ensures we count each user only once.
        const monthlyActive = await usersCollection.countDocuments({
            lastLogin: {
                $gte: startOfMonthUTC,
                $lte: endOfMonthUTC
            }
        });

        // Retrieve total users and new users metrics.
        const totalUsers = await usersCollection.countDocuments();

        // Get unique new users today.
        const dailyNew = await usersCollection.countDocuments({
            createdAt: {
                $gte: startOfTodayUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        // Get unique new users this month.
        const monthlyNew = await usersCollection.countDocuments({
            createdAt: {
                $gte: startOfMonthUTC,
                $lte: endOfMonthUTC
            }
        });

        // Retrieve comparison data for new users.
        const yesterdayNew = await usersCollection.countDocuments({
            createdAt: {
                $gte: yesterdayStartUTC,
                $lt: startOfTodayUTC
            }
        });

        const prevMonthlyNew = await usersCollection.countDocuments({
            createdAt: {
                $gte: previousMonthStartUTC,
                $lt: startOfMonthUTC
            }
        });

        // Calculate retention rates for different time periods.
        // For 7-day retention, use the date 7 days ago.
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        sevenDaysAgo.setUTCHours(0, 0, 0, 0);
        const sevenDaysAgoUTC = toUTCDate(sevenDaysAgo);

        // For 30-day retention, use the date 30 days ago.
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        thirtyDaysAgo.setUTCHours(0, 0, 0, 0);
        const thirtyDaysAgoUTC = toUTCDate(thirtyDaysAgo);

        // For 90-day retention, use the date 90 days ago.
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);
        ninetyDaysAgo.setUTCHours(0, 0, 0, 0);
        const ninetyDaysAgoUTC = toUTCDate(ninetyDaysAgo);

        const metrics: IUserMetrics = {
            totalUsers,
            activeUsers: {
                daily: dailyActive,
                monthly: monthlyActive
            },
            newUsers: {
                daily: dailyNew,
                monthly: monthlyNew
            },
            retention: {
                sevenDays: await calculateRetentionRate(usersCollection, sevenDaysAgoUTC),
                thirtyDays: await calculateRetentionRate(usersCollection, thirtyDaysAgoUTC),
                ninetyDays: await calculateRetentionRate(usersCollection, ninetyDaysAgoUTC)
            },
            comparison: {
                totalUsers: totalUsers - monthlyNew,
                activeUsers: {
                    daily: previousDayMetrics[0]?.dailyActive || 0,
                    monthly: previousMonthMetrics[0]?.monthlyActive || 0
                },
                newUsers: {
                    daily: yesterdayNew,
                    monthly: prevMonthlyNew
                }
            }
        };

        res.status(200).json({
            success: true,
            message: 'User metrics retrieved successfully.',
            data: metrics,
            metadata: {
                lastUpdated: now
            }
        });

    } catch (error) {
        console.error('Error occurred while retrieving user metrics:', error);
        
        // Determine the type of error.
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isDbError = errorMessage.toLowerCase().includes('database') || 
                          errorMessage.toLowerCase().includes('mongo') ||
                          errorMessage.toLowerCase().includes('db');
        
        res.status(500).json({
            success: false,
            message: 'Error occurred while retrieving user metrics.',
            error: isDbError ? 'DATABASE_ERROR' : 'ANALYTICS_PROCESSING_ERROR',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
};

/**
 * Retrieve transaction metrics including totals and averages.
 */
export const getTransactionMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = getCurrentUTCDate();

        // Determine the start of today in UTC.
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const startOfTodayUTC = toUTCDate(startOfToday);

        // Determine the start of the month in UTC.
        const startOfMonth = new Date();
        startOfMonth.setUTCDate(1);
        startOfMonth.setUTCHours(0, 0, 0, 0);
        const startOfMonthUTC = toUTCDate(startOfMonth);

        // Determine the end of the month in UTC.
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setUTCDate(1);
        endOfMonth.setUTCHours(0, 0, 0, 0);
        const endOfMonthUTC = toUTCDate(endOfMonth);

        // Determine the start of the previous month in UTC.
        const startOfPrevMonth = new Date();
        startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1, 1);
        startOfPrevMonth.setUTCHours(0, 0, 0, 0);
        const startOfPrevMonthUTC = toUTCDate(startOfPrevMonth);

        // Determine the end of the previous month in UTC (which is the start of the current month).
        const endOfPrevMonthUTC = startOfMonthUTC;

        // Retrieve total transactions.
        const total = await transactionsCollection.countDocuments();

        // Retrieve today's transactions using the date field.
        const today = await transactionsCollection.countDocuments({
            date: {
                $gte: startOfTodayUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        // Retrieve this month's transactions (only current month).
        const thisMonth = await transactionsCollection.countDocuments({
            date: {
                $gte: startOfMonthUTC,
                $lt: endOfMonthUTC
            }
        });

        // Retrieve previous month's transactions (complete month).
        const prevMonth = await transactionsCollection.countDocuments({
            date: {
                $gte: startOfPrevMonthUTC,
                $lt: endOfPrevMonthUTC
            }
        });

        // Retrieve sample transactions for verification.
        const sampleThisMonth = await transactionsCollection.find({
            date: {
                $gte: startOfMonthUTC,
                $lt: endOfMonthUTC
            }
        }).limit(3).toArray();

        const samplePrevMonth = await transactionsCollection.find({
            date: {
                $gte: startOfPrevMonthUTC,
                $lt: endOfPrevMonthUTC
            }
        }).limit(3).toArray();

        // Calculate average transactions per user.
        const totalUsers = await usersCollection.countDocuments();
        const averagePerUser = totalUsers > 0 ? total / totalUsers : 0;

        // Retrieve today vs yesterday comparison.
        const prevStartOfToday = new Date(startOfToday);
        prevStartOfToday.setDate(prevStartOfToday.getDate() - 1);
        const prevStartOfTodayUTC = toUTCDate(prevStartOfToday);

        const prevToday = await transactionsCollection.countDocuments({
            date: {
                $gte: prevStartOfTodayUTC,
                $lt: startOfTodayUTC
            }
        });

        const metrics: ITransactionMetrics = {
            total,
            today,
            thisMonth,
            averagePerUser,
            comparison: {
                total: total - thisMonth,
                today: prevToday,
                thisMonth: prevMonth,
                averagePerUser: averagePerUser
            }
        };

        res.status(200).json({
            success: true,
            message: 'Transaction metrics retrieved successfully.',
            data: metrics,
            metadata: {
                lastUpdated: now
            }
        });

    } catch (error) {
        console.error('Error occurred while retrieving transaction metrics:', error);
        
        // Determine the type of error.
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isDbError = errorMessage.toLowerCase().includes('database') || 
                          errorMessage.toLowerCase().includes('mongo') ||
                          errorMessage.toLowerCase().includes('db');
        
        res.status(500).json({
            success: false,
            message: 'Error occurred while retrieving transaction metrics.',
            error: isDbError ? 'DATABASE_ERROR' : 'ANALYTICS_PROCESSING_ERROR',
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
};

/**
 * Retrieve transaction history for chart.
 */
export const getTransactionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type = 'monthly' } = req.query;

        // Validate the requested history type.
        if (type !== 'daily' && type !== 'monthly') {
            res.status(400).json({
                success: false,
                message: 'Invalid history type. It must be "daily" or "monthly".',
                error: 'INVALID_DATE_RANGE'
            });
            return;
        }

        const now = getCurrentUTCDate();
        let startDate: Date;
        let endDate: Date;
        let groupByFormat: string;

        if (type === 'daily') {
            // Last 7 days.
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 6);
            startDate.setUTCHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setUTCHours(23, 59, 59, 999);
            groupByFormat = '%Y-%m-%d';
        } else {
            // Last 12 months including current month.
            startDate = new Date(now);
            startDate.setUTCMonth(startDate.getUTCMonth() - 11, 1);
            startDate.setUTCHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setUTCMonth(endDate.getUTCMonth() + 1, 0);
            endDate.setUTCHours(23, 59, 59, 999);
            groupByFormat = '%Y-%m';
        }

        const startDateUTC = toUTCDate(startDate);
        const endDateUTC = toUTCDate(endDate);

        const pipeline = [
            {
                $match: {
                    date: {
                        $gte: startDateUTC,
                        $lte: endDateUTC
                    }
                }
            },
            {
                $group: {
                    _id: {
                        $dateToString: {
                            format: groupByFormat,
                            date: { $toDate: '$date' }
                        }
                    },
                    count: { $sum: 1 }
                }
            },
            {
                $sort: { '_id': 1 }
            }
        ];

        const history = await transactionsCollection.aggregate(pipeline).toArray();

        // Format dates and fill missing dates with zero.
        const formattedHistory: ITransactionHistory[] = [];
        let currentDate = new Date(startDate);

        while (currentDate <= endDate) {
            const dateStr = currentDate.toISOString().slice(0, type === 'daily' ? 10 : 7);
            const existingData = history.find(h => h._id === dateStr);

            formattedHistory.push({
                date: toUTCDate(currentDate),
                count: existingData ? existingData.count : 0
            });

            if (type === 'daily') {
                currentDate.setDate(currentDate.getDate() + 1);
            } else {
                currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
            }
        }

        res.status(200).json({
            success: true,
            message: 'Transaction history retrieved successfully.',
            data: formattedHistory,
            metadata: {
                lastUpdated: now,
                type
            }
        });

    } catch (error) {
        console.error('Error occurred while retrieving transaction history:', error);
        
        // Determine the type of error.
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isDbError = errorMessage.toLowerCase().includes('database') || 
                          errorMessage.toLowerCase().includes('mongo') ||
                          errorMessage.toLowerCase().includes('db');
        const isDateError = errorMessage.toLowerCase().includes('date') || 
                           errorMessage.toLowerCase().includes('time');
        
        let errorType = 'ANALYTICS_PROCESSING_ERROR';
        if (isDbError) errorType = 'DATABASE_ERROR';
        else if (isDateError) errorType = 'INVALID_DATE_RANGE';
        
        res.status(500).json({
            success: false,
            message: 'Error occurred while retrieving transaction history.',
            error: errorType,
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
};

/**
 * Helper function to calculate retention rate.
 * Calculates the percentage of users created before a given date who have logged in on or after that date.
 * @param collection - The users collection.
 * @param startDate - The reference date in ISO format.
 * @returns The retention rate as a percentage.
 */
const calculateRetentionRate = async (collection: any, startDate: string): Promise<number> => {
    try {
        // Count total users created before or on the reference date.
        const totalUsersInPeriod = await collection.countDocuments({
            createdAt: { $lte: startDate }
        });

        // Count users who were created before the reference date AND have logged in on or after that date.
        // These are the "retained" users.
        const activeUsersInPeriod = await collection.countDocuments({
            createdAt: { $lte: startDate },
            lastLogin: { $gte: startDate }
        });

        // Calculate retention rate as a percentage.
        return totalUsersInPeriod > 0
            ? (activeUsersInPeriod / totalUsersInPeriod) * 100
            : 0;
    } catch (error) {
        console.error('Error occurred while calculating retention rate:', error);
        throw new Error(`Error occurred while calculating retention rate: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
};

/**
 * Retrieve user metrics history for chart.
 */
export const getUserMetricsHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type = 'monthly' } = req.query;

        // Validate the requested history type.
        if (type !== 'daily' && type !== 'monthly') {
            res.status(400).json({
                success: false,
                message: 'Invalid history type. It must be "daily" or "monthly".',
                error: 'INVALID_DATE_RANGE'
            });
            return;
        }

        const now = getCurrentUTCDate();
        let startDate: Date;
        let endDate: Date;
        let groupByFormat: string;

        if (type === 'daily') {
            // Last 7 days.
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 6);
            startDate.setUTCHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setUTCHours(23, 59, 59, 999);
            groupByFormat = '%Y-%m-%d';
        } else {
            // Last 12 months including current month.
            startDate = new Date(now);
            startDate.setUTCMonth(startDate.getUTCMonth() - 11, 1);
            startDate.setUTCHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setUTCMonth(endDate.getUTCMonth() + 1, 0);
            endDate.setUTCHours(23, 59, 59, 999);
            groupByFormat = '%Y-%m';
        }

        const startDateUTC = toUTCDate(startDate);
        const endDateUTC = toUTCDate(endDate);

        // Determine the metrics field to use based on the type.
        let metricField = 'dailyActive';
        if (type === 'monthly') {
            metricField = 'monthlyActive';
        }

        // Retrieve all metrics in the date range.
        const metrics = await userMetricsHistoryCollection.find({
            date: {
                $gte: startDateUTC,
                $lte: endDateUTC
            }
        }).sort({ date: 1 }).toArray();

        // Initialize the array to hold the formatted history data
        const formattedHistory: IUserMetricsHistory[] = [];
        
        if (type === 'daily') {
            // For daily view, generate data for the last 7 days
            const today = new Date();
            today.setUTCHours(0, 0, 0, 0);
            
            for (let i = 6; i >= 0; i--) {
                const date = new Date(today);
                date.setDate(date.getDate() - i);
                const dateStr = date.toISOString().slice(0, 10);
                
                // Find the metric for this date
                const metric = metrics.find(m => {
                    const metricDate = new Date(m.date);
                    return metricDate.toISOString().slice(0, 10) === dateStr;
                });
                
                formattedHistory.push({
                    date: toUTCDate(date),
                    dailyActive: metric ? metric.dailyActive : 0,
                    monthlyActive: metric ? metric.monthlyActive : 0
                });
            }
        } else {
            // For monthly view, generate data for the last 12 months
            const currentMonth = new Date();
            currentMonth.setUTCDate(1); // First day of current month
            currentMonth.setUTCHours(0, 0, 0, 0);
            
            for (let i = 11; i >= 0; i--) {
                const date = new Date(currentMonth);
                date.setMonth(date.getMonth() - i);
                
                // Create a key for this month in format YYYY-MM
                const monthKey = `${date.getUTCFullYear()}-${(date.getUTCMonth() + 1).toString().padStart(2, '0')}`;
                
                // Find metrics for this month
                const monthMetrics = metrics.filter(m => {
                    const metricDate = new Date(m.date);
                    return metricDate.getUTCFullYear() === date.getUTCFullYear() && 
                           metricDate.getUTCMonth() === date.getUTCMonth();
                });
                
                // If we have metrics for this month, use the latest one
                // Otherwise, use 0
                let monthlyValue = 0;
                if (monthMetrics.length > 0) {
                    // Sort by date descending to get the most recent
                    monthMetrics.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                    monthlyValue = monthMetrics[0].monthlyActive;
                }
                
                formattedHistory.push({
                    date: toUTCDate(date),
                    dailyActive: 0, // Not relevant for monthly view
                    monthlyActive: monthlyValue
                });
            }
        }

        res.status(200).json({
            success: true,
            message: 'User metrics history retrieved successfully.',
            data: formattedHistory,
            metadata: {
                lastUpdated: now,
                type
            }
        });

    } catch (error) {
        console.error('Error occurred while retrieving user metrics history:', error);
        
        // Determine the type of error.
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isDbError = errorMessage.toLowerCase().includes('database') || 
                          errorMessage.toLowerCase().includes('mongo') ||
                          errorMessage.toLowerCase().includes('db');
        const isDateError = errorMessage.toLowerCase().includes('date') || 
                           errorMessage.toLowerCase().includes('time');
        
        let errorType = 'ANALYTICS_PROCESSING_ERROR';
        if (isDbError) errorType = 'DATABASE_ERROR';
        else if (isDateError) errorType = 'INVALID_DATE_RANGE';
        
        res.status(500).json({
            success: false,
            message: 'Error occurred while retrieving user metrics history.',
            error: errorType,
            details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
        });
    }
};
