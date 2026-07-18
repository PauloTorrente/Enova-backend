import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import * as authMethods from './client.auth-methods.util.js';

// Static register/confirmAccount/login methods live in
// client.auth-methods.util.js — kept separate from the schema below since
// they're business logic, not column mapping.
const Client = sequelize.define('Client', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  companyName: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    field: 'company_name'
  },
  contactName: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'contact_name'
  },
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: { isEmail: true },
    field: 'contact_email'
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: { is: /^\+?[\d\s\-()]+$/ },
    field: 'phone_number'
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  industry: {
    type: DataTypes.STRING,
    allowNull: false,
    field: 'industry'
  },
  idIntentification: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'id_intentification'
  },
  isConfirmed: {
    type: DataTypes.BOOLEAN,
    defaultValue: false,
    field: 'is_confirmed'
  },
  confirmationToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'confirmation_token'
  },
  resetPasswordToken: {
    type: DataTypes.STRING,
    allowNull: true,
    field: 'reset_password_token'
  },
  resetPasswordExpires: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'reset_password_expires'
  },
  role: {
    type: DataTypes.STRING,
    defaultValue: 'client',
    allowNull: false,
    validate: {
      isIn: [['client', 'client_admin']]
    },
    field: 'role'
  },
  permissions: {
    type: DataTypes.JSON,
    defaultValue: {
      canAwardPoints: false,
      canViewAllSurveys: false,
      canViewUserScores: false,
      canManageUsers: false
    },
    field: 'permissions'
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    field: 'login_attempts'
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_login'
  },
  lastFailedAttempt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'last_failed_attempt'
  }
}, {
  tableName: 'clients',
  timestamps: true,
  underscored: true
});

Client.afterCreate(async (client) => {
  console.log(`[client.model] New client created (id=${client.id})`);
});

Client.register = (clientData) => authMethods.register(Client, clientData);
Client.confirmAccount = (token) => authMethods.confirmAccount(Client, token);
Client.login = (email, password) => authMethods.login(Client, email, password);

export default Client;
