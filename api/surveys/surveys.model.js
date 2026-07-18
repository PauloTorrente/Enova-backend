import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import { getQuestionsValue, setQuestionsValue, validateQuestions } from './surveys.questions.schema.util.js';

// `questions` column get/set/validate logic lives in
// surveys.questions.schema.util.js — it's the bulk of this model's
// complexity, so it's kept in its own file rather than inlined here.
const Survey = sequelize.define('Survey', {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  title: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  questions: {
    type: DataTypes.JSON,
    allowNull: false,
    get: getQuestionsValue,
    set: setQuestionsValue,
    validate: {
      isValidQuestions: validateQuestions
    }
  },
  expirationTime: {
    type: DataTypes.DATE,
    allowNull: false,
  },
  status: {
    type: DataTypes.ENUM('active', 'expired'),
    defaultValue: 'active',
  },
  clientId: {
    type: DataTypes.INTEGER,
    allowNull: true,
    references: {
      model: 'clients',
      key: 'id'
    },
    field: 'client_id'
  },
  responseLimit: {
    type: DataTypes.INTEGER,
    allowNull: true,
    defaultValue: null,
    field: 'response_limit',
    validate: {
      min: 1
    }
  },
  accessToken: {
    type: DataTypes.STRING,
    allowNull: false,
    unique: true,
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'created_at',
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    allowNull: false,
    field: 'updated_at',
    defaultValue: DataTypes.NOW
  }
}, {
  tableName: 'surveys',
  timestamps: true,
  underscored: false,
});

// Define the association between Survey and Result
Survey.associate = (models) => {
  Survey.hasMany(models.Result, {
    foreignKey: 'surveyId',
    as: 'results',
  });

  Survey.belongsTo(models.Client, {
    foreignKey: 'clientId',
    as: 'client'
  });
};

export default Survey;
