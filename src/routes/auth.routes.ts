import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import { login, logout, register } from '../controllers/auth.controller';

const router = Router();

// Typed wrappers for controllers
const registerHandler: RequestHandler = async (req, res, next) => {
    try {
        await register(req as Request, res as Response);
    } catch (error) {
        next(error);
    }
};

const loginHandler: RequestHandler = async (req, res, next) => {
    try {
        await login(req as Request, res as Response);
    } catch (error) {
        next(error);
    }
};

const logoutHandler: RequestHandler = async (req, res, next) => {
    try {
        await logout(req as Request, res as Response);
    } catch (error) {
        next(error);
    }
};

router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/logout', logoutHandler);

export default router;
