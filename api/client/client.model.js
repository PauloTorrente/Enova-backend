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
  contactName: { 
    type: DataTypes.STRING,
    allowNull: false,
    field: 'contact_name'
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
}, {
  tableName: 'clients',
  timestamps: true,
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  underscored: true
});

// Métodos diretamente no Model
Client.register = async function(clientData) {
  const { companyName, contactName, contactEmail, phone, password, industry } = clientData;
  
  const existingClient = await this.findOne({ where: { contactEmail } });
  if (existingClient) throw new Error('Email já registrado');

  const existingCompany = await this.findOne({ where: { companyName } });
  if (existingCompany) throw new Error('Empresa já registrada');

  const hashedPassword = await bcryptjs.hash(password, 10);
  const confirmationToken = crypto.randomBytes(20).toString('hex');

  return await this.create({
    companyName,
    contactName,
    contactEmail,
    phoneNumber: phone,
    password: hashedPassword,
    industry,
    confirmationToken,
    isConfirmed: false
  });
};

Client.confirmAccount = async function(token) {
  const client = await this.findOne({ where: { confirmationToken: token } });
  if (!client) throw new Error('Token inválido ou expirado');

  client.isConfirmed = true;
  client.confirmationToken = null;
  return await client.save();
};

Client.login = async function(contactEmail, password) {
  const client = await this.findOne({ where: { contactEmail } });
  if (!client || !client.isConfirmed) throw new Error('Credenciais inválidas');

  const isPasswordValid = await bcryptjs.compare(password, client.password);
  if (!isPasswordValid) throw new Error('Credenciais inválidas');

  return client;
};

export default Client;
