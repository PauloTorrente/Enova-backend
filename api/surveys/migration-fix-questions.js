import { sequelize } from '../../config/database.js';
import Survey from './surveys.model.js';

const fixSelectionLimitValues = async () => {
  try {
    console.log('🚀 Starting migration: Fix selectionLimit values...');
    
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    const surveys = await Survey.findAll();
    console.log(`📊 Found ${surveys.length} surveys to process`);
    
    let fixedCount = 0;
    let errorCount = 0;

    for (const survey of surveys) {
      try {
        let questions = survey.questions;
        let needsUpdate = false;
        
        if (Array.isArray(questions)) {
          const updatedQuestions = questions.map(question => {
            // Corrige selectionLimit que está como string ou null indevidamente
            if (question.type === 'multiple' && 
                question.multipleSelections === 'yes' && 
                question.selectionLimit !== undefined && 
                question.selectionLimit !== null) {
              
              // Converte para número se for string
              if (typeof question.selectionLimit === 'string') {
                const numLimit = parseInt(question.selectionLimit);
                if (!isNaN(numLimit) && numLimit > 0) {
                  console.log(`🔄 Converting selectionLimit from "${question.selectionLimit}" to ${numLimit} for survey ${survey.id}`);
                  needsUpdate = true;
                  return {
                    ...question,
                    selectionLimit: numLimit
                  };
                }
              }
              
              // Garante que é número
              if (typeof question.selectionLimit === 'number' && question.selectionLimit > 0) {
                return question; // Já está correto
              }
            }
            
            // Para outras questões, garante que selectionLimit seja null
            if (question.selectionLimit !== null && question.selectionLimit !== undefined) {
              if (question.type !== 'multiple' || question.multipleSelections !== 'yes') {
                console.log(`🔄 Setting selectionLimit to null for non-multiple question in survey ${survey.id}`);
                needsUpdate = true;
                return {
                  ...question,
                  selectionLimit: null
                };
              }
            }
            
            return question;
          });

          if (needsUpdate) {
            await survey.update({ questions: updatedQuestions });
            fixedCount++;
            console.log(`✅ Fixed selectionLimit for survey ID: ${survey.id}`);
          }
        }
      } catch (error) {
        console.error(`❌ Error processing survey ${survey.id}:`, error.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`📈 Results:`);
    console.log(`   ✅ Fixed: ${fixedCount} surveys`);
    console.log(`   ❌ Errors: ${errorCount} surveys`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
  } finally {
    if (sequelize) {
      await sequelize.close();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
};

fixSelectionLimitValues();
