import type { Response } from 'express';
import { ObjectId } from 'mongodb';

import { client } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { ICategory } from '../types/models/ICategory';
import { getCurrentUTCDate } from '../utils/dateUtils';

// MongoDB categories collection
const categoriesCollection = client.db(process.env.DB_NAME).collection('categories');
// MongoDB movements collection
const movementsCollection = client.db(process.env.DB_NAME).collection('movements');

/**
 * Get all categories for the authenticated user.
 */
export const getAllCategories = async (req: AuthRequest, res: Response): Promise<void> => {
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

        // Fetch categories from the database
        const categories = await categoriesCollection
            .find({ user_id: new ObjectId(userId) })
            .toArray();

        // Return success message
        res.status(200).json({
            success: true,
            data: categories
        });
    } catch (error) {
        console.error('❌ Error getting categories:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

/**
 * Create a new category for the authenticated user.
 */
export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { name, color } = req.body;

        // Validate required fields
        if (!name || !color) {
            res.status(400).json({
                success: false,
                message: 'Name and color are required',
                error: 'MISSING_FIELDS'
            });
            return;
        }

        // Check if category with the same name already exists
        const existingCategory = await categoriesCollection.findOne({
            name,
            user_id: new ObjectId(userId)
        });

        // Check if category with the same name already exists
        if (existingCategory) {
            res.status(409).json({
                success: false,
                message: 'Category with this name already exists',
                error: 'DUPLICATE_CATEGORY'
            });
            return;
        }

        // Create new category object
        const newCategory: ICategory = {
            user_id: new ObjectId(userId),
            name,
            color: color.startsWith('#') ? color : `#${color}`,
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        };

        // Insert new category into the database
        const result = await categoriesCollection.insertOne(newCategory);
        const insertedCategory = await categoriesCollection.findOne({ _id: result.insertedId });

        // Return success message
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: insertedCategory
        });
    } catch (error) {
        console.error('❌ Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

/**
 * Update an existing category for the authenticated user.
 */
export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;
        const { name, color } = req.body;

        // Validate ID format
        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        // Validate required fields
        if (!name || !color) {
            res.status(400).json({
                success: false,
                message: 'Name and color are required',
                error: 'MISSING_FIELDS'
            });
            return;
        }

        // Update category in the database
        const result = await categoriesCollection.updateOne(
            {
                _id: new ObjectId(id),
                user_id: new ObjectId(userId)
            },
            {
                $set: {
                    name,
                    color: color.startsWith('#') ? color : `#${color}`,
                    updatedAt: getCurrentUTCDate()
                }
            }
        );

        // Check if update was successful
        if (result.matchedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'Category not found',
                error: 'NOT_FOUND'
            });
            return;
        }

        // Return success message
        res.status(200).json({
            success: true,
            message: 'Category updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating category:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

/**
 * Delete an existing category for the authenticated user.
 */
export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;

        // Validate ID format
        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        // Check if category has associated movements
        const movementsCount = await movementsCollection.countDocuments({
            user_id: new ObjectId(userId),
            category: new ObjectId(id)
        });

        // Check if category has associated movements   
        if (movementsCount > 0) {
            res.status(400).json({
                success: false,
                message: 'Cannot delete category with associated movements',
                error: 'CATEGORY_IN_USE'
            });
            return;
        }

        // Delete category from the database
        const result = await categoriesCollection.deleteOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        // Check if deletion was successful
        if (result.deletedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'Category not found',
                error: 'NOT_FOUND'
            });
            return;
        }

        // Return success message
        res.status(200).json({
            success: true,
            message: 'Category deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};
