import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import User from '../users/users.model.js';

// One row per Perfilación Quirúrgica submission. Raw answers are kept in
// full (rawAnswers) alongside the individually-typed fields the Graffar
// formula reads, so the whole base can be recalculated later if the
// cutoffs in config/graffarConfig.js change — recalculating never needs
// another trip to the respondent.
const SurgicalProfile = sequelize.define(
  'SurgicalProfile',
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: false, field: 'user_id' },

    // Módulo A — núcleo socioeconómico
    sostenQuien: { type: DataTypes.STRING, allowNull: true, field: 'sosten_quien' },
    ocupacionSosten: { type: DataTypes.INTEGER, allowNull: false, field: 'ocupacion_sosten' },
    educacionSosten: { type: DataTypes.INTEGER, allowNull: false, field: 'educacion_sosten' },
    fuenteIngreso: { type: DataTypes.INTEGER, allowNull: false, field: 'fuente_ingreso' },
    tenencia: { type: DataTypes.STRING, allowNull: false },
    banos: { type: DataTypes.INTEGER, allowNull: false },
    personas: { type: DataTypes.INTEGER, allowNull: false },
    posesiones: { type: DataTypes.JSON, allowNull: true }, // { auto, lavadora, refrigerador, aire, computador, tarjeta, banca, internet, streaming, numAutos, ... }
    cpZona: { type: DataTypes.STRING, allowNull: true, field: 'cp_zona' },

    // Módulo B — hogar y ciclo de vida
    numHijos: { type: DataTypes.STRING, allowNull: true, field: 'num_hijos' },
    estadoPareja: { type: DataTypes.STRING, allowNull: true, field: 'estado_pareja' },
    decisorCompras: { type: DataTypes.STRING, allowNull: true, field: 'decisor_compras' },

    // Módulo C — consumo y comportamiento
    categorias: { type: DataTypes.JSON, allowNull: true }, // cat_* booleans
    canales: { type: DataTypes.JSON, allowNull: true }, // array of channel strings
    digital: { type: DataTypes.JSON, allowNull: true }, // dig_banca, dig_compras_online, dig_billetera, ...
    sector: { type: DataTypes.STRING, allowNull: true },

    // Módulo D — actitudes (opcional / rotativo)
    actitudCompra: { type: DataTypes.STRING, allowNull: true, field: 'actitud_compra' },
    actitudInnovador: { type: DataTypes.INTEGER, allowNull: true, field: 'actitud_innovador' },

    // Control de calidad
    controlAtencion: { type: DataTypes.STRING, allowNull: true, field: 'control_atencion' },
    flagAtencion: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'flag_atencion' },

    // Calculados al enviar (ver profiling.graffar.service.js — fuente única)
    viviendaScore: { type: DataTypes.INTEGER, allowNull: false, field: 'vivienda_score' },
    graffar: { type: DataTypes.INTEGER, allowNull: false },
    estrato: { type: DataTypes.INTEGER, allowNull: false },
    estratoLabel: { type: DataTypes.STRING, allowNull: false, field: 'estrato_label' },
    indicePosesiones: { type: DataTypes.INTEGER, allowNull: false, field: 'indice_posesiones' },
    bandaObjetiva: { type: DataTypes.INTEGER, allowNull: false, field: 'banda_objetiva' },
    bandaObjetivaLabel: { type: DataTypes.STRING, allowNull: false, field: 'banda_objetiva_label' },
    flagRevisar: { type: DataTypes.BOOLEAN, defaultValue: false, field: 'flag_revisar' },
    etiquetaLocal: { type: DataTypes.STRING, allowNull: true, field: 'etiqueta_local' },
    pais: { type: DataTypes.STRING, allowNull: true },

    rawAnswers: { type: DataTypes.JSON, allowNull: false, field: 'raw_answers' },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
  },
  {
    tableName: 'surgical_profiles',
    timestamps: false,
  }
);

SurgicalProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

export default SurgicalProfile;
