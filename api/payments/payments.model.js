import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

// Append-only ledger for every peso that moves — or, for now, every peso
// that's just *recorded* as owed, since no real payment gateway is wired
// up yet (see payments.service.js and the Thunder Client guide's "Sistema
// de Pagos" section for what's still missing). direction is from the
// platform's point of view: credit = platform pays out to a respondent,
// debit = platform collects from a client.
const PaymentTransaction = sequelize.define(
  'PaymentTransaction',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    kind: { type: DataTypes.STRING, allowNull: false }, // 'respondent_reward' | 'survey_creation_fee' | 'credit_topup' | 'basic_profile_completion'
    direction: { type: DataTypes.STRING, allowNull: false }, // 'credit' | 'debit'
    amount: { type: DataTypes.FLOAT, allowNull: false },
    currency: { type: DataTypes.STRING, allowNull: false, defaultValue: 'MXN' },
    userId: { type: DataTypes.INTEGER, allowNull: true, field: 'user_id' },
    clientId: { type: DataTypes.INTEGER, allowNull: true, field: 'client_id' },
    surveyId: { type: DataTypes.INTEGER, allowNull: true, field: 'survey_id' },
    // 'recorded' (techdemo, no real money involved) for respondent_reward /
    // survey_creation_fee. 'credit_topup' rows go 'pending' -> 'paid' (or
    // 'failed') as Conekta's webhook confirms the real charge — see
    // conekta.controller.js.
    status: { type: DataTypes.STRING, allowNull: false, defaultValue: 'recorded' },
    // Conekta's order id, only set for kind: 'credit_topup' — how the
    // webhook finds which row to reconcile when payment confirms.
    conektaOrderId: { type: DataTypes.STRING, allowNull: true, field: 'conekta_order_id' },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    tableName: 'payment_transactions',
    timestamps: false,
  }
);

export default PaymentTransaction;
