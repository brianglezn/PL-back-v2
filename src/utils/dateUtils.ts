// Frontend:
// 1. Works in local time (LocalTime)
// 2. Sends dates to the backend in LocalTime formatted as ISO
// 3. Receives dates from the backend in UTC ISO and converts them to LocalTime

// Backend:
// 1. Works in UTC
// 1. Receives LocalTime from the frontend formatted as ISO
// 2. Converts to UTC ISO for storage
// 3. Returns UTC ISO to the frontend
 

// Regular expression to validate ISO UTC date format
// Format: YYYY-MM-DDTHH:mm:ss.sssZ
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// Type definition for ISO date strings (for consistency with frontend)
export type ISODateString = string;

/**
 * Converts a local time string to UTC ISO string
 * @param localTime - Local time string from frontend
 * @returns UTC ISO string for storage
 */
export const localToUTC = (localTime: string): ISODateString => {
    try {
        const date = new Date(localTime);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid date format received from frontend');
        }
        return date.toISOString();
    } catch (error) {
        console.error('Error converting local time to UTC:', error);
        throw error;
    }
};

/**
 * Converts a UTC ISO string to local time string
 * This function exists for backend testing purposes.
 * The actual conversion to local time should happen in the frontend.
 * 
 * @param utcTime - UTC ISO string
 * @returns Local time string
 */
export const utcToLocal = (utcTime: ISODateString): string => {
    try {
        const date = new Date(utcTime);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid UTC date format');
        }
        return date.toLocaleString();
    } catch (error) {
        console.error('Error converting UTC to local time:', error);
        throw error;
    }
};

/**
 * Creates a UTC ISO string from a Date object or converts a local time string to UTC ISO
 * @param date - Date object or local time string
 * @returns UTC ISO string
 */
export const toUTCDate = (date: string | Date): ISODateString => {
    try {
        if (typeof date === 'string') {
            return localToUTC(date);
        }
        if (isNaN(date.getTime())) {
            throw new Error('Invalid Date object');
        }
        return date.toISOString();
    } catch (error) {
        console.error('Error in toUTCDate:', error);
        throw error;
    }
};

/**
 * Creates a Date object from a UTC ISO string
 * @param isoString - UTC ISO string
 * @returns Date object
 */
export const fromUTCString = (isoString: ISODateString): Date => {
    try {
        const date = new Date(isoString);
        if (isNaN(date.getTime())) {
            throw new Error('Invalid ISO string format');
        }
        return date;
    } catch (error) {
        console.error('Error in fromUTCString:', error);
        throw error;
    }
};

/**
 * Returns the current date and time in UTC ISO format
 * @returns Current UTC ISO string
 */
export const getCurrentUTCDate = (): ISODateString => {
    return new Date().toISOString();
};

/**
 * Creates a UTC date range for a specific year and month
 * @param year - Year number
 * @param month - Month number (1-12)
 * @returns Object containing start and end dates in UTC ISO format
 */
export const createUTCMonthRange = (year: number, month: number): { start: ISODateString; end: ISODateString } => {
    try {
        const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
        const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
        
        if (isNaN(startOfMonth.getTime()) || isNaN(endOfMonth.getTime())) {
            throw new Error('Invalid year or month');
        }

        return {
            start: startOfMonth.toISOString(),
            end: endOfMonth.toISOString()
        };
    } catch (error) {
        console.error('Error creating UTC month range:', error);
        throw error;
    }
};

/**
 * Validates if a string is a valid ISO date string
 * @param dateString - String to validate
 * @returns boolean indicating if string is valid ISO format
 */
export const isValidISOString = (dateString: string): boolean => {
    if (!dateString) return false;
    try {
        const date = new Date(dateString);
        return !isNaN(date.getTime()) && DATE_REGEX.test(dateString);
    } catch {
        return false;
    }
};
