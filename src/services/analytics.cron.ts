import cron from 'node-cron';

// Controllers
import { saveUserMetricsHistory } from '../controllers/analytics.controller';

// Database
import { client } from '../config/database';

/**
 * Initializes the cron job to save analytics metrics daily
 * Executes at 23:59 UTC every day
 */
export const initAnalyticsCron = () => {
    console.log('🔄 Starting the initialization of the analytics cron job...');

    // Validate the cron expression
    if (!cron.validate('59 23 * * *')) {
        console.error('❌ Error: The cron expression for analytics is invalid');
        return;
    }

    cron.schedule('59 23 * * *', async () => {
        console.log('🔄 Executing the daily analytics metrics saving job...');

        try {
            // Check the database connection before execution
            try {
                // Execute a simple command to verify the connection
                await client.db('admin').command({ ping: 1 });
                console.log('📡 MongoDB connection successfully verified for the analytics job');
            } catch (dbError) {
                console.error('❌ Error: Unable to connect to the database for the analytics job', dbError);
                // Attempt to reconnect in the next scheduled cycle
                return;
            }

            // Execute the metrics saving - pass false to indicate an automatic save
            await saveUserMetricsHistory(false);

            console.log('✅ Analytics metrics saving completed successfully');
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('❌ Error during the daily analytics metrics saving job:', errorMessage);
            
            // Log additional information for debugging
            if (process.env.NODE_ENV === 'development') {
                console.error('Error details:', error);
            }
            
            // Here, a notification system could be implemented to alert about failures
            // For example, sending an email to the administrator
        }
    }, {
        timezone: 'UTC',
        scheduled: true
    });

    console.log('✅ Analytics cron job initialized successfully - Scheduled for daily execution at 23:59 UTC');
};

/**
 * Manually executes the analytics metrics saving job
 * Useful for testing or running the job outside the scheduled time
 * @returns Promise<boolean> - true if the job executed successfully, false otherwise
 */
export const runAnalyticsJobManually = async (): Promise<boolean> => {
    console.log('🔄 Manually starting the analytics metrics saving job...');

    try {
        // Check the database connection before execution
        try {
            // Execute a simple command to verify the connection
            await client.db('admin').command({ ping: 1 });
            console.log('📡 MongoDB connection successfully verified for the manual analytics job');
        } catch (dbError) {
            const errorMessage = dbError instanceof Error ? dbError.message : 'Unknown error';
            console.error('❌ Error: Unable to connect to the database for the manual analytics job', errorMessage);
            
            // Log additional information for debugging
            if (process.env.NODE_ENV === 'development') {
                console.error('Connection error details:', dbError);
            }
            
            return false;
        }

        // Execute the metrics saving - pass true to indicate a manual save
        await saveUserMetricsHistory(true);

        console.log('✅ Manual analytics metrics saving completed successfully');
        return true;
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error('❌ Error during the manual analytics metrics saving job:', errorMessage);
        
        // Log additional information for debugging
        if (process.env.NODE_ENV === 'development') {
            console.error('Error details:', error);
        }
        
        return false;
    }
}; 