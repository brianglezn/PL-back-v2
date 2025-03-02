import cron from 'node-cron';

// Controllers
import { saveUserMetricsHistory } from '../controllers/analytics.controller';

// Database
import { client } from '../config/database';

/**
 * Initializes the cron job to save analytics metrics daily
 * It runs at 23:59 UTC every day
 */
export const initAnalyticsCron = () => {
    console.log('🔄 Starting the analytics cron job initialization...');

    // Validate the cron expression
    if (!cron.validate('59 23 * * *')) {
        console.error('❌ Error: The cron expression for analytics is invalid');
        return;
    }

    cron.schedule('59 23 * * *', async () => {
        console.log('🔄 Running the daily analytics metrics save job...');

        try {
            // Verify database connection before execution
            try {
                // Execute a simple command to check the connection
                await client.db('admin').command({ ping: 1 });
                console.log('📡 MongoDB connection successfully verified for analytics job');
            } catch (dbError) {
                console.error('❌ Error: Unable to connect to the database for analytics job', dbError);
                return;
            }

            // Execute the metrics save - pass false to indicate an automatic save
            await saveUserMetricsHistory(false);

            console.log('✅ Successfully completed the analytics metrics save');
        } catch (error) {
            console.error('❌ Error occurred during the daily analytics metrics save job:', error);
        }
    }, {
        timezone: 'UTC',
        scheduled: true
    });

    console.log('✅ Analytics cron job initialized successfully - Scheduled for daily execution at 23:59 UTC');
};

/**
 * Manually executes the analytics metrics save job
 * Useful for testing or running the job outside of the scheduled time
 * @returns Promise<boolean> - true if the job executed successfully, false otherwise
 */
export const runAnalyticsJobManually = async (): Promise<boolean> => {
    console.log('🔄 Manually initiating the analytics metrics save job...');

    try {
        // Verify database connection before execution
        try {
            // Execute a simple command to check the connection
            await client.db('admin').command({ ping: 1 });
            console.log('📡 MongoDB connection successfully verified for manual analytics job');
        } catch (dbError) {
            console.error('❌ Error: Unable to connect to the database for manual analytics job', dbError);
            return false;
        }

        // Execute the metrics save - pass true to indicate a manual save
        await saveUserMetricsHistory(true);

        console.log('✅ Successfully completed the manual analytics metrics save');
        return true;
    } catch (error) {
        console.error('❌ Error occurred during the manual analytics metrics save job:', error);
        return false;
    }
}; 