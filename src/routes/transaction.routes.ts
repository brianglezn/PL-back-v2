import { Router } from 'express';
import type { RequestHandler, Response } from 'express';
import { 
    getAllTransactions,
    getTransactionsByYear,
    getTransactionsByYearAndMonth,
    createTransaction,
    updateTransaction,
    deleteTransaction
} from '../controllers/transaction.controller';
import { authMiddleware, type AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

const wrapHandler = (handler: (req: AuthRequest, res: Response) => Promise<void>): RequestHandler => {
    return async (req, res, next) => {
        try {
            await handler(req as AuthRequest, res);
        } catch (error) {
            next(error);
        }
    };
};

// Rutas
router.get('/all', authMiddleware, wrapHandler(getAllTransactions));
router.get('/:year', authMiddleware, wrapHandler(getTransactionsByYear));
router.get('/:year/:month', authMiddleware, wrapHandler(getTransactionsByYearAndMonth));
router.post('/create', authMiddleware, wrapHandler(createTransaction));
router.put('/:id', authMiddleware, wrapHandler(updateTransaction));
router.delete('/:id', authMiddleware, wrapHandler(deleteTransaction));

export default router;
