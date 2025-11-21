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
      // Always ensures saving as stringified JSON
      if (typeof value === 'string') {
        try {
          // If it's already a JSON string, validate before saving
          const parsed = JSON.parse(value);
          this.setDataValue('questions', value); // Keep as string
        } catch (error) {
          // If not valid JSON, try to convert
          this.setDataValue('questions', JSON.stringify(value));
        }
      } else {
        // If it's object/array, convert to JSON string
        this.setDataValue('questions', JSON.stringify(value));
      }
    },
    validate: {
      isValidQuestions(value) {
        let questionsToValidate = value;
        
        // Se for string, parseia para validar
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
            if (question.multipleSelections === 'yes') {
              if (question.selectionLimit) {
                if (typeof question.selectionLimit !== 'number' || question.selectionLimit < 1) {
                  throw new Error('selectionLimit must be a positive number');
                }
                if (question.selectionLimit > question.options.length) {
                  throw new Error('selectionLimit cannot exceed the number of available options');
                }
                if (question.selectionLimit === 1) {
                  throw new Error('For single selection, set multipleSelections to "no" instead of using selectionLimit');
                }
              }
            } else {
              // Para seleção única, não deve ter selectionLimit
              if (question.selectionLimit) {
                throw new Error('selectionLimit is only allowed for multiple selection questions (multipleSelections: "yes")');
              }
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
