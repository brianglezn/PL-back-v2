import { Router } from 'express';
import { getUserMetrics, getTransactionMetrics, getTransactionHistory } from '../controllers/analytics.controller';
import { authMiddleware } from '../middlewares/auth.middleware';
import { isAdmin } from '../middlewares/admin.middleware';

const router = Router();

/**
 * @route   GET /api/analytics/users
 * @desc    Retrieve user metrics
 * @access  Admin
 */
router.get('/users', authMiddleware, isAdmin, (req, res) => {
    void getUserMetrics(req, res);
});

/**
 * @route   GET /api/analytics/transactions
 * @desc    Retrieve transaction metrics
 * @access  Admin
 */
router.get('/transactions', authMiddleware, isAdmin, (req, res) => {
    void getTransactionMetrics(req, res);
});

/**
 * @route   GET /api/analytics/transactions/history
 * @desc    Retrieve transaction history
 * @access  Admin
 */
router.get('/transactions/history', authMiddleware, isAdmin, (req, res) => {
    void getTransactionHistory(req, res);
});

export default router;