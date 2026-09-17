import * as paymentsService from './payments.service.js';
import User from '../users/users.model.js';
import Client from '../client/client.model.js';

// GET /api/payments/me — a respondent's own earnings ledger + current balance.
export const getMyTransactions = async (req, res) => {
  try {
    const [transactions, user] = await Promise.all([
      paymentsService.getRespondentTransactions(req.user.userId),
      User.findByPk(req.user.userId),
    ]);
    res.status(200).json({
      success: true,
      walletBalance: user?.walletBalance ?? 0,
      transactions,
    });
  } catch (error) {
    console.error(`[payments] getMyTransactions failed (userId=${req.user?.userId}):`, error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};

// GET /api/payments/client/me — a client's own charges ledger + current balance.
export const getMyClientTransactions = async (req, res) => {
  try {
    const [transactions, client] = await Promise.all([
      paymentsService.getClientTransactions(req.client.id),
      Client.findByPk(req.client.id),
    ]);
    res.status(200).json({
      success: true,
      creditBalance: client?.creditBalance ?? 0,
      transactions,
    });
  } catch (error) {
    console.error(`[payments] getMyClientTransactions failed (clientId=${req.client?.id}):`, error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch transactions' });
  }
};
