// Define ISODateString type for backend
export type ISODateString = string;

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

export interface ITransactionHistory {
    date: Date;
    count: number;
}

export interface IAnalytics {
    users: IUserMetrics;
    transactions: ITransactionMetrics;
    lastUpdated: ISODateString;
}
