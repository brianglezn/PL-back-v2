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
    jan: string;
    feb: string;
    mar: string;
    apr: string;
    may: string;
    jun: string;
    jul: string;
    aug: string;
    sep: string;
    oct: string;
    nov: string;
    dec: string;
}

export interface IAccountConfiguration {
    backgroundColor: string;
    color: string;
    isActive: boolean;
}

export interface YearRecord {
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