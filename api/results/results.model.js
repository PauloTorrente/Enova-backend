import { DataTypes } from 'sequelize'; // Importing DataTypes from Sequelize
import { sequelize } from '../../config/database.js'; // Importing the Sequelize instance

// Defining the Result model using Sequelize ORM
const Result = sequelize.define('Result', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true, // Auto-incrementing ID for each response
  },
  surveyId: {
    type: DataTypes.INTEGER,
    allowNull: false, // Cannot be null, each response must be linked to a survey
    references: {
      model: 'surveys', // The reference is to the Survey model
      key: 'id',
    },
    onDelete: 'CASCADE', // If the survey is deleted, the associated responses will also be deleted
    field: 'survey_id', // Ensuring the correct column name in the database (snake_case)
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false, // Cannot be null, each response must be linked to a user
    references: {
      model: 'users', // The reference is to the User model
      key: 'id',
    },
    onDelete: 'CASCADE', // If the user is deleted, their responses will also be deleted
    field: 'user_id', // Ensuring the correct column name in the database (snake_case)
  },
  question: {
    type: DataTypes.STRING, // The question from the survey that was answered
    allowNull: false, // Cannot be null, we need the question to store the response
  },
  answer: {
    type: DataTypes.JSON, // The answer can be a simple value or an object (for multiple choice questions, for example)
    allowNull: false, // Cannot be null, the response must be provided
  },
}, {
  tableName: 'results', // Defining the table name in the database
  timestamps: false, // Disabling automatic creation of createdAt and updatedAt columns
});

// Define the association between Result and Survey
Result.associate = (models) => {
  Result.belongsTo(models.Survey, {
    foreignKey: 'surveyId', // Foreign key in the Result model
    as: 'survey', // Alias for the association
  });
};

// Exporting the Result model for use in other files
export default Result;