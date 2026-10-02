// Básico a propósito: list + create for each entity, no update/delete yet
// (nothing in the spec's acceptance tests needs them for this first pass —
// see enova-price-schema.sql.txt and the "Enova Pulse Price" instructivo).
import { QueryTypes } from 'sequelize';
import { sequelize } from '../../config/database.js';
import {
  PriceCadena, PriceTienda, PriceCategoria, PriceProducto,
  PriceCaptura, PriceObservacion, PriceAlerta, PriceStagingRechazo, PriceConfig,
} from './price.models.js';
import { recalcularAlertas as recalcularAlertasService } from './price.alerts.service.js';

const listAndCreate = (Model, { include } = {}) => ({
  list: async (req, res) => {
    try {
      const rows = await Model.findAll({ include, order: [['id', 'DESC']] });
      res.status(200).json({ success: true, data: rows });
    } catch (error) {
      console.error(`[price] ${Model.name} list failed:`, error.message);
      res.status(500).json({ success: false, message: `Failed to fetch ${Model.name}`, error: error.message });
    }
  },
  create: async (req, res) => {
    try {
      const row = await Model.create(req.body);
      res.status(201).json({ success: true, data: row });
    } catch (error) {
      console.error(`[price] ${Model.name} create failed:`, error.message);
      res.status(400).json({ success: false, message: `Failed to create ${Model.name}`, error: error.message });
    }
  },
});

export const cadenas = listAndCreate(PriceCadena);
export const tiendas = listAndCreate(PriceTienda, { include: [{ model: PriceCadena, as: 'cadena' }] });
export const categorias = listAndCreate(PriceCategoria);
export const productos = listAndCreate(PriceProducto, { include: [{ model: PriceCategoria, as: 'categoria' }] });
export const capturas = listAndCreate(PriceCaptura, {
  include: [{ model: PriceTienda, as: 'tienda' }, { model: PriceCategoria, as: 'categoria' }],
});
export const observaciones = listAndCreate(PriceObservacion, {
  include: [
    {
      model: PriceCaptura,
      as: 'captura',
      include: [{ model: PriceTienda, as: 'tienda', include: [{ model: PriceCadena, as: 'cadena' }] }],
    },
    { model: PriceProducto, as: 'producto' },
  ],
});
export const alertas = listAndCreate(PriceAlerta, {
  include: [{ model: PriceProducto, as: 'producto' }, { model: PriceCadena, as: 'cadena' }],
});
export const stagingRechazos = listAndCreate(PriceStagingRechazo);

// Config is key/value, upserted by clave rather than created fresh each time.
export const getConfig = async (req, res) => {
  try {
    const rows = await PriceConfig.findAll({ order: [['clave', 'ASC']] });
    res.status(200).json({ success: true, data: rows });
  } catch (error) {
    console.error('[price] getConfig failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch config', error: error.message });
  }
};

export const setConfig = async (req, res) => {
  const { clave } = req.params;
  const { valor, descripcion } = req.body;
  try {
    const [row] = await PriceConfig.upsert(
      { clave, valor, descripcion, updatedAt: new Date() },
      { returning: true }
    );
    res.status(200).json({ success: true, data: row });
  } catch (error) {
    console.error(`[price] setConfig failed (clave=${clave}):`, error.message);
    res.status(400).json({ success: false, message: 'Failed to update config', error: error.message });
  }
};

// Basic dashboard summary — counts + most recent alerts, so the frontend
// has something to show on first load without stitching together 7 calls.
export const getSummary = async (req, res) => {
  try {
    const [cadenaCount, tiendaCount, productoCount, observacionCount, alertaAbiertaCount, alertasRecientes] = await Promise.all([
      PriceCadena.count(),
      PriceTienda.count(),
      PriceProducto.count(),
      PriceObservacion.count(),
      PriceAlerta.count({ where: { estado: ['observacion', 'movimiento_real'] } }),
      PriceAlerta.findAll({
        include: [{ model: PriceProducto, as: 'producto' }, { model: PriceCadena, as: 'cadena' }],
        order: [['fechaUltima', 'DESC']],
        limit: 10,
      }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        cadenaCount, tiendaCount, productoCount, observacionCount, alertaAbiertaCount,
        alertasRecientes,
      },
    });
  } catch (error) {
    console.error('[price] getSummary failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch summary', error: error.message });
  }
};

// The actual cross-reference the alert rules need (gap entre cadenas, dinero
// sobre la mesa, etc.): same producto, latest known price per tienda, so
// they can be compared side by side. DISTINCT ON (tienda_id) picks the most
// recent captura/observacion per tienda in one pass instead of N queries.
export const getProductoComparativa = async (req, res) => {
  const { id } = req.params;
  try {
    const rows = await sequelize.query(
      `
      SELECT DISTINCT ON (t.id)
        t.id AS "tiendaId", t.nombre AS "tiendaNombre", t.ciudad AS "tiendaCiudad",
        ca.id AS "cadenaId", ca.nombre AS "cadenaNombre",
        o.precio_envase AS "precioEnvase", o.precio_promo AS "precioPromo",
        o.tipo_promo AS "tipoPromo", o.confianza_extraccion AS "confianzaExtraccion",
        c.fecha AS "fecha"
      FROM price_observaciones o
      JOIN price_capturas c ON c.id = o.captura_id
      JOIN price_tiendas t ON t.id = c.tienda_id
      JOIN price_cadenas ca ON ca.id = t.cadena_id
      WHERE o.producto_id = :productoId
      ORDER BY t.id, c.fecha DESC, o.created_at DESC
      `,
      { replacements: { productoId: id }, type: QueryTypes.SELECT }
    );

    const precios = rows.map((r) => Number(r.precioEnvase));
    const min = precios.length ? Math.min(...precios) : null;
    const max = precios.length ? Math.max(...precios) : null;

    res.status(200).json({
      success: true,
      data: {
        porTienda: rows,
        rango: min !== null ? { min, max, gap: Number((max - min).toFixed(2)) } : null,
      },
    });
  } catch (error) {
    console.error(`[price] getProductoComparativa failed (producto=${id}):`, error.message);
    res.status(500).json({ success: false, message: 'Failed to fetch price comparison', error: error.message });
  }
};

// Recomputes every alert type from the full observaciones history — see
// price.alerts.service.js for the rules. Admin-triggered rather than a
// cron for now: there's no automated daily ingestion yet (Doc 1/2 describe
// it as still manual/assisted), so there's no natural "new data landed" hook.
export const recalcularAlertas = async (req, res) => {
  try {
    const alertas = await recalcularAlertasService();
    res.status(200).json({ success: true, data: { count: alertas.length, alertas } });
  } catch (error) {
    console.error('[price] recalcularAlertas failed:', error.message);
    res.status(500).json({ success: false, message: 'Failed to recalculate alerts', error: error.message });
  }
};
