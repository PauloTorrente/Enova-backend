---
id: price-lectura-precios
capa: modulo
producto: price
dueno: pepe
version: 0.2
actualizado: 2026-09-24
cargar_si: la consulta trata de precios, primas, gaps, promociones, formatos o comparativas entre cadenas
---

# Lectura de precios

Principio: los umbrales dependen del tipo de categoría, del país y del momento, porque el ingreso disponible se comprime y las alternativas mejoran. Son puntos de alerta, no leyes. Se revisan cada trimestre. La clasificación de categorías la decide Pepe.

## 1. Dos precios, siempre

- **Precio neto**: precio por unidad de consumo de la misma medida (kg, L, ml, unidad), efectivamente pagado, con promoción incluida. Sirve para comparar primas.
- **Desembolso por compra (cash outlay)**: lo que el consumidor paga por el envase en el lineal. Sirve para leer puntos de precio.
- Una marca puede estar en paridad de precio neto y perder en desembolso. Ejemplo: Monster 330 ml en paridad con Red Bull; si Red Bull lanza 285 ml con impresión de tamaño parecida a un punto de precio notablemente inferior, es alerta aunque su precio por litro sea más alto.
- Todo cambio de formato o tamaño de un competidor se reporta. Un formato más pequeño con apariencia similar y menor desembolso es alerta.

## 2. Clasificar la categoría antes de leer cualquier precio

Clasificación por defecto (España; ajustar por país):

| Tipo | Categorías |
| --- | --- |
| Fortaleza (aún hay diferencia real de desempeño) | Pañales, desodorantes, toallas higiénicas, bebidas energéticas, detergentes y lavavajillas, cremas para la piel, snacks de SKU único |
| Piso (commodity) | Arroz, aceite, pasta, leche, quesos, lácteos, jabones, limpieza del hogar, tintes de cabello, snacks simples |
| En transición hacia piso | Gaseosas, cárnicos, helados (en cadenas) |
| Premium | Chocolates |
| Tecnología propia | Cualquier presentación con tecnología relevante, de nicho, casi única, que la competencia no tiene |

- Categoría no listada: se pregunta a Pepe; no se clasifica por deducción.
- **Categorías en transición:** se leen con umbrales de piso y se reporta explícitamente que la categoría se está comoditizando. Es la alerta de mayor valor para el cliente.
- Umbrales para Premium: `[pendiente]`.

## 3. Prima de precio neto

| Tipo de categoría | Sana | Alerta | Problema serio |
| --- | --- | --- | --- |
| Piso, frente a marca del distribuidor | Menos de 15% | 15-20% ("jugando con fuego") | Más de 20% |
| Piso, frente a marca comercial de igual tradición | Menos de 15% | 15-20% (watchout importante) | Más de 20% |
| Fortaleza | Hasta 20% (fuerza de marca) | 25% | 30% o más |
| Tecnología propia | 30-35% | `[pendiente]` | `[pendiente]` |

- En categorías piso, la recomendación es defensa de volumen con buena imagen, no persecución de prima.
- Con primas de 30-35% (tecnología propia), vigilar que el desembolso por compra no cruce un punto de precio psicológico.

## 4. Precio por debajo del líder

- Que sea un problema depende de la estrategia del cliente, que el dato no muestra.
- Si la marca del cliente está 15% o más por debajo del líder, se reporta como **posible dinero sobre la mesa**, formulado como pregunta al cliente, no como conclusión.
- En mercados con inflación alta (ej. Venezuela), no acompañar una subida de precios del mercado es dejar dinero sobre la mesa; se reporta siempre.

## 5. Promoción: táctica o muleta

- Una marca en promoción más de 45-60 días se trata como promoción estructural. Ventana (seguidos o acumulados en qué periodo): `[pendiente]`.
- Profundidad de descuento que indica muleta: `[pendiente]`.
- Lectura: la promoción estructural entrena al consumidor a desconfiar del precio base y acelera la comoditización.

## 6. Movimiento del rival: real o ruido

- Un cambio de precio o formato del rival sostenido más de 30 días es un movimiento real. Menos de 30 días se reporta como observación, no como alerta.
- Con captura semanal, 30 días equivalen a unas 4 observaciones consecutivas.

## 7. Diferencias entre cadenas

- Pesa más el punto de precio y el euro entero que el porcentaje. Una diferencia de 1 € en el mismo SKU, o cruzar un punto de precio redondo, se reporta aunque el % parezca moderado.
- Con una marca de imagen sólida no es emergencia, pero sí una jugada estructural del retailer.
- Si se mantiene más de 30 días (sección 6), se reporta como amenaza validada.
