import { ObjectId } from 'mongodb';

export interface IAccount {
    _id?: ObjectId;
    user_id: ObjectId;
    accountName: string;
    records: IAccountRecord[];
    configuration: IAccountConfiguration;
    createdAt: string;
    updatedAt: string;
}

export interface IAccountRecord {
    year: number;
    month: string;
    value: number;
}

export interface IAccountConfiguration {
    backgroundColor: string;
    color: string;
    isActive: boolean;
}