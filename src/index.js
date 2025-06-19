// src/index.js - Updated CORS Configuration
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

// CORS configuration
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  process.env.FRONTEND_URL,
  'https://code-craft-frontend-4wg4xt2dc-thecosmicgiants-projects.vercel.app', // Your current Vercel URL
  'https://codecraft-frontend-uj45.onrender.com', // Your old Render URL
];

// Add any additional origins from environment variable
if (process.env.ALLOWED_ORIGINS) {
  const additionalOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
  allowedOrigins.push(...additionalOrigins);
}

// Remove undefined/null values
const cleanOrigins = allowedOrigins.filter(Boolean);

console.log('🌍 Allowed CORS origins:', cleanOrigins);

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (cleanOrigins.indexOf(origin) !== -1) {
      console.log(`✅ CORS allowed for origin: ${origin}`);
      callback(null, true);
    } else {
      console.log(`❌ CORS blocked for origin: ${origin}`);
      console.log(`🔍 Allowed origins: ${cleanOrigins.join(', ')}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: false, // No cookies needed for JWT
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200 // For legacy browser support
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

// Health check route
app.get('/', (req, res) => {
  res.json({
    message: 'API is running...',
    cors_origins: cleanOrigins,
    environment: process.env.NODE_ENV
  });
});

// CORS test route
app.get('/api/v1/cors-test', (req, res) => {
  res.json({
    message: 'CORS is working!',
    origin: req.headers.origin,
    timestamp: new Date().toISOString()
  });
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
  console.log(`CORS Origins: ${cleanOrigins.join(', ')}`);
});