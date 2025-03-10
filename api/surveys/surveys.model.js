import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js'; // Import Sequelize instance

// Define the Survey model using Sequelize ORM
const Survey = sequelize.define('Survey', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true, // Auto-incrementing ID for each survey
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false, // Title is required for each survey
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true, // Description is optional
  },
  questions: {
    type: DataTypes.JSON, // Stores survey questions as JSON (array of question objects)
    allowNull: false, // Questions are required
  },
  expirationTime: {
    type: DataTypes.DATE,
    allowNull: false, // Expiration time is required
    field: 'expirationTime', // Make sure to match the exact column name in the database
  },
  status: {
    type: DataTypes.ENUM('active', 'expired'), // Status can be 'active' or 'expired'
    defaultValue: 'active', // Default status is 'active'
  },
  accessToken: {
    type: DataTypes.STRING,
    allowNull: false, // Token is required for survey access
    unique: true, // Ensure each survey has a unique token
  },
}, {
  tableName: 'surveys', // Explicitly set table name
  timestamps: false, // Disable automatic creation of createdAt and updatedAt columns
});

// Define the association between Survey and Result
Survey.associate = (models) => {
  Survey.hasMany(models.Result, {
    foreignKey: 'surveyId', // Foreign key in the Result model
    as: 'results', // Alias for the association
  });
};

export default Survey;
