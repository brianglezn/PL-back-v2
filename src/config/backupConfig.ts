import dotenv from 'dotenv';
dotenv.config();

export const BACKUP_CONFIG = {
    SERVICE_ACCOUNT: process.env.GOOGLE_SERVICE_ACCOUNT,
    DRIVE_FOLDER_ID: process.env.DRIVE_FOLDER_ID,
    MAX_BACKUPS: 30,
    BACKUP_FREQUENCY: '0 2 * * *'
}; 