// migration-fix-double-serialization.js
const fixDoubleSerializedQuestions = async () => {
  try {
    console.log('🚀 Fixing double-serialized questions...');
    
    const surveys = await Survey.findAll();
    let fixedCount = 0;
    
    for (const survey of surveys) {
      const currentQuestions = survey.questions;
      
      if (typeof currentQuestions === 'string') {
        try {
          // Tenta detectar e corrigir serialização dupla
          let fixedQuestions = currentQuestions;
          
          // Caso: "\"[{\\\"...
          if (fixedQuestions.startsWith('"[') && fixedQuestions.endsWith(']"')) {
            fixedQuestions = fixedQuestions.slice(1, -1)
              .replace(/\\"/g, '"')
              .replace(/\\\\/g, '\\');
          }
          
          // Parse para validar
          const parsed = JSON.parse(fixedQuestions);
          
          // Se chegou aqui, salva o JSON correto
          await survey.update({ questions: parsed });
          fixedCount++;
          
        } catch (error) {
          console.error(`❌ Error fixing survey ${survey.id}:`, error.message);
        }
      }
    }
    
    console.log(`✅ Fixed ${fixedCount} surveys with double-serialized questions`);
  } catch (error) {
    console.error('💥 Migration failed:', error);
  }
};
