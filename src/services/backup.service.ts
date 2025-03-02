import { MongoClient } from 'mongodb';
import { google } from 'googleapis';
import cron from 'node-cron';
import { Readable } from 'stream';

import { BACKUP_CONFIG } from '../config/backupConfig';
import { DB_URI, DB_NAME } from '../config/database';

// Interface to define the structure of backup data
interface BackupData {
    [key: string]: any[];
}

// Variable to store the Google Drive instance
let drive: any = null;

// Initialize the Google Drive service
const initializeGoogleDrive = (): void => {
    try {
        const credentials = JSON.parse(BACKUP_CONFIG.SERVICE_ACCOUNT as string);
        const auth = new google.auth.GoogleAuth({
            credentials,
            scopes: ['https://www.googleapis.com/auth/drive.file']
        });
        drive = google.drive({ version: 'v3', auth });
        console.log('✅ Google Drive service initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing Google Drive service:', error);
    }
};

// Verify access to the specified folder
const verifyFolderAccess = async (): Promise<boolean> => {
    try {
        await drive.files.list({
            q: `'${BACKUP_CONFIG.DRIVE_FOLDER_ID}' in parents`,
            pageSize: 1
        });
        return true;
    } catch (error) {
        console.error('❌ Error verifying access to the specified folder:', error);
        return false;
    }
};

// Upload a file to Google Drive
const uploadToDrive = async (fileName: string, fileContent: string) => {
    try {
        const fileMetadata = {
            name: fileName,
            parents: [BACKUP_CONFIG.DRIVE_FOLDER_ID]
        };

        const media = {
            mimeType: 'application/json',
            body: Readable.from(fileContent)
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id,name,createdTime'
        });

        console.log(`✅ File uploaded successfully: ${response.data.name}`);
        return response.data;
    } catch (error) {
        console.error('❌ Error uploading file to Drive:', error);
        throw error;
    }
};

// Clean up old backups
const cleanOldBackups = async (): Promise<void> => {
    try {
        const response = await drive.files.list({
            q: `'${BACKUP_CONFIG.DRIVE_FOLDER_ID}' in parents`,
            orderBy: 'createdTime desc',
            fields: 'files(id,name,createdTime)',
            pageSize: 100
        });

        const files = response.data.files;
        if (files.length > BACKUP_CONFIG.MAX_BACKUPS) {
            const filesToDelete = files.slice(BACKUP_CONFIG.MAX_BACKUPS);
            for (const file of filesToDelete) {
                await drive.files.delete({ fileId: file.id });
                console.log(`🗑️ Old backup deleted: ${file.name}`);
            }
        }
    } catch (error) {
        console.error('❌ Error cleaning up old backups:', error);
    }
};

// Create a backup of the database
const createBackup = async (): Promise<boolean> => {
    const hasAccess = await verifyFolderAccess();
    if (!hasAccess) {
        console.error('❌ No access to the specified Drive folder');
        return false;
    }

    const client = new MongoClient(DB_URI);

    try {
        await client.connect();
        const db = client.db(DB_NAME);
        const collections = await db.listCollections().toArray();
        const backupData: BackupData = {};

        for (const collection of collections) {
            const collectionName = collection.name;
            const collectionData = await db.collection(collectionName).find({}).toArray();
            backupData[collectionName] = collectionData;
        }

        const fileName = `pl-backup-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.json`;
        await uploadToDrive(fileName, JSON.stringify(backupData, null, 2));
        await cleanOldBackups();

        console.log(`✅ Backup completed successfully: ${fileName}`);
        return true;
    } catch (error) {
        console.error('❌ Error creating backup:', error);
        return false;
    } finally {
        await client.close();
    }
};

// Start scheduled backups
export const startScheduledBackups = (): void => {
    if (!cron.validate(BACKUP_CONFIG.BACKUP_FREQUENCY)) {
        console.error('❌ Invalid backup frequency format');
        return;
    }

    cron.schedule(BACKUP_CONFIG.BACKUP_FREQUENCY, async () => {
        console.log('🔄 Starting scheduled backup...');
        await createBackup();
    });

    console.log(`✅ Scheduled backups started with frequency: ${BACKUP_CONFIG.BACKUP_FREQUENCY}`);
};

// Execute a manual backup
export const executeManualBackup = async () => {
    try {
        const result = await createBackup();
        return {
            success: result,
            message: result ? 'Backup completed successfully' : 'Error occurred while performing backup'
        };
    } catch (error) {
        return {
            success: false,
            message: 'Error executing manual backup',
            error: (error as Error).message
        };
    }
};

// Initialize the service upon module import
initializeGoogleDrive();

// Verify access to the folder on startup
verifyFolderAccess().then(isAccessible => {
    if (!isAccessible) {
        console.error('❌ Cannot access the specified Drive folder');
    } else {
        console.log('✅ Access to the Drive folder verified successfully');
    }
}); 