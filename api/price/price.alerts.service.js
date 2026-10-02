// Computes price_alertas from the raw observaciones history, implementing
// the rules from "Instructivo técnico — Base de datos Enova Pulse Price"
// (sección 5) against the thresholds stored in price_config (T5: "umbrales
// en configuración, no en código").
//
// Deliberately NOT implemented here: "categoría en transición" (a fixed
// static notice per the doc, not a computed threshold) and unit-normalized
// "precio neto por unidad" (the doc's full promo-adjusted price math) —
// this pass compares precio_envase directly, which is enough to exercise
// every numeric rule but doesn't yet account for NxM/segunda-unidad math.
import { Op } from 'sequelize';
import {
  PriceCadena, PriceTienda, PriceCategoria, PriceProducto,
  PriceCaptura, PriceObservacion, PriceAlerta, PriceConfig,
} from './price.models.js';

const diffDias = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const groupBy = (arr, key) => arr.reduce((acc, item) => {
  (acc[item[key]] ||= []).push(item);
  return acc;
}, {});

// Prima/dinero-sobre-la-mesa only mean something comparing the same shelf
// on the same visit — pairing by fecha alone would average a producto's
// price across every tienda it's in, which isn't the "premium on this
// shelf" the rule is about. Matches by (fecha, tiendaId) instead.
const matchPorTiendaYFecha = (obsA, obsB) => {
  const puntos = [];
  for (const a of obsA) {
    const b = obsB.find((x) => x.fecha === a.fecha && x.tiendaId === a.tiendaId);
    if (b) puntos.push({ fecha: a.fecha, tiendaId: a.tiendaId, precioA: a.precio, precioB: b.precio });
  }
  return puntos;
};

const getConfigMap = async () => {
  const rows = await PriceConfig.findAll();
  const map = {};
  rows.forEach((r) => { map[r.clave] = r.valor; });
  return map;
};

// { productoId -> [{ fecha, tiendaId, cadenaId, cadenaNombre, precio, tipoPromo }] }
// built from EVERY observation (not just the latest), so fecha_primera/
// fecha_ultima on an alert reflect how long the condition has actually
// held — which is what "persistencia" (T7) needs to mean anything.
const loadObservacionesPorProducto = async () => {
  const observaciones = await PriceObservacion.findAll({
    include: [{
      model: PriceCaptura,
      as: 'captura',
      include: [{ model: PriceTienda, as: 'tienda', include: [{ model: PriceCadena, as: 'cadena' }] }],
    }],
  });
  const porProducto = new Map();
  for (const o of observaciones) {
    if (!o.captura?.tienda?.cadena) continue;
    const list = porProducto.get(o.productoId) || [];
    list.push({
      fecha: o.captura.fecha,
      tiendaId: o.captura.tienda.id,
      tiendaNombre: o.captura.tienda.nombre,
      cadenaId: o.captura.tienda.cadena.id,
      cadenaNombre: o.captura.tienda.cadena.nombre,
      precio: Number(o.precioEnvase),
      tipoPromo: o.tipoPromo,
    });
    porProducto.set(o.productoId, list);
  }
  return porProducto;
};

// One alert instance per (tipo, productoId) — recomputing extends
// fecha_primera/fecha_ultima to cover the full known window instead of
// creating a duplicate row every time this runs.
const upsertAlerta = async ({ tipo, regla, productoId, cadenaId = null, valores, fechaPrimera, fechaUltima }) => {
  const existing = await PriceAlerta.findOne({
    where: { tipo, productoId, estado: { [Op.ne]: 'cerrada' } },
  });
  if (existing) {
    await existing.update({
      regla,
      valores,
      fechaPrimera: fechaPrimera < existing.fechaPrimera ? fechaPrimera : existing.fechaPrimera,
      fechaUltima: fechaUltima > existing.fechaUltima ? fechaUltima : existing.fechaUltima,
      cadenaId: cadenaId ?? existing.cadenaId,
    });
    return existing;
  }
  return PriceAlerta.create({ tipo, regla, productoId, cadenaId, valores, fechaPrimera, fechaUltima });
};

export const recalcularAlertas = async () => {
  const config = await getConfigMap();
  const porProducto = await loadObservacionesPorProducto();
  const productos = await PriceProducto.findAll();
  const categorias = await PriceCategoria.findAll();
  const creadas = [];

  // 1. Diferencia entre cadenas — per producto, per fecha, how wide is the
  // spread across the stores observed that day; a date only counts if the
  // spread crosses the threshold AND spans more than one cadena (two
  // Mercadona branches pricing differently isn't a "between chains" story).
  const gapMin = config.diferencia_entre_cadenas_eur?.min ?? 1;
  for (const [productoId, obs] of porProducto) {
    const porFecha = groupBy(obs, 'fecha');
    const fechasQueCumplen = [];
    let detalleUltimaFecha = null;
    for (const fecha of Object.keys(porFecha).sort()) {
      const items = porFecha[fecha];
      if (new Set(items.map((i) => i.cadenaId)).size < 2) continue;
      const precios = items.map((i) => i.precio);
      const gap = Math.max(...precios) - Math.min(...precios);
      if (gap >= gapMin) {
        fechasQueCumplen.push(fecha);
        detalleUltimaFecha = items;
      }
    }
    if (fechasQueCumplen.length) {
      const precios = detalleUltimaFecha.map((i) => i.precio);
      creadas.push(await upsertAlerta({
        tipo: 'diferencia_entre_cadenas',
        regla: 'diferencia_entre_cadenas_eur',
        productoId,
        valores: {
          gap: Number((Math.max(...precios) - Math.min(...precios)).toFixed(2)),
          tiendas: detalleUltimaFecha.map((i) => ({ tienda: i.tiendaNombre, cadena: i.cadenaNombre, precio: i.precio })),
        },
        fechaPrimera: fechasQueCumplen[0],
        fechaUltima: fechasQueCumplen[fechasQueCumplen.length - 1],
      }));
    }
  }

  // 2. Prima vs. líder (fortaleza) / vs. distribuidor (piso), and
  // 3. Dinero sobre la mesa (vs. líder, independiente del tipo) — ambas
  // relativas al producto marcado es_producto_cliente en cada categoría.
  for (const cat of categorias) {
    const productosCategoria = productos.filter((p) => p.categoriaId === cat.id);
    const cliente = productosCategoria.find((p) => p.esProductoCliente);
    if (!cliente) continue;
    const clienteObs = porProducto.get(cliente.id) || [];
    if (!clienteObs.length) continue;

    if (cat.tipoCategoria === 'piso' || cat.tipoCategoria === 'fortaleza') {
      const referenciaId = cat.tipoCategoria === 'piso' ? cat.productoReferenciaDistribuidorId : cat.productoLiderId;
      const refObs = referenciaId ? (porProducto.get(referenciaId) || []) : [];
      if (refObs.length) {
        const key = cat.tipoCategoria === 'piso' ? 'prima_piso' : 'prima_fortaleza';
        const umbralAlerta = config[`${key}_alerta`];
        const umbralSerio = config[`${key}_problema_serio`];
        const puntos = matchPorTiendaYFecha(clienteObs, refObs);
        const fechasAlerta = [];
        const fechasSerio = [];
        let ultima = null;
        for (const { fecha, precioA: pCliente, precioB: pRef } of puntos.sort((a, b) => (a.fecha < b.fecha ? -1 : 1))) {
          const prima = (pCliente - pRef) / pRef;
          ultima = { fecha, prima, pCliente, pRef };
          if (umbralSerio && prima >= umbralSerio.min) fechasSerio.push(fecha);
          else if (umbralAlerta && prima >= umbralAlerta.min) fechasAlerta.push(fecha);
        }
        const fechas = [...fechasSerio, ...fechasAlerta].sort();
        if (fechas.length) {
          const nivel = fechasSerio.length ? 'problema_serio' : 'alerta';
          creadas.push(await upsertAlerta({
            tipo: key,
            regla: `${key}_${nivel}`,
            productoId: cliente.id,
            valores: {
              nivel,
              primaPct: Number((ultima.prima * 100).toFixed(1)),
              precioCliente: ultima.pCliente,
              precioReferencia: ultima.pRef,
              referenciaProductoId: referenciaId,
            },
            fechaPrimera: fechas[0],
            fechaUltima: fechas[fechas.length - 1],
          }));
        }
      }
    }

    if (cat.productoLiderId && cat.productoLiderId !== cliente.id) {
      const liderObs = porProducto.get(cat.productoLiderId) || [];
      if (liderObs.length) {
        const umbral = config.dinero_sobre_la_mesa?.min ?? 0.15;
        const puntos = matchPorTiendaYFecha(clienteObs, liderObs);
        const fechasQueCumplen = [];
        let ultima = null;
        for (const { fecha, precioA: pCliente, precioB: pLider } of puntos.sort((a, b) => (a.fecha < b.fecha ? -1 : 1))) {
          const diff = (pLider - pCliente) / pLider;
          ultima = { fecha, diff, pCliente, pLider };
          if (diff >= umbral) fechasQueCumplen.push(fecha);
        }
        if (fechasQueCumplen.length) {
          creadas.push(await upsertAlerta({
            tipo: 'dinero_sobre_la_mesa',
            regla: 'dinero_sobre_la_mesa',
            productoId: cliente.id,
            valores: {
              diferenciaPct: Number((ultima.diff * 100).toFixed(1)),
              precioCliente: ultima.pCliente,
              precioLider: ultima.pLider,
            },
            fechaPrimera: fechasQueCumplen[0],
            fechaUltima: fechasQueCumplen[fechasQueCumplen.length - 1],
          }));
        }
      }
    }
  }

  // 4. Formato nuevo — alerta única, la primera vez que un producto aparece
  // observado (no se re-crea una vez ya registrada, aunque se le siga viendo).
  for (const [productoId, obs] of porProducto) {
    const existing = await PriceAlerta.findOne({ where: { tipo: 'formato_nuevo', productoId } });
    if (existing) continue;
    const primera = [...obs].map((o) => o.fecha).sort()[0];
    creadas.push(await upsertAlerta({
      tipo: 'formato_nuevo',
      regla: 'formato_nuevo',
      productoId,
      valores: { fechaDeteccion: primera },
      fechaPrimera: primera,
      fechaUltima: primera,
    }));
  }

  // 5. Promoción estructural — días entre la primera y la última fecha en
  // que el producto tuvo promo activa (cualquier tienda), sin importar si
  // fue continua: una campaña larga e intermitente también cuenta como
  // "estructural" frente a una promo puntual.
  const promoDias = config.promocion_estructural_dias?.dias ?? 45;
  for (const [productoId, obs] of porProducto) {
    const fechasPromo = [...new Set(obs.filter((o) => o.tipoPromo && o.tipoPromo !== 'ninguna').map((o) => o.fecha))].sort();
    if (fechasPromo.length < 2) continue;
    const dias = diffDias(fechasPromo[0], fechasPromo[fechasPromo.length - 1]);
    if (dias >= promoDias) {
      creadas.push(await upsertAlerta({
        tipo: 'promocion_estructural',
        regla: 'promocion_estructural_dias',
        productoId,
        valores: { dias, primeraFechaPromo: fechasPromo[0], ultimaFechaPromo: fechasPromo[fechasPromo.length - 1] },
        fechaPrimera: fechasPromo[0],
        fechaUltima: fechasPromo[fechasPromo.length - 1],
      }));
    }
  }

  // 6. Formato de ataque — un producto nuevo, 80-95% del tamaño del
  // producto del cliente, cuyo precio cruza una frontera de euro entero
  // por debajo del precio más reciente del cliente (sección 6: propuesta).
  const [sizeMin, sizeMax] = [config.formato_ataque_tamano?.min ?? 0.8, config.formato_ataque_tamano?.max ?? 0.95];
  for (const cat of categorias) {
    const productosCategoria = productos.filter((p) => p.categoriaId === cat.id);
    const cliente = productosCategoria.find((p) => p.esProductoCliente);
    if (!cliente) continue;
    const clienteObs = porProducto.get(cliente.id) || [];
    if (!clienteObs.length) continue;
    const clienteReciente = [...clienteObs].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];

    for (const candidato of productosCategoria) {
      if (candidato.id === cliente.id) continue;
      if (candidato.tamanoUnidad !== cliente.tamanoUnidad) continue;
      const ratio = Number(candidato.tamanoValor) / Number(cliente.tamanoValor);
      if (ratio < sizeMin || ratio > sizeMax) continue;
      const candidatoObs = porProducto.get(candidato.id) || [];
      if (!candidatoObs.length) continue;
      const candidatoReciente = [...candidatoObs].sort((a, b) => (a.fecha < b.fecha ? 1 : -1))[0];
      if (Math.floor(clienteReciente.precio) <= Math.floor(candidatoReciente.precio)) continue;

      creadas.push(await upsertAlerta({
        tipo: 'formato_ataque',
        regla: 'formato_ataque_tamano',
        productoId: candidato.id,
        valores: {
          ratioTamano: Number(ratio.toFixed(2)),
          precioCandidato: candidatoReciente.precio,
          precioCliente: clienteReciente.precio,
          productoClienteId: cliente.id,
        },
        fechaPrimera: candidatoReciente.fecha,
        fechaUltima: candidatoReciente.fecha,
      }));
    }
  }

  // 7. Persistencia (T7) — una vez que una alerta lleva abierta ≥N días
  // (fecha_ultima - fecha_primera), deja de ser "observación" y pasa a
  // "movimiento_real". Puramente basado en las fechas ya calculadas arriba.
  const persistenciaDias = config.persistencia_dias?.dias ?? 30;
  const abiertas = await PriceAlerta.findAll({ where: { estado: 'observacion' } });
  for (const a of abiertas) {
    if (diffDias(a.fechaPrimera, a.fechaUltima) >= persistenciaDias) {
      await a.update({ estado: 'movimiento_real' });
    }
  }

  return PriceAlerta.findAll({
    include: [{ model: PriceProducto, as: 'producto' }, { model: PriceCadena, as: 'cadena' }],
    order: [['tipo', 'ASC']],
  });
};
