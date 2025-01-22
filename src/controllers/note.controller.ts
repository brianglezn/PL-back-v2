import type { Response } from 'express';
import { ObjectId } from 'mongodb';
import { client } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { INote } from '../types/models/INote';
import { getCurrentUTCDate } from '../utils/dateUtils';
import { encryptText, decryptText } from '../utils/encryption';

// MongoDB notes collection
const notesCollection = client.db(process.env.DB_NAME).collection('notes');

/**
 * Get all notes for the authenticated user.
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
        const decryptedNotes = notes.map(note => ({
            ...note,
            title: note.title ? decryptText(note.title) : 'Sin título',
            content: note.content ? decryptText(note.content) : ''
        }));

        res.status(200).json({
            success: true,
            message: 'Notes retrieved successfully',
            data: decryptedNotes,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error getting notes:', error);
        res.status(500).json({
            success: false,
            message: 'Error retrieving notes',
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

        const newNote: INote = {
            user_id: new ObjectId(userId),
            title: title ? encryptText(title) : encryptText('New Note'),
            content: content ? encryptText(content) : '',
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        };

        const result = await notesCollection.insertOne(newNote);
        const insertedNote = await notesCollection.findOne({ _id: result.insertedId });

        if (!insertedNote) {
            res.status(500).json({
                success: false,
                message: 'Error creating note',
                error: 'DATABASE_ERROR',
                statusCode: 500
            });
            return;
        }

        // Decrypt for response
        const decryptedNote = {
            ...insertedNote,
            title: decryptText(insertedNote.title),
            content: insertedNote.content ? decryptText(insertedNote.content) : ''
        };

        res.status(201).json({
            success: true,
            message: 'Note created successfully',
            data: decryptedNote,
            statusCode: 201
        });
    } catch (error) {
        console.error('❌ Error creating note:', error);
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
                message: 'ID inválido',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // First, check if the note exists
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

        // Encrypt title and content
        const encryptedTitle = title ? encryptText(title) : '';
        const encryptedContent = content ? encryptText(content) : '';

        // Update the note
        const updateResult = await notesCollection.updateOne(
            {
                _id: new ObjectId(id),
                user_id: new ObjectId(userId)
            },
            {
                $set: {
                    title: encryptedTitle || encryptText('Sin título'),
                    content: encryptedContent,
                    updatedAt: getCurrentUTCDate()
                }
            }
        );

        if (updateResult.modifiedCount === 0) {
            console.error('Error updating note:', { id, userId });
            res.status(500).json({
                success: false,
                message: 'Error updating note',
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

        // Decrypt for response
        const decryptedNote = {
            ...updatedNote,
            title: decryptText(updatedNote.title),
            content: updatedNote.content ? decryptText(updatedNote.content) : ''
        };

        res.status(200).json({
            success: true,
            message: 'Note updated successfully',
            data: decryptedNote,
            statusCode: 200
        });

    } catch (error) {
        console.error('❌ Error updating note:', error);
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
            message: 'Note deleted successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error deleting note:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};
