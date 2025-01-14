import { ObjectId } from 'mongodb';

export interface ICategory {
    _id?: ObjectId;
    user_id: ObjectId;
    name: string;
    color: string;
    createdAt: string;
    updatedAt: string;
}