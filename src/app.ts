import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import { connectToDatabase } from './config/database';
import { initAnalyticsCron } from './services/analytics.cron';

// Routes
import authRoutes from './routes/auth.routes';
import userRoutes from './routes/user.routes';
import accountRoutes from './routes/account.routes';
import transactionRoutes from './routes/transaction.routes';
import analyticsRoutes from './routes/analytics.routes';

const app = express();

// Middleware
app.use(express.json());
app.use(cookieParser());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/accounts', accountRoutes);
app.use('/api/transactions', transactionRoutes);
app.use('/api/analytics', analyticsRoutes);

// Connect to MongoDB
connectToDatabase().then(() => {
    console.log('Connected to MongoDB');
    
    // Initialize cron jobs
    initAnalyticsCron();
    console.log('Analytics cron jobs initialized');
}).catch(error => {
    console.error('Error connecting to MongoDB:', error);
});

export default app; 