import type { Response } from 'express';
import { ObjectId } from 'mongodb';

// Database
import { client } from '../config/database';

// Types
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { INote } from '../types/models/INote';

// Utils
import { getCurrentUTCDate } from '../utils/dateUtils';
import { encryptNote, decryptNote, decryptNotes } from '../utils/noteEncryption';

// MongoDB notes collection
const notesCollection = client.db(process.env.DB_NAME).collection<INote>('notes');

/**
 * Retrieve all notes for the authenticated user.
 */
export const getAllNotes = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        const notes = await notesCollection.find({ user_id: new ObjectId(userId) }).toArray();
        const decryptedNotes = decryptNotes(notes);

        res.status(200).json({
            success: true,
            message: 'Notes successfully retrieved',
            data: decryptedNotes,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error while retrieving notes:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to retrieve notes',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Create a new note for the authenticated user.
 */
export const createNote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { title, content } = req.body;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Create note with UTC ISO dates
        const newNote = encryptNote({
            user_id: new ObjectId(userId),
            title,
            content,
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        });

        const result = await notesCollection.insertOne(newNote as INote);
        const insertedNote = await notesCollection.findOne({ _id: result.insertedId });

        if (!insertedNote) {
            res.status(500).json({
                success: false,
                message: 'Failed to create note',
                error: 'DATABASE_ERROR',
                statusCode: 500
            });
            return;
        }

        // Frontend will handle UTC ISO to local time conversion
        const decryptedNote = decryptNote(insertedNote);

        res.status(201).json({
            success: true,
            message: 'Note successfully created',
            data: decryptedNote,
            statusCode: 201
        });
    } catch (error) {
        console.error('❌ Error while creating note:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Update an existing note for the authenticated user.
 */
export const updateNote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;
        const { title, content } = req.body;

        if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Check if the note exists
        const existingNote = await notesCollection.findOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        if (!existingNote) {
            res.status(404).json({
                success: false,
                message: 'Note not found',
                error: 'NOTE_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Update note with UTC ISO date
        const encryptedNote = encryptNote({
            title,
            content,
            updatedAt: getCurrentUTCDate()
        });

        // Update the note
        const updateResult = await notesCollection.updateOne(
            {
                _id: new ObjectId(id),
                user_id: new ObjectId(userId)
            },
            { $set: encryptedNote }
        );

        if (updateResult.modifiedCount === 0) {
            console.error('Error while updating note:', { id, userId });
            res.status(500).json({
                success: false,
                message: 'Failed to update note',
                error: 'DATABASE_ERROR',
                statusCode: 500
            });
            return;
        }

        // Get the updated note
        const updatedNote = await notesCollection.findOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        if (!updatedNote) {
            res.status(404).json({
                success: false,
                message: 'Error retrieving updated note',
                error: 'NOTE_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Frontend will handle UTC ISO to local time conversion
        const decryptedNote = decryptNote(updatedNote);

        res.status(200).json({
            success: true,
            message: 'Note successfully updated',
            data: decryptedNote,
            statusCode: 200
        });

    } catch (error) {
        console.error('❌ Error while updating note:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Delete an existing note for the authenticated user.
 */
export const deleteNote = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;

        // Validate ID format
        if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Delete note from the database
        const result = await notesCollection.deleteOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        // Check if deletion was successful
        if (result.deletedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'Note not found or does not belong to the user',
                error: 'NOTE_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Return success message
        res.status(200).json({
            success: true,
            message: 'Note successfully deleted',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error while deleting note:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};
