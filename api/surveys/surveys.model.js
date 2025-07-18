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
        
        // Define allowed answer length constraints
        const allowedLengths = {
          short: { min: 1, max: 100 },     // Minimum 1, maximum 100 chars
          medium: { min: 10, max: 300 },   // Minimum 10, maximum 300 chars
          long: { min: 50, max: 1000 },    // Minimum 50, maximum 1000 chars
          unrestricted: { min: 0, max: Infinity } // No limits
        };
        
        // Validate each question object in the array
        for (const question of value) {
          // Required fields for every question
          if (!question.type || !question.question || !question.questionId) {
            throw new Error('Each question must have type, question, and questionId');
          }         
          // Validation for multiple-choice questions
          if (question.type === 'multiple') {
            // Validate if multiple selections are allowed
            if (question.multipleSelections) {
              if (!Array.isArray(question.options) || question.options.length < 1) {
                throw new Error('Multiple selection questions require an options array with at least one option');
              }
            }
            // Validate that it has defined options (even for single selection)
            if (!question.options || !Array.isArray(question.options)) {
              throw new Error('Multiple choice questions must have an options array');
            }
          }
          
          // If image exists, validate it's a string (URL)
          if (question.imagem && typeof question.imagem !== 'string') {
            throw new Error('Image must be a string (URL)');
          }
          
          // If video exists, validate it's a string (URL)
          if (question.video && typeof question.video !== 'string') {
            throw new Error('Video must be a string (URL)');
          }

          // Validate answerLength if provided
          if (question.answerLength) {
            if (typeof question.answerLength !== 'string') {
              throw new Error('answerLength must be a string');
            }
            
            // Check if answerLength is one of the allowed types
            if (!allowedLengths[question.answerLength]) {
              throw new Error(`Invalid answerLength. Allowed values: ${Object.keys(allowedLengths).join(', ')}`);
            }

            // For text questions, validate min/max constraints if options are provided
            if (question.type === 'text' && question.options) {
              const options = Array.isArray(question.options) ? question.options : [];
              options.forEach(option => {
                if (option.minLength && typeof option.minLength !== 'number') {
                  throw new Error('minLength must be a number');
                }
                if (option.maxLength && typeof option.maxLength !== 'number') {
                  throw new Error('maxLength must be a number');
                }
              });
            }
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
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: true,        // Can be null for surveys created by admins
    references: {
      model: 'clients',    // References the clients table
      key: 'id'            // References the id field in clients table
    },
    field: 'client_id'     // Database column name
  },
  responseLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,       // Can be null (unlimited responses)
    defaultValue: null,    // Default value is null (unlimited)
    field: 'response_limit', // Database column name
    validate: {
      min: 1              // Minimum value if not null
    }
  }
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

  // Add association with Client model
  Survey.belongsTo(models.Client, {
    foreignKey: 'clientId',
    as: 'client'
  });
};

export default Survey;
