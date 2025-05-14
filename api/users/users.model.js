import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'last_name',
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isConfirmed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'isconfirmed',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'createdat',
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'resetpasswordtoken',
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resetpasswordexpires',
    },
    confirmationToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'confirmationtoken',
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true, 
    },
    phoneNumber: {
      type: DataTypes.STRING,
      allowNull: true, 
      field: 'phone_number',
      validate: {
        isString(value) {
          if (value && typeof value !== 'string') {
            throw new Error('Phone number must be a string');
          }
        }
      }
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    residentialArea: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'residential_area',
    },
    purchaseResponsibility: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'purchase_responsibility',
    },
    childrenCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'children_count',
    },
    childrenAges: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
      field: 'children_ages',
    },
    educationLevel: {
      type: DataTypes.STRING,
      allowNull: true, 
      field: 'education_level',
    },
    walletBalance: {
      type: DataTypes.FLOAT,
      defaultValue: 0, 
      field: 'wallet_balance',
    },
  },
  {
    tableName: 'accounts_db',
    timestamps: false,
  }
);

export default User;
