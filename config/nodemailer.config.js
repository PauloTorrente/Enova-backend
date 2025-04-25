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

setInterval(async () => {
  try {
    const { credentials } = await oauth2Client.refreshAccessToken();
    console.log('Token renovado:', credentials.access_token);
  } catch (error) {
    console.error('Erro ao renovar token:', error);
  }
}, 45 * 60 * 1000);

async function getAccessToken() {
  try {
    const { token } = await oauth2Client.getAccessToken();
    return token;
  } catch (error) {
    console.error('Erro ao obter access token:', error);
    return null;
  }
}

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    type: 'OAuth2',
    user: process.env.SMTP_USER,  
    clientId: process.env.SMTP_CLIENT_ID,
    clientSecret: process.env.SMTP_CLIENT_SECRET,
    refreshToken: process.env.SMTP_REFRESH_TOKEN,
    accessToken: () => getAccessToken(), 
  },
});

export default transporter;
