import { ObjectId } from 'mongodb';
import { ISODateString } from '../../utils/dateUtils';

/**
 * Interface representing a transaction in the system.
 * All date fields use ISO UTC format (YYYY-MM-DDTHH:mm:ss.sssZ).
 */
export interface ITransaction {
    _id?: ObjectId;
    user_id: ObjectId;
    date: ISODateString;
    description: string;
    amount: string;
    category: ObjectId;
    createdAt: ISODateString;
    updatedAt: ISODateString;
    isRecurrent: boolean;
    recurrenceType?: RecurrenceType;
    recurrenceEndDate?: ISODateString;
    recurrenceId?: string;
    isOriginalRecurrence?: boolean;
}

export type RecurrenceType = 'weekly' | 'monthly' | 'yearly' | null;