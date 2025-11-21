import { sequelize } from '../../config/database.js';
import Survey from './surveys.model.js';

const fixExistingSurveysQuestions = async () => {
  try {
    console.log('🚀 Starting migration: Fix survey questions format...');
    
    // Conectar ao banco
    await sequelize.authenticate();
    console.log('✅ Database connected successfully');

    // Buscar todas as surveys
    const surveys = await Survey.findAll();
    console.log(`📊 Found ${surveys.length} surveys to process`);
    
    let fixedCount = 0;
    let errorCount = 0;
    let alreadyFixedCount = 0;

    for (const survey of surveys) {
      try {
        let questions = survey.questions;
        
        // Se já for array, não precisa fazer nada
        if (Array.isArray(questions)) {
          alreadyFixedCount++;
          console.log(`ℹ️ Survey ${survey.id} already has array questions`);
          continue;
        }
        
        // Se for string, tenta parsear
        if (typeof questions === 'string') {
          console.log(`🔄 Processing survey ${survey.id}: string questions found`);
          
          try {
            const parsedQuestions = JSON.parse(questions);
            if (Array.isArray(parsedQuestions)) {
              // Atualiza o survey com as questions parseadas
              await survey.update({ questions: parsedQuestions });
              fixedCount++;
              console.log(`✅ Fixed survey ID: ${survey.id}`);
            } else {
              console.log(`⚠️ Survey ${survey.id}: parsed questions not an array`);
              errorCount++;
            }
          } catch (parseError) {
            console.error(`❌ Error parsing questions for survey ${survey.id}:`, parseError.message);
            errorCount++;
          }
        } else {
          console.log(`⚠️ Survey ${survey.id}: questions is not string or array (type: ${typeof questions})`);
          errorCount++;
        }
      } catch (surveyError) {
        console.error(`❌ Error processing survey ${survey.id}:`, surveyError.message);
        errorCount++;
      }
    }
    
    console.log('\n🎉 Migration completed!');
    console.log(`📈 Results:`);
    console.log(`   ✅ Fixed: ${fixedCount} surveys`);
    console.log(`   ℹ️ Already correct: ${alreadyFixedCount} surveys`);
    console.log(`   ❌ Errors: ${errorCount} surveys`);
    console.log(`   📊 Total processed: ${surveys.length} surveys`);
    
  } catch (error) {
    console.error('💥 Migration failed:', error);
    process.exit(1);
  } finally {
    // Fechar conexão
    if (sequelize) {
      await sequelize.close();
      console.log('🔌 Database connection closed');
    }
    process.exit(0);
  }
};

// Executar a migração
fixExistingSurveysQuestions();
