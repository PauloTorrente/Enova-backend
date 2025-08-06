import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

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
  contactEmail: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
    validate: {
      isEmail: true
    },
    field: 'contact_email'
  },
  phoneNumber: {
    type: DataTypes.STRING,
    allowNull: true,
    validate: {
      is: /^\+?[\d\s\-()]+$/ 
    },
    field: 'phone_number'
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
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
}, {
  tableName: 'clients',
  timestamps: false,
});

export default Client;
