import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js'; // Import Sequelize instance

// Define the Result model using Sequelize ORM
const Result = sequelize.define('Result', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  surveyId: {
    type: DataTypes.INTEGER,
    allowNull: false, // Survey ID is required
    references: {
      model: 'surveys',
      key: 'id',
    },
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false, // User ID is required
    references: {
      model: 'users',
      key: 'id',
    },
  },
  questionId: {
    type: DataTypes.INTEGER,
    allowNull: false, // Question ID is required
  },
  answer: {
    type: DataTypes.JSONB, // Store the answer as JSON for flexibility (supports multiple choices, text, etc.)
    allowNull: false, // Answer is required
  },
}, {
  tableName: 'results', // Explicitly set table name
  timestamps: false, // Disable automatic creation of createdAt and updatedAt columns
});

export default Result;
