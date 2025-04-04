import ExcelJS from 'exceljs'; // Importing ExcelJS for advanced Excel file features

// Function to export responses to Excel with statistics and charts
export const exportResponsesToExcel = async (req, res) => {
  try {
    const { surveyId } = req.params; // Get survey ID from the URL
    const responses = await resultsService.getResponsesBySurvey(surveyId); // Get responses from DB

    // Clean the answers to remove extra quotes and escape sequences
    const cleanedResponses = responses.map(r => ({
      ...r,
      answer: r.answer.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"')
    }));

    // Create a new Excel workbook with multiple tabs
    const workbook = new ExcelJS.Workbook();
    const rawSheet = workbook.addWorksheet('Respostas');
    const statsSheet = workbook.addWorksheet('Estatísticas');
    const chartsSheet = workbook.addWorksheet('Gráficos');

    // Define the style for headers
    const headerStyle = {
      fill: { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF6C63FF' } },
      font: { bold: true, color: { argb: 'FFFFFFFF' } },
      alignment: { horizontal: 'center' }
    };

    // Sheet 1: Raw cleaned responses
    rawSheet.columns = [
      { header: 'Pergunta', key: 'question', width: 40 },
      { header: 'Resposta', key: 'answer', width: 30 }
    ];
    rawSheet.addRows(cleanedResponses);
    rawSheet.getRow(1).eachCell(cell => Object.assign(cell, headerStyle)); // Style header row

    // Sheet 2: Statistics (like total and most frequent answers)
    const statsData = calculateStats(cleanedResponses);
    statsSheet.columns = [
      { header: 'Métrica', key: 'metric', width: 40 },
      { header: 'Valor', key: 'value', width: 30 }
    ];
    statsSheet.addRows(statsData);
    statsSheet.getRow(1).eachCell(cell => Object.assign(cell, headerStyle)); // Style header row

    // Sheet 3: Add charts (bar chart based on grouped responses)
    addChartsToSheet(chartsSheet, cleanedResponses);

    // Generate the Excel file buffer
    const buffer = await workbook.xlsx.writeBuffer();

    // Set headers and send the Excel file
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=survey_${surveyId}_dashboard.xlsx`);
    res.send(buffer);
  } catch (error) {
    console.error('Error exporting responses:', error); // Debugging log
    res.status(500).json({ message: 'Error exporting responses', error: error.message });
  }
};

// Helper function to calculate statistics
function calculateStats(responses) {
  const total = responses.length;
  const byQuestion = responses.reduce((acc, { question, answer }) => {
    if (!acc[question]) acc[question] = { counts: {}, total: 0 };
    acc[question].counts[answer] = (acc[question].counts[answer] || 0) + 1;
    acc[question].total++;
    return acc;
  }, {});

  const stats = [];
  stats.push({ metric: 'Total de Respostas', value: total });

  for (const [question, data] of Object.entries(byQuestion)) {
    const mostCommon = Object.entries(data.counts).sort((a, b) => b[1] - a[1])[0];
    stats.push({
      metric: `Mais comum: "${question}"`,
      value: `${mostCommon[0]} (${Math.round((mostCommon[1] / data.total) * 100)}%)`
    });
  }
  return stats;
}

// Helper function to add a basic bar chart to the sheet
function addChartsToSheet(sheet, responses) {
  const chartData = responses
    .filter(r => r.question.includes('frequência')) // Example: only for specific question
    .reduce((acc, { answer }) => {
      acc[answer] = (acc[answer] || 0) + 1;
      return acc;
    }, {});

  // Add data table to worksheet
  sheet.addTable({
    name: 'ChartData',
    ref: 'A1',
    columns: [{ name: 'Resposta' }, { name: 'Contagem' }],
    rows: Object.entries(chartData).map(([answer, count]) => [answer, count])
  });

  // Charts with ExcelJS are not rendered visually yet; placeholder if needed
  // Could be implemented later using OfficeJS or rendering in frontend
}
