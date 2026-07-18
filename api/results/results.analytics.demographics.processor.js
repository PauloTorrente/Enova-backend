import { getAgeGroup } from './results.analytics.age-group.util.js';

// Builds and fills the top-level (survey-wide) analytics structure.
// Per-question demographic breakdowns live in
// results.analytics.demographics.helpers.js — this file only covers the
// "overview" section shown at the top of a survey's analytics page.

// Creates the empty analytics shell for a survey, including basic stats
// that don't require iterating over every response.
export const initializeAnalytics = (survey, results) => {
  return {
    basicStats: {
      totalResponses: results.length,
      surveyTitle: survey.title,
      createdAt: survey.createdAt,
      expirationTime: survey.expirationTime,
      status: survey.status,
      responseLimit: survey.responseLimit,
      completionRate: survey.responseLimit
        ? Math.min(100, Math.round((results.length / survey.responseLimit) * 100))
        : null
    },

    demographicOverview: {
      byGender: {},
      byAgeGroup: { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '56+': 0 },
      byCity: {},
      byResidentialArea: {},
      byEducationLevel: {},
      byPurchaseResponsibility: {},
      byChildrenCount: { '0': 0, '1': 0, '2': 0, '3+': 0 },
      walletBalanceRanges: { '0-100': 0, '101-500': 0, '501-1000': 0, '1000+': 0 },
      scoreRanges: { '0-100': 0, '101-500': 0, '501-1000': 0, '1000+': 0 }
    },
    questionAnalytics: []
  };
};

// Walks every response once and fills in the survey-wide demographic
// counters. Mutates `analytics` in place to avoid re-allocating the
// (potentially large) overview object per result.
export const processDemographicData = (analytics, results) => {
  const overview = analytics.demographicOverview;

  results.forEach((result) => {
    const user = result.user;
    if (!user) return; // Anonymous/deleted-user response, nothing to bucket.

    if (user.gender) {
      overview.byGender[user.gender] = (overview.byGender[user.gender] || 0) + 1;
    }

    if (user.age) {
      overview.byAgeGroup[getAgeGroup(user.age)]++;
    }

    if (user.city) {
      overview.byCity[user.city] = (overview.byCity[user.city] || 0) + 1;
    }

    if (user.residentialArea) {
      overview.byResidentialArea[user.residentialArea] =
        (overview.byResidentialArea[user.residentialArea] || 0) + 1;
    }

    if (user.educationLevel) {
      overview.byEducationLevel[user.educationLevel] =
        (overview.byEducationLevel[user.educationLevel] || 0) + 1;
    }

    if (user.purchaseResponsibility) {
      overview.byPurchaseResponsibility[user.purchaseResponsibility] =
        (overview.byPurchaseResponsibility[user.purchaseResponsibility] || 0) + 1;
    }

    if (user.childrenCount !== null && user.childrenCount !== undefined) {
      const key =
        user.childrenCount === 0 ? '0'
        : user.childrenCount === 1 ? '1'
        : user.childrenCount === 2 ? '2'
        : '3+';
      overview.byChildrenCount[key]++;
    }

    if (user.walletBalance !== null && user.walletBalance !== undefined) {
      const range =
        user.walletBalance <= 100 ? '0-100'
        : user.walletBalance <= 500 ? '101-500'
        : user.walletBalance <= 1000 ? '501-1000'
        : '1000+';
      overview.walletBalanceRanges[range]++;
    }

    if (user.score !== null && user.score !== undefined) {
      const range =
        user.score <= 100 ? '0-100'
        : user.score <= 500 ? '101-500'
        : user.score <= 1000 ? '501-1000'
        : '1000+';
      overview.scoreRanges[range]++;
    }
  });
};
