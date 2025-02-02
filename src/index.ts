import express from 'express';
import type { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';

import { connectDB } from './config/database';
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import categoryRoutes from './routes/category.routes';
import accountRoutes from './routes/account.routes';
import noteRoutes from './routes/note.routes';
import transactionRoutes from './routes/transaction.routes';
import { backupService } from './services/backup.service';

// Load environment variables from .env file
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middlewares
// Enable Cross-Origin Resource Sharing (CORS) for specific origins
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = ['https://profit-lost.com', 'http://localhost:5173'];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie']
}));
app.use(express.json());
app.use(cookieParser());
app.use(morgan('dev'));

// API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/notes', noteRoutes);

// Health check endpoint
app.get('/health', (_, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Iniciar el servicio de backups programados
backupService.startScheduledBackups();

// Endpoint para backups manuales
app.post('/api/backup', async (req, res) => {
    try {
        const result = await backupService.executeManualBackup();
        res.status(result.success ? 200 : 500).json(result);
    } catch (error) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: (error as Error).message
        });
    }
});

// Initialize server and database connection
async function initializeServer() {
    try {
        await connectDB();
        app.listen(PORT, () => {
            console.log(`🚀 Server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Failed to initialize server:', error);
        process.exit(1);
    }
}

initializeServer(); 