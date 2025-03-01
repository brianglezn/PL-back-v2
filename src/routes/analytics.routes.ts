import { Router } from 'express';
import analyticsController from '../controllers/analytics.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';

const router = Router();

/**
 * @route   GET /api/analytics/users
 * @desc    Get user metrics
 * @access  Admin
 */
router.get('/users', authMiddleware, isAdmin, (req, res) => {
    void analyticsController.getUserMetrics(req, res);
});

/**
 * @route   GET /api/analytics/transactions
 * @desc    Get transaction metrics
 * @access  Admin
 */
router.get('/transactions', authMiddleware, isAdmin, (req, res) => {
    void analyticsController.getTransactionMetrics(req, res);
});

/**
 * @route   GET /api/analytics/transactions/history
 * @desc    Get transaction history
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
            await analyticsController.saveUserMetricsHistory();
            res.status(200).json({
                success: true,
                message: 'User metrics saved successfully'
            });
        } catch (error) {
            console.error('Error saving user metrics:', error);
            res.status(500).json({
                success: false,
                message: 'Error saving user metrics',
                error: 'SERVER_ERROR'
            });
        }
    })();
});

export default router;
