// Computes price_alertas from the raw observaciones history, implementing
// the rules from "Instructivo técnico — Base de datos Enova Pulse Price"
// (sección 5) against the thresholds stored in price_config (T5: "umbrales
// en configuración, no en código").
//
// Deliberately NOT implemented here: "categoría en transición" (a fixed
// static notice per the doc, not a computed threshold) and the Kizeo
// import pipeline (T2 — still manual/assisted per Doc 1/2).
//
// Which price each rule uses matters and is doc-specified, not a free
// choice: "prima vs. líder/distribuidor" and "dinero sobre la mesa" compare
// precio_neto_unidad (promo-adjusted, normalized €/L-€/kg — sección 4);
// "cruce de euro entero" and "formato de ataque" compare desembolso
// (precio_envase) on purpose — sección 7's own test case has the attack
// format alert fire even though its €/L is HIGHER than the client's,
// because what crosses the euro is the sticker price, not the normalized one.
import { Op } from 'sequelize';
import {
  PriceCadena, PriceTienda, PriceCategoria, PriceProducto,
  PriceCaptura, PriceObservacion, PriceAlerta, PriceConfig,
} from './price.models.js';
import { precioNetoUnidad } from './price.calculations.js';

const diffDias = (a, b) => Math.round((new Date(b) - new Date(a)) / 86400000);
const groupBy = (arr, key) => arr.reduce((acc, item) => {
  (acc[item[key]] ||= []).push(item);
  return acc;
}, {});

// Prima/dinero-sobre-la-mesa only mean something comparing the same shelf
// on the same visit — pairing by fecha alone would average a producto's
// price across every tienda it's in, which isn't the "premium on this
// shelf" the rule is about. Matches by (fecha, tiendaId) instead, on
// whichever price field the caller asks for (precio = desembolso,
// precioNeto = €/L-€/kg promo-adjusted).
const matchPorTiendaYFecha = (obsA, obsB, field = 'precio') => {
  const puntos = [];
  for (const a of obsA) {
    const b = obsB.find((x) => x.fecha === a.fecha && x.tiendaId === a.tiendaId);
    if (b && a[field] != null && b[field] != null) {
      puntos.push({ fecha: a.fecha, tiendaId: a.tiendaId, precioA: a[field], precioB: b[field] });
    }
  }
  return puntos;
};

const getConfigMap = async () => {
  const rows = await PriceConfig.findAll();
  const map = {};
  rows.forEach((r) => { map[r.clave] = r.valor; });
  return map;
};

// { productoId -> [{ fecha, tiendaId, cadenaId, cadenaNombre, precio,
//   precioNeto, tipoPromo }] } built from EVERY observation (not just the
// latest), so fecha_primera/fecha_ultima on an alert reflect how long the
// condition has actually held — which is what "persistencia" (T7) needs to
// mean anything. `precio` = desembolso crudo; `precioNeto` = €/L-€/kg
// ajustado por promoción (sección 4) — null if the producto's tamaño/
// unidad is somehow missing, in which case that observation only
// participates in desembolso-based rules.
const loadObservacionesPorProducto = async (productos) => {
  const productosById = new Map(productos.map((p) => [p.id, p]));
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
    const producto = productosById.get(o.productoId);
    const list = porProducto.get(o.productoId) || [];
    list.push({
      fecha: o.captura.fecha,
      tiendaId: o.captura.tienda.id,
      tiendaNombre: o.captura.tienda.nombre,
      cadenaId: o.captura.tienda.cadena.id,
      cadenaNombre: o.captura.tienda.cadena.nombre,
      precio: Number(o.precioEnvase),
      precioNeto: producto ? precioNetoUnidad(o, producto) : null,
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
  const productos = await PriceProducto.findAll();
  const porProducto = await loadObservacionesPorProducto(productos);
  const categorias = await PriceCategoria.findAll();
  const creadas = [];

  // 1. Diferencia entre cadenas — "mismo producto con ≥1€ de diferencia (en
  // desembolso O en precio neto por litro/kilo), O que cruza un euro
  // entero" (sección 5: es un OR de tres condiciones, no solo desembolso).
  // Per producto, per fecha: only counts if the spread spans more than one
  // cadena (two Mercadona branches pricing differently isn't a
  // "between chains" story).
  const gapMin = config.diferencia_entre_cadenas_eur?.min ?? 1;
  for (const [productoId, obs] of porProducto) {
    const porFecha = groupBy(obs, 'fecha');
    const fechasQueCumplen = [];
    let detalleUltimaFecha = null;
    for (const fecha of Object.keys(porFecha).sort()) {
      const items = porFecha[fecha];
      if (new Set(items.map((i) => i.cadenaId)).size < 2) continue;
      const desembolsos = items.map((i) => i.precio);
      const netos = items.map((i) => i.precioNeto).filter((n) => n != null);
      const gapDesembolso = Math.max(...desembolsos) - Math.min(...desembolsos);
      const gapNeto = netos.length ? Math.max(...netos) - Math.min(...netos) : 0;
      const cruzaEuro = new Set(desembolsos.map((d) => Math.floor(d))).size > 1;
      if (gapDesembolso >= gapMin || gapNeto >= gapMin || cruzaEuro) {
        fechasQueCumplen.push(fecha);
        detalleUltimaFecha = items;
      }
    }
    if (fechasQueCumplen.length) {
      const desembolsos = detalleUltimaFecha.map((i) => i.precio);
      const netos = detalleUltimaFecha.map((i) => i.precioNeto).filter((n) => n != null);
      creadas.push(await upsertAlerta({
        tipo: 'diferencia_entre_cadenas',
        regla: 'diferencia_entre_cadenas_eur',
        productoId,
        valores: {
          gapDesembolso: Number((Math.max(...desembolsos) - Math.min(...desembolsos)).toFixed(2)),
          gapNeto: netos.length ? Number((Math.max(...netos) - Math.min(...netos)).toFixed(2)) : null,
          cruzaEuro: new Set(desembolsos.map((d) => Math.floor(d))).size > 1,
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
        const puntos = matchPorTiendaYFecha(clienteObs, refObs, 'precioNeto');
        const puntosAlerta = [];
        const puntosSerio = [];
        for (const punto of puntos.sort((a, b) => (a.fecha < b.fecha ? -1 : 1))) {
          const { fecha, precioA: pCliente, precioB: pRef } = punto;
          const prima = (pCliente - pRef) / pRef;
          const detalle = { fecha, prima, pCliente, pRef };
          // Un mismo día puede dar más de un punto si el producto se vio en
          // más de una tienda — el nivel más grave de ESE día manda, no
          // "lo último que se procesó" (ver bug histórico: un punto que no
          // califica podía pisar el resultado de uno que sí).
          if (umbralSerio && prima >= umbralSerio.min) puntosSerio.push(detalle);
          else if (umbralAlerta && prima >= umbralAlerta.min) puntosAlerta.push(detalle);
        }
        const fechas = [...puntosSerio, ...puntosAlerta].map((p) => p.fecha).sort();
        if (fechas.length) {
          const nivel = puntosSerio.length ? 'problema_serio' : 'alerta';
          const relevantes = puntosSerio.length ? puntosSerio : puntosAlerta;
          const ultima = relevantes[relevantes.length - 1];
          creadas.push(await upsertAlerta({
            tipo: key,
            regla: `${key}_${nivel}`,
            productoId: cliente.id,
            valores: {
              nivel,
              primaPct: Number((ultima.prima * 100).toFixed(1)),
              precioClienteNeto: Number(ultima.pCliente.toFixed(2)),
              precioReferenciaNeto: Number(ultima.pRef.toFixed(2)),
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
        const puntos = matchPorTiendaYFecha(clienteObs, liderObs, 'precioNeto');
        const puntosQueCumplen = [];
        for (const punto of puntos.sort((a, b) => (a.fecha < b.fecha ? -1 : 1))) {
          const { fecha, precioA: pCliente, precioB: pLider } = punto;
          const diff = (pLider - pCliente) / pLider;
          if (diff >= umbral) puntosQueCumplen.push({ fecha, diff, pCliente, pLider });
        }
        if (puntosQueCumplen.length) {
          const ultima = puntosQueCumplen[puntosQueCumplen.length - 1];
          creadas.push(await upsertAlerta({
            tipo: 'dinero_sobre_la_mesa',
            regla: 'dinero_sobre_la_mesa',
            productoId: cliente.id,
            valores: {
              diferenciaPct: Number((ultima.diff * 100).toFixed(1)),
              precioClienteNeto: Number(ultima.pCliente.toFixed(2)),
              precioLiderNeto: Number(ultima.pLider.toFixed(2)),
            },
            fechaPrimera: puntosQueCumplen[0].fecha,
            fechaUltima: ultima.fecha,
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
