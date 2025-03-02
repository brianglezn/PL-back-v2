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
 * Save current user metrics to history
 * This function should be called by a daily cron job at the end of each day or manually
 * @param isManualSave - Indicates if this is a manual save (true) or automated cron save (false)
 */
export const saveUserMetricsHistory = async (isManualSave: boolean = false): Promise<boolean> => {
    try {
        console.log(`🔄 Initiating user metrics save... (${isManualSave ? 'manual' : 'automated'} save)`);

        const now = getCurrentUTCDate();
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const startOfTodayUTC = toUTCDate(startOfToday);

        // Determine the start of the week (Monday) in UTC
        const startOfWeek = new Date();
        startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay() + (startOfWeek.getUTCDay() === 0 ? -6 : 1));
        startOfWeek.setUTCHours(0, 0, 0, 0);
        const startOfWeekUTC = toUTCDate(startOfWeek);

        // Determine the start of the month in UTC
        const startOfMonth = new Date();
        startOfMonth.setUTCDate(1);
        startOfMonth.setUTCHours(0, 0, 0, 0);
        const startOfMonthUTC = toUTCDate(startOfMonth);

        console.log('📅 Periods calculated:', {
            today: startOfTodayUTC,
            week: startOfWeekUTC,
            month: startOfMonthUTC
        });

        // Calculate active users for the day
        const dailyActive = await usersCollection.countDocuments({
            lastLogin: {
                $gte: startOfTodayUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        const weeklyActive = await usersCollection.countDocuments({
            lastLogin: {
                $gte: startOfWeekUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        const monthlyActive = await usersCollection.countDocuments({
            lastLogin: {
                $gte: startOfMonthUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        console.log('👥 Active users calculated:', {
            daily: dailyActive,
            weekly: weeklyActive,
            monthly: monthlyActive
        });

        // Create the metrics object
        const metricsData: IUserMetricsHistory = {
            // For manual saves, use the exact date and time
            // For automated saves (cron), use the start of the day
            date: isManualSave ? now : startOfTodayUTC,
            dailyActive,
            weeklyActive,
            monthlyActive
        };

        // If it's a manual save, add the flag
        if (isManualSave) {
            metricsData.isManualSave = true;
        }

        // Save metrics to history
        await userMetricsHistoryCollection.insertOne(metricsData);

        console.log('✅ User metrics successfully saved for:', metricsData.date);
        return true;
    } catch (error) {
        console.error('❌ Error occurred while saving user metrics:', error);
        throw error; // Rethrow the error to be captured by the cron job
    }
};

/**
 * Get user metrics including active users, new users, and retention
 */
export const getUserMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = getCurrentUTCDate();

        // Get the start of today in UTC
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const startOfTodayUTC = toUTCDate(startOfToday);

        // Get the end of today in UTC
        const endOfToday = new Date(startOfToday);
        endOfToday.setUTCHours(23, 59, 59, 999);
        const endOfTodayUTC = toUTCDate(endOfToday);

        // Get the start of the current week (Monday) in UTC
        const startOfWeek = new Date();
        startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay() + (startOfWeek.getUTCDay() === 0 ? -6 : 1));
        startOfWeek.setUTCHours(0, 0, 0, 0);
        const startOfWeekUTC = toUTCDate(startOfWeek);

        // Get the start of the month in UTC
        const startOfMonth = new Date();
        startOfMonth.setUTCDate(1);
        startOfMonth.setUTCHours(0, 0, 0, 0);
        const startOfMonthUTC = toUTCDate(startOfMonth);

        // Get previous day metrics from history - find the most recent metric from the previous day
        const yesterday = new Date(startOfToday);
        yesterday.setDate(yesterday.getDate() - 1);
        yesterday.setUTCHours(0, 0, 0, 0);
        const yesterdayStartUTC = toUTCDate(yesterday);

        const yesterdayEnd = new Date(yesterday);
        yesterdayEnd.setUTCHours(23, 59, 59, 999);
        const yesterdayEndUTC = toUTCDate(yesterdayEnd);

        // Find the most recent metric from the previous day
        const previousDayMetrics = await userMetricsHistoryCollection
            .find({
                date: {
                    $gte: yesterdayStartUTC,
                    $lte: yesterdayEndUTC
                }
            })
            .sort({ date: -1 }) // Sort by date descending to get the most recent
            .limit(1)
            .toArray();

        // Get previous week metrics from history
        const previousWeek = new Date(startOfWeek);
        previousWeek.setDate(previousWeek.getDate() - 7);
        previousWeek.setUTCHours(0, 0, 0, 0);
        const previousWeekStartUTC = toUTCDate(previousWeek);

        const previousWeekEnd = new Date(previousWeek);
        previousWeekEnd.setUTCHours(23, 59, 59, 999);
        const previousWeekEndUTC = toUTCDate(previousWeekEnd);

        // Find the most recent metric from the previous week
        const previousWeekMetrics = await userMetricsHistoryCollection
            .find({
                date: {
                    $gte: previousWeekStartUTC,
                    $lte: previousWeekEndUTC
                }
            })
            .sort({ date: -1 }) // Sort by date descending to get the most recent
            .limit(1)
            .toArray();

        // Get previous month metrics from history
        const previousMonth = new Date(startOfMonth);
        previousMonth.setMonth(previousMonth.getMonth() - 1);
        previousMonth.setUTCHours(0, 0, 0, 0);
        const previousMonthStartUTC = toUTCDate(previousMonth);

        const previousMonthEnd = new Date(previousMonth);
        previousMonthEnd.setMonth(previousMonthEnd.getMonth() + 1);
        previousMonthEnd.setDate(0); // Last day of the previous month
        previousMonthEnd.setUTCHours(23, 59, 59, 999);
        const previousMonthEndUTC = toUTCDate(previousMonthEnd);

        // Find the most recent metric from the previous month
        const previousMonthMetrics = await userMetricsHistoryCollection
            .find({
                date: {
                    $gte: previousMonthStartUTC,
                    $lte: previousMonthEndUTC
                }
            })
            .sort({ date: -1 }) // Sort by date descending to get the most recent
            .limit(1)
            .toArray();

        // Get current active users
        const dailyActive = await usersCollection.countDocuments({
            lastLogin: {
                $gte: startOfTodayUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        const weeklyActive = await usersCollection.countDocuments({
            lastLogin: {
                $gte: startOfWeekUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        const monthlyActive = await usersCollection.countDocuments({
            lastLogin: {
                $gte: startOfMonthUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        // Get total users and new users metrics
        const totalUsers = await usersCollection.countDocuments();

        const dailyNew = await usersCollection.countDocuments({
            createdAt: {
                $gte: startOfTodayUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        const weeklyNew = await usersCollection.countDocuments({
            createdAt: {
                $gte: startOfWeekUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        const monthlyNew = await usersCollection.countDocuments({
            createdAt: {
                $gte: startOfMonthUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        // Get comparison data for new users
        const yesterdayNew = await usersCollection.countDocuments({
            createdAt: {
                $gte: yesterdayStartUTC,
                $lt: startOfTodayUTC
            }
        });

        const prevWeeklyNew = await usersCollection.countDocuments({
            createdAt: {
                $gte: previousWeekStartUTC,
                $lt: startOfWeekUTC
            }
        });

        const prevMonthlyNew = await usersCollection.countDocuments({
            createdAt: {
                $gte: previousMonthStartUTC,
                $lt: startOfMonthUTC
            }
        });

        const metrics: IUserMetrics = {
            totalUsers,
            activeUsers: {
                daily: dailyActive,
                weekly: weeklyActive,
                monthly: monthlyActive
            },
            newUsers: {
                daily: dailyNew,
                weekly: weeklyNew,
                monthly: monthlyNew
            },
            retention: {
                sevenDays: await calculateRetentionRate(usersCollection, startOfWeekUTC),
                thirtyDays: await calculateRetentionRate(usersCollection, startOfMonthUTC),
                ninetyDays: await calculateRetentionRate(usersCollection, toUTCDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)))
            },
            comparison: {
                totalUsers: totalUsers - monthlyNew,
                activeUsers: {
                    daily: previousDayMetrics[0]?.dailyActive || 0,
                    weekly: previousWeekMetrics[0]?.weeklyActive || 0,
                    monthly: previousMonthMetrics[0]?.monthlyActive || 0
                },
                newUsers: {
                    daily: yesterdayNew,
                    weekly: prevWeeklyNew,
                    monthly: prevMonthlyNew
                }
            }
        };

        res.status(200).json({
            success: true,
            message: 'User metrics successfully retrieved',
            data: metrics
        });

    } catch (error) {
        console.error('Error occurred while retrieving user metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while retrieving user metrics',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get transaction metrics including totals and averages
 */
export const getTransactionMetrics = async (req: Request, res: Response): Promise<void> => {
    try {
        const now = getCurrentUTCDate();

        // Get the start of today in UTC
        const startOfToday = new Date();
        startOfToday.setUTCHours(0, 0, 0, 0);
        const startOfTodayUTC = toUTCDate(startOfToday);

        // Get the start of the month in UTC
        const startOfMonth = new Date();
        startOfMonth.setUTCDate(1);
        startOfMonth.setUTCHours(0, 0, 0, 0);
        const startOfMonthUTC = toUTCDate(startOfMonth);

        // Get the end of the month in UTC
        const endOfMonth = new Date();
        endOfMonth.setMonth(endOfMonth.getMonth() + 1);
        endOfMonth.setUTCDate(1);
        endOfMonth.setUTCHours(0, 0, 0, 0);
        const endOfMonthUTC = toUTCDate(endOfMonth);

        // Get the start of the previous month in UTC
        const startOfPrevMonth = new Date();
        startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1, 1);
        startOfPrevMonth.setUTCHours(0, 0, 0, 0);
        const startOfPrevMonthUTC = toUTCDate(startOfPrevMonth);

        // Get the end of the previous month in UTC (which is the start of the current month)
        const endOfPrevMonthUTC = startOfMonthUTC;

        // Get total transactions
        const total = await transactionsCollection.countDocuments();

        // Get today's transactions using the date field
        const today = await transactionsCollection.countDocuments({
            date: {
                $gte: startOfTodayUTC,
                $lt: toUTCDate(new Date(startOfToday.getTime() + 24 * 60 * 60 * 1000))
            }
        });

        // Get this month's transactions (only current month)
        const thisMonth = await transactionsCollection.countDocuments({
            date: {
                $gte: startOfMonthUTC,
                $lt: endOfMonthUTC
            }
        });

        // Get previous month's transactions (complete month)
        const prevMonth = await transactionsCollection.countDocuments({
            date: {
                $gte: startOfPrevMonthUTC,
                $lt: endOfPrevMonthUTC
            }
        });

        // Get sample transactions for verification
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

        // Calculate average transactions per user
        const totalUsers = await usersCollection.countDocuments();
        const averagePerUser = totalUsers > 0 ? total / totalUsers : 0;

        // Get today vs yesterday comparison
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
            message: 'Transaction metrics successfully retrieved',
            data: metrics
        });

    } catch (error) {
        console.error('Error occurred while retrieving transaction metrics:', error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while retrieving transaction metrics',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Get transaction history for chart
 */
export const getTransactionHistory = async (req: Request, res: Response): Promise<void> => {
    try {
        const { type = 'monthly' } = req.query;

        const now = getCurrentUTCDate();
        let startDate: Date;
        let endDate: Date;
        let groupByFormat: string;

        if (type === 'daily') {
            // Last 7 days
            startDate = new Date(now);
            startDate.setDate(startDate.getDate() - 6);
            startDate.setUTCHours(0, 0, 0, 0);
            endDate = new Date(now);
            endDate.setUTCHours(23, 59, 59, 999);
            groupByFormat = '%Y-%m-%d';
        } else {
            // Last 12 months including current month
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

        // Format dates and fill missing dates with zero
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
            message: 'Transaction history successfully retrieved',
            data: formattedHistory
        });

    } catch (error) {
        console.error('Error occurred while retrieving transaction history:', error);
        res.status(500).json({
            success: false,
            message: 'Error occurred while retrieving transaction history',
            error: 'SERVER_ERROR'
        });
    }
};

/**
 * Helper function to calculate retention rate
 */
const calculateRetentionRate = async (collection: any, startDate: string): Promise<number> => {
    const totalUsersInPeriod = await collection.countDocuments({
        createdAt: { $lte: startDate }
    });

    const activeUsersInPeriod = await collection.countDocuments({
        createdAt: { $lte: startDate },
        lastLogin: { $gte: startDate }
    });

    return totalUsersInPeriod > 0
        ? (activeUsersInPeriod / totalUsersInPeriod) * 100
        : 0;
};
