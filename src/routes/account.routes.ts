import { Router } from 'express';
import type { RequestHandler, Response } from 'express';

import { getAllAccounts, getAccountsByYear, createAccount, updateAccount, deleteAccount } from '../controllers/account.controller';
import { authMiddleware, type AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// Type-safe wrapper for controllers
// Ensures proper error handling for async/await functions
const wrapHandler = (handler: (req: AuthRequest, res: Response) => Promise<void>): RequestHandler => {
    return async (req, res, next) => {
        try {
            await handler(req as AuthRequest, res); // Typecast the request to include AuthRequest
        } catch (error) {
            next(error); // Forward errors to the next middleware (error handler)
        }
    };
};

// Routes
router.get('/all', authMiddleware, wrapHandler(getAllAccounts));
router.get('/:year', authMiddleware, wrapHandler(getAccountsByYear));
router.post('/create', authMiddleware, wrapHandler(createAccount));
router.put('/:id', authMiddleware, wrapHandler(updateAccount));
router.delete('/:id', authMiddleware, wrapHandler(deleteAccount));

export default router;
