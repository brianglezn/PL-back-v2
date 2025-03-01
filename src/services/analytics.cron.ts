import cron from 'node-cron';
import analyticsController from '../controllers/analytics.controller';

// Ejecutar a las 23:59 UTC todos los días
export const initAnalyticsCron = () => {
    cron.schedule('59 23 * * *', async () => {
        console.log('Running daily analytics metrics save job...');
        try {
            await analyticsController.saveUserMetricsHistory();
            console.log('Daily analytics metrics save completed successfully');
        } catch (error) {
            console.error('Error in daily analytics metrics save job:', error);
        }
    }, {
        timezone: 'UTC'
    });
}; 