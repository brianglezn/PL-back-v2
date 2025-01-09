import { Router } from 'express';
import type { RequestHandler, Response } from 'express';
import { 
    getAllNotes,
    createNote,
    updateNote,
    deleteNote
} from '../controllers/note.controller';
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

router.get('/', authMiddleware, wrapHandler(getAllNotes));
router.post('/', authMiddleware, wrapHandler(createNote));
router.put('/:id', authMiddleware, wrapHandler(updateNote));
router.delete('/:id', authMiddleware, wrapHandler(deleteNote));

export default router;
