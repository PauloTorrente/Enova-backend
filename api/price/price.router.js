import express from 'express';
import { authenticateClientAdmin } from '../../middlewares/client.auth.middleware.js';
import * as price from './price.controller.js';

const router = express.Router();

// Internal tool (Enova Price) — every route here needs a client_admin
// session, same login as Enova Pulse. No public/respondent-facing data.
router.use(authenticateClientAdmin);

router.get('/summary', price.getSummary);

router.get('/cadenas', price.cadenas.list);
router.post('/cadenas', price.cadenas.create);

router.get('/tiendas', price.tiendas.list);
router.post('/tiendas', price.tiendas.create);

router.get('/categorias', price.categorias.list);
router.post('/categorias', price.categorias.create);

router.get('/productos', price.productos.list);
router.post('/productos', price.productos.create);
router.get('/productos/:id/comparativa', price.getProductoComparativa);

router.get('/capturas', price.capturas.list);
router.post('/capturas', price.capturas.create);

router.get('/observaciones', price.observaciones.list);
router.post('/observaciones', price.observaciones.create);

router.get('/alertas', price.alertas.list);
router.post('/alertas', price.alertas.create);
router.post('/alertas/recalcular', price.recalcularAlertas);

router.get('/staging-rechazos', price.stagingRechazos.list);

router.get('/config', price.getConfig);
router.put('/config/:clave', price.setConfig);

export default router;
