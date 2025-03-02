import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';
import { runAnalyticsJobManually } from '../services/analytics.cron';

const router = Router();

/**
 * @route   GET /api/analytics/users
 * @desc    Retrieve user metrics
 * @access  Admin
 */
router.get('/users', authMiddleware, isAdmin, (req, res) => {
    void analyticsController.getUserMetrics(req, res);
});

/**
 * @route   GET /api/analytics/transactions
 * @desc    Retrieve transaction metrics
 * @access  Admin
 */
router.get('/transactions', authMiddleware, isAdmin, (req, res) => {
    void analyticsController.getTransactionMetrics(req, res);
});

/**
 * @route   GET /api/analytics/transactions/history
 * @desc    Retrieve transaction history
 * @access  Admin
 */
router.get('/transactions/history', authMiddleware, isAdmin, (req, res) => {
    void analyticsController.getTransactionHistory(req, res);
});

/**
 * @route   POST /api/analytics/users/save-metrics
 * @desc    Save current user metrics to history
 * @access  Admin
 */
router.post('/users/save-metrics', authMiddleware, isAdmin, (req, res) => {
    void (async () => {
        try {
            const success = await runAnalyticsJobManually();
            res.status(success ? 200 : 500).json({
                success,
                message: success 
                    ? 'User metrics have been saved successfully' 
                    : 'Failed to save user metrics'
            });
        } catch (error) {
            console.error('An error occurred while saving user metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to save user metrics',
                error: 'SERVER_ERROR'
            });
        }
    })();
});

export default router;
