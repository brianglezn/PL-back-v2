import type { Response } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import type { UploadApiResponse } from 'cloudinary';
import { client } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { cloudinary } from '../config/cloudinary';
import type { IUser } from '../types/models/IUser';
import { getAccountDeletionEmailTemplate, getPasswordChangeEmailTemplate } from '../utils/emailTemplates';
import { getCurrentUTCDate } from '../utils/dateUtils';

// Extend the AuthRequest interface for file handling with Multer
interface MulterRequest extends AuthRequest {
    file?: Express.Multer.File;
}

// MongoDB users collection
const usersCollection = client.db(process.env.DB_NAME).collection('users');
const accountsCollection = client.db(process.env.DB_NAME).collection('accounts');
const categoriesCollection = client.db(process.env.DB_NAME).collection('categories');
const transactionsCollection = client.db(process.env.DB_NAME).collection('transactions');

/**
 * Fetch the authenticated user's data.
 */
export const getUserData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        // Validate user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Fetch user data from the database
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) }) as IUser | null;

        // Check if user exists
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Return user data
        res.status(200).json({
            success: true,
            data: {
                _id: user._id,
                username: user.username,
                email: user.email,
                name: user.name,
                surname: user.surname,
                profileImage: user.profileImage,
                accountsOrder: user.accountsOrder,
                preferences: user.preferences
            },
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error getting user data:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Update the authenticated user's profile information.
 */
export const updateUserProfile = async (req: MulterRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { viewMode, name, surname, language, currency, dateFormat, timeFormat } = req.body;

        // Validate user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Fetch user data from the database
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        // Check if user exists
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Prepare update data
        const updateData: Partial<IUser> = {
            name,
            surname,
            preferences: {
                ...user.preferences, 
                language: language || user.preferences.language,
                currency: currency || user.preferences.currency,
                dateFormat: dateFormat || user.preferences.dateFormat,
                timeFormat: timeFormat || user.preferences.timeFormat
            },
            updatedAt: getCurrentUTCDate()
        };

        // Handle profile image update
        if (req.file) {
            try {
                // Delete old profile image if it exists
                if (user.profileImagePublicId) {
                    try {
                        await cloudinary.uploader.destroy(user.profileImagePublicId);
                    } catch (cloudinaryError) {
                        console.error('❌ Error deleting old image from cloudinary:', cloudinaryError);
                    }
                }

                // Upload new profile image
                const result = await new Promise<UploadApiResponse>((resolve, reject) => {
                    const uploadStream = cloudinary.uploader.upload_stream({
                        resource_type: 'image',
                        folder: `ProfilePhotos/${userId}`,
                        allowed_formats: ['jpg', 'jpeg', 'png', 'gif'],
                        max_bytes: 5 * 1024 * 1024 // 5MB limit
                    }, (error, result) => {
                        if (error) reject(error);
                        else resolve(result!);
                    });

                    uploadStream.end(req.file!.buffer);
                });

                // Update user data with new profile image
                updateData.profileImage = result.secure_url;
                updateData.profileImagePublicId = result.public_id;
            } catch (error) {
                console.error('❌ Error uploading image:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error uploading profile image',
                    error: 'IMAGE_UPLOAD_ERROR',
                    statusCode: 500
                });
                return;
            }
        }

        // Update user data in the database
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: updateData }
        );

        // Check if user exists
        if (result.matchedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Check if changes were made
        if (result.modifiedCount === 0) {
            res.status(400).json({
                success: false,
                message: 'No changes were made',
                error: 'NO_CHANGES',
                statusCode: 400
            });
            return;
        }

        // Return success message
        res.status(200).json({
            success: true,
            message: 'Profile updated successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error updating user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Update the authenticated user's theme.
 */
export const updateUserTheme = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { theme } = req.body;

        if (!theme || !['light', 'dark'].includes(theme)) {
            res.status(400).json({
                success: false,
                message: 'Invalid theme value',
                error: 'INVALID_THEME',
                statusCode: 400
            });
            return;
        }

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    'preferences.theme': theme,
                    updatedAt: getCurrentUTCDate()
                }
            }
        );

        if (result.modifiedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

        res.status(200).json({
            success: true,
            data: updatedUser,
            message: 'Theme updated successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error updating theme:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Update the authenticated user's view mode.
 */
export const updateUserViewMode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { viewMode } = req.body;

        if (!viewMode || !['yearToday', 'fullYear'].includes(viewMode)) {
            res.status(400).json({
                success: false,
                message: 'Invalid view mode value',
                error: 'INVALID_VIEW_MODE',
                statusCode: 400
            });
            return;
        }

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    'preferences.viewMode': viewMode,
                    updatedAt: getCurrentUTCDate()
                }
            }
        );

        if (result.modifiedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

        res.status(200).json({
            success: true,
            data: updatedUser,
            message: 'View mode updated successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error updating view mode:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Change the authenticated user's password.
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { currentPassword, newPassword, language } = req.body;

        if (!currentPassword || !newPassword) {
            res.status(400).json({
                success: false,
                message: 'Current and new password are required',
                error: 'MISSING_FIELDS',
                statusCode: 400
            });
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[A-Za-z\d!@#$%^&*(),.?":{}|<>]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character',
                error: 'PASSWORD_TOO_WEAK',
                statusCode: 400
            });
            return;
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            res.status(400).json({
                success: false,
                message: 'Current password is incorrect',
                error: 'INVALID_PASSWORD',
                statusCode: 400
            });
            return;
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { 
                $set: { 
                    password: hashedNewPassword,
                    updatedAt: getCurrentUTCDate()
                } 
            }
        );

        const transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: 'no-reply@profit-lost.com',
                pass: process.env.EMAIL_PASSWORD
            }
        });

        await transporter.sendMail({
            from: '"Profit-Lost" <no-reply@profit-lost.com>',
            to: user.email,
            subject: user.language === 'esES' ? 'Contraseña actualizada con éxito' : 'Password Changed Successfully',
            html: getPasswordChangeEmailTemplate(user.name, user.language)
        });

        res.status(200).json({
            success: true,
            message: 'Password changed successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Delete the authenticated user's profile image.
 */
export const deleteProfileImage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        // Validate user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_FORMAT',
                statusCode: 400
            });
            return;
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        // Check if user exists
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Delete profile image from cloudinary if it exists
        if (user.profileImagePublicId) {
            try {
                await cloudinary.uploader.destroy(user.profileImagePublicId);
            } catch (cloudinaryError) {
                console.error('❌ Error deleting image from cloudinary:', cloudinaryError);
            }
        }

        // Update user data in the database
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $unset: { profileImage: '', profileImagePublicId: '' },
                $set: { updatedAt: getCurrentUTCDate() }
            }
        );

        // Return success message
        res.status(200).json({
            success: true,
            message: 'Profile image deleted successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error deleting profile image:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Delete the authenticated user's account.
 */
export const deleteUserAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        // Validate user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_FORMAT',
                statusCode: 400
            });
            return;
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        // Check if user exists
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Send goodbye email before deleting the account
        const transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: 'no-reply@profit-lost.com',
                pass: process.env.EMAIL_PASSWORD
            }
        });

        await transporter.sendMail({
            from: '"Profit-Lost" <no-reply@profit-lost.com>',
            to: user.email,
            subject: user.language === 'esES' ? 'Cuenta eliminada con éxito' : 'Account Successfully Deleted',
            html: getAccountDeletionEmailTemplate(user.name, user.language)
        });

        // Eliminar imagen de perfil de Cloudinary si existe
        if (user.profileImagePublicId) {
            try {
                await cloudinary.uploader.destroy(user.profileImagePublicId);
            } catch (cloudinaryError) {
                console.error('❌ Error deleting image from cloudinary:', cloudinaryError);
            }
        }

        // Eliminar todos los datos del usuario de todas las colecciones
        const userObjectId = new ObjectId(userId);

        // Usar Promise.all para ejecutar todas las operaciones de eliminación en paralelo
        await Promise.all([
            // Eliminar cuentas del usuario
            accountsCollection.deleteMany({ user_id: userObjectId }),
            
            // Eliminar categorías del usuario
            categoriesCollection.deleteMany({ user_id: userObjectId }),
            
            // Eliminar transacciones del usuario
            transactionsCollection.deleteMany({ user_id: userObjectId }),
                        
            // Finalmente, eliminar el usuario
            usersCollection.deleteOne({ _id: userObjectId })
        ]);

        // Limpiar la cookie del token
        res.clearCookie('token');

        res.status(200).json({
            success: true,
            message: 'User account and all related data deleted successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error deleting user account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Update the authenticated user's accounts order.
 */
export const updateAccountsOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { accountsOrder } = req.body;

        // Validate user ID format
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Validate accounts order format
        if (!Array.isArray(accountsOrder)) {
            res.status(400).json({
                success: false,
                message: 'Invalid accounts order format',
                error: 'INVALID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Update user data in the database
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    accountsOrder,
                    updatedAt: new Date()
                }
            }
        );

        // Check if changes were made
        if (result.modifiedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Return success message
        res.status(200).json({
            success: true,
            message: 'Accounts order updated successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error updating accounts order:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};