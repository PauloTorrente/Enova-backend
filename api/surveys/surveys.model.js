// surveys.model.js
import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

// Define the Survey model using Sequelize
const Survey = sequelize.define('Survey', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  questions: {
    type: DataTypes.JSON,
    allowNull: false,
    validate: {
      isValidQuestions(value) {
        if (!Array.isArray(value)) {
          throw new Error('Questions must be an array');
        }
        
        const allowedLengths = {
          short: { min: 1, max: 100 },
          medium: { min: 10, max: 300 },
          long: { min: 50, max: 1000 },
          unrestricted: { min: 0, max: Infinity }
        };
        
        for (const question of value) {
          if (!question.type || !question.question || !question.questionId) {
            throw new Error('Each question must have type, question, and questionId');
          }

          if (question.type === 'multiple') {
            if (question.multipleSelections && !['yes', 'no'].includes(question.multipleSelections)) {
              throw new Error('multipleSelections must be either "yes" or "no"');
            }
            
            if (!question.multipleSelections) {
              question.multipleSelections = 'no';
            }

            if (!question.options || !Array.isArray(question.options)) {
              throw new Error('Multiple choice questions must have an options array');
            }

            if (question.multipleSelections === 'yes' && question.options.length < 2) {
              throw new Error('Multiple selection questions require at least two options');
            }

            question.options.forEach(option => {
              if (typeof option !== 'string') {
                throw new Error('All options must be strings');
              }
            });
          }
          
          if (question.imagem && typeof question.imagem !== 'string') {
            throw new Error('Image must be a string (URL)');
          }
          
          if (question.video && typeof question.video !== 'string') {
            throw new Error('Video must be a string (URL)');
          }

          if (question.answerLength) {
            if (typeof question.answerLength !== 'string') {
              throw new Error('answerLength must be a string');
            }
            
            if (!allowedLengths[question.answerLength]) {
              throw new Error(`Invalid answerLength. Allowed values: ${Object.keys(allowedLengths).join(', ')}`);
            }

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
    allowNull: false,
    // Keep as camelCase since database column is camelCase
  },
  status: {
    type: DataTypes.ENUM('active', 'expired'),
    defaultValue: 'active',
  },
  accessToken: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    // Keep as camelCase since database column is camelCase
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'clients',
      key: 'id'
    },
    field: 'client_id' // Map to snake_case column
  },
  responseLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'response_limit', // Map to snake_case column
    validate: {
      min: 1
    }
  },
  // Add explicit timestamp fields to match mixed database naming
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at', // Map to snake_case column
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at', // Map to snake_case column
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'surveys',
  timestamps: true, // Enable timestamps
  underscored: false, // DISABLE this since we have mixed naming
  // We'll handle field mapping manually for each field
});

// Define the association between Survey and Result
Survey.associate = (models) => {
  Survey.hasMany(models.Result, {
    foreignKey: 'surveyId',
    as: 'results',
  });

  // Add association with Client model
  Survey.belongsTo(models.Client, {
    foreignKey: 'clientId',
    as: 'client'
  });
};

export default Survey;
