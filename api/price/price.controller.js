// Básico a propósito: list + create for each entity, no update/delete yet
// (nothing in the spec's acceptance tests needs them for this first pass —
// see enova-price-schema.sql.txt and the "Enova Pulse Price" instructivo).
import {
  PriceCadena, PriceTienda, PriceCategoria, PriceProducto,
  PriceCaptura, PriceObservacion, PriceAlerta, PriceStagingRechazo, PriceConfig,
} from './price.models.js';

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
  include: [{ model: PriceCaptura, as: 'captura' }, { model: PriceProducto, as: 'producto' }],
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
