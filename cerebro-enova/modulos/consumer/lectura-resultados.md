---
id: consumer-lectura-resultados
capa: modulo
producto: consumer
dueno: pepe
version: 0.2
actualizado: 2026-09-24
fuentes: respuestas de Pepe (bloque 2), "Cuestionarios del catálogo de estudios tipo v2.3" (Cora)
cargar_si: la consulta trata de resultados de encuestas, estudios de Enova Pulse Consumer o comportamiento declarado del consumidor
---

# Lectura de resultados de Consumer

Principio: una encuesta flash nunca es concluyente. Es una señal que orienta decisiones, no una verdad. El valor está en leerla bien y en cruzarla con conducta real.

## 1. Lenguaje: nunca concluyente, pero graduado

Toda lectura usa lenguaje de hipótesis. Para que el cliente distinga una señal fuerte de una débil, el grado depende del margen de error (sección 3):

| Fuerza de la señal | Cuándo | Cómo se dice |
| --- | --- | --- |
| Clara | Diferencia mayor que el margen de error, muestra suficiente | "La muestra indica…" |
| Direccional | Diferencia cercana al margen, o muestra justa | "Parecería indicar…", "es un punto a considerar" |
| Exploratoria | Diferencia dentro del margen, muestra chica o respuesta abierta | "La hipótesis de trabajo sería…" |

Nunca: "está demostrado", "el consumidor prefiere", "sin duda".

## 2. Lo declarado frente a lo real

- **En categorías piso, la preferencia declarada no es evidencia de compra.** Mucha gente declara una marca líder como su preferida y compra la marca del distribuidor la mayoría de las veces (ejemplo: declara Coca-Cola, se lleva gaseosa de marca blanca 3 de cada 5 veces).
- **En categorías fortaleza, lo declarado se acerca más a la conducta**, pero sigue siendo declaración.
- **Cruzar siempre con conducta** cuando exista: datos de Enova Pulse Price, última compra, frecuencia declarada del estudio 9.
- **México:** el encuestado tiende a no ser transparente (respuesta de cortesía o deseabilidad). Todo resultado declarado se lee con más cautela y se reporta así.
- Las clasificaciones piso/fortaleza son las del módulo `price/lectura-precios.md`.
- **Brecha de inflación declarada:** en el estudio de competencia se pregunta por separado la marca preferida y la marca de la última compra. La diferencia entre ambas mide cuánto infla el consumidor lo declarado, por categoría y por país, y se reporta al cliente como hallazgo (ej.: "tu preferencia declarada está 30 puntos por encima de tu compra real"). Esa brecha calibra cómo se leen las demás respuestas declaradas del mismo mercado.

## 3. Diferencias reales o ruido

- Una diferencia entre marcas, segmentos u oleadas solo se trata como real si supera el margen de error de la muestra.
- Referencia (95% de confianza, proporción cercana a 50%): n=100 → ±10 puntos; n=200 → ±7; n=300 → ±5,7; n=500 → ±4,4.
- El backend calcula el margen de cada cifra; la IA no lo estima de memoria.

## 4. Precio (estudio 2)

- La batería de rango de precios (demasiado barato, buena compra, empieza a ser caro, demasiado caro) se responde sin referencia a la competencia. **Se lee siempre contra el lineal real**: gap frente a competidores y marca del distribuidor según datos de Price.
- Si el rango aceptable declarado queda por encima del precio real de la competencia, se reporta como riesgo, no como permiso para subir precio.
- Cuando el cliente tiene Price y Consumer, el estudio de precios se entrega combinado: rango aceptable declarado sobre el mapa real del lineal. Es la lectura de mayor valor del catálogo.

## 5. Respuestas abiertas

- Se presentan como insight, citando la respuesta textual. No se cuantifican como dato ni se generalizan.

## 6. Reglas heredadas de los cuestionarios (no negociables)

- Satisfacción de relación (1A) y satisfacción de episodio (1B) son variables distintas. Nunca se suman ni se comparan como serie.
- Atribución de marca en Prueba de Anuncio (8b) e Impacto de Campaña (8a) tampoco se suman.
- Barrera de crecimiento (9, P9): el % con freno removible es el espacio de crecimiento; el tipo de freno indica la palanca (no lo encuentro → distribución; se me olvida → recordación; no vale la pena → propuesta de valor).
- Alternativa real (9, P10): "otra marca" → guerra de marca; "otra cosa" o "no hago nada" → agrandar la categoría, no quitar share.
- Los resultados no se agregan entre países.

## 7. Pendiente

- Estudio 3 (competencia) y estudios de marca (4, 5, 6, 10): incluirán la batería de relevancia de Enova (qué cambiaría si la marca desapareciera, qué harías si no la encuentras, cuánto más pagarías). Reglas de lectura: `[pendiente]` hasta que Cora los escriba.
