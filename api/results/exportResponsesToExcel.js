import ExcelJS from 'exceljs';
import * as resultsService from './results.service.js';

// Main function to export survey responses to Excel
export const exportResponsesToExcel = async (req, res) => {
  try {
    // Extract survey ID from request parameters
    const { surveyId } = req.params;
    
    // Fetch responses from database using service
    const responses = await resultsService.getResponsesBySurvey(surveyId);

    // Clean response data by removing unnecessary quotes
    const cleanedResponses = responses.map(r => ({
      ...r.get({ plain: true }), // Convert Sequelize instance to plain object
      answer: typeof r.answer === 'string' 
        ? r.answer.replace(/^"(.*)"$/, '$1').replace(/\\"/g, '"')
        : r.answer
    }));

    // Initialize new Excel workbook
    const workbook = new ExcelJS.Workbook();
    
    // Create worksheets
    const rawSheet = workbook.addWorksheet('Responses');
    const statsSheet = workbook.addWorksheet('Statistics');
    const chartsSheet = workbook.addWorksheet('Charts');

    // Define header styling
    const headerStyle = {
      fill: { 
        type: 'pattern', 
        pattern: 'solid', 
        fgColor: { argb: 'FF6C63FF' }
      },
      font: { 
        bold: true, 
        color: { argb: 'FFFFFFFF' }
      },
      alignment: { 
        horizontal: 'center' 
      }
    };

    // Worksheet 1: Raw responses
    rawSheet.columns = [
      { header: 'Question', key: 'question', width: 40 },
      { header: 'Answer', key: 'answer', width: 30 }
    ];
    rawSheet.addRows(cleanedResponses);
    applyHeaderStyle(rawSheet, headerStyle);

    // Worksheet 2: Statistics
    const statsData = calculateStats(cleanedResponses);
    statsSheet.columns = [
      { header: 'Metric', key: 'metric', width: 40 },
      { header: 'Value', key: 'value', width: 30 }
    ];
    statsSheet.addRows(statsData);
    applyHeaderStyle(statsSheet, headerStyle);

    // Worksheet 3: Charts data
    prepareChartsData(chartsSheet, cleanedResponses);
    applyHeaderStyle(chartsSheet, headerStyle);

    // Generate and send Excel file
    const buffer = await workbook.xlsx.writeBuffer();
    
    // Set response headers for file download
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=survey_${surveyId}_report.xlsx`);
    
    // Send the Excel file
    res.send(buffer);

  } catch (error) {
    console.error('Export failed:', error);
    res.status(500).json({ 
      message: 'Failed to generate report',
      error: error.message 
    });
  }
};

// Helper function to apply header styles
function applyHeaderStyle(sheet, style) {
  if (sheet.rowCount > 0) {
    sheet.getRow(1).eachCell(cell => {
      Object.assign(cell, style);
    });
  }
}

// Calculate response statistics
function calculateStats(responses) {
  const total = responses.length;
  
  // Group responses by question and count answers
  const byQuestion = responses.reduce((acc, { question, answer }) => {
    if (!question) return acc;
    
    if (!acc[question]) {
      acc[question] = { counts: {}, total: 0 };
    }
    const answerStr = String(answer);
    acc[question].counts[answerStr] = (acc[question].counts[answerStr] || 0) + 1;
    acc[question].total++;
    return acc;
  }, {});

  // Prepare statistics data for Excel
  const stats = [
    { metric: 'Total Responses', value: total }
  ];

  // Add most common answers for each question
  for (const [question, data] of Object.entries(byQuestion)) {
    const mostCommon = Object.entries(data.counts)
      .sort((a, b) => b[1] - a[1])[0];
    
    stats.push({
      metric: `Most common: "${question}"`,
      value: `${mostCommon[0]} (${Math.round((mostCommon[1] / data.total) * 100)}%)`
    });
  }

  return stats;
}

// Prepare data for charts
function prepareChartsData(sheet, responses) {
  // Get all unique questions for charting
  const questions = [...new Set(responses.map(r => r.question))];
  
  questions.forEach((question, index) => {
    const row = index * 5 + 1; // Space charts vertically
    
    // Filter responses for this question
    const questionResponses = responses.filter(r => r.question === question);
    
    // Count answer frequencies
    const answerCounts = questionResponses.reduce((acc, { answer }) => {
      const answerStr = String(answer);
      acc[answerStr] = (acc[answerStr] || 0) + 1;
      return acc;
    }, {});

    // Add question title
    sheet.getCell(`A${row}`).value = question;
    sheet.getCell(`A${row}`).font = { bold: true };
    
    // Add data table
    const dataRows = Object.entries(answerCounts).map(([answer, count], i) => {
      sheet.getCell(`A${row + i + 1}`).value = answer;
      sheet.getCell(`B${row + i + 1}`).value = count;
      return [answer, count];
    });

    // Add table structure
    sheet.addTable({
      name: `ChartData_${index}`,
      ref: `A${row}`,
      columns: [
        { name: 'Answer' },
        { name: 'Count' }
      ],
      rows: dataRows
    });
  });
}
