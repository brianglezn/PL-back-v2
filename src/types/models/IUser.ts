import { ObjectId } from 'mongodb';
import { ISODateString } from '../../utils/dateUtils';

/**
 * Interface representing a user in the system.
 * All date fields use ISO UTC format (YYYY-MM-DDTHH:mm:ss.sssZ).
 */
export interface IUser {
    _id?: ObjectId;
    username: string;
    email: string;
    password?: string;
    name: string;
    surname: string;
    googleId?: string;
    resetToken?: string;
    resetTokenExpiry?: ISODateString;
    profileImage?: string;
    profileImagePublicId?: string;
    accountsOrder: string[];
    lastLogin: ISODateString;
    createdAt: ISODateString;
    updatedAt: ISODateString;
    preferences: UserPreferences;
    onboarding: UserOnboarding;
    role: UserRole;
}

/**
 * User preferences for application settings.
 */
export interface UserPreferences {
    language: Language;
    currency: Currency;
    dateFormat: DateFormat;
    timeFormat: TimeFormat;
    theme: Theme;
    viewMode: ViewMode;
}

export type Language = 'enUS' | 'esES';
export type Currency = 'USD' | 'EUR' | 'GBP' | 'MXN' | 'ARS' | 'CLP' | 'COP' | 'PEN' | 'UYU' | 'PYG' | 'BOB' | 'VES';
export type DateFormat = 'DD/MM/YYYY' | 'MM/DD/YYYY';
export type TimeFormat = '12h' | '24h';
export type Theme = 'light' | 'dark';
export type ViewMode = 'yearToday' | 'fullYear';

/**
 * User onboarding status and progress.
 */
export interface UserOnboarding {
    completed: boolean;
    sections: OnboardingSection[];
}

export interface OnboardingSection {
    section: string;
    shown: boolean;
}

export type UserRole = 'user' | 'admin';
