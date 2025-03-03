import type { Response } from 'express';
import { ObjectId } from 'mongodb';

// Database
import { client } from '../config/database';

// Types
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { ICategory } from '../types/models/ICategory';

// Utils
import { getCurrentUTCDate, DATE_REGEX } from '../utils/dateUtils';

// MongoDB categories collection
const categoriesCollection = client.db(process.env.DB_NAME).collection('categories');

// MongoDB transactions collection
const transactionsCollection = client.db(process.env.DB_NAME).collection('transactions');

/**
 * Fetch all categories linked to the authenticated user.
 */
export const getAllCategories = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        // Validate the user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Retrieve categories from the database
        const categories = await categoriesCollection
            .find({ user_id: new ObjectId(userId) })
            .toArray();

        // Respond with the retrieved categories
        res.status(200).json({
            success: true,
            data: categories,
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error while fetching categories:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Add a new category for the authenticated user.
 */
export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { name, color } = req.body;

        // Check for required fields
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

        // Insert the new category into the database
        const result = await categoriesCollection.insertOne(newCategory);

        // Respond with the created category
        res.status(201).json({
            success: true,
            message: 'Category created successfully',
            data: { ...newCategory, _id: result.insertedId },
            statusCode: 201
        });
    } catch (error) {
        console.error('❌ Error while creating category:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Modify an existing category for the authenticated user.
 */
export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;
        const { name, color } = req.body;

        // Validate the category ID format
        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Check for required fields
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

        // Respond with success message
        res.status(200).json({
            success: true,
            message: 'Category updated successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error while updating category:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Remove an existing category for the authenticated user.
 */
export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;

        // Validate the category ID format
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

        // Remove the category from the database
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

        // Respond with success message
        res.status(200).json({
            success: true,
            message: 'Category deleted successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error while deleting category:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Create default categories for the authenticated user.
 */
export const createDefaultCategories = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { categories } = req.body;

        // Ensure categories is an array
        if (!Array.isArray(categories)) {
            res.status(400).json({
                success: false,
                message: 'Categories must be an array',
                error: 'INVALID_FORMAT',
                statusCode: 400
            });
            return;
        }

        const categoriesWithUserId = categories.map(category => ({
            user_id: new ObjectId(userId),
            name: category.name,
            color: category.color.startsWith('#') ? category.color : `#${category.color}`,
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        }));

        const result = await categoriesCollection.insertMany(categoriesWithUserId);

        res.status(201).json({
            success: true,
            message: 'Default categories created successfully',
            data: result,
            statusCode: 201
        });
    } catch (error) {
        console.error('❌ Error while creating default categories:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};
