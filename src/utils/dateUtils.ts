// Regular expression to validate ISO UTC date format
// Format: YYYY-MM-DDTHH:mm:ss.sssZ
export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;

/**
 * Converts a given date to an ISO UTC string.
 * If the input is a string, it validates the format before converting.
 * 
 * @param date - The input date, either a string in ISO format or a Date object.
 * @returns The date as an ISO UTC string.
 * @throws Error if the input string is not in a valid ISO UTC format.
 */
export const toUTCDate = (date: string | Date): string => {
    // Validate the date string if it is a string and not in the correct format
    if (typeof date === 'string' && !DATE_REGEX.test(date)) {
        throw new Error('Invalid date format. Must be ISO UTC format (YYYY-MM-DDTHH:mm:ss.sssZ)');
    }
    // Convert the date to an ISO string
    return new Date(date).toISOString();
};

/**
 * Returns the current date and time in ISO UTC format.
 * 
 * @returns The current date as an ISO UTC string.
 */
export const getCurrentUTCDate = (): string => {
    return new Date().toISOString();
};
