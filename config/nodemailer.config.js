import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

// Configuração inicial
dotenv.config();

// Criação do cliente OAuth2
const oauth2Client = new google.auth.OAuth2(
  process.env.SMTP_CLIENT_ID,
  process.env.SMTP_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

// Configuração das credenciais
oauth2Client.setCredentials({
  refresh_token: process.env.SMTP_REFRESH_TOKEN,
});

// Função otimizada para obtenção de tokens
const getAccessToken = async () => {
  try {
    const { token } = await oauth2Client.getAccessToken();
    if (!token) {
      throw new Error('Access token não foi gerado');
    }
    return token;
  } catch (error) {
    console.error('Erro ao gerar access token:', error);
    throw error; // Propaga o erro para melhor tratamento
  }
};

// Configuração do transporter com melhorias
const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true, // Habilita connection pooling
  maxConnections: 5, // Número máximo de conexões
  auth: {
    type: 'OAuth2',
    user: process.env.SMTP_USER,
    clientId: process.env.SMTP_CLIENT_ID,
    clientSecret: process.env.SMTP_CLIENT_SECRET,
    refreshToken: process.env.SMTP_REFRESH_TOKEN,
    accessToken: getAccessToken, // Remove a necessidade do setInterval
  },
  // Configurações adicionais de robustez
  tls: {
    rejectUnauthorized: false // Importante para ambientes de produção
  },
  logger: true // Habilita logs detalhados
});

// Verificação inicial da conexão
transporter.verify((error) => {
  if (error) {
    console.error('❌ Falha na verificação do transporter:', error);
  } else {
    console.log('✅ SMTP configurado e verificado com sucesso');
  }
});

// Monitoramento de eventos (opcional mas útil)
transporter.on('token', (token) => {
  console.log('Novo token gerado:', token);
});

export default transporter;
