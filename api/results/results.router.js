import express from 'express'; // Importing express to define the routes
import * as resultsController from './results.controller.js'; // Importing controller functions

const router = express.Router(); // Initializing the router to define our API routes

// Route to save a response for a survey
// POST /results/submit
// This route is used when a user submits a response to a survey question
router.post('/submit', async (req, res) => {
  try {
    const { surveyId, userId, question, answer } = req.body; // Destructuring the data from the request body
    console.log('POST /results/submit called');
    console.log('Request body:', req.body);

    // Ensure all required fields are present
    if (!surveyId || !userId || !question || !answer) {
      console.log('Validation failed: Missing required fields');
      return res.status(400).json({ message: 'All fields (surveyId, userId, question, and answer) are required' });
    }

    const result = await resultsController.saveResponse(surveyId, userId, question, answer); // Call the controller function to save the response
    console.log('Response saved:', result);

    res.status(201).json(result); // Respond with a success message and the saved result
  } catch (error) {
    console.error('Error in POST /results/submit:', error.message);
    res.status(400).json({ message: error.message }); // Respond with an error message if something goes wrong
  }
});

// Route to get all responses for a specific survey
// GET /results/survey/:surveyId
// This route is used to fetch all responses for a specific survey
router.get('/survey/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params; // Extracting the surveyId from the URL parameters
    console.log('GET /results/survey/:surveyId called');
    console.log('surveyId:', surveyId);

    if (!surveyId) {
      console.log('Validation failed: Missing surveyId');
      return res.status(400).json({ message: 'surveyId is required' });
    }

    const responses = await resultsController.getResponsesBySurvey(surveyId); // Call the controller function to fetch responses
    console.log(`Found ${responses.length} responses for surveyId: ${surveyId}`);

    res.status(200).json(responses); // Respond with the list of responses
  } catch (error) {
    console.error('Error in GET /results/survey/:surveyId:', error.message);
    res.status(400).json({ message: error.message }); // Respond with an error message if something goes wrong
  }
});

// Route to get all responses for a specific user
// GET /results/user/:userId
// This route is used to fetch all responses for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params; // Extracting the userId from the URL parameters
    console.log('GET /results/user/:userId called');
    console.log('userId:', userId);

    if (!userId) {
      console.log('Validation failed: Missing userId');
      return res.status(400).json({ message: 'userId is required' });
    }

    const responses = await resultsController.getUserResponses(userId); // Call the controller function to fetch responses for the user
    console.log(`Found ${responses.length} responses for userId: ${userId}`);

    res.status(200).json(responses); // Respond with the list of user responses
  } catch (error) {
    console.error('Error in GET /results/user/:userId:', error.message);
    res.status(400).json({ message: error.message }); // Respond with an error message if something goes wrong
  }
});

// Route to get all responses for a specific question in a survey
// GET /results/survey/:surveyId/question/:question
// This route is used to fetch all responses for a specific question in a survey
router.get('/survey/:surveyId/question/:question', async (req, res) => {
  try {
    const { surveyId, question } = req.params; // Extracting surveyId and question from the URL parameters
    console.log('GET /results/survey/:surveyId/question/:question called');
    console.log('surveyId:', surveyId, 'question:', question);

    if (!surveyId || !question) {
      console.log('Validation failed: Missing surveyId or question');
      return res.status(400).json({ message: 'surveyId and question are required' });
    }

    const responses = await resultsController.getResponsesByQuestion(surveyId, question); // Call the controller function to fetch responses for the question
    console.log(`Found ${responses.length} responses for surveyId: ${surveyId}, question: ${question}`);

    res.status(200).json(responses); // Respond with the list of responses for the specific question
  } catch (error) {
    console.error('Error in GET /results/survey/:surveyId/question/:question:', error.message);
    res.status(400).json({ message: error.message }); // Respond with an error message if something goes wrong
  }
});

export default router; // Exporting the router to be used in the main server file
