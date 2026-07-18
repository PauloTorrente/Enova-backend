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

// Called by nodemailer on every send — OAuth2 access tokens are short-lived,
// so this refreshes one from the stored refresh token rather than caching it.
const getAccessToken = async () => {
  const { token } = await oauth2Client.getAccessToken();
  if (!token) {
    throw new Error('Failed to generate OAuth2 access token');
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

// Fire-and-forget connectivity check at startup — errors surface on the
// next actual send attempt rather than here, so we don't fail app boot
// over a transient SMTP hiccup.
transporter.verify(() => {});

export default transporter;
