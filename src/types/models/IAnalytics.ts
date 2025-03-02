// Define the ISODateString type for backend usage
export type ISODateString = string;

/**
 * Interface representing user metrics history records stored in the database
 */
export interface IUserMetricsHistory {
    date: ISODateString;
    dailyActive: number;
    weeklyActive: number;
    monthlyActive: number;
    isManualSave?: boolean;
}

/**
 * Interface representing user metrics returned by the API
 */
export interface IUserMetrics {
    totalUsers: number;
    activeUsers: {
        daily: number;
        weekly: number;
        monthly: number;
    };
    newUsers: {
        daily: number;
        weekly: number;
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
            weekly: number;
            monthly: number;
        };
        newUsers: {
            daily: number;
            weekly: number;
            monthly: number;
        };
    };
}

/**
 * Interface representing transaction metrics returned by the API
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
 * Interface representing transaction history data points
 */
export interface ITransactionHistory {
    date: ISODateString;
    count: number;
}

/**
 * Interface representing combined analytics data
 */
export interface IAnalytics {
    users: IUserMetrics;
    transactions: ITransactionMetrics;
    lastUpdated: ISODateString;
}
