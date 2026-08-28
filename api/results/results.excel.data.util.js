// Turns raw survey response rows into the shapes the Excel sheets need:
// cleaned answers, per-question answer counts, and summary statistics.

// Strips the Sequelize instance down to plain data and unwraps a
// double-encoded answer string (e.g. `"\"Red\""` -> `Red`).
export const processResponses = (responses) => {
  return responses.map((r) => ({
    ...r.get({ plain: true }),
    question: r.question,
    answer: cleanAnswer(r.answer),
    surveyTitle: r.surveyTitle
  }));
};

// Removes the surrounding quotes and escaped quotes left behind when an
// answer was JSON-stringified before being stored.
export const cleanAnswer = (answer) => {
  if (typeof answer !== 'string') return answer;
  return answer.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"');
};

// Builds the "Estadísticas" sheet rows: total response count, plus the
// most common answer (and, for low-cardinality questions, the full
// distribution) per question.
export const calculateStatistics = (data) => {
  const total = data.length;
  const byQuestion = {};

  data.forEach(({ question, answer }) => {
    if (!byQuestion[question]) {
      byQuestion[question] = { counts: {}, total: 0 };
    }
    const answerKey = String(answer);
    byQuestion[question].counts[answerKey] = (byQuestion[question].counts[answerKey] || 0) + 1;
    byQuestion[question].total++;
  });

  const stats = [{ metric: 'Total de respuestas', value: total }];

  for (const [question, questionStats] of Object.entries(byQuestion)) {
    const sortedAnswers = Object.entries(questionStats.counts).sort((a, b) => b[1] - a[1]);
    const [mostCommonAnswer, mostCommonCount] = sortedAnswers[0];
    const percentage = Math.round((mostCommonCount / questionStats.total) * 100);

    stats.push({
      metric: `Respuesta más común: "${question}"`,
      value: `${mostCommonAnswer} (${percentage}%)`
    });

    // Only show the full breakdown for questions with few distinct answers
    // (e.g. multiple choice) — free text would blow up the sheet.
    if (sortedAnswers.length <= 5) {
      sortedAnswers.forEach(([answer, count], index) => {
        stats.push({
          metric: `  ${index + 1}. ${answer}`,
          value: `${count} (${Math.round((count / questionStats.total) * 100)}%)`
        });
      });
    }
  }

  return stats;
};

// Builds the answer -> count map for one question, used by the
// "Visualizaciones" sheet.
export const calculateAnswerCounts = (data) => {
  return data.reduce((acc, { answer }) => {
    const answerKey = String(answer);
    acc[answerKey] = (acc[answerKey] || 0) + 1;
    return acc;
  }, {});
};

// Demographic columns every wide-format export row starts with, in the
// order they should appear before the per-question columns.
export const DEMOGRAPHIC_COLUMNS = ['Nombre', 'Email', 'Género', 'Edad', 'Ciudad', 'Zona'];

// Pivots the one-row-per-answer shape from getSurveyResponsesWithUserDetails
// into one-row-per-respondent, with one column per question — the format
// a client actually wants to filter/pivot in Excel (e.g. "who are the
// people who answered 'No' to this question") instead of a flat answer
// log they'd have to regroup by hand.
export const buildWideRows = (responses) => {
  const byUser = new Map();
  const questionOrder = [];
  const seenQuestions = new Set();

  responses.forEach((r) => {
    if (!seenQuestions.has(r.question)) {
      seenQuestions.add(r.question);
      questionOrder.push(r.question);
    }

    const uid = r.userId ?? r.user?.id ?? `anon_${r.id}`;
    if (!byUser.has(uid)) {
      byUser.set(uid, {
        Nombre: r.user ? `${r.user.firstName || ''} ${r.user.lastName || ''}`.trim() || 'N/D' : 'N/D',
        Email: r.user?.email || 'N/D',
        Género: r.user?.gender || 'N/D',
        Edad: r.user?.age ?? 'N/D',
        Ciudad: r.user?.city || 'N/D',
        Zona: r.user?.residentialArea || 'N/D'
      });
    }

    const answer = Array.isArray(r.answer) ? r.answer.join(', ') : cleanAnswer(r.answer);
    byUser.get(uid)[r.question] = answer;
  });

  return { rows: Array.from(byUser.values()), questionOrder };
};

const escapeCsvValue = (value) => {
  const str = value === null || value === undefined ? '' : String(value);
  return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
};

// Serializes the wide-row format to CSV. A leading BOM is included by the
// caller so Excel opens accented characters correctly instead of mangling
// them (Excel assumes plain CSV is Latin-1 without one).
export const toCsv = (rows, questionOrder) => {
  const columns = [...DEMOGRAPHIC_COLUMNS, ...questionOrder];
  const lines = [columns.map(escapeCsvValue).join(',')];
  rows.forEach((row) => {
    lines.push(columns.map((col) => escapeCsvValue(row[col] ?? '')).join(','));
  });
  return lines.join('\r\n');
};
