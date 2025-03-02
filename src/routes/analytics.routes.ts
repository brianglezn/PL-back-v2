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
                    : 'Error saving user metrics'
            });
        } catch (error) {
            console.error('Error occurred while saving user metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Error saving user metrics',
                error: 'SERVER_ERROR'
            });
        }
    })();
});

export default router;
