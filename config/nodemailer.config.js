import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import { google } from 'googleapis';

dotenv.config();

const oauth2Client = new google.auth.OAuth2(
  process.env.SMTP_CLIENT_ID,
  process.env.SMTP_CLIENT_SECRET,
  'https://developers.google.com/oauthplayground'
);

oauth2Client.setCredentials({
  refresh_token: process.env.SMTP_REFRESH_TOKEN,
});

const getAccessToken = async () => {
  const { token } = await oauth2Client.getAccessToken();
  if (!token) {
    throw new Error('Access token não foi gerado');
  }
  return token;
};

const transporter = nodemailer.createTransport({
  service: 'gmail',
  pool: true,
  maxConnections: 5,
  auth: {
    type: 'OAuth2',
    user: process.env.SMTP_USER,
    clientId: process.env.SMTP_CLIENT_ID,
    clientSecret: process.env.SMTP_CLIENT_SECRET,
    refreshToken: process.env.SMTP_REFRESH_TOKEN,
    accessToken: getAccessToken,
  },
  tls: {
    rejectUnauthorized: false
  }
});

transporter.verify(() => {});

export default transporter;
