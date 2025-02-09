import type { Response } from 'express';
import { ObjectId } from 'mongodb';

import { client } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { ICategory } from '../types/models/ICategory';
import { getCurrentUTCDate, DATE_REGEX } from '../utils/dateUtils';

// MongoDB categories collection
const categoriesCollection = client.db(process.env.DB_NAME).collection('categories');
// MongoDB transactions collection
const transactionsCollection = client.db(process.env.DB_NAME).collection('transactions');

/**
 * Retrieve all categories associated with the authenticated user.
 */
export const getAllCategories = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        // Validate the format of the user ID
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Fetch categories from the database
        const categories = await categoriesCollection
            .find({ user_id: new ObjectId(userId) })
            .toArray();

        // Return a success response with the categories
        res.status(200).json({
            success: true,
            data: categories,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error getting categories:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
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

        // Validate that required fields are provided
        if (!name || !color) {
            res.status(400).json({
                success: false,
                message: 'Name and color are required',
                error: 'MISSING_FIELDS',
                statusCode: 400
            });
            return;
        }

        // Check if a category with the same name already exists
        const existingCategory = await categoriesCollection.findOne({
            name: name.toLowerCase(),
            user_id: new ObjectId(userId)
        });

        if (existingCategory) {
            res.status(409).json({
                success: false,
                message: 'Category with this name already exists',
                error: 'DUPLICATE_CATEGORY',
                statusCode: 409
            });
            return;
        }

        // Create a new category object
        const newCategory: ICategory = {
            user_id: new ObjectId(userId),
            name,
            color: color.startsWith('#') ? color : `#${color}`,
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        };

        // Validate the date format
        if (!DATE_REGEX.test(newCategory.createdAt) || !DATE_REGEX.test(newCategory.updatedAt)) {
            res.status(400).json({
                success: false,
                message: 'Invalid date format',
                error: 'INVALID_DATE_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Insert the new category into the database
        const result = await categoriesCollection.insertOne(newCategory);

        // Return a success response with the created category
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: { ...newCategory, _id: result.insertedId },
            statusCode: 201
        });
    } catch (error) {
        console.error('❌ Error creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
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

        // Validate the format of the category ID
        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Validate that required fields are provided
        if (!name || !color) {
            res.status(400).json({
                success: false,
                message: 'Name and color are required',
                error: 'MISSING_FIELDS',
                statusCode: 400
            });
            return;
        }

        // Update the category in the database
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

        // Check if the update was successful
        if (result.matchedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'Category not found',
                error: 'CATEGORY_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Return a success response
        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error updating category:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
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

        // Validate the format of the category ID
        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Check if the category has associated transactions
        const movementsCount = await transactionsCollection.countDocuments({
            user_id: new ObjectId(userId),
            category: new ObjectId(id)
        });

        // Prevent deletion if the category has associated transactions
        if (movementsCount > 0) {
            res.status(400).json({
                success: false,
                message: 'Cannot delete category with associated movements',
                error: 'CATEGORY_IN_USE',
                statusCode: 400
            });
            return;
        }

        // Delete the category from the database
        const result = await categoriesCollection.deleteOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        // Check if the deletion was successful
        if (result.deletedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'Category not found',
                error: 'CATEGORY_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Return a success response
        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};
