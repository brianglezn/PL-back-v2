import { Router } from 'express';
import type { RequestHandler, Response } from 'express';
import multer from 'multer';
import {
    getUserData,
    updateUserProfile,
    changePassword,
    deleteProfileImage,
    deleteUserAccount,
    updateAccountsOrder,
    updateUserTheme
} from '../controllers/user.controller';
import { authMiddleware, type AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// Multer configuration for memory storage
// Used for handling file uploads, storing them in memory
const upload = multer({ storage: multer.memoryStorage() });

// Type-safe wrapper for asynchronous controllers
// Ensures proper error handling for async/await functions
const wrapHandler = (handler: (req: AuthRequest, res: Response) => Promise<void>): RequestHandler => {
    return async (req, res, next) => {
        try {
            await handler(req as AuthRequest, res); // Typecast the request to include user information
        } catch (error) {
            next(error); // Pass errors to the next middleware (error handler)
        }
    };
};

// Routes
router.get('/me', authMiddleware, wrapHandler(getUserData));
router.post('/profile', authMiddleware, upload.single('profileImage'), wrapHandler(updateUserProfile));
router.post('/password', authMiddleware, wrapHandler(changePassword));
router.delete('/profile-image', authMiddleware, wrapHandler(deleteProfileImage));
router.delete('/account', authMiddleware, wrapHandler(deleteUserAccount));
router.post('/accounts-order', authMiddleware, wrapHandler(updateAccountsOrder));
router.post('/theme', authMiddleware, wrapHandler(updateUserTheme));

export default router;
