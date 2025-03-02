import cron from 'node-cron';
import analyticsController from '../controllers/analytics.controller';
import { client } from '../config/database';

/**
 * Initializes the cron job to save analytics metrics daily
 * It runs at 23:59 UTC every day
 */
export const initAnalyticsCron = () => {
    console.log('🔄 Initializing analytics cron...');
    
    // Check if the cron expression is valid
    if (!cron.validate('59 23 * * *')) {
        console.error('❌ Error: Invalid cron expression for analytics');
        return;
    }
    
    cron.schedule('59 23 * * *', async () => {
        console.log('🔄 Executing daily analytics metrics save job...');
        
        try {
            // Check database connection before executing
            try {
                // Attempt to run a simple command to verify the connection
                await client.db('admin').command({ ping: 1 });
                console.log('📡 MongoDB connection verified for analytics job');
            } catch (dbError) {
                console.error('❌ Error: No database connection for analytics job', dbError);
                return;
            }
            
            // Execute the metrics save
            await analyticsController.saveUserMetricsHistory();
            
            console.log('✅ Analytics metrics save completed successfully');
        } catch (error) {
            console.error('❌ Error in the daily analytics metrics save job:', error);
            
            // Here you could implement a notification system
            // for example, send an email to the administrator
        }
    }, {
        timezone: 'UTC',
        scheduled: true
    });
    
    console.log('✅ Analytics cron initialized successfully - Scheduled for 23:59 UTC daily');
};

/**
 * Manually executes the analytics metrics save job
 * Useful for testing or running the job outside of the scheduled time
 * @returns Promise<boolean> - true if the job executed successfully, false otherwise
 */
export const runAnalyticsJobManually = async (): Promise<boolean> => {
    console.log('🔄 Manually executing the analytics metrics save job...');
    
    try {
        // Check database connection before executing
        try {
            // Attempt to run a simple command to verify the connection
            await client.db('admin').command({ ping: 1 });
            console.log('📡 MongoDB connection verified for manual analytics job');
        } catch (dbError) {
            console.error('❌ Error: No database connection for manual analytics job', dbError);
            return false;
        }
        
        // Execute the metrics save
        await analyticsController.saveUserMetricsHistory();
        
        console.log('✅ Manual analytics metrics save completed successfully');
        return true;
    } catch (error) {
        console.error('❌ Error in the manual analytics metrics save job:', error);
        return false;
    }
}; 