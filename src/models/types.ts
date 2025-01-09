import { ObjectId } from 'mongodb';

export interface IUser {
    _id?: ObjectId;
    username: string;
    email: string;
    password: string;
    name: string;
    surname: string;
    resetToken?: string;
    resetTokenExpiry?: string;
    language: Language;
    profileImage?: string;
    profileImagePublicId?: string;
    accountsOrder: string[];
    currency: Currency;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    createdAt: string;
    updatedAt: string;
}

export type Language = 'enUS' | 'esES';
export type Currency = 'USD' | 'EUR' | 'GBP';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type TimeFormat = '12h' | '24h';

export interface ICategory {
    _id?: ObjectId;
    user_id: ObjectId;
    name: string;
    color: string;
    createdAt: string;
    updatedAt: string;
}

export interface IAccount {
    _id?: ObjectId;
    user_id: ObjectId;
    accountName: string;
    records: IAccountRecord[];
    configuration: IAccountConfiguration;
    createdAt: Date;
    updatedAt: Date;
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

export interface INote {
    _id?: ObjectId;
    user_id: ObjectId;
    title: string;
    content: string;
    createdAt: Date;
    updatedAt: Date;
}

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