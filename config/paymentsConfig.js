// Techdemo pricing placeholders. These numbers are NOT final — the
// business side still needs to define real per-response and
// per-survey-creation pricing. They exist only so the payment
// scaffolding in api/payments/ has something concrete to compute with.
// opina-cash pays respondents in Bolívares (VES) — Venezuela, not Mexico.
// NOTE: this only relabels the respondent-reward ledger (PaymentTransaction
// rows, opina-cash's wallet display). It does NOT touch the Conekta
// client-topup integration (api/payments/conekta.*) — that's a real
// Mexican payment gateway that only settles in MXN, a completely separate
// flow (charging a client, not paying a respondent) that would need an
// actual Venezuelan payment provider to really move money in VES.
export const CURRENCY = 'VES';

// Paid to a respondent's wallet for completing one survey (unless the
// survey itself sets its own Survey.rewardPerResponse). This is the
// "perfil básico" tier from the meeting's 3-level example (basic /
// advanced-socioeconómico / psicográfico paying progressively more —
// they used $1/$2/$5 as a round illustration, not settled MXN pricing).
// Set a survey's own rewardPerResponse higher for the advanced
// (surveyType: 'surgical_profiling') and psychographic tiers.
export const DEFAULT_RESPONDENT_REWARD = 5;

// Charged to a client's credit balance for publishing one survey.
export const DEFAULT_SURVEY_CREATION_FEE = 50;

// One-time reward for completing the basic profile (phone + gender —
// same fields opina-cash's profile-completeness gate requires). This is
// "completa tu registro y vas a ganar X" from the meeting — paid once,
// tracked by User.basicProfileRewardPaid so it can never fire twice.
export const BASIC_PROFILE_COMPLETION_REWARD = 50;

// One-time reward for completing the Filtro Preliminar step (country,
// postal code, birth year, education, occupation) — the second onboarding
// session opina-cash sends the respondent to right after the basic
// profile above. Paid once, tracked by User.filtroPreliminarRewardPaid.
export const FILTRO_PRELIMINAR_COMPLETION_REWARD = 50;
