import { ObjectId } from 'mongodb';

export interface IUser {
    _id?: ObjectId;
    username: string;
    email: string;
    password?: string;
    name: string;
    surname: string;
    googleId?: string;
    resetToken?: string;
    resetTokenExpiry?: string;
    profileImage?: string;
    profileImagePublicId?: string;
    accountsOrder: string[];
    lastLogin: string;
    createdAt: string;
    updatedAt: string;
    preferences: UserPreferences;
}

export interface UserPreferences {
    language: Language;
    currency: Currency;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    theme: Theme;
    viewMode: ViewMode;
}

export type Language = 'enUS' | 'esES';
export type Currency = 'USD' | 'EUR' | 'GBP';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type TimeFormat = '12h' | '24h';
export type Theme = 'light' | 'dark';
export type ViewMode = 'yearToday' | 'fullYear';