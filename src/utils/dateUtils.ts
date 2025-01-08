export const DATE_REGEX = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z$/;

export const toUTCDate = (date: string | Date): string => {
    if (typeof date === 'string' && !DATE_REGEX.test(date)) {
        throw new Error('Invalid date format. Must be ISO UTC format (YYYY-MM-DDTHH:mm:ss.sssZ)');
    }
    return new Date(date).toISOString();
};

export const getCurrentUTCDate = (): string => {
    return new Date().toISOString();
}; 