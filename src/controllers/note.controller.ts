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

        // Validate user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        // Fetch notes from the database
        const notes = await notesCollection.find({ user_id: new ObjectId(userId) }).toArray();
        const decryptedNotes = notes.map(note => ({
            ...note,
            content: note.content ? decryptText(note.content) : ''
        }));

        // Return notes
        res.status(200).json({
            success: true,
            data: decryptedNotes
        });
    } catch (error) {
        console.error('❌ Error getting notes:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
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

        // Validate user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        // Create new note
        const newNote: INote = {
            user_id: new ObjectId(userId),
            title: title || 'Untitled Note',
            content: content ? encryptText(content) : '',
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        };

        // Insert new note into the database
        const result = await notesCollection.insertOne(newNote);
        const insertedNote = await notesCollection.findOne({ _id: result.insertedId });

        // Check if insertion was successful
        if (!insertedNote) {
            res.status(500).json({
                success: false,
                message: 'Error retrieving created note',
                error: 'DATABASE_ERROR'
            });
            return;
        }

        // Return success message
        insertedNote.content = insertedNote.content ? decryptText(insertedNote.content) : '';
        res.status(201).json({
            success: true,
            message: 'Note created successfully',
            data: insertedNote
        });
    } catch (error) {
        console.error('❌ Error creating note:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
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

        // Validate ID format
        if (!ObjectId.isValid(id) || !ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        // Update note in the database
        const result = await notesCollection.findOneAndUpdate(
            {
                _id: new ObjectId(id),
                user_id: new ObjectId(userId)
            },
            {
                $set: {
                    title: title || 'Untitled Note',
                    content: content ? encryptText(content) : '',
                    updatedAt: getCurrentUTCDate()
                }
            },
            { returnDocument: 'after' }
        );

        // Check if update was successful
        if (!result?.value) {
            res.status(404).json({
                success: false,
                message: 'Note not found or does not belong to the user',
                error: 'NOT_FOUND'
            });
            return;
        }

        // Return success message
        result.value.content = result.value.content ? decryptText(result.value.content) : '';
        res.status(200).json({
            success: true,
            message: 'Note updated successfully',
            data: result.value
        });
    } catch (error) {
        console.error('❌ Error updating note:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
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
                error: 'INVALID_ID_FORMAT'
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
                error: 'NOT_FOUND'
            });
            return;
        }

        // Return success message
        res.status(200).json({
            success: true,
            message: 'Note deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting note:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};
