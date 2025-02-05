import { Router } from 'express';
import type { Request, Response, RequestHandler } from 'express';
import { login, logout, register, forgotPassword, verifyResetToken, resetPassword, googleAuth } from '../controllers/auth.controller';

const router = Router();

/**
 * Wrapper for the register controller to handle errors gracefully.
 * Ensures the request is passed to the `register` controller and any errors are caught.
 */
const registerHandler: RequestHandler = async (req, res, next) => {
    try {
        await register(req as Request, res as Response); // Call the register controller
    } catch (error) {
        next(error); // Forward errors to the error handler middleware
    }
};

/**
 * Wrapper for the login controller to handle errors gracefully.
 * Ensures the request is passed to the `login` controller and any errors are caught.
 */
const loginHandler: RequestHandler = async (req, res, next) => {
    try {
        await login(req as Request, res as Response); // Call the login controller
    } catch (error) {
        next(error); // Forward errors to the error handler middleware
    }
};

/**
 * Wrapper for the logout controller to handle errors gracefully.
 * Ensures the request is passed to the `logout` controller and any errors are caught.
 */
const logoutHandler: RequestHandler = async (req, res, next) => {
    try {
        await logout(req as Request, res as Response); // Call the logout controller
    } catch (error) {
        next(error); // Forward errors to the error handler middleware
    }
};

/**
 * Wrapper for the forgot password controller to handle errors gracefully.
 * Ensures the request is passed to the `forgotPassword` controller and any errors are caught.
 */
const forgotPasswordHandler: RequestHandler = async (req, res, next) => {
    try {
        await forgotPassword(req as Request, res as Response);
    } catch (error) {
        next(error);
    }
};

/**
 * Wrapper for the verify reset token controller to handle errors gracefully.
 * Ensures the request is passed to the `verifyResetToken` controller and any errors are caught.
 */
const verifyResetTokenHandler: RequestHandler = async (req, res, next) => {
    try {
        await verifyResetToken(req as Request, res as Response);
    } catch (error) {
        next(error);
    }
};

/**
 * Wrapper for the reset password controller to handle errors gracefully.
 * Ensures the request is passed to the `resetPassword` controller and any errors are caught.
 */
const resetPasswordHandler: RequestHandler = async (req, res, next) => {
    try {
        await resetPassword(req as Request, res as Response);
    } catch (error) {
        next(error);
    }
};

const googleAuthHandler: RequestHandler = async (req, res, next) => {
    try {
        await googleAuth(req as Request, res as Response);
    } catch (error) {
        next(error);
    }
};

// Routes
router.post('/register', registerHandler);
router.post('/login', loginHandler);
router.post('/logout', logoutHandler);
router.post('/forgot-password', forgotPasswordHandler);
router.post('/verify-reset-token', verifyResetTokenHandler);
router.post('/reset-password', resetPasswordHandler);
router.post('/google', googleAuthHandler);

export default router;
