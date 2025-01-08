import { Router } from 'express';
import type { RequestHandler, Response } from 'express';
import multer from 'multer';
import { 
    getUserData, 
    updateUserProfile, 
    changePassword, 
    deleteProfileImage, 
    deleteUserAccount,
    updateAccountsOrder 
} from '../controllers/user.controller';
import { authMiddleware, type AuthRequest } from '../middlewares/auth.middleware';

const router = Router();

// Multer configuration for memory storage
const upload = multer({ storage: multer.memoryStorage() });

// Type-safe wrapper for controllers
const wrapHandler = (handler: (req: AuthRequest, res: Response) => Promise<void>): RequestHandler => {
    return async (req, res, next) => {
        try {
            await handler(req as AuthRequest, res);
        } catch (error) {
            next(error);
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

export default router;
