import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

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

Client.afterCreate(async (client, options) => {
  console.log('[MODEL] Novo cliente criado:', { 
    id: client.id,
    companyName: client.companyName,
    contactEmail: client.contactEmail,
    contactName: client.contactName,
    phoneNumber: client.phoneNumber,
    industry: client.industry
  });
});

Client.afterFind(async (clients, options) => {
  if (Array.isArray(clients)) {
    console.log(`[MODEL] ${clients.length} clientes encontrados`);
  } else if (clients) {
    console.log('[MODEL] Cliente encontrado:', {
      id: clients.id,
      companyName: clients.companyName
    });
  } else {
    console.log('[MODEL] Nenhum cliente encontrado');
  }
});

Client.afterUpdate(async (client, options) => {
  console.log('[MODEL] Cliente atualizado:', {
    id: client.id,
    changes: client._changed
  });
});

Client.register = async function(clientData) {
  console.log('[MODEL] Iniciando registro de cliente');
  
  const { companyName, contactName, contactEmail, phone, password, industry } = clientData;
  
  console.log('[MODEL] Verificando email existente:', contactEmail);
  const existingClient = await this.findOne({ where: { contactEmail } });
  if (existingClient) {
    console.log('[MODEL] Email já registrado:', contactEmail);
    throw new Error('Email já registrado');
  }

  console.log('[MODEL] Verificando empresa existente:', companyName);
  const existingCompany = await this.findOne({ where: { companyName } });
  if (existingCompany) {
    console.log('[MODEL] Empresa já registrada:', companyName);
    throw new Error('Empresa já registrada');
  }

  console.log('[MODEL] Gerando hash da senha');
  const hashedPassword = await bcryptjs.hash(password, 10);
  
  console.log('[MODEL] Gerando token de confirmação');
  const confirmationToken = crypto.randomBytes(20).toString('hex');

  console.log('[MODEL] Criando novo cliente no banco');
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
  console.log('[MODEL] Confirmando conta com token:', token);
  
  const client = await this.findOne({ where: { confirmationToken: token } });
  if (!client) {
    console.log('[MODEL] Token inválido ou expirado:', token);
    throw new Error('Token inválido ou expirado');
  }

  console.log('[MODEL] Atualizando cliente confirmado:', client.id);
  client.isConfirmed = true;
  client.confirmationToken = null;
  
  return await client.save();
};

Client.login = async function(contactEmail, password) {
  console.log('[MODEL] Tentativa de login:', contactEmail);
  
  const client = await this.findOne({ where: { contactEmail } });
  if (!client) {
    console.log('[MODEL] Cliente não encontrado:', contactEmail);
    throw new Error('Credenciais inválidas');
  }

  if (!client.isConfirmed) {
    console.log('[MODEL] Conta não confirmada:', contactEmail);
    throw new Error('Por favor, confirme seu email primeiro');
  }

  console.log('[MODEL] Verificando senha');
  const isPasswordValid = await bcryptjs.compare(password, client.password);
  if (!isPasswordValid) {
    console.log('[MODEL] Senha inválida para:', contactEmail);
    throw new Error('Credenciais inválidas');
  }

  console.log('[MODEL] Login bem-sucedido para:', contactEmail);
  return client;
};

export default Client;
