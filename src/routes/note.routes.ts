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

// Type-safe wrapper for asynchronous controllers
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
router.get('/', authMiddleware, wrapHandler(getAllNotes));
router.post('/', authMiddleware, wrapHandler(createNote));
router.put('/:id', authMiddleware, wrapHandler(updateNote));
router.delete('/:id', authMiddleware, wrapHandler(deleteNote));

export default router;
