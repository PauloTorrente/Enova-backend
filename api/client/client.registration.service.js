import crypto from 'crypto';
import bcryptjs from 'bcryptjs';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import transporter from '../../config/nodemailer.config.js';
import Client from './client.model.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Registers a new client company and emails them a confirmation link.
// Rejects duplicate emails/company names before touching the DB.
export const registerClient = async (clientData) => {
  try {
    const { companyName, contactName, contactEmail, phone, password, industry } = clientData;

    if (await Client.findOne({ where: { contactEmail } })) {
      throw new Error('Email already registered');
    }
    if (await Client.findOne({ where: { companyName } })) {
      throw new Error('Company already registered');
    }

    const hashedPassword = await bcryptjs.hash(password, 10);
    const confirmationToken = crypto.randomBytes(20).toString('hex');

    const newClient = await Client.create({
      companyName,
      contactName,
      contactEmail,
      phoneNumber: phone,
      password: hashedPassword,
      industry,
      confirmationToken,
      isConfirmed: false
    });

    await sendConfirmationEmail(contactEmail, confirmationToken);

    return newClient;
  } catch (error) {
    console.error(`[client.registration] registerClient failed (company=${clientData?.companyName}):`, error.message);
    throw error;
  }
};

const sendConfirmationEmail = async (contactEmail, confirmationToken) => {
  const templatePath = path.join(__dirname, '../../assets/templates/clientConfirmationEmail.html');
  if (!fs.existsSync(templatePath)) {
    throw new Error('Email template not found');
  }

  let emailTemplate = fs.readFileSync(templatePath, 'utf-8');
  const confirmationUrl = `https://enova-pulse-rwpd.vercel.app/confirm?token=${confirmationToken}`;
  emailTemplate = emailTemplate.replace('{{confirmationUrl}}', confirmationUrl);

  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: contactEmail,
      subject: 'Confirm your business registration',
      html: emailTemplate,
    });
  } catch (emailError) {
    // Never log the confirmation token/URL — it's a live activation credential.
    console.error(`[client.registration] Failed to send confirmation email to ${contactEmail}:`, emailError.message);
    throw new Error('Failed to send confirmation email');
  }
};
