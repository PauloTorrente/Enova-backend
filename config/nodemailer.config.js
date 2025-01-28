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

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.SMTP_USER,  
    pass: process.env.SMTP_APP_PASSWORD,  
    clientId: process.env.SMTP_CLIENT_ID,
    clientSecret: process.env.SMTP_CLIENT_SECRET,
    refreshToken: process.env.SMTP_REFRESH_TOKEN,
    accessToken: async () => {
      const { token } = await oauth2Client.getAccessToken();
      return token;
    },
  },
});

export default transporter;
