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
    lastLogin: string;
    createdAt: string;
    updatedAt: string;
}

export type Language = 'enUS' | 'esES';
export type Currency = 'USD' | 'EUR' | 'GBP';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type TimeFormat = '12h' | '24h';