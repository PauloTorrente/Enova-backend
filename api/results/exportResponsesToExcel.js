import ExcelJS from 'exceljs';
import * as resultsService from './results.service.js';

// Función principal para exportar respuestas de encuestas a un archivo Excel
export const exportResponsesToExcel = async (req, res) => {
  try {
    // Obtener el ID de la encuesta desde los parámetros de la solicitud
    const { surveyId } = req.params;

    // Obtener respuestas desde la base de datos
    const responses = await resultsService.getResponsesBySurvey(surveyId);

    // Procesar los datos para limpiarlos y estructurarlos correctamente
    const processedData = processResponses(responses);
    
    // Crear el archivo Excel con los datos procesados
    const workbook = createExcelWorkbook(processedData);

    // Enviar el archivo Excel como respuesta
    sendExcelResponse(res, workbook, surveyId);

  } catch (error) {
    // Manejar errores en la exportación
    handleExportError(res, error);
  }
};

// Función para procesar las respuestas y limpiar los datos innecesarios
function processResponses(responses) {
  return responses.map(r => ({
    ...r.get({ plain: true }),
    question: r.question,
    answer: cleanAnswer(r.answer),
    surveyTitle: r.surveyTitle
  }));
}

// Función para limpiar las respuestas eliminando comillas innecesarias
function cleanAnswer(answer) {
  if (typeof answer !== 'string') return answer;
  return answer.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"');
}

// Función para crear un archivo Excel con los datos estructurados
function createExcelWorkbook(data) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Enova Analytics';
  workbook.created = new Date();

  // Agregar diferentes hojas con información
  addRawDataSheet(workbook, data);
  addStatisticsSheet(workbook, data);
  addVisualizationSheet(workbook, data);

  return workbook;
}

// Función para agregar la hoja de datos sin procesar
function addRawDataSheet(workbook, data) {
  const sheet = workbook.addWorksheet('Datos Brutos');
  
  // Definir columnas con encabezados
  sheet.columns = [
    { header: 'Pregunta', key: 'question', width: 35 },
    { header: 'Respuesta', key: 'answer', width: 30 }
  ];
  
  // Agregar las respuestas a la hoja
  sheet.addRows(data);
  applySheetStyle(sheet, '6C63FF');
}

// Función para agregar la hoja de estadísticas
function addStatisticsSheet(workbook, data) {
  const sheet = workbook.addWorksheet('Estadísticas');
  const stats = calculateStatistics(data);

  // Definir las columnas
  sheet.columns = [
    { header: 'Métrica', key: 'metric', width: 40 },
    { header: 'Valor', key: 'value', width: 30 }
  ];

  // Agregar estadísticas calculadas
  sheet.addRows(stats);
  applySheetStyle(sheet, '4A90E2');
}

// Función para agregar la hoja de visualización de datos
function addVisualizationSheet(workbook, data) {
  const sheet = workbook.addWorksheet('Visualizaciones');
  const questions = [...new Set(data.map(r => r.question))];

  let currentRow = 1;
  
  questions.forEach(question => {
    // Agregar título de la pregunta
    sheet.getCell(`A${currentRow}`).value = question;
    sheet.getCell(`A${currentRow}`).font = { bold: true, size: 14 };
    currentRow++;

    // Filtrar respuestas para la pregunta actual
    const questionData = data.filter(r => r.question === question);
    const answerCounts = calculateAnswerCounts(questionData);

    // Agregar encabezados para la tabla de respuestas
    sheet.getCell(`A${currentRow}`).value = 'Respuesta';
    sheet.getCell(`B${currentRow}`).value = 'Cantidad';
    currentRow++;

    // Agregar respuestas y sus conteos
    Object.entries(answerCounts).forEach(([answer, count]) => {
      sheet.getCell(`A${currentRow}`).value = answer;
      sheet.getCell(`B${currentRow}`).value = count;
      currentRow++;
    });

    // Espaciado entre preguntas
    currentRow += 2;
  });

  applySheetStyle(sheet, '00C897');
}

// Función para calcular estadísticas generales de las respuestas
function calculateStatistics(data) {
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

  const stats = [
    { metric: 'Total de respuestas', value: total }
  ];

  for (const [question, data] of Object.entries(byQuestion)) {
    const sortedAnswers = Object.entries(data.counts).sort((a, b) => b[1] - a[1]);
    const mostCommon = sortedAnswers[0];
    const percentage = Math.round((mostCommon[1] / data.total) * 100);

    stats.push({
      metric: `Respuesta más común: "${question}"`,
      value: `${mostCommon[0]} (${percentage}%)`
    });

    // Agregar distribución completa para preguntas con pocas opciones
    if (sortedAnswers.length <= 5) {
      sortedAnswers.forEach(([answer, count], index) => {
        stats.push({
          metric: `  ${index + 1}. ${answer}`,
          value: `${count} (${Math.round((count / data.total) * 100)}%)`
        });
      });
    }
  }

  return stats;
}

// Función para contar respuestas por tipo
function calculateAnswerCounts(data) {
  return data.reduce((acc, { answer }) => {
    const answerKey = String(answer);
    acc[answerKey] = (acc[answerKey] || 0) + 1;
    return acc;
  }, {});
}

// Función para aplicar estilo a las hojas de Excel
function applySheetStyle(sheet, color) {
  // Estilo para la fila de encabezado
  sheet.getRow(1).eachCell(cell => {
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: color }
    };
    cell.font = {
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.alignment = { horizontal: 'center' };
    cell.border = {
      top: { style: 'thin' },
      left: { style: 'thin' },
      bottom: { style: 'thin' },
      right: { style: 'thin' }
    };
  });

  // Ajustar alineación para las celdas de datos
  for (let i = 2; i <= sheet.rowCount; i++) {
    sheet.getRow(i).alignment = { vertical: 'top', wrapText: true };
  }
}

// Función para enviar el archivo Excel como respuesta
function sendExcelResponse(res, workbook, surveyId) {
  res.setHeader(
    'Content-Type',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  );
  res.setHeader(
    'Content-Disposition',
    `attachment; filename=Reporte_Encuesta_${surveyId}.xlsx`
  );

  workbook.xlsx.write(res)
    .then(() => res.end());
}

// Función para manejar errores en la exportación
function handleExportError(res, error) {
  console.error('Error en la exportación:', error);
  res.status(500).json({
    success: false,
    message: 'Fallo al generar el informe',
    error: error.message
  });
}
