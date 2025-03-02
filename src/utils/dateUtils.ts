// Regular expression to validate ISO UTC date format
// Format: YYYY-MM-DDTHH:mm:ss.sssZ
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

// Type definition for ISO date strings (for consistency with frontend)
export type ISODateString = string;

/**
 * Converts a given date to an ISO UTC string.
 * If the input is a string, it validates the format before converting.
 * 
 * @param date - The input date, either a string in ISO format or a Date object.
 * @returns The date as an ISO UTC string.
 * @throws Error if the input string is not in a valid ISO UTC format.
 */
export const toUTCDate = (date: string | Date): ISODateString => {
    // Validate the date string if it is a string and not in the correct format
    if (typeof date === 'string' && !DATE_REGEX.test(date)) {
        throw new Error('Invalid date format. Must be ISO UTC format (YYYY-MM-DDTHH:mm:ss.sssZ)');
    }
    // Convert the date to an ISO string
    return new Date(date).toISOString();
};

/**
 * Alias for toUTCDate that only accepts Date objects (for consistency with frontend)
 */
export const toUTCString = (date: Date): ISODateString => {
    return date.toISOString();
};

/**
 * Converts an ISO date string to a Date object
 */
export const fromUTCString = (isoString: ISODateString): Date => {
    return new Date(isoString);
};

/**
 * Returns the current date and time in ISO UTC format.
 * 
 * @returns The current date as an ISO UTC string.
 */
export const getCurrentUTCDate = (): ISODateString => {
    return new Date().toISOString();
};

/**
 * Validates if a string is a valid ISO date string
 */
export const isValidISOString = (dateString: string): boolean => {
    return DATE_REGEX.test(dateString);
};
