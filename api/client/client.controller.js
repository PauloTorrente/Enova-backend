import * as clientService from './client.service.js';

// Registrar novo cliente empresarial
export const register = async (req, res) => {
  const { companyName, contactEmail, password, industry } = req.body;

  try {
    await clientService.registerClient({ companyName, contactEmail, password, industry });
    
    res.status(201).json({
      message: 'Registro empresarial realizado! Verifique seu email para confirmar sua conta.'
    });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Confirmar registro do cliente
export const confirm = async (req, res) => {
  const { token } = req.params;

  try {
    await clientService.confirmClient(token);
    res.json({ message: 'Conta empresarial confirmada com sucesso!' });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// Login do cliente empresarial
export const login = async (req, res) => {
  const { contactEmail, password } = req.body;

  try {
    const client = await clientService.loginClient(contactEmail, password);
    res.json(client);
  } catch (error) {
    res.status(401).json({ message: error.message });
  }
};

// Obter informações do cliente
export const getClient = async (req, res) => {
  try {
    const client = await clientService.getClientById(req.client.id);
    if (!client) {
      return res.status(404).json({ message: 'Cliente não encontrado' });
    }
    res.json(client);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar informações do cliente' });
  }
};
