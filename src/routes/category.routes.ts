import { Router } from 'express';
import type { RequestHandler, Response } from 'express';
import { 
    getAllCategories,
    createCategory,
    updateCategory,
    deleteCategory
} from '../controllers/category.controller';
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
router.get('/all', authMiddleware, wrapHandler(getAllCategories));
router.post('/create', authMiddleware, wrapHandler(createCategory));
router.put('/:id', authMiddleware, wrapHandler(updateCategory));
router.delete('/:id', authMiddleware, wrapHandler(deleteCategory));

export default router;
