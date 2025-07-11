import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import transporter from '../../config/nodemailer.config.js';
import Client from './client.model.js';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Registrar novo cliente empresarial
export const registerClient = async ({ companyName, contactEmail, password, industry }) => {
  // Verificar se o email já está registrado
  const existingClient = await Client.findOne({ where: { contactEmail } });
  if (existingClient) {
    throw new Error('Este email já está registrado.');
  }

  // Verificar se o nome da empresa já existe
  const existingCompany = await Client.findOne({ where: { companyName } });
  if (existingCompany) {
    throw new Error('Esta empresa já está registrada.');
  }

  // Criptografar senha
  const hashedPassword = await bcryptjs.hash(password, 10);
  
  // Gerar token de confirmação
  const confirmationToken = crypto.randomBytes(20).toString('hex');

  // Criar novo cliente
  const newClient = await Client.create({
    companyName,
    contactEmail,
    password: hashedPassword,
    industry,
    confirmationToken,
    isConfirmed: false
  });

  // Enviar email de confirmação
  const templatePath = path.join(__dirname, '../../assets/templates/clientConfirmationEmail.html');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error('Modelo de email não encontrado');
  }

  let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
  const confirmationUrl = `https://enova-backend.onrender.com/api/clients/confirm/${confirmationToken}`;
  emailTemplate = emailTemplate.replace('{{confirmationUrl}}', confirmationUrl);

  await transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: contactEmail,
    subject: 'Confirme seu registro empresarial',
    html: emailTemplate,
  });

  return newClient;
};

// Confirmar cliente pelo token
export const confirmClient = async (token) => {
  const client = await Client.findOne({ where: { confirmationToken: token } });
  
  if (!client) {
    throw new Error('Token de confirmação inválido ou expirado');
  }

  client.isConfirmed = true;
  client.confirmationToken = null;
  await client.save();
  
  return client;
};

// Autenticar cliente
export const loginClient = async (contactEmail, password) => {
  const client = await Client.findOne({ where: { contactEmail } });
  
  if (!client) {
    throw new Error('Credenciais inválidas');
  }

  if (!client.isConfirmed) {
    throw new Error('Por favor, confirme seu email antes de fazer login');
  }

  const isPasswordValid = await bcryptjs.compare(password, client.password);
  if (!isPasswordValid) {
    throw new Error('Credenciais inválidas');
  }

  // Retornar dados básicos do cliente (sem senha)
  const { password: _, ...clientData } = client.toJSON();
  return clientData;
};

// Obter cliente por ID
export const getClientById = async (id) => {
  const client = await Client.findByPk(id);
  if (!client) return null;
  
  const { password, ...clientData } = client.toJSON();
  return clientData;
};
