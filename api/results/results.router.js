import express from 'express'; // Importing express to define the routes
import * as resultsController from './results.controller.js'; // Importing controller functions

const router = express.Router(); // Initializing the router to define our API routes

// Route to save a response for a survey
// POST /results/submit
// This route is used when a user submits a response to a survey question
router.post('/submit', async (req, res) => {
  try {
    const { surveyId, userId, question, answer } = req.body; // Destructuring the data from the request body
    const result = await resultsController.saveResponse(surveyId, userId, question, answer); // Call the controller function to save the response
    res.status(201).json(result); // Respond with a success message and the saved result
  } catch (error) {
    res.status(400).json({ message: error.message }); // Respond with an error message if something goes wrong
  }
});

// Route to get all responses for a specific survey
// GET /results/survey/:surveyId
// This route is used to fetch all responses for a specific survey
router.get('/survey/:surveyId', async (req, res) => {
  try {
    const { surveyId } = req.params; // Extracting the surveyId from the URL parameters
    const responses = await resultsController.getResponsesBySurvey(surveyId); // Call the controller function to fetch responses
    res.status(200).json(responses); // Respond with the list of responses
  } catch (error) {
    res.status(400).json({ message: error.message }); // Respond with an error message if something goes wrong
  }
});

// Route to get all responses for a specific user
// GET /results/user/:userId
// This route is used to fetch all responses for a specific user
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params; // Extracting the userId from the URL parameters
    const responses = await resultsController.getUserResponses(userId); // Call the controller function to fetch responses for the user
    res.status(200).json(responses); // Respond with the list of user responses
  } catch (error) {
    res.status(400).json({ message: error.message }); // Respond with an error message if something goes wrong
  }
});

// Route to get all responses for a specific question in a survey
// GET /results/survey/:surveyId/question/:question
// This route is used to fetch all responses for a specific question in a survey
router.get('/survey/:surveyId/question/:question', async (req, res) => {
  try {
    const { surveyId, question } = req.params; // Extracting surveyId and question from the URL parameters
    const responses = await resultsController.getResponsesByQuestion(surveyId, question); // Call the controller function to fetch responses for the question
    res.status(200).json(responses); // Respond with the list of responses for the specific question
  } catch (error) {
    res.status(400).json({ message: error.message }); // Respond with an error message if something goes wrong
  }
});

export default router; // Exporting the router to be used in the main server file
