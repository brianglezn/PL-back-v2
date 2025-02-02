import { MongoClient } from 'mongodb';
import { google } from 'googleapis';
import cron from 'node-cron';
import { Readable } from 'stream';
import { BACKUP_CONFIG } from '../config/backupConfig';
import { DB_URI, DB_NAME } from '../config/database';

interface BackupData {
    [key: string]: any[];
}

class BackupService {
    private drive: any;

    constructor() {
        this.drive = null;
        this.initializeGoogleDrive();
        this.verifyFolderAccess().then(isAccessible => {
            if (!isAccessible) {
                console.error('❌ Cannot access the Drive folder');
            } else {
                console.log('✅ Access to the Drive folder verified');
            }
        });
    }

    private initializeGoogleDrive() {
        try {
            const credentials = JSON.parse(BACKUP_CONFIG.SERVICE_ACCOUNT as string);
            const auth = new google.auth.GoogleAuth({
                credentials,
                scopes: ['https://www.googleapis.com/auth/drive.file']
            });
            this.drive = google.drive({ version: 'v3', auth });
            console.log('✅ Google Drive service initialized');
        } catch (error) {
            console.error('❌ Error initializing Google Drive:', error);
        }
    }

    private async createBackup() {
        const hasAccess = await this.verifyFolderAccess();
        if (!hasAccess) {
            console.error('❌ No access to the Drive folder');
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
            await this.uploadToDrive(fileName, JSON.stringify(backupData, null, 2));
            await this.cleanOldBackups();

            console.log(`✅ Backup completed: ${fileName}`);
            return true;
        } catch (error) {
            console.error('❌ Error creating backup:', error);
            return false;
        } finally {
            await client.close();
        }
    }

    private async uploadToDrive(fileName: string, fileContent: string) {
        try {
            const fileMetadata = {
                name: fileName,
                parents: [BACKUP_CONFIG.DRIVE_FOLDER_ID]
            };

            const media = {
                mimeType: 'application/json',
                body: Readable.from(fileContent)
            };

            const response = await this.drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id,name,createdTime'
            });

            console.log(`✅ File uploaded: ${response.data.name}`);
            return response.data;
        } catch (error) {
            console.error('❌ Error uploading to Drive:', error);
            throw error;
        }
    }

    private async cleanOldBackups() {
        try {
            const response = await this.drive.files.list({
                q: `'${BACKUP_CONFIG.DRIVE_FOLDER_ID}' in parents`,
                orderBy: 'createdTime desc',
                fields: 'files(id,name,createdTime)',
                pageSize: 100
            });

            const files = response.data.files;
            if (files.length > BACKUP_CONFIG.MAX_BACKUPS) {
                const filesToDelete = files.slice(BACKUP_CONFIG.MAX_BACKUPS);
                for (const file of filesToDelete) {
                    await this.drive.files.delete({ fileId: file.id });
                    console.log(`🗑️ Old backup deleted: ${file.name}`);
                }
            }
        } catch (error) {
            console.error('❌ Error cleaning old backups:', error);
        }
    }

    private async verifyFolderAccess(): Promise<boolean> {
        try {
            await this.drive.files.list({
                q: `'${BACKUP_CONFIG.DRIVE_FOLDER_ID}' in parents`,
                pageSize: 1
            });
            return true;
        } catch (error) {
            console.error('❌ Error verifying access to the folder:', error);
            return false;
        }
    }

    public startScheduledBackups() {
        if (!cron.validate(BACKUP_CONFIG.BACKUP_FREQUENCY)) {
            console.error('❌ Invalid backup frequency format');
            return;
        }

        cron.schedule(BACKUP_CONFIG.BACKUP_FREQUENCY, async () => {
            console.log('🔄 Starting scheduled backup...');
            await this.createBackup();
        });

        console.log(`✅ Scheduled backups started: ${BACKUP_CONFIG.BACKUP_FREQUENCY}`);
    }

    public async executeManualBackup() {
        try {
            const result = await this.createBackup();
            return {
                success: result,
                message: result ? 'Backup completed successfully' : 'Error performing backup'
            };
        } catch (error) {
            return {
                success: false,
                message: 'Error executing backup',
                error: (error as Error).message
            };
        }
    }
}

export const backupService = new BackupService(); 