import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

// Define the Survey model using Sequelize
const Survey = sequelize.define('Survey', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,       // This is the primary key
    autoIncrement: true,    // Automatically increments for each new survey
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,       // Title is required
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,        // Description is optional
  },
  questions: {
    type: DataTypes.JSON,   // Store questions as JSON array
    allowNull: false,       // Questions are required
    validate: {
      isValidQuestions(value) {
        // First check if questions is an array
        if (!Array.isArray(value)) {
          throw new Error('Questions must be an array');
        }
        
        // Validate each question object in the array
        for (const question of value) {
          // Required fields for every question
          if (!question.type || !question.question || !question.questionId) {
            throw new Error('Each question must have type, question, and questionId');
          }
          
          // If image exists, validate it's a string (URL)
          if (question.imagem && typeof question.imagem !== 'string') {
            throw new Error('Image must be a string (URL)');
          }
          
          // If video exists, validate it's a string (URL)
          if (question.video && typeof question.video !== 'string') {
            throw new Error('Video must be a string (URL)');
          }
        }
      }
    }
  },
  expirationTime: {
    type: DataTypes.DATE,
    allowNull: false,       // Expiration time is required
    field: 'expirationTime', // Maps to this column name in database
  },
  status: {
    type: DataTypes.ENUM('active', 'expired'), // Only these values allowed
    defaultValue: 'active', // Defaults to 'active' when not specified
  },
  accessToken: {
    type: DataTypes.STRING,
    allowNull: false,       // Token is required
    unique: true,           // Each token must be unique
  },
}, {
  tableName: 'surveys',     // Explicit table name
  timestamps: false,        // Don't auto-create createdAt/updatedAt
});

// Define the association between Survey and Result
Survey.associate = (models) => {
  Survey.hasMany(models.Result, {
    foreignKey: 'surveyId', // Foreign key in the Result model
    as: 'results', // Alias for the association
  });
};

export default Survey;
