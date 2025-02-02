import { ObjectId } from 'mongodb';

export interface IAccount {
    _id?: ObjectId;
    user_id: ObjectId;
    accountName: string;
    records: Record<string, IYearRecord>;
    configuration: IAccountConfiguration;
    createdAt: string;
    updatedAt: string;
}

export interface IYearRecord {
    jan: number;
    feb: number;
    mar: number;
    apr: number;
    may: number;
    jun: number;
    jul: number;
    aug: number;
    sep: number;
    oct: number;
    nov: number;
    dec: number;
}

export interface IAccountConfiguration {
    backgroundColor: string;
    color: string;
    isActive: boolean;
}