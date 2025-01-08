import type { Response } from 'express';
import { ObjectId } from 'mongodb';
import bcrypt from 'bcrypt';
import nodemailer from 'nodemailer';
import type { UploadApiResponse } from 'cloudinary';
import { client } from '../config/database';
import type { AuthRequest } from '../middlewares/auth.middleware';
import { cloudinary } from '../config/cloudinary';
import type { IUser } from '../models/types';
import { getAccountDeletionEmailTemplate } from '../utils/emailTemplates';
import { getCurrentUTCDate } from '../utils/dateUtils';

interface MulterRequest extends AuthRequest {
    file?: Express.Multer.File;
}

const usersCollection = client.db(process.env.DB_NAME).collection('users');

export const getUserData = async (req: AuthRequest, res: Response): Promise<void> => {
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

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) }) as IUser | null;

        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
            return;
        }

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
                language: user.language,
                currency: user.currency,
                dateFormat: user.dateFormat,
                timeFormat: user.timeFormat,
            }
        });
    } catch (error) {
        console.error('❌ Error getting user data:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

export const updateUserProfile = async (req: MulterRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { name, surname, language, currency, dateFormat, timeFormat } = req.body;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_ID_FORMAT'
            });
            return;
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
            return;
        }

        const updateData: Partial<IUser> = {
            name,
            surname,
            language,
            currency,
            dateFormat,
            timeFormat,
            updatedAt: getCurrentUTCDate()
        };

        if (req.file) {
            try {
                if (user.profileImagePublicId) {
                    try {
                        await cloudinary.uploader.destroy(user.profileImagePublicId);
                    } catch (cloudinaryError) {
                        console.error('❌ Error deleting old image from cloudinary:', cloudinaryError);
                    }
                }

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

                updateData.profileImage = result.secure_url;
                updateData.profileImagePublicId = result.public_id;
            } catch (error) {
                console.error('❌ Error uploading image:', error);
                res.status(500).json({
                    success: false,
                    message: 'Error uploading profile image',
                    error: 'IMAGE_UPLOAD_ERROR'
                });
                return;
            }
        }

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: updateData }
        );

        if (result.matchedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'USER_NOT_FOUND'
            });
            return;
        }

        if (result.modifiedCount === 0) {
            res.status(400).json({
                success: false,
                message: 'No changes were made',
                error: 'NO_CHANGES'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Profile updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating user profile:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'DATABASE_ERROR'
        });
    }
};

export const changePassword = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { currentPassword, newPassword } = req.body;
        const { userId } = req.user;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_FORMAT'
            });
            return;
        }

        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()])[A-Za-z\d!@#$%^&*()]{8,}$/;
        if (!passwordRegex.test(newPassword)) {
            res.status(400).json({
                success: false,
                message: 'Password must be at least 8 characters long and contain uppercase, lowercase, number and special character',
                error: 'INVALID_PASSWORD'
            });
            return;
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'NOT_FOUND'
            });
            return;
        }

        const passwordMatch = await bcrypt.compare(currentPassword, user.password);
        if (!passwordMatch) {
            res.status(400).json({
                success: false,
                message: 'Current password is incorrect',
                error: 'INVALID_PASSWORD'
            });
            return;
        }

        const hashedNewPassword = await bcrypt.hash(newPassword, 10);
        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            { $set: { password: hashedNewPassword, updatedAt: new Date() } }
        );

        // Email notification
        const transporter = nodemailer.createTransport({
            host: 'smtp.hostinger.com',
            port: 465,
            secure: true,
            auth: {
                user: 'no-reply@profit-lost.com',
                pass: process.env.EMAIL_PASSWORD
            }
        });

        transporter.sendMail({
            from: '"Profit-Lost" <no-reply@profit-lost.com>',
            to: user.email,
            subject: 'Password Changed Successfully',
            html: `
                <div style="font-family: 'Arial', sans-serif; color: #212529;">
                    <h2>Password Changed</h2>
                    <p>Your password has been successfully changed.</p>
                    <p>If you did not make this change, please contact support immediately.</p>
                </div>
            `
        }, (error, info) => {
            if (error) {
                console.error('Error sending email:', error);
            } else {
                console.log('Confirmation email sent:', info.messageId);
            }
        });

        res.status(200).json({
            success: true,
            message: 'Password changed successfully'
        });
    } catch (error) {
        console.error('❌ Error changing password:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};

export const deleteProfileImage = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_FORMAT'
            });
            return;
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'NOT_FOUND'
            });
            return;
        }

        if (user.profileImagePublicId) {
            try {
                await cloudinary.uploader.destroy(user.profileImagePublicId);
            } catch (cloudinaryError) {
                console.error('❌ Error deleting image from cloudinary:', cloudinaryError);
            }
        }

        await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $unset: { profileImage: '', profileImagePublicId: '' },
                $set: { updatedAt: getCurrentUTCDate() }
            }
        );

        res.status(200).json({
            success: true,
            message: 'Profile image deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting profile image:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};

export const deleteUserAccount = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_FORMAT'
            });
            return;
        }

        const user = await usersCollection.findOne({ _id: new ObjectId(userId) });
        if (!user) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'NOT_FOUND'
            });
            return;
        }

        // Enviar correo de despedida antes de eliminar la cuenta
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
            subject: "We're sad to see you go - Profit-Lost",
            html: getAccountDeletionEmailTemplate(user.name)
        });

        // Eliminar el usuario
        const result = await usersCollection.deleteOne({ _id: new ObjectId(userId) });

        if (result.deletedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'NOT_FOUND'
            });
            return;
        }

        res.clearCookie('token');
        res.status(200).json({
            success: true,
            message: 'User account deleted successfully'
        });
    } catch (error) {
        console.error('❌ Error deleting user account:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};

export const updateAccountsOrder = async (req: AuthRequest, res: Response): Promise<void> => {
    try {
        const { userId } = req.user;
        const { accountsOrder } = req.body;

        if (!ObjectId.isValid(userId)) {
            res.status(400).json({
                success: false,
                message: 'Invalid user ID format',
                error: 'INVALID_FORMAT'
            });
            return;
        }

        if (!Array.isArray(accountsOrder)) {
            res.status(400).json({
                success: false,
                message: 'Invalid accounts order format',
                error: 'INVALID_FORMAT'
            });
            return;
        }

        const result = await usersCollection.updateOne(
            { _id: new ObjectId(userId) },
            {
                $set: {
                    accountsOrder,
                    updatedAt: new Date()
                }
            }
        );

        if (result.modifiedCount === 0) {
            res.status(404).json({
                success: false,
                message: 'User not found',
                error: 'NOT_FOUND'
            });
            return;
        }

        res.status(200).json({
            success: true,
            message: 'Accounts order updated successfully'
        });
    } catch (error) {
        console.error('❌ Error updating accounts order:', error);
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: 'SERVER_ERROR'
        });
    }
};