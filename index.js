import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { sequelize } from './config/database.js';
import router from './api/router.js';
import './api/users/cleanUnconfirmedUsers.js';

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
  'https://www.opinacash.com',
  'https://opinacash.com',
  'http://localhost:5173' 
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1 || origin.includes('render.com')) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
};

// Middleware configuration
app.use(express.json());
app.use(cors(corsOptions)); 
app.use(helmet());

app.options('*', cors(corsOptions));

// Router configuration
app.use('/api', router);

// Test database connection
sequelize.authenticate()
  .then(() => {
    console.log('Connected to PostgreSQL database');

    // Start the server
    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error('Database connection error:', err);
    process.exit(1);
  });

// Error handling middleware
app.use((err, req, res, next) => {
  if (err.name === 'CorsError') {
    return res.status(403).json({ error: 'Acesso não autorizado' });
  }
  console.error(err.stack);
  res.status(500).send('Algo quebrou!');
});
