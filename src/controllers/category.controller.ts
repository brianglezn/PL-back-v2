import type { Response } from 'express';
import { ObjectId } from 'mongodb';

import { client } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import type { ICategory } from '../models/types';
import { getCurrentUTCDate } from '../utils/dateUtils';

const categoriesCollection = client.db(process.env.DB_NAME).collection('categories');
const movementsCollection = client.db(process.env.DB_NAME).collection('movements');

export const getAllCategories = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        const categories = await categoriesCollection
            .find({ user_id: new ObjectId(userId) })
            .toArray();

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

export const createCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { name, color } = req.body;

        if (!name || !color) {
            res.status(400).json({
                success: false,
                message: 'Name and color are required',
                error: 'MISSING_FIELDS'
            });
            return;
        }

        const existingCategory = await categoriesCollection.findOne({
            name,
            user_id: new ObjectId(userId)
        });

        if (existingCategory) {
            res.status(409).json({
                success: false,
                message: 'Category with this name already exists',
                error: 'DUPLICATE_CATEGORY'
            });
            return;
        }

        const newCategory: ICategory = {
            user_id: new ObjectId(userId),
            name,
            color: color.startsWith('#') ? color : `#${color}`,
            createdAt: getCurrentUTCDate(),
            updatedAt: getCurrentUTCDate()
        };

        const result = await categoriesCollection.insertOne(newCategory);
        const insertedCategory = await categoriesCollection.findOne({ _id: result.insertedId });

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

export const updateCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;
        const { name, color } = req.body;

        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        if (!name || !color) {
            res.status(400).json({
                success: false,
                message: 'Name and color are required',
                error: 'MISSING_FIELDS'
            });
            return;
        }

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

        if (result.matchedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'Category not found',
                error: 'NOT_FOUND'
            });
            return;
        }

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

export const deleteCategory = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { id } = req.params;

        if (!ObjectId.isValid(id)) {
            res.status(400).json({
                success: false,
                message: 'Invalid category ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        const movementsCount = await movementsCollection.countDocuments({
            user_id: new ObjectId(userId),
            category: new ObjectId(id)
        });

        if (movementsCount > 0) {
            res.status(400).json({
                success: false,
                message: 'Cannot delete category with associated movements',
                error: 'CATEGORY_IN_USE'
            });
            return;
        }

        const result = await categoriesCollection.deleteOne({
            _id: new ObjectId(id),
            user_id: new ObjectId(userId)
        });

        if (result.deletedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'Category not found',
                error: 'NOT_FOUND'
            });
            return;
        }

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
