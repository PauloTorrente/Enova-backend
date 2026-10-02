import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

// One row per (survey, respondent) once a client_admin has given that
// respondent's answers to THIS specific survey a score via award-points.
// Exists because User.score is a running total across every survey
// someone has ever answered — it can't tell you "has this person's
// response to this particular survey already been reviewed?", which is
// exactly what the "Evaluado" badge on the survey list needs to know.
const SurveyResponseEvaluation = sequelize.define(
  'SurveyResponseEvaluation',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    surveyId: { type: DataTypes.INTEGER, allowNull: false, field: 'survey_id' },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    tableName: 'survey_response_evaluations',
    timestamps: false,
  }
);

export default SurveyResponseEvaluation;
