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

// Type-safe wrapper para controladores
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
router.get('/all', authMiddleware, wrapHandler(getAllCategories));
router.post('/create', authMiddleware, wrapHandler(createCategory));
router.put('/:id', authMiddleware, wrapHandler(updateCategory));
router.delete('/:id', authMiddleware, wrapHandler(deleteCategory));

export default router;
