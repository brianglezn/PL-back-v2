import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthRequest extends Request {
    user?: {
        userId: string;
        email: string;
        username: string;
    };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
    try {
        const token = req.cookies.token;

        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'No se proporcionó token',
                error: 'NO_TOKEN'
            });
        }

        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as {
                userId: string;
                email: string;
                username: string;
            };

            req.user = decoded;
            next();
        } catch (jwtError) {
            return res.status(401).json({
                success: false,
                message: 'Token inválido o expirado',
                error: 'INVALID_TOKEN'
            });
        }
    } catch (error) {
        console.error('❌ Error en auth middleware:', error);
        return res.status(500).json({
            success: false,
            message: 'Error interno del servidor',
            error: 'SERVER_ERROR'
        });
    }
}; 