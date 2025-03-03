import { Request, Response } from 'express';
import { client } from '../config/database';
import { toUTCDate, getCurrentUTCDate, createUTCMonthRange } from '../utils/dateUtils';

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
        const currentYear = new Date().getUTCFullYear();
        const currentMonth = new Date().getUTCMonth() + 1;

        // Get UTC date range for the current month
        const { start: startOfMonth, end: endOfMonth } = createUTCMonthRange(currentYear, currentMonth);

        // Calculate metrics
        const [dailyActiveCount, monthlyActiveCount, totalUsersCount] = await Promise.all([
            usersCollection.countDocuments({
                lastLogin: { $gte: startOfMonth }
            }),
            usersCollection.countDocuments({
                lastLogin: { $gte: startOfMonth, $lte: endOfMonth }
            }),
            usersCollection.countDocuments({})
        ]);

        // Calculate retention rate
        const retentionRate = await calculateRetentionRate(usersCollection, startOfMonth);

        // Create metrics record
        const metricsRecord: IUserMetricsHistory = {
            date: now,
            dailyActive: dailyActiveCount,
            monthlyActive: monthlyActiveCount,
            isManualSave
        };

        // Save to history collection
        const result = await userMetricsHistoryCollection.insertOne(metricsRecord);

        if (!result.acknowledged) {
            throw new Error('Failed to save metrics to history');
        }

        console.log('✅ User metrics saved successfully');
        return true;
    } catch (error) {
        console.error('❌ Error saving user metrics history:', error);
        return false;
    }
};

/**
 * Calculate user retention rate based on returning users
 */
const calculateRetentionRate = async (collection: any, startDate: string): Promise<number> => {
    try {
        const totalUsers = await collection.countDocuments({
            createdAt: { $lt: startDate }
        });

        if (totalUsers === 0) return 0;

        const returningUsers = await collection.countDocuments({
            createdAt: { $lt: startDate },
            lastLogin: { $gte: startDate }
        });

        return (returningUsers / totalUsers) * 100;
    } catch (error) {
        console.error('Error calculating retention rate:', error);
        return 0;
    }
};

/**
 * Retrieve user metrics including active users, new users, and retention.
 */
export const getUserMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = getCurrentUTCDate();
        const currentYear = new Date().getUTCFullYear();
        const currentMonth = new Date().getUTCMonth() + 1;

        // Get UTC date range for the current month
        const { start: startOfMonth, end: endOfMonth } = createUTCMonthRange(currentYear, currentMonth);

        // Get previous month's range
        const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
        const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
        const { start: startOfPrevMonth, end: endOfPrevMonth } = createUTCMonthRange(prevYear, prevMonth);

        // Calculate metrics
        const [
            dailyActiveUsers,
            monthlyActiveUsers,
            totalUsers,
            newUsersToday,
            newUsersThisMonth
        ] = await Promise.all([
            // Daily active users (users who logged in today)
            usersCollection.countDocuments({
                lastLogin: { $gte: startOfMonth }
            }),
            // Monthly active users
            usersCollection.countDocuments({
                lastLogin: { $gte: startOfMonth, $lte: endOfMonth }
            }),
            // Total users
            usersCollection.countDocuments({}),
            // New users today
            usersCollection.countDocuments({
                createdAt: { $gte: startOfMonth }
            }),
            // New users this month
            usersCollection.countDocuments({
                createdAt: { $gte: startOfMonth, $lte: endOfMonth }
            })
        ]);

        // Calculate retention rate
        const retentionRate = await calculateRetentionRate(usersCollection, startOfMonth);

        // Calculate growth rates
        const prevMonthUsers = await usersCollection.countDocuments({
            createdAt: { $lte: endOfPrevMonth }
        });

        const userGrowthRate = prevMonthUsers > 0
            ? ((totalUsers - prevMonthUsers) / prevMonthUsers) * 100
            : 0;

        const metrics: IUserMetrics = {
            totalUsers,
            activeUsers: {
                daily: dailyActiveUsers,
                monthly: monthlyActiveUsers
            },
            newUsers: {
                daily: newUsersToday,
                monthly: newUsersThisMonth
            },
            retention: {
                sevenDays: retentionRate,
                thirtyDays: retentionRate, // Podríamos calcular diferentes períodos en el futuro
                ninetyDays: retentionRate
            },
            comparison: {
                totalUsers: prevMonthUsers,
                activeUsers: {
                    daily: 0, // Estos valores podrían calcularse si es necesario
                    monthly: 0
                },
                newUsers: {
                    daily: 0,
                    monthly: 0
                }
            }
        };

        res.status(200).json({
            success: true,
            data: metrics,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error retrieving user metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
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
