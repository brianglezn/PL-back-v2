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

// Load environment variables from .env file
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 3000;

// Middlewares
// Enable Cross-Origin Resource Sharing (CORS) for specific origins
app.use(cors({
    origin: (origin, callback) => {
        const allowedOrigins = ['https://pl2.profit-lost.com', 'http://localhost:5173'];
        console.log('🔒 Request origin:', origin);
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            console.log('❌ Origin not allowed:', origin);
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

// Agregar en src/index.ts después de los middlewares
app.get('/api/test-cookies', (req, res) => {
    console.log('📝 Test cookies endpoint');
    console.log('Cookies:', req.cookies);
    res.json({
        cookies: req.cookies,
        headers: {
            origin: req.headers.origin,
            cookie: req.headers.cookie
        }
    });
});

// Health check endpoint
app.get('/health', (_, res) => {
    res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
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