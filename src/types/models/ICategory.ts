import { ObjectId } from 'mongodb';
import { ISODateString } from '../../utils/dateUtils';

/**
 * Interface representing a category in the system.
 * All date fields use ISO UTC format (YYYY-MM-DDTHH:mm:ss.sssZ).
 */
export interface ICategory {
    _id?: ObjectId;
    user_id: ObjectId;
    name: string;
    color: string;
    createdAt: ISODateString;
    updatedAt: ISODateString;
}