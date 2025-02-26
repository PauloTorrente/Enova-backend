import jwt from 'jsonwebtoken'; // Importing jsonwebtoken to verify the JWT

// Middleware to check if the user is authenticated
export const authenticateUser = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.log('No token provided'); // Debugging log
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify the token and decode it
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // Attach user info to request

    console.log('Authenticated User:', req.user); // Debugging log

    // Check if the token contains a surveyId
    if (!req.user.surveyId) {
      return res.status(400).json({ message: 'Survey ID missing in token' });
    }

    next(); // Proceed to the next middleware or route handler
  } catch (error) {
    console.error('Token validation error:', error.message); // Debugging log
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

// Middleware to check if the user is authenticated and is an admin
export const authenticateAdmin = (req, res, next) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    console.log('No token provided'); // Debugging log
    return res.status(401).json({ message: 'No token, authorization denied' });
  }

  try {
    // Verify the token and decode it
    const decoded = jwt.verify(token, process.env.JWT_SECRET); 
    req.user = decoded; // Attach user info to request

    console.log('Authenticated Admin:', req.user); // Debugging log

    // Check if the user role is admin
    if (req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. Only admins can create surveys.' });
    }

    next(); // If the user is an admin, proceed to the next middleware or route handler
  } catch (error) {
    console.error('Token validation error:', error.message); // Debugging log
    return res.status(401).json({ message: 'Token is not valid' });
  }
};

// Controller function to get responses by survey ID
export const getResponsesBySurvey = async (req, res) => {
  try {
    console.log('Request User:', req.user); // Debugging log
    console.log('Request Params:', req.params); // Debugging log

    const { surveyId } = req.params; // Extract surveyId from URL
    console.log('Extracted Survey ID:', surveyId); // Debugging log

    if (!surveyId) {
      return res.status(400).json({ message: 'Survey ID is required' });
    }

    const responses = await resultsService.getResponsesBySurvey(surveyId);
    if (responses.length === 0) {
      return res.status(404).json({ message: 'No responses found for this survey.' });
    }

    return res.status(200).json({ message: 'Responses fetched successfully!', responses });
  } catch (error) {
    console.error('Error in getResponsesBySurvey:', error); // Debugging log
    return res.status(500).json({ message: 'Error fetching responses for the survey', error: error.message });
  }
};
