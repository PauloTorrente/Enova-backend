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
    field: 'expirationTime', 
  },
  status: {
    type: DataTypes.ENUM('active', 'expired'), // Status can be 'active' or 'expired'
    defaultValue: 'active', // Default status is 'active'
  },
  createdBy: {
    type: DataTypes.INTEGER,
    allowNull: false, // Creator (admin user ID) is required
    references: {
      model: 'accounts_db', // Reference to the users table
      key: 'id',
    },
  },
}, {
  tableName: 'surveys', // Explicitly set table name
  timestamps: true, // Enables createdAt and updatedAt timestamps
});

export default Survey;
