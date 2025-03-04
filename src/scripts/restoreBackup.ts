/**
 * Script to restore the database from a backup file
 * 
 * Usage:
 * - npm run restoreDB # Uses the default backup file located in the src/scripts/ folder
 * - npm run restoreDB -- path/to/backup.json  # Specifies a backup file
 * 
 * The script performs three steps:
 * 1. Reads and analyzes the backup file
 * 2. Restores the database
 * 3. Verifies that the restoration was successful
 */

import { MongoClient, ObjectId } from 'mongodb';
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Import types from models
import { IAccount } from '../types/models/IAccount';
import { ICategory } from '../types/models/ICategory';
import { ITransaction } from '../types/models/ITransaction';
import { IUser } from '../types/models/IUser';
import { INote } from '../types/models/INote';

// Load environment variables
dotenv.config();

// Database configuration
const DB_USER = process.env.DB_USER;
const DB_PASS = process.env.DB_PASS;
// const DB_NAME = process.env.DB_NAME;
const DB_NAME = 'ProfitAndLostDB_BCKP';
const DB_URI = `mongodb+srv://${DB_USER}:${DB_PASS}@profit-lost.dojlby3.mongodb.net/?retryWrites=true&w=majority&ssl=true`;

// Interface for backup data
export interface BackupData {
    categories: ICategory[];
    users: IUser[];
    accounts: IAccount[];
    notes: INote[];
    transactions: ITransaction[];
    [key: string]: any[];
}

// Interface to store collection counts for verification
export interface CollectionCounts {
    [collectionName: string]: number;
}

// Global variable to store collection counts from the backup file
export let backupCollectionCounts: CollectionCounts = {};

/**
 * Converts string IDs to ObjectId in the data
 * @param data - Data to process
 * @returns Data with ObjectId instead of strings for ID fields
 */
function convertStringIdsToObjectIds(data: any): any {
    if (data === null || data === undefined) {
        return data;
    }

    if (typeof data === 'string' && /^[0-9a-fA-F]{24}$/.test(data)) {
        return new ObjectId(data);
    }

    if (Array.isArray(data)) {
        return data.map(item => convertStringIdsToObjectIds(item));
    }

    if (typeof data === 'object') {
        const result: any = {};
        for (const key in data) {
            // Convert _id and fields ending with _id (like user_id, category_id)
            if ((key === '_id' || key.endsWith('_id')) && typeof data[key] === 'string' && /^[0-9a-fA-F]{24}$/.test(data[key])) {
                result[key] = new ObjectId(data[key]);
            } else {
                result[key] = convertStringIdsToObjectIds(data[key]);
            }
        }
        return result;
    }

    return data;
}

/**
 * STEP 1: Reads and analyzes the backup file, displaying the content of each collection
 * @param backupFilePath - Path to the backup file
 * @returns Object containing backup data and document count per collection, or null if there is an error
 */
function readAndAnalyzeBackup(backupFilePath: string): { backupData: BackupData, collectionCounts: CollectionCounts } | null {
    try {
        if (!fs.existsSync(backupFilePath)) {
            console.error(`❌ The backup file does not exist: ${backupFilePath}`);
            return null;
        }

        // Read the backup file
        console.log(`📂 Reading backup file: ${backupFilePath}`);
        const backupData: BackupData = JSON.parse(fs.readFileSync(backupFilePath, 'utf8'));
        
        // Analyze the content of the backup
        console.log('\n🔍 STEP 1: Analyzing backup file');
        console.log('📊 Collections found:');
        
        // Store document count per collection
        const collectionCounts: CollectionCounts = {};
        
        // Required collections to verify
        const requiredCollections = ['categories', 'users', 'accounts', 'transactions', 'notes'];
        
        // Verify each collection in the backup data
        for (const collectionName in backupData) {
            const count = backupData[collectionName].length;
            collectionCounts[collectionName] = count;
            console.log(`- ${collectionName}: ${count} documents`);
            
            // Check if the collection has data
            if (count === 0) {
                console.warn(`  ⚠️ The collection ${collectionName} has no documents in the backup`);
            }
        }
        
        // Check for required collections that may be missing
        for (const collection of requiredCollections) {
            if (!backupData[collection]) {
                console.error(`❌ Required collection '${collection}' not found in the backup`);
                collectionCounts[collection] = 0;
            }
        }
        
        return { backupData, collectionCounts };
    } catch (error) {
        console.error('❌ Error reading or analyzing the backup file:', error);
        return null;
    }
}

/**
 * STEP 2: Restores the database from the backup data
 * @param backupData - Data from the backup to restore
 * @returns Promise<boolean> - true if the restoration was successful, false otherwise
 */
async function restoreDatabase(backupData: BackupData): Promise<boolean> {
    try {
        console.log('\n🔄 STEP 2: Restoring database...');
        
        // Connect to the database
        const client = new MongoClient(DB_URI);
        await client.connect();
        console.log('✅ MongoDB connection established');
        
        const db = client.db(DB_NAME);
        
        // Restore each collection
        for (const collectionName in backupData) {
            const collection = db.collection(collectionName);
            
            // Convert string IDs to ObjectId
            const processedData = convertStringIdsToObjectIds(backupData[collectionName]);
            
            // Remove existing data
            console.log(`🗑️ Removing existing data from the collection ${collectionName}...`);
            await collection.deleteMany({});
            
            // Insert new data
            if (processedData.length > 0) {
                console.log(`📥 Restoring ${processedData.length} documents in the collection ${collectionName}...`);
                await collection.insertMany(processedData);
            }
        }
        
        console.log('✅ Restoration completed successfully');
        await client.close();
        return true;
        
    } catch (error) {
        console.error('❌ Error during restoration:', error);
        return false;
    }
}

/**
 * STEP 3: Verifies that the restored database matches the original backup
 * @param expectedCounts - Expected document count per collection from the backup file
 * @returns Promise<boolean> - true if the verification was successful, false otherwise
 */
async function verifyDatabase(expectedCounts: CollectionCounts): Promise<boolean> {
    try {
        console.log('\n🔍 STEP 3: Verifying restored database...');
        
        const client = new MongoClient(DB_URI);
        await client.connect();
        console.log('✅ MongoDB connection established');
        
        const db = client.db(DB_NAME);
        
        // Collections to verify
        const collections = ['categories', 'users', 'accounts', 'transactions', 'notes'];
        
        // Count documents in each collection
        console.log(`\n📊 Summary of the database ${DB_NAME}:`);
        let allCollectionsMatch = true;
        const actualCounts: CollectionCounts = {};
        
        for (const collectionName of collections) {
            const count = await db.collection(collectionName).countDocuments();
            actualCounts[collectionName] = count;
            console.log(`- ${collectionName}: ${count} documents`);
            
            // Check if it matches the expected count
            if (expectedCounts[collectionName] !== undefined) {
                const expected = expectedCounts[collectionName];
                if (count !== expected) {
                    console.warn(`  ⚠️ Discrepancy: Expected ${expected} documents, but found ${count}`);
                    allCollectionsMatch = false;
                } else {
                    console.log(`  ✅ Matches the backup (${expected} documents)`);
                }
            } else if (count === 0) {
                console.warn(`  ⚠️ The collection ${collectionName} is empty`);
                allCollectionsMatch = false;
            }
        }
        
        // Display verification summary
        console.log('\n📋 Verification summary:');
        if (allCollectionsMatch) {
            console.log('✅ All collections match the backup');
        } else {
            console.warn('⚠️ Some collections do not match the backup');
        }
        
        await client.close();
        console.log('\n🔄 MongoDB connection closed');
        return allCollectionsMatch;
    } catch (error) {
        console.error('❌ Error verifying the database:', error);
        return false;
    }
}

/**
 * Main function that executes the entire restoration process
 * @param backupFilePath - Path to the backup file
 */
async function main() {
    // Get the file path from the command line or use the default
    let backupFilePath = process.argv[2];
    
    // If no path is provided, use the default
    if (!backupFilePath) {
        backupFilePath = path.join(__dirname, 'pl-backup-2025-03-04T02-00-02.json');
        console.log(`ℹ️ No file path provided. Using default: ${backupFilePath}`);
    }
    
    // Check if the file exists
    if (fs.existsSync(backupFilePath)) {
        console.log(`✅ Backup file found: ${backupFilePath}`);
    } else {
        console.error(`❌ Backup file not found: ${backupFilePath}`);
        process.exit(1);
    }
    
    console.log('\n🚀 Starting restoration process...');
    
    // STEP 1: Read and analyze the backup file
    const backupInfo = readAndAnalyzeBackup(backupFilePath);
    if (!backupInfo) {
        console.error('❌ Could not read or analyze the backup file');
        process.exit(1);
    }
    
    // STEP 2: Restore the database
    const restorationSuccess = await restoreDatabase(backupInfo.backupData);
    if (!restorationSuccess) {
        console.error('❌ Database restoration failed');
        process.exit(1);
    }
    
    // STEP 3: Verify the restored database
    const verificationSuccess = await verifyDatabase(backupInfo.collectionCounts);
    if (verificationSuccess) {
        console.log('\n✅ Process completed successfully: The database matches the backup');
    } else {
        console.warn('\n⚠️ Process completed with warnings: The database does not fully match the backup');
    }
}

// Execute the main function only if this file is run directly
if (require.main === module) {
    main().catch(error => {
        console.error('Unexpected error:', error);
        process.exit(1);
    });
}

// Export functions and constants for use in other files
export { DB_URI, DB_NAME }; 