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

// Middleware configuration
app.use(express.json());
app.use(cors());
app.use(helmet());

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
