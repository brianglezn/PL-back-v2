import { Request, Response } from 'express';
import { client } from '../config/database';
import { toUTCDate, getCurrentUTCDate } from '../utils/dateUtils';

// Interfaces
import { IUserMetrics, ITransactionMetrics, ITransactionHistory } from '../types/models/IAnalytics';

interface IUserMetricsHistory {
    date: Date;
    dailyActive: number;
    weeklyActive: number;
    monthlyActive: number;
}

class AnalyticsController {
    /**
     * Save current user metrics to history
     * This should be called by a daily cron job at the end of each day
     */
    async saveUserMetricsHistory() {
        try {
            const db = client.db(process.env.DB_NAME);
            const usersCollection = db.collection('users');
            const userMetricsHistoryCollection = db.collection('userMetricsHistory');

            const now = getCurrentUTCDate();
            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);
            const startOfTodayUTC = toUTCDate(startOfToday);

            // Get start of week (Monday) in UTC
            const startOfWeek = new Date();
            startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay() + (startOfWeek.getUTCDay() === 0 ? -6 : 1));
            startOfWeek.setUTCHours(0, 0, 0, 0);
            const startOfWeekUTC = toUTCDate(startOfWeek);

            // Get start of month in UTC
            const startOfMonth = new Date();
            startOfMonth.setUTCDate(1);
            startOfMonth.setUTCHours(0, 0, 0, 0);
            const startOfMonthUTC = toUTCDate(startOfMonth);

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

            // Save metrics to history
            await userMetricsHistoryCollection.insertOne({
                date: startOfTodayUTC,
                dailyActive,
                weeklyActive,
                monthlyActive
            });

            console.log('User metrics history saved successfully for:', startOfTodayUTC);
        } catch (error) {
            console.error('Error saving user metrics history:', error);
        }
    }

    /**
     * Get user metrics including active users, new users and retention
     */
    async getUserMetrics(req: Request, res: Response) {
        try {
            const db = client.db(process.env.DB_NAME);
            const usersCollection = db.collection('users');
            const userMetricsHistoryCollection = db.collection('userMetricsHistory');

            const now = getCurrentUTCDate();

            // Get start of today in UTC
            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);
            const startOfTodayUTC = toUTCDate(startOfToday);

            // Get start of current week (Monday) in UTC
            const startOfWeek = new Date();
            startOfWeek.setUTCDate(startOfWeek.getUTCDate() - startOfWeek.getUTCDay() + (startOfWeek.getUTCDay() === 0 ? -6 : 1));
            startOfWeek.setUTCHours(0, 0, 0, 0);
            const startOfWeekUTC = toUTCDate(startOfWeek);

            // Get start of month in UTC
            const startOfMonth = new Date();
            startOfMonth.setUTCDate(1);
            startOfMonth.setUTCHours(0, 0, 0, 0);
            const startOfMonthUTC = toUTCDate(startOfMonth);

            // Get previous day metrics from history
            const yesterday = new Date(startOfToday);
            yesterday.setDate(yesterday.getDate() - 1);
            const yesterdayUTC = toUTCDate(yesterday);

            const previousDayMetrics = await userMetricsHistoryCollection.findOne({
                date: yesterdayUTC
            }) as IUserMetricsHistory | null;

            // Get previous week metrics from history
            const previousWeek = new Date(startOfWeek);
            previousWeek.setDate(previousWeek.getDate() - 7);
            const previousWeekUTC = toUTCDate(previousWeek);

            const previousWeekMetrics = await userMetricsHistoryCollection.findOne({
                date: previousWeekUTC
            }) as IUserMetricsHistory | null;

            // Get previous month metrics from history
            const previousMonth = new Date(startOfMonth);
            previousMonth.setMonth(previousMonth.getMonth() - 1);
            const previousMonthUTC = toUTCDate(previousMonth);

            const previousMonthMetrics = await userMetricsHistoryCollection.findOne({
                date: previousMonthUTC
            }) as IUserMetricsHistory | null;

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
                    $gte: yesterdayUTC,
                    $lt: startOfTodayUTC
                }
            });

            const prevWeeklyNew = await usersCollection.countDocuments({
                createdAt: {
                    $gte: previousWeekUTC,
                    $lt: startOfWeekUTC
                }
            });

            const prevMonthlyNew = await usersCollection.countDocuments({
                createdAt: {
                    $gte: previousMonthUTC,
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
                    sevenDays: await this.calculateRetentionRate(usersCollection, startOfWeekUTC),
                    thirtyDays: await this.calculateRetentionRate(usersCollection, startOfMonthUTC),
                    ninetyDays: await this.calculateRetentionRate(usersCollection, toUTCDate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)))
                },
                comparison: {
                    totalUsers: totalUsers - monthlyNew,
                    activeUsers: {
                        daily: previousDayMetrics?.dailyActive || 0,
                        weekly: previousWeekMetrics?.weeklyActive || 0,
                        monthly: previousMonthMetrics?.monthlyActive || 0
                    },
                    newUsers: {
                        daily: yesterdayNew,
                        weekly: prevWeeklyNew,
                        monthly: prevMonthlyNew
                    }
                }
            };

            return res.status(200).json({
                success: true,
                message: 'User metrics retrieved successfully',
                data: metrics
            });

        } catch (error) {
            console.error('Error getting user metrics:', error);
            return res.status(500).json({
                success: false,
                message: 'Error retrieving user metrics',
                error: 'SERVER_ERROR'
            });
        }
    }

    /**
     * Get transaction metrics including totals and averages
     */
    async getTransactionMetrics(req: Request, res: Response) {
        try {
            const db = client.db(process.env.DB_NAME);
            const transactionsCollection = db.collection('transactions');
            const usersCollection = db.collection('users');

            const now = getCurrentUTCDate();

            // Get start of today in UTC
            const startOfToday = new Date();
            startOfToday.setUTCHours(0, 0, 0, 0);
            const startOfTodayUTC = toUTCDate(startOfToday);

            // Get start of month in UTC
            const startOfMonth = new Date();
            startOfMonth.setUTCDate(1);
            startOfMonth.setUTCHours(0, 0, 0, 0);
            const startOfMonthUTC = toUTCDate(startOfMonth);

            // Get end of month in UTC
            const endOfMonth = new Date();
            endOfMonth.setMonth(endOfMonth.getMonth() + 1);
            endOfMonth.setUTCDate(1);
            endOfMonth.setUTCHours(0, 0, 0, 0);
            const endOfMonthUTC = toUTCDate(endOfMonth);

            // Get start of previous month in UTC
            const startOfPrevMonth = new Date();
            startOfPrevMonth.setMonth(startOfPrevMonth.getMonth() - 1, 1);
            startOfPrevMonth.setUTCHours(0, 0, 0, 0);
            const startOfPrevMonthUTC = toUTCDate(startOfPrevMonth);

            // Get end of previous month in UTC (which is start of current month)
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

            // Obtener ejemplos de transacciones para verificar
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

            return res.status(200).json({
                success: true,
                message: 'Transaction metrics retrieved successfully',
                data: metrics
            });

        } catch (error) {
            console.error('Error getting transaction metrics:', error);
            return res.status(500).json({
                success: false,
                message: 'Error retrieving transaction metrics',
                error: 'SERVER_ERROR'
            });
        }
    }

    /**
     * Get transaction history for chart
     */
    async getTransactionHistory(req: Request, res: Response) {
        try {
            const { type = 'monthly' } = req.query;
            const db = client.db(process.env.DB_NAME);
            const transactionsCollection = db.collection('transactions');

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
                    date: new Date(currentDate),
                    count: existingData ? existingData.count : 0
                });

                if (type === 'daily') {
                    currentDate.setDate(currentDate.getDate() + 1);
                } else {
                    currentDate.setUTCMonth(currentDate.getUTCMonth() + 1);
                }
            }

            return res.status(200).json({
                success: true,
                message: 'Transaction history retrieved successfully',
                data: formattedHistory
            });

        } catch (error) {
            console.error('Error getting transaction history:', error);
            return res.status(500).json({
                success: false,
                message: 'Error retrieving transaction history',
                error: 'SERVER_ERROR'
            });
        }
    }

    /**
     * Helper function to calculate retention rate
     */
    private async calculateRetentionRate(collection: any, startDate: string): Promise<number> {
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
    }
}

export default new AnalyticsController();
