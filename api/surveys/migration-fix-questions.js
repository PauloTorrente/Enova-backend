// One-off maintenance script: repairs surveys whose `questions` column
// ended up double-JSON-serialized (a stringified string instead of a
// stringified array). Run manually with `node
// api/surveys/migration-fix-questions.js` — not wired into the app.
import { sequelize } from '../../config/database.js';
import Survey from './surveys.model.js';

const fixDoubleSerializedQuestions = async () => {
  try {
    console.log('Fixing double-serialized questions...');

    const surveys = await Survey.findAll();
    let fixedCount = 0;

    for (const survey of surveys) {
      const currentQuestions = survey.questions;

      if (typeof currentQuestions === 'string') {
        try {
          let fixedQuestions = currentQuestions;

          // Case: value looks like "\"[{\\\"..." (JSON-encoded twice).
          if (fixedQuestions.startsWith('"[') && fixedQuestions.endsWith(']"')) {
            fixedQuestions = fixedQuestions.slice(1, -1)
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
          }

          // Parse to confirm it's now valid JSON.
          const parsed = JSON.parse(fixedQuestions);

          // Parsed successfully — persist the corrected value.
          await survey.update({ questions: parsed });
          fixedCount++;
        } catch (error) {
          console.error(`Error fixing survey ${survey.id}:`, error.message);
        }
      }
    }

    console.log(`Fixed ${fixedCount} surveys with double-serialized questions`);
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log('Database connection closed');
    }
    process.exit(0);
  }
};

fixDoubleSerializedQuestions();
