import bcryptjs from 'bcryptjs';
import crypto from 'crypto';

// Static auth methods attached to the Client model (client.model.js).
// Kept separate from the schema definition since this is business logic,
// not column mapping.

// Registers a new client company, rejecting duplicate emails/company
// names. `ClientModel` is passed in (rather than imported) to avoid a
// circular import with client.model.js, which attaches these methods.
export const register = async function (ClientModel, clientData) {
  const { companyName, contactEmail } = clientData;

  if (await ClientModel.findOne({ where: { contactEmail } })) {
    throw new Error('Email already registered');
  }
  if (await ClientModel.findOne({ where: { companyName } })) {
    throw new Error('Company already registered');
  }

  const hashedPassword = await bcryptjs.hash(clientData.password, 10);
  const confirmationToken = crypto.randomBytes(20).toString('hex');

  return ClientModel.create({
    ...clientData,
    password: hashedPassword,
    confirmationToken,
    isConfirmed: false,
    role: 'client'
  });
};

// Marks a client account as confirmed given a valid confirmation token.
export const confirmAccount = async function (ClientModel, token) {
  const client = await ClientModel.findOne({ where: { confirmationToken: token } });
  if (!client) {
    throw new Error('Invalid token');
  }

  client.isConfirmed = true;
  client.confirmationToken = null;
  return client.save();
};

// Validates login credentials and returns the client record on success.
export const login = async function (ClientModel, email, password) {
  const client = await ClientModel.findOne({ where: { contactEmail: email } });
  if (!client) {
    throw new Error('Invalid credentials');
  }
  if (!client.isConfirmed) {
    throw new Error('Confirm your email first');
  }

  const validPass = await bcryptjs.compare(password, client.password);
  if (!validPass) {
    throw new Error('Invalid credentials');
  }

  return client;
};
