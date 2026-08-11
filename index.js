import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { sequelize } from './config/database.js';
import router from './api/router.js';
import './api/users/cleanUnconfirmedUsers.js'; 
import User from './api/users/users.model.js';
import Survey from './api/surveys/surveys.model.js';
import Result from './api/results/results.model.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Define which domains are allowed to make requests
const allowedOrigins = [
  'https://www.opinacash.com',
  'https://opinacash.com',
  'http://localhost:5174',
  'https://enova-pulse-rwpd.vercel.app',
  'https://enova-pulse-rne2.vercel.app',
  'https://enova-pulse.vercel.app',
  'https://*.vercel.app' // Not a real CORS wildcard match — actual *.vercel.app requests are allowed by the endsWith() check below, not by this literal string.
];

const corsOptions = {
  origin: function (origin, callback) {
    // Allow requests with no origin (like Postman, mobile apps, etc.)
    if (!origin) return callback(null, true);
    
    // Check if origin is in allowed list
    if (allowedOrigins.includes(origin)) {
      console.log(`✅ CORS allowed for origin: ${origin}`);
      return callback(null, true);
    }
    
    // Check for Vercel preview deployments (*.vercel.app)
    if (origin.endsWith('.vercel.app')) {
      console.log(`✅ CORS allowed for Vercel deployment: ${origin}`);
      return callback(null, true);
    }
    
    // Check for Render deployments
    if (origin.includes('render.com') || origin.includes('onrender.com')) {
      console.log(`✅ CORS allowed for Render deployment: ${origin}`);
      return callback(null, true);
    }
    
    // Block unauthorized origins
    console.warn(`🌐 CORS blocked for origin: ${origin}`);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-CSRF-Token']
};

// Apply middlewares
app.use(express.json()); // Parse incoming JSON data
app.use(cookieParser()); // Parse cookies (httpOnly access/refresh/csrf tokens)
app.use(cors(corsOptions)); // Apply CORS with our configuration
app.use(helmet()); // Add security headers

// Handle pre-flight requests for all routes
app.options('*', cors(corsOptions));

// Mount API routes under /api prefix
app.use('/api', router);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Server is running',
    timestamp: new Date().toISOString(),
    allowedOrigins: allowedOrigins
  });
});

// Test database connection and start server
sequelize.authenticate()
  .then(() => {
    console.log('✅ Connected to PostgreSQL database');
    
    // Start the server
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log('🌐 Allowed origins:', allowedOrigins);
      console.log(`📊 Health check: http://localhost:${PORT}/health`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
    process.exit(1); // Stop server if database connection fails
  });

// Global error handler
app.use((err, req, res, next) => {
  // Handle CORS errors specifically
  if (err.message === 'Not allowed by CORS') {
    return res.status(403).json({ 
      error: 'Access forbidden', 
      message: 'Origin not allowed by CORS policy',
      allowedOrigins: allowedOrigins 
    });
  }

  // Log unexpected errors
  console.error('🔥 Internal server error:', err.stack);
  
  // Send generic error response
  res.status(500).json({ 
    error: 'Internal server error',
    message: 'Something went wrong!'
  });
});

// Setup database associations
Result.associate({ User, Survey });
User.associate({ Result });
