import PaymentTransaction from './payments.model.js';
import * as usersService from '../users/users.service.js';
import Client from '../client/client.model.js';
import {
  CURRENCY,
  DEFAULT_RESPONDENT_REWARD,
  DEFAULT_SURVEY_CREATION_FEE,
  BASIC_PROFILE_COMPLETION_REWARD,
} from '../../config/paymentsConfig.js';

// Same definition of "complete" opina-cash's profile gate uses (see
// useIncompleteProfile.js) — kept here too since this is what decides
// whether the one-time reward fires, not just whether the UI nags the user.
export const isBasicProfileComplete = (user) => Boolean(user.phone_number) && Boolean(user.gender);

// Credits the respondent's existing wallet (User.walletBalance, already
// used elsewhere for cash-out) and leaves an audit row. Techdemo: no real
// payment gateway moves this money anywhere yet — it just accumulates in
// the DB. Called right after a survey response is saved successfully
// (see surveys.response.validation.controller.js); failures here are
// logged and swallowed by the caller so a payment hiccup never blocks the
// respondent's actual submission.
export const payRespondentForSurvey = async ({ userId, survey }) => {
  const amount = survey.rewardPerResponse ?? DEFAULT_RESPONDENT_REWARD;

  await usersService.updateWalletBalance(userId, amount);
  await PaymentTransaction.create({
    kind: 'respondent_reward',
    direction: 'credit',
    amount,
    currency: CURRENCY,
    userId,
    surveyId: survey.id,
  });

  return amount;
};

// Charges the client's credit balance for publishing a survey. Techdemo
// behavior: pure bookkeeping — creditBalance can go negative, and survey
// creation is never blocked on it (no payment method is on file to
// actually decline). See the Thunder Client guide for what real
// enforcement would need.
export const chargeClientForSurveyCreation = async ({ clientId, survey }) => {
  const amount = DEFAULT_SURVEY_CREATION_FEE;

  const client = await Client.findByPk(clientId);
  if (client) {
    await client.update({ creditBalance: (client.creditBalance || 0) - amount });
  }

  await PaymentTransaction.create({
    kind: 'survey_creation_fee',
    direction: 'debit',
    amount,
    currency: CURRENCY,
    clientId,
    surveyId: survey.id,
  });

  return amount;
};

// "Completa tu registro y vas a ganar X" — a one-time reward the instant
// a respondent's basic profile (phone + gender) becomes complete, guarded
// by User.basicProfileRewardPaid so it can never pay twice (e.g. if they
// edit their profile again afterwards). Takes the already-loaded `user`
// instance (the caller just updated it) rather than re-fetching by id.
// Returns the amount awarded, or 0 if this user already got it / isn't
// eligible yet — callers that display walletBalance right after this can
// just add the returned amount rather than re-fetching the user.
export const payBasicProfileCompletionReward = async (user) => {
  if (user.basicProfileRewardPaid || !isBasicProfileComplete(user)) return 0;

  const amount = BASIC_PROFILE_COMPLETION_REWARD;
  await usersService.updateWalletBalance(user.id, amount);
  await user.update({ basicProfileRewardPaid: true });
  await PaymentTransaction.create({
    kind: 'basic_profile_completion',
    direction: 'credit',
    amount,
    currency: CURRENCY,
    userId: user.id,
  });

  return amount;
};

export const getRespondentTransactions = (userId) =>
  PaymentTransaction.findAll({ where: { userId }, order: [['createdAt', 'DESC']] });

export const getClientTransactions = (clientId) =>
  PaymentTransaction.findAll({ where: { clientId }, order: [['createdAt', 'DESC']] });
