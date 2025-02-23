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

// Extend the AuthRequest interface to include file handling with Multer
interface MulterRequest extends AuthRequest {
    file?: Express.Multer.File;
}

// MongoDB collections for users, accounts, categories, and transactions
const usersCollection = client.db(process.env.DB_NAME).collection('users');
const accountsCollection = client.db(process.env.DB_NAME).collection('accounts');
const categoriesCollection = client.db(process.env.DB_NAME).collection('categories');
const transactionsCollection = client.db(process.env.DB_NAME).collection('transactions');

/**
 * Retrieve the data of the authenticated user.
 */
export const getUserData = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        // Check if the user ID format is valid
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Retrieve user data from the database
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) }) as IUser | null;

        // Verify if the user exists
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Send back the user data
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
                preferences: user.preferences,
                onboarding: user.onboarding,
                role: user.role
            },
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error retrieving user data:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Update the profile information of the authenticated user.
 */
export const updateUserProfile = async (req: MulterRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { viewMode, name, surname, language, currency, dateFormat, timeFormat } = req.body;

        // Check if the user ID format is valid
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Retrieve user data from the database
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        // Verify if the user exists
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Prepare the data for updating the user profile
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

        // Process the profile image update if a new file is provided
        if (req.file) {
            try {
                // Remove the old profile image if it exists
                if (user.profileImagePublicId) {
                    try {
                        await cloudinary.uploader.destroy(user.profileImagePublicId);
                    } catch (cloudinaryError) {
                        console.error('❌ Error deleting old image from Cloudinary:', cloudinaryError);
                    }
                }

                // Upload the new profile image
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

                // Update user data with the new profile image information
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

        // Update the user data in the database
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: updateData }
        );

        // Verify if the user exists
        if (result.matchedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Check if any changes were made
        if (result.modifiedCount === 0) {
            res.status(400).json({
                success: false,
                message: 'No changes were made',
                error: 'NO_CHANGES',
                statusCode: 400
            });
            return;
        }

        // Send back a success message
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
 * Update the theme preference of the authenticated user.
 */
export const updateUserTheme = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { theme } = req.body;

        // Validate the theme value
        if (!theme || !['light', 'dark'].includes(theme)) {
            res.status(400).json({
                success: false,
                message: 'Invalid theme value',
                error: 'INVALID_THEME',
                statusCode: 400
            });
            return;
        }

        // Update the user's theme preference in the database
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    'preferences.theme': theme,
                    updatedAt: getCurrentUTCDate()
                }
            }
        );

        // Check if the user was found
        if (result.modifiedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Retrieve the updated user data
        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

        // Send back the updated user data
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
 * Update the view mode preference of the authenticated user.
 */
export const updateUserViewMode = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { viewMode } = req.body;

        // Validate the view mode value
        if (!viewMode || !['yearToday', 'fullYear'].includes(viewMode)) {
            res.status(400).json({
                success: false,
                message: 'Invalid view mode value',
                error: 'INVALID_VIEW_MODE',
                statusCode: 400
            });
            return;
        }

        // Update the user's view mode preference in the database
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    'preferences.viewMode': viewMode,
                    updatedAt: getCurrentUTCDate()
                }
            }
        );

        // Check if the user was found
        if (result.modifiedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Retrieve the updated user data
        const updatedUser = await usersCollection.findOne({ _id: new ObjectId(userId) });

        // Send back the updated user data
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
 * Change the password of the authenticated user.
 */
export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { currentPassword, newPassword, language } = req.body;

        // Ensure both current and new passwords are provided
        if (!currentPassword || !newPassword) {
            res.status(400).json({
                success: false,
                message: 'Current and new password are required',
                error: 'MISSING_FIELDS',
                statusCode: 400
            });
            return;
        }

        // Validate the new password strength
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

        // Retrieve the user from the database
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

        // Verify the current password
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

        // Hash the new password
        const hashedNewPassword = await bcrypt.hash(newPassword, 10);

        // Update the user's password in the database
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    password: hashedNewPassword,
                    updatedAt: getCurrentUTCDate()
                }
            }
        );

        // Set up the email transporter
        const transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: 'no-reply@profit-lost.com',
                pass: process.env.EMAIL_PASSWORD
            }
        });

        // Send a notification email about the password change
        await transporter.sendMail({
            from: '"Profit-Lost" <no-reply@profit-lost.com>',
            to: user.email,
            subject: user.language === 'esES' ? 'Contraseña actualizada con éxito' : 'Password Changed Successfully',
            html: getPasswordChangeEmailTemplate(user.name, user.language)
        });

        // Send back a success message
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
 * Delete the profile image of the authenticated user.
 */
export const deleteProfileImage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        // Check if the user ID format is valid
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Retrieve the user from the database
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        // Verify if the user exists
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Remove the profile image from Cloudinary if it exists
        if (user.profileImagePublicId) {
            try {
                await cloudinary.uploader.destroy(user.profileImagePublicId);
            } catch (cloudinaryError) {
                console.error('❌ Error deleting image from Cloudinary:', cloudinaryError);
            }
        }

        // Update the user data in the database to remove the profile image
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $unset: { profileImage: '', profileImagePublicId: '' },
                $set: { updatedAt: getCurrentUTCDate() }
            }
        );

        // Send back a success message
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
 * Delete the account of the authenticated user.
 */
export const deleteUserAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        // Check if the user ID format is valid
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Retrieve the user from the database
        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });

        // Verify if the user exists
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Remove the profile image from Cloudinary if it exists
        if (user.profileImagePublicId) {
            try {
                await cloudinary.uploader.destroy(user.profileImagePublicId);
            } catch (cloudinaryError) {
                console.error('❌ Error deleting image from Cloudinary:', cloudinaryError);
            }
        }

        // Send a goodbye email before deleting the account
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

        // Delete all user-related data from all collections
        const userObjectId = new ObjectId(userId);

        // Use Promise.all to execute all deletion operations in parallel
        await Promise.all([
            // Delete the user's accounts
            accountsCollection.deleteMany({ user_id: userObjectId }),

            // Delete the user's categories
            categoriesCollection.deleteMany({ user_id: userObjectId }),

            // Delete the user's transactions
            transactionsCollection.deleteMany({ user_id: userObjectId }),

            // Finally, delete the user
            usersCollection.deleteOne({ _id: userObjectId })
        ]);

        // Clear the token cookie
        res.clearCookie('token');

        // Send back a success message
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
 * Update the order of the authenticated user's accounts.
 */
export const updateAccountsOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { accountsOrder } = req.body;

        // Check if the user ID format is valid
        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Validate the format of the accounts order
        if (!Array.isArray(accountsOrder)) {
            res.status(400).json({
                success: false,
                message: 'Invalid accounts order format',
                error: 'INVALID_FORMAT',
                statusCode: 400
            });
            return;
        }

        // Update the user's accounts order in the database
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    accountsOrder,
                    updatedAt: new Date()
                }
            }
        );

        // Check if any changes were made
        if (result.modifiedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        // Send back a success message
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

/**
 * Updates the preferences for new users.
 */
export const onboardingPreferences = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const preferences = req.body;
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
        // Update the user's preferences in the database
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    preferences,
                    updatedAt: getCurrentUTCDate()
                }
            }
        );
        // Check if the update was successful
        if (result.modifiedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }
        // Respond with a success message
        res.status(200).json({
            success: true,
            message: 'User preferences updated successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error updating user preferences:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Finalizes the onboarding process for the new user.
 */
export const completeOnboarding = async (req: AuthRequest, res: Response): Promise<void> => {
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
        // Mark the onboarding process as completed in the database
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    'onboarding.completed': true,
                    updatedAt: getCurrentUTCDate()
                }
            }
        );
        // Check if the update was successful
        if (result.modifiedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND',
                statusCode: 404
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Onboarding completed successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error completing onboarding:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};

/**
 * Updates the onboarding section for the authenticated user.
 */
export const updateOnboardingSection = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { section } = req.body;

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

        // Update the user's onboarding section in the database
        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $addToSet: {
                    'onboarding.sections': {
                        section,
                        shown: true
                    }
                },
                $set: {
                    updatedAt: getCurrentUTCDate()
                }
            }
        );

        // Respond with success message
        res.status(200).json({
            success: true,
            message: 'Onboarding section updated successfully',
            statusCode: 200
        });
    } catch (error) {
        console.error('❌ Error updating onboarding section:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR',
            statusCode: 500
        });
    }
};