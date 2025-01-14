import { ObjectId } from 'mongodb';

export interface INote {
    _id?: ObjectId;
    user_id: ObjectId;
    title: string;
    content: string;
    createdAt: string;
    updatedAt: string;
}