import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js'; // Import Sequelize instance

// Define the Results model using Sequelize ORM
const Result = sequelize.define('Result', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true, // Auto-incrementing ID for each response
  },
  // The user who answered the survey
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false, // User ID is required
    references: {
      model: 'users', // Assuming 'users' table exists in your database (accounts_db)
      key: 'id',
    },
  },
  // The survey that was answered
  surveyId: {
    type: DataTypes.INTEGER,
    allowNull: false, // Survey ID is required
    references: {
      model: 'surveys', // Assuming 'surveys' table exists
      key: 'id',
    },
  },
  // Store the user's answers as a JSON object (can be an array of answers or key-value pairs)
  answers: {
    type: DataTypes.JSON, // Store responses as JSON (can include multiple answers)
    allowNull: false, // Answers are required
  },
  // Store the date/time when the response was submitted
  submittedAt: {
    type: DataTypes.DATE,
    allowNull: false, // Required for tracking submission time
    defaultValue: DataTypes.NOW, // Set default to the current time
  },
}, {
  tableName: 'results', // Explicitly set table name for the results
  timestamps: true, // Enables createdAt and updatedAt timestamps automatically
});

export default Result;
