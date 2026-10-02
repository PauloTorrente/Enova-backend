// Sequelize models for Enova Pulse Price — one file for all nine tables
// (rather than the usual one-file-per-model) since this is the first,
// deliberately "básico" pass at the whole schema from the same migration
// (see enova-price-schema.sql.txt at the repo root's parent folder).
// Matches price_* tables created by that script — see it for the field
// notes/comments; kept brief here to avoid duplicating the same context twice.
import { DataTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';

export const PriceCadena = sequelize.define('PriceCadena', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING, allowNull: false },
  pais: { type: DataTypes.STRING, allowNull: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { tableName: 'price_cadenas', timestamps: false });

export const PriceTienda = sequelize.define('PriceTienda', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  cadenaId: { type: DataTypes.INTEGER, allowNull: false, field: 'cadena_id' },
  nombre: { type: DataTypes.STRING, allowNull: false },
  ciudad: { type: DataTypes.STRING, allowNull: true },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { tableName: 'price_tiendas', timestamps: false });

export const PriceCategoria = sequelize.define('PriceCategoria', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  nombre: { type: DataTypes.STRING, allowNull: false },
  pais: { type: DataTypes.STRING, allowNull: false },
  // null = "sin clasificar" — no se calculan alertas de prima (sección 5).
  tipoCategoria: { type: DataTypes.STRING, allowNull: true, field: 'tipo_categoria' },
  productoLiderId: { type: DataTypes.INTEGER, allowNull: true, field: 'producto_lider_id' },
  productoReferenciaDistribuidorId: { type: DataTypes.INTEGER, allowNull: true, field: 'producto_referencia_distribuidor_id' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { tableName: 'price_categorias', timestamps: false });

export const PriceProducto = sequelize.define('PriceProducto', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  categoriaId: { type: DataTypes.INTEGER, allowNull: false, field: 'categoria_id' },
  marca: { type: DataTypes.STRING, allowNull: false },
  fabricante: { type: DataTypes.STRING, allowNull: true },
  linea: { type: DataTypes.STRING, allowNull: true },
  variante: { type: DataTypes.STRING, allowNull: true },
  ean: { type: DataTypes.STRING, allowNull: true },
  tamanoValor: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'tamano_valor' },
  tamanoUnidad: { type: DataTypes.STRING, allowNull: false, field: 'tamano_unidad' }, // ml | g | ud
  formato: { type: DataTypes.STRING, allowNull: true },
  unidadesPack: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1, field: 'unidades_pack' },
  esMarcaDistribuidor: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'es_marca_distribuidor' },
  // The product(s) the client actually tracks strategically within a
  // category — "prima vs. líder/distribuidor" and "dinero sobre la mesa"
  // (price.alerts.service.js) are all relative to this, per categoría.
  esProductoCliente: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'es_producto_cliente' },
  primeraVezVisto: { type: DataTypes.DATEONLY, allowNull: true, field: 'primera_vez_visto' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { tableName: 'price_productos', timestamps: false });

export const PriceCaptura = sequelize.define('PriceCaptura', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tiendaId: { type: DataTypes.INTEGER, allowNull: false, field: 'tienda_id' },
  categoriaId: { type: DataTypes.INTEGER, allowNull: false, field: 'categoria_id' },
  fecha: { type: DataTypes.DATEONLY, allowNull: false },
  scout: { type: DataTypes.STRING, allowNull: true },
  kizeoId: { type: DataTypes.STRING, allowNull: true, field: 'kizeo_id' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { tableName: 'price_capturas', timestamps: false });

export const PriceObservacion = sequelize.define('PriceObservacion', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  capturaId: { type: DataTypes.INTEGER, allowNull: false, field: 'captura_id' },
  productoId: { type: DataTypes.INTEGER, allowNull: false, field: 'producto_id' },
  // Kizeo's photo filename — the idempotency key for daily incremental
  // ingestion (ON CONFLICT(foto_id) DO UPDATE, per Doc 2 Fase B/D).
  fotoId: { type: DataTypes.STRING, allowNull: true, unique: true, field: 'foto_id' },
  fotoUrl: { type: DataTypes.TEXT, allowNull: true, field: 'foto_url' },
  precioEnvase: { type: DataTypes.DECIMAL(10, 2), allowNull: false, field: 'precio_envase' },
  precioPromo: { type: DataTypes.DECIMAL(10, 2), allowNull: true, field: 'precio_promo' },
  tipoPromo: { type: DataTypes.STRING, allowNull: false, defaultValue: 'ninguna', field: 'tipo_promo' },
  parametrosPromo: { type: DataTypes.JSONB, allowNull: true, field: 'parametros_promo' },
  promoConTarjeta: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false, field: 'promo_con_tarjeta' },
  facings: { type: DataTypes.INTEGER, allowNull: true },
  huecoEnLineal: { type: DataTypes.STRING, allowNull: true, field: 'hueco_en_lineal' },
  confianzaExtraccion: { type: DataTypes.STRING, allowNull: false, defaultValue: 'alta', field: 'confianza_extraccion' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { tableName: 'price_observaciones', timestamps: false });

export const PriceAlerta = sequelize.define('PriceAlerta', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  tipo: { type: DataTypes.STRING, allowNull: false },
  regla: { type: DataTypes.STRING, allowNull: false },
  productoId: { type: DataTypes.INTEGER, allowNull: true, field: 'producto_id' },
  cadenaId: { type: DataTypes.INTEGER, allowNull: true, field: 'cadena_id' },
  valores: { type: DataTypes.JSONB, allowNull: true },
  fechaPrimera: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_primera' },
  fechaUltima: { type: DataTypes.DATEONLY, allowNull: false, field: 'fecha_ultima' },
  // observacion -> movimiento_real (tras 30 días, T7) -> cerrada
  estado: { type: DataTypes.STRING, allowNull: false, defaultValue: 'observacion' },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { tableName: 'price_alertas', timestamps: false });

// Cuarentena de visitas/filas huérfanas (sin cadena/tienda reconocida) de
// la ingesta diaria — nunca se infiere la cadena por marca blanca.
export const PriceStagingRechazo = sequelize.define('PriceStagingRechazo', {
  id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
  motivo: { type: DataTypes.STRING, allowNull: false },
  fechaCaptura: { type: DataTypes.DATEONLY, allowNull: true, field: 'fecha_captura' },
  kizeoId: { type: DataTypes.STRING, allowNull: true, field: 'kizeo_id' },
  fotoId: { type: DataTypes.STRING, allowNull: true, field: 'foto_id' },
  datosCrudos: { type: DataTypes.JSONB, allowNull: true, field: 'datos_crudos' },
  resuelto: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: false },
  createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
}, { tableName: 'price_staging_rechazos', timestamps: false });

// "Umbrales en configuración, no en código" (T5) — key/value, one row per
// threshold. See enova-price-schema.sql.txt's seed INSERTs for the
// literal values from spec section 5.
export const PriceConfig = sequelize.define('PriceConfig', {
  clave: { type: DataTypes.STRING, primaryKey: true },
  valor: { type: DataTypes.JSONB, allowNull: false },
  descripcion: { type: DataTypes.TEXT, allowNull: true },
  updatedAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'updated_at' },
}, { tableName: 'price_config', timestamps: false });

// Associations — read-side only (include chains for the list endpoints);
// nothing here needs cascade deletes for this first pass.
PriceTienda.belongsTo(PriceCadena, { foreignKey: 'cadenaId', as: 'cadena' });
PriceProducto.belongsTo(PriceCategoria, { foreignKey: 'categoriaId', as: 'categoria' });
PriceCaptura.belongsTo(PriceTienda, { foreignKey: 'tiendaId', as: 'tienda' });
PriceCaptura.belongsTo(PriceCategoria, { foreignKey: 'categoriaId', as: 'categoria' });
PriceObservacion.belongsTo(PriceCaptura, { foreignKey: 'capturaId', as: 'captura' });
PriceObservacion.belongsTo(PriceProducto, { foreignKey: 'productoId', as: 'producto' });
PriceAlerta.belongsTo(PriceProducto, { foreignKey: 'productoId', as: 'producto' });
PriceAlerta.belongsTo(PriceCadena, { foreignKey: 'cadenaId', as: 'cadena' });
