import { Router } from 'express';
import { getUserMetrics, getTransactionMetrics, getTransactionHistory } from '../controllers/analytics.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';
import { runAnalyticsJobManually } from '../services/analytics.cron';

const router = Router();

/**
 * @route   GET /api/analytics/users
 * @desc    Fetch user metrics
 * @access  Admin
 */
router.get('/users', authMiddleware, isAdmin, (req, res) => {
    void getUserMetrics(req, res);
});

/**
 * @route   GET /api/analytics/transactions
 * @desc    Fetch transaction metrics
 * @access  Admin
 */
router.get('/transactions', authMiddleware, isAdmin, (req, res) => {
    void getTransactionMetrics(req, res);
});

/**
 * @route   GET /api/analytics/transactions/history
 * @desc    Fetch transaction history
 * @access  Admin
 */
router.get('/transactions/history', authMiddleware, isAdmin, (req, res) => {
    void getTransactionHistory(req, res);
});

/**
 * @route   POST /api/analytics/users/save-metrics
 * @desc    Store current user metrics to history
 * @access  Admin
 */
router.post('/users/save-metrics', authMiddleware, isAdmin, (req, res) => {
    void (async () => {
        try {
            const success = await runAnalyticsJobManually();
            res.status(success ? 200 : 500).json({
                success,
                message: success
                    ? 'User metrics have been successfully saved'
                    : 'Error saving user metrics',
                error: success ? undefined : 'METRICS_SAVE_ERROR'
            });
        } catch (error) {
            console.error('Error occurred while saving user metrics:', error);

            // Determinar el tipo de error
            const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
            const isDbError = errorMessage.toLowerCase().includes('database') ||
                errorMessage.toLowerCase().includes('mongo') ||
                errorMessage.toLowerCase().includes('db');

            res.status(500).json({
                success: false,
                message: 'Error saving user metrics',
                error: isDbError ? 'DATABASE_ERROR' : 'METRICS_SAVE_ERROR',
                details: process.env.NODE_ENV === 'development' ? errorMessage : undefined
            });
        }
    })();
});

export default router;
