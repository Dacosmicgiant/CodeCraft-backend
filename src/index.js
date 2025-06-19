// src/index.js - Simple CORS (No Cookies)
import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import connectDB from './lib/db.js';

// Import routes
import authRoutes from './routes/auth.route.js';
import userRoutes from './routes/user.route.js';
import domainRoutes from './routes/domain.route.js';
import technologyRoutes from './routes/technology.route.js';
import tutorialRoutes from './routes/tutorial.route.js';
import lessonRoutes from './routes/lesson.route.js';
import tutorialLessonRoutes from './routes/tutorial.lesson.route.js';

// Load environment variables
dotenv.config();

// Connect to database
connectDB();

const app = express();

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Simple CORS configuration
const corsOptions = {
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    'https://your-app.vercel.app', // Replace with your Vercel URL
    process.env.FRONTEND_URL
  ].filter(Boolean), // Remove undefined values
  credentials: false, // No cookies needed
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
};

app.use(cors(corsOptions));

// Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/domains', domainRoutes);
app.use('/api/v1/technologies', technologyRoutes);
app.use('/api/v1/tutorials', tutorialRoutes);
app.use('/api/v1/lessons', lessonRoutes);
app.use('/api/v1/tutorials/:tutorialId/lessons', tutorialLessonRoutes);

// Base route
app.get('/', (req, res) => {
  res.send('API is running...');
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(`Error: ${err.message}`);
  const statusCode = res.statusCode === 200 ? 500 : res.statusCode;
  res.status(statusCode);
  res.json({
    message: err.message,
    stack: process.env.NODE_ENV === 'production' ? null : err.stack,
  });
});

// Start server
const PORT = process.env.PORT || 5001;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV}`);
});