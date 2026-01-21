import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

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
    get() {
      const rawValue = this.getDataValue('questions');
      try {
        // If it's a string, parse to object
        if (typeof rawValue === 'string') {
          return JSON.parse(rawValue);
        }
        // If it's already an object, return directly
        return rawValue;
      } catch (error) {
        console.error('Error parsing questions in getter:', error);
        return [];
      }
    },
    set(value) {
      if (typeof value === 'string') {
        try {
          JSON.parse(value);
          this.setDataValue('questions', value);
        } catch (error) {
          this.setDataValue('questions', JSON.stringify(value));
        }
      } else {
        this.setDataValue('questions', JSON.stringify(value));
      }
    },
    validate: {
      isValidQuestions(value) {
        let questionsToValidate = value;
        
        // If it's a string, parse to validate
        if (typeof questionsToValidate === 'string') {
          try {
            questionsToValidate = JSON.parse(questionsToValidate);
          } catch (error) {
            throw new Error('Invalid JSON format for questions');
          }
        }
        
        if (!Array.isArray(questionsToValidate)) {
          throw new Error('Questions must be an array');
        }
        
        const allowedLengths = {
          short: { min: 1, max: 100 },
          medium: { min: 10, max: 300 },
          long: { min: 50, max: 1000 },
          unrestricted: { min: 0, max: Infinity }
        };
        
        for (const question of questionsToValidate) {
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

            // Validate each option in the multiple choice question
            question.options.forEach((option, index) => {
              // Allow both string options and "Other" option objects
              if (typeof option !== 'string' && typeof option !== 'object') {
                throw new Error(`Option ${index + 1} must be a string or an object`);
              }
              
              // If it's an object, validate it as an "Other" option
              if (typeof option === 'object') {
                if (option.type !== 'other') {
                  throw new Error(`Option ${index + 1}: Custom option objects must have type: "other"`);
                }
                if (!option.label || typeof option.label !== 'string') {
                  throw new Error(`Option ${index + 1}: Other option must have a string label`);
                }
                // Set default value for requiresTextInput if not provided
                if (option.requiresTextInput === undefined) {
                  option.requiresTextInput = true;
                }
                if (typeof option.requiresTextInput !== 'boolean') {
                  throw new Error(`Option ${index + 1}: requiresTextInput must be a boolean`);
                }
              }
            });

            // Validate selectionLimit for multiple selection questions
            if (question.multipleSelections === 'yes') {
              if (question.selectionLimit) {
                if (typeof question.selectionLimit !== 'number' || question.selectionLimit < 1) {
                  throw new Error('selectionLimit must be a positive number');
                }
                
                // Count only non-"Other" options for validation (strings)
                const nonOtherOptionsCount = question.options.filter(opt => typeof opt === 'string').length;
                
                if (question.selectionLimit > nonOtherOptionsCount) {
                  throw new Error('selectionLimit cannot exceed the number of standard (non-Other) options');
                }
                if (question.selectionLimit === 1) {
                  throw new Error('For single selection, set multipleSelections to "no" instead of using selectionLimit');
                }
              }
            } else {
              // For single selection questions, selectionLimit should not be set
              if (question.selectionLimit) {
                throw new Error('selectionLimit is only allowed for multiple selection questions (multipleSelections: "yes")');
              }
            }
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
  },
  status: {
    type: DataTypes.ENUM('active', 'expired'),
    defaultValue: 'active',
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'clients',
      key: 'id'
    },
    field: 'client_id'
  },
  responseLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'response_limit',
    validate: {
      min: 1
    }
  },
  // CAMPO NOVO ADICIONADO
  accessToken: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at',
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'surveys',
  timestamps: true,
  underscored: false,
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
