// Define the ISODateString type for backend usage
export type ISODateString = string;

/**
 * Interface representing user metrics history records stored in the database.
 * This interface captures the date of the record, the number of daily active users,
 * the number of monthly active users, and whether the save was manual.
 */
export interface IUserMetricsHistory {
    date: ISODateString;
    dailyActive: number;
    monthlyActive: number;
    isManualSave?: boolean;
}

/**
 * Interface representing user metrics returned by the API.
 * This interface includes total users, active users, new users, retention metrics,
 * and comparison metrics for better insights.
 */
export interface IUserMetrics {
    totalUsers: number;
    activeUsers: {
        daily: number;
        monthly: number;
    };
    newUsers: {
        daily: number;
        monthly: number;
    };
    retention: {
        sevenDays: number;
        thirtyDays: number;
        ninetyDays: number;
    };
    comparison: {
        totalUsers: number;
        activeUsers: {
            daily: number;
            monthly: number;
        };
        newUsers: {
            daily: number;
            monthly: number;
        };
    };
}

/**
 * Interface representing transaction metrics returned by the API.
 * This interface includes total transactions, today's transactions, this month's transactions,
 * average transactions per user, and comparison metrics for analysis.
 */
export interface ITransactionMetrics {
    total: number;
    today: number;
    thisMonth: number;
    averagePerUser: number;
    comparison: {
        total: number;
        today: number;
        thisMonth: number;
        averagePerUser: number;
    };
}

/**
 * Interface representing transaction history data points.
 * This interface captures the date of the transaction and the count of transactions on that date.
 */
export interface ITransactionHistory {
    date: ISODateString;
    count: number;
}

/**
 * Interface representing combined analytics data.
 * This interface consolidates user metrics and transaction metrics along with the last updated timestamp.
 */
export interface IAnalytics {
    users: IUserMetrics;
    transactions: ITransactionMetrics;
    lastUpdated: ISODateString;
}
