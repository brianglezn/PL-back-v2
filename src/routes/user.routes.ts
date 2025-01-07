import { Router } from 'express';
import type { RequestHandler } from 'express';
import { getUserData } from '../controllers/user.controller';
import { authMiddleware, type AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// Typed wrapper for controller
const getUserDataHandler: RequestHandler = async (req, res, next) => {
    try {
        await getUserData(req as AuthRequest, res);
    } catch (error) {
        next(error);
    }
};

// Aplicar middleware de autenticación y el handler
router.get('/me', authMiddleware, getUserDataHandler);

export default router;
