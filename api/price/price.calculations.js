// Direct translation of "Instructivo técnico — Base de datos Enova Pulse
// Price" sección 4 — same formulas, same variable names where practical,
// so this stays checkable against the doc line by line. parametros_promo
// keys (n, m, descuento_segunda) are whatever the doc's own example uses,
// since that JSON column has no fixed schema of its own.
const FACTOR_UNIDAD = { ml: 1000, g: 1000, ud: 1 };

// o: { tipoPromo, precioEnvase, precioPromo, parametrosPromo }
export const precioEfectivoEnvase = (o) => {
  switch (o.tipoPromo) {
    case 'descuento_directo':
      return o.precioPromo != null ? Number(o.precioPromo) : Number(o.precioEnvase);
    case 'nxm':
      // 3x2 → {n:3, m:2} → ×2/3 (sección 4, ejemplo del propio documento)
      return (Number(o.precioEnvase) * o.parametrosPromo.m) / o.parametrosPromo.n;
    case 'segunda_unidad':
      // 2ª al 50% → {descuento_segunda:0.5} → ×(1 + 0.5)/2 = ×0.75
      return (Number(o.precioEnvase) * (1 + (1 - o.parametrosPromo.descuento_segunda))) / 2;
    default:
      return Number(o.precioEnvase);
  }
};

// p: { tamanoValor, tamanoUnidad, unidadesPack } — €/L, €/kg o €/ud.
export const precioNetoUnidad = (o, p) => {
  const factor = FACTOR_UNIDAD[p.tamanoUnidad] ?? 1;
  return (precioEfectivoEnvase(o) / (Number(p.tamanoValor) * p.unidadesPack)) * factor;
};
