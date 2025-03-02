import express from 'express';
import type { Application } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import dotenv from 'dotenv';

// Import the database connection
import { connectDB } from './config/database';

// Import routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import categoryRoutes from './routes/category.routes';
import accountRoutes from './routes/account.routes';
import noteRoutes from './routes/note.routes';
import transactionRoutes from './routes/transaction.routes';
import analyticsRoutes from './routes/analytics.routes';
// Import services
import { startScheduledBackups, executeManualBackup } from './services/backup.service';
import { initAnalyticsCron } from './services/analytics.cron';

// Load environment variables from .env file
dotenv.config();

// Create the express application
const app: Application = express();

// Define the port
const PORT = process.env.PORT || 3000;

// Enable Cross-Origin Resource Sharing (CORS) for specific origins
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = [
            'https://profit-lost.com',
            'https://www.profit-lost.com',
            'http://localhost:5173'
        ];
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('CORS policy: Origin not allowed'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
    exposedHeaders: ['Set-Cookie'],
    maxAge: 86400
}));

// Parse JSON bodies
app.use(express.json());

// Parse cookies
app.use(cookieParser());

// Log requests
app.use(morgan('dev'));

// Allow credentials
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Credentials', 'true');
    next();
});

// API endpoints
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/notes', noteRoutes);
app.use('/api/analytics', analyticsRoutes);

// Health check endpoint
app.get('/health', (_, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Manual backup endpoint
app.post('/api/backup', async (req, res) => {
    try {
        const result = await executeManualBackup();
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

        // Start the scheduled backups service
        startScheduledBackups();
        // Initialize the analytics cron job after connecting to the database
        initAnalyticsCron();

        app.listen(PORT, () => {
            console.log(`🚀 Server is successfully running on port ${PORT}`);
        });
    } catch (error) {
        console.error('❌ Server initialization failed due to an error:', error);
        process.exit(1);
    }
}

initializeServer(); 