import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

const User = sequelize.define(
  'User',
  {
    id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },
    role: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    email: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    firstName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'first_name',
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: false,
      field: 'last_name',
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    isConfirmed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'isconfirmed',
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'createdat',
    },
    resetPasswordToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'resetpasswordtoken',
    },
    resetPasswordExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'resetpasswordexpires',
    },
    confirmationToken: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'confirmationtoken',
    },
    gender: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    age: {
      type: DataTypes.INTEGER,
      allowNull: true, 
    },
    phone_number: {
      type: DataTypes.STRING,
      allowNull: true,
      validate: {
        isString(value) {
          if (value && typeof value !== 'string') {
            throw new Error('Phone number must be a string');
          }
        },
        isPhoneFormat(value) {
          if (value && !/^\+?[0-9\s\-()]+$/.test(value)) {
            throw new Error('Invalid phone number format');
          }
        }
      }
    },
    city: {
      type: DataTypes.STRING,
      allowNull: true, 
    },
    residentialArea: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'residential_area',
    },
    purchaseResponsibility: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'purchase_responsibility',
    },
    childrenCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'children_count',
    },
    childrenAges: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: true,
      field: 'children_ages',
    },
    educationLevel: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'education_level',
    },
    // --- Filtro Preliminar (registration) fields added on top of the
    // original columns above. whatsapp reuses phone_number, sexo reuses
    // gender, ciudad reuses city — see docs/registro-filtro-preliminar.md.
    country: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'country',
    },
    postalCode: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'postal_code',
    },
    birthYear: {
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'birth_year',
    },
    educationCode: {
      // 1-5 code per the Filtro Preliminar spec (1 = universitario+ ... 5 = sin estudios).
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'education_code',
    },
    occupation: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'occupation',
    },
    hasChildren: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
      field: 'has_children',
    },
    consentAccepted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'consent_accepted',
    },
    consentDate: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'consent_date',
    },
    consentVersion: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'consent_version',
    },
    whatsappVerified: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'whatsapp_verified',
    },
    whatsappOtpCode: {
      type: DataTypes.STRING,
      allowNull: true,
      field: 'whatsapp_otp_code',
    },
    whatsappOtpExpires: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'whatsapp_otp_expires',
    },
    // Paid once, the first time the respondent's basic profile (phone +
    // gender — the same fields opina-cash's profile-completeness gate
    // requires before responding to surveys) becomes complete. See
    // api/payments/payments.service.js#payBasicProfileCompletionReward.
    // "Completa tu registro y vas a ganar X" from the Aug 2026 meeting.
    basicProfileRewardPaid: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      field: 'basic_profile_reward_paid',
    },
    walletBalance: {
      type: DataTypes.FLOAT,
      defaultValue: 0, 
      field: 'wallet_balance',
    },
    score: {
    type: DataTypes.INTEGER,
    defaultValue: 0, 
    field: 'score',
},
  },
  {
    tableName: 'accounts_db',
    timestamps: false,
  }
);

User.addScope('publicData', {
  attributes: { 
    exclude: ['password', 'confirmationToken', 'resetPasswordToken', 'resetPasswordExpires'] 
  }
});

User.associate = (models) => {
  User.hasMany(models.Result, {
    foreignKey: 'userId',
    as: 'results'
  });
};

export default User;
