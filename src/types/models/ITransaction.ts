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
}   