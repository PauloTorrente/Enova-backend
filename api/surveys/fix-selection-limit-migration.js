// One-off maintenance script: normalizes the `selectionLimit` field on
// every survey's questions. Run manually with `node
// api/surveys/fix-selection-limit-migration.js` — not wired into the app.
import { sequelize } from '../../config/database.js';
import Survey from './surveys.model.js';

const fixSelectionLimitValues = async () => {
  try {
    console.log('Starting migration: fix selectionLimit values...');

    await sequelize.authenticate();
    console.log('Database connected successfully');

    const surveys = await Survey.findAll();
    console.log(`Found ${surveys.length} surveys to process`);

    let fixedCount = 0;
    let errorCount = 0;

    for (const survey of surveys) {
      try {
        const questions = survey.questions;
        let needsUpdate = false;

        if (Array.isArray(questions)) {
          const updatedQuestions = questions.map((question) => {
            // Fix selectionLimit values incorrectly stored as a string or stray null.
            if (
              question.type === 'multiple' &&
              question.multipleSelections === 'yes' &&
              question.selectionLimit !== undefined &&
              question.selectionLimit !== null
            ) {
              // Convert to a number if it's still a string.
              if (typeof question.selectionLimit === 'string') {
                const numLimit = parseInt(question.selectionLimit);
                if (!isNaN(numLimit) && numLimit > 0) {
                  needsUpdate = true;
                  return { ...question, selectionLimit: numLimit };
                }
              }

              // Already a valid number, nothing to fix.
              if (typeof question.selectionLimit === 'number' && question.selectionLimit > 0) {
                return question;
              }
            }

            // For non-multiple-selection questions, selectionLimit must be null.
            if (question.selectionLimit !== null && question.selectionLimit !== undefined) {
              if (question.type !== 'multiple' || question.multipleSelections !== 'yes') {
                needsUpdate = true;
                return { ...question, selectionLimit: null };
              }
            }

            return question;
          });

          if (needsUpdate) {
            await survey.update({ questions: updatedQuestions });
            fixedCount++;
            console.log(`Fixed selectionLimit for survey ID: ${survey.id}`);
          }
        }
      } catch (error) {
        console.error(`Error processing survey ${survey.id}:`, error.message);
        errorCount++;
      }
    }

    console.log('Migration completed.');
    console.log(`Fixed: ${fixedCount} surveys, Errors: ${errorCount} surveys`);
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

fixSelectionLimitValues();
