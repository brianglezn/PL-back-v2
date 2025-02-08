import { ObjectId } from 'mongodb';

export interface ITransaction {
    _id?: ObjectId;
    user_id: ObjectId;
    date: string;
    description: string;
    amount: number;
    category: ObjectId;
    createdAt: string;
    updatedAt: string;
    isRecurrent: boolean;
    recurrenceType?: RecurrenceType;
    recurrenceEndDate?: string;
    recurrenceId?: string;
    isOriginalRecurrence?: boolean;
}   

export type RecurrenceType = 'weekly' | 'monthly' | 'yearly' | null;