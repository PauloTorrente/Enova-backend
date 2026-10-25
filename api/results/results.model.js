import { DataTypes } from 'sequelize'; // Importing DataTypes from Sequelize
import { sequelize } from '../../config/database.js'; // Importing the Sequelize instance
import User from '../users/users.model.js';
import Survey from '../surveys/surveys.model.js'; // Survey model, needed for the belongsTo association below

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
    // TEXT, not STRING (VARCHAR 255) — Estudio 7's "Lee esta idea" question
    // embeds the full concept body (40-80 words, easily 300+ chars), and
    // VARCHAR(255) made every response to it fail at insert time with
    // "value too long for type character varying(255)" (a 500 on submit,
    // not a validation error — the respondent had answered everything).
    type: DataTypes.TEXT,
    allowNull: false, // Cannot be null, we need the question to store the response
  },
  // The question's stable questionId (as opposed to `question`, its
  // display text, which can change or repeat). Nullable because rows
  // saved before this column existed only have the text. Needed to map a
  // respondent's answers back to a specific field reliably — e.g. the
  // Perfilación Quirúrgica survey's Graffar calculation reads answers by
  // questionId, not by matching display text (see api/profiling/).
  questionId: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'question_id',
  },
  answer: {
    type: DataTypes.JSON, // The answer can be a simple value or an object (for multiple choice questions, for example)
    allowNull: false, // Cannot be null, the response must be provided
  },
}, {
  tableName: 'results', // Defining the table name in the database
  timestamps: false, // Disabling automatic creation of createdAt and updatedAt columns
});

// Define the association between Result and other models
Result.associate = function(models) {
  Result.belongsTo(models.User, {
    foreignKey: 'userId',
    as: 'user'
  });
  Result.belongsTo(models.Survey, {
    foreignKey: 'surveyId',
    as: 'survey'
  });
};

// Exporting the Result model for use in other files
export default Result;
