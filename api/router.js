import express from 'express';
import authRouter from './auth/auth.router.js'; // Importing the authentication routes
import usersRouter from './users/users.router.js'; // Importing the user-related routes
import clientRouter from './client/client.router.js'; // importing the client-related routes
import surveysRouter from './surveys/surveys.router.js'; // Importing the surveys routes
import resultsRouter from './results/results.router.js'; // Importing the results routes

// Creating an Express Router instance
const router = express.Router();

// The '/surveys' endpoint will use the surveysRouter, which handles all the survey-related routes
router.use('/surveys', surveysRouter);

// The '/results' endpoint will use the resultsRouter for handling survey responses (user answers)
router.use('/results', resultsRouter);

// The '/auth' endpoint will use the authRouter for handling login, registration, and authentication
router.use('/auth', authRouter);

// The '/users' endpoint will use the usersRouter for managing user data
router.use('/users', usersRouter);

// The '/clients' endpoint will use the clientsRouter for managing client data
router.use('/clients', clientRouter);

export default router;
