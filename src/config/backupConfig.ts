import dotenv from 'dotenv';
// Load environment variables from .env file
dotenv.config();

export const BACKUP_CONFIG = {
    SERVICE_ACCOUNT: process.env.GOOGLE_SERVICE_ACCOUNT,// Google service account for authentication
    DRIVE_FOLDER_ID: process.env.DRIVE_FOLDER_ID,// ID of the Google Drive folder for backups
    MAX_BACKUPS: 30,// Maximum number of backups to retain
    BACKUP_FREQUENCY: '0 2 * * *'// Frequency of backups in cron format (daily at 2 AM)
}; 