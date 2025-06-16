import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
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
  'http://localhost:5173' // Dev environment
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true); // Allow non-browser tools like Postman
    if (allowedOrigins.includes(origin) || origin.includes('render.com')) {
      callback(null, true);
    } else {
      console.warn(`🌐 CORS blocked for origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Apply middlewares
app.use(express.json()); // Parse incoming JSON
app.use(cors(corsOptions)); // Apply CORS with our config
app.use(helmet()); // Basic security headers

// Pre-flight requests handler
app.options('*', cors(corsOptions));

// Mount API routes
app.use('/api', router);

// Test DB connection and start server
sequelize.authenticate()
  .then(() => {
    console.log('✅ Connected to PostgreSQL database');

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('❌ Database connection error:', err.message);
    process.exit(1); // Stop server if DB fails
  });

// Global error handler
app.use((err, req, res, next) => {
  if (err.name === 'CorsError') {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }

  console.error('🔥 Internal server error:', err.stack);
  res.status(500).send('Algo quebrou!');
});

Result.associate({ User, Survey });
User.associate({ Result });
