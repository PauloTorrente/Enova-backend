import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

// Define client model structure
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

// ⚠️ Log new client creation (remove sensitive data in production)
Client.afterCreate(async (client) => {
  console.log('🆕 Client created ID:', client.id);
});

// Custom method for client registration
Client.register = async function(clientData) {
  console.log('🔍 Checking duplicate email/company...');
  const { companyName, contactEmail } = clientData;
  
  if (await this.findOne({ where: { contactEmail } })) {
    console.log('❌ Email already registered');
    throw new Error('Email already registered');
  }

  if (await this.findOne({ where: { companyName } })) {
    console.log('❌ Company already registered');
    throw new Error('Company already registered');
  }

  const hashedPassword = await bcryptjs.hash(clientData.password, 10);
  const confirmationToken = crypto.randomBytes(20).toString('hex');

  return await this.create({
    ...clientData,
    password: hashedPassword,
    confirmationToken,
    isConfirmed: false,
    role: 'client'
  });
};

// Account confirmation method
Client.confirmAccount = async function(token) {
  console.log('🔑 Validating confirmation token...');
  const client = await this.findOne({ where: { confirmationToken: token } });
  
  if (!client) {
    console.log('❌ Invalid/expired token');
    throw new Error('Invalid token');
  }

  client.isConfirmed = true;
  client.confirmationToken = null;
  console.log('✅ Account confirmed ID:', client.id);
  return await client.save();
};

// Login validation method
Client.login = async function(email, password) {
  console.log('🔐 Attempting login for:', email);
  const client = await this.findOne({ where: { contactEmail: email } });
  
  if (!client) {
    console.log('❌ Client not found');
    throw new Error('Invalid credentials');
  }

  if (!client.isConfirmed) {
    console.log('⚠️ Unconfirmed account');
    throw new Error('Confirm your email first');
  }

  const validPass = await bcryptjs.compare(password, client.password);
  if (!validPass) {
    console.log('❌ Invalid password');
    throw new Error('Invalid credentials');
  }

  console.log('✅ Login successful ID:', client.id);
  return client;
};

export default Client;
