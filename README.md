# Movilidad CDMX · Big Data & Advanced Analytics

Un dashboard + herramienta de decisión sobre la **afluencia del transporte público de la CDMX**, construido sobre datos abiertos reales de SEMOVI (`datos.cdmx.gob.mx`, licencia CC-BY-4.0). No usa IA: cada resultado se deriva de estadística simple y reproducible (promedios, índices, presión por máximo histórico, regresión lineal, z-scores, comparación de periodos y pronóstico estacional).

---

## 1. La idea en una frase

Medimos de forma **normalizada** quién usa cada sistema de transporte y cómo cambia con el tiempo, para que cualquiera pueda decidir *"¿qué me conviene tomar, cuándo y por qué?"* con la misma base en todas las vistas.

Todo parte de una sola pregunta y se responde **poco a poco**: con cada vista se aprende una variable, y las vistas siguientes usan ese conocimiento.

---

## 2. Cómo fue surgiendo la idea (el recorrido de las vistas)

El proyecto se armó por pasos. Cada paso contestó una nueva pregunta y dejó una vista:

1. **Primero quisimos ver qué hay**: ¿cuánta gente usa cada uno de los 7 sistemas? → vista **Datos**.
2. **Luego prendimos decidir en el día a día**: ¿qué línea está menos solicitada hoy para viajar cómodo? → vista **Planificador**.
3. **Luego decidir por anticipado**: ¿cómo estará la demanda hoy y por qué? → vista **Monitor** (pronóstico).
4. **Luego entender por qué**: ¿qué ciclos y anomalías hay en la demanda? → vista **Patrones**.
5. **Luego medir el cambio**: ¿cómo cambió la demanda de un periodo a otro? → vista **Comparativas**.
6. **Por último, poder verificarlo**: ¿cómo se construyó y de dónde sale cada número? → vista **Metodología**.

> El orden de lectura recomendado es ese mismo: **Datos → Planificador → Monitor → Patrones → Comparativas → Metodología**. Cada vista asume y usa las variables de la anterior.

---

## 3. Qué busca cada vista y cómo lo logra

| Vista | Requerimiento que cumple | Cómo lo hacemos (enfoque) |
| --- | --- | --- |
| **Datos** | "¿Qué sistemas existen, cuánto mueven y con qué variables los voy a analizar?" | Tarjetas de volumen total (con escala para apreciar los sistemas pequeños), detalle de las 12 líneas del Metro y el panel **"Variables y comparaciones del análisis"** que define las 6 variables base. Es la vista de aterrizaje del conocimiento. |
| **Planificador** | "¿Qué línea me conviene tomar hoy?" | Tú eliges **origen y destino por zona** (Poniente, Centro, Oriente, Norte, Sur). Cada corredor se ordena por la variable **presión** (viajes del día ÷ máximo histórico del sistema), de la menos a la más llena, usando el perfil del mismo día de la semana. Se basa en demanda, no en tiempos GPS. |
| **Monitor** | "¿Cómo estará hoy la demanda y por qué?" | **Pronóstico estacional** para una fecha: `promedio × día de la semana × mes × año en curso`. Muestra también el **ranking de "qué sistema conviene"**, cuáles variables suben/bajan en los 7 sistemas y el pronóstico del próximo mes (Holt-Winters). Explica el resultado en palabras, no solo con números. |
| **Patrones** | "¿Qué patrones y anomalías tiene la demanda?" | Usa los **índices** definidos en Datos: el **índice de día de la semana** (ciclo laboral), el **índice de mes** (temporada), el **z-score** (días atípicos, umbral 2.5) y la **tendencia** (regresión sobre la serie mensual). Se presenta con barras del perfil semanal, una gráfica anual con días atípicos marcados y la semana laboral de cada sistema. |
| **Comparativas** | "¿Cómo cambió la demanda entre periodos y entre sistemas?" | Combina la variable **crecimiento** `(periodo2 − periodo1) ÷ periodo1` con la **participación** de cada sistema en el mismo periodo. Un mes o año entero contra otro (sin etiquetas A/B engañosas), sistemas frente a frente con su propio color, crecimiento por sistema y el perfil de cada uno. |
| **Metodología** | "¿Cómo se construyó y cómo verifico que es correcto?" | Presenta problema, fuentes, proceso completo, fórmulas y **hallazgos verificables** (tendencia con su R², días atípicos concretos, crecimiento entre periodos idénticos, saturación de punta, demanda laboral). Todo reproducible con los scripts del repo. |

---

## 4. La parte técnica: variables y cómo se exponen

### 4.1 Las variables (todas parten de la afluencia diaria)

| Variable | Fórmula | Qué significa | Dónde se usa |
| --- | --- | --- | --- |
| **Presión** | viajes del día ÷ máximo histórico del sistema | Qué tan lleno se pide cada sistema respecto a su **propio récord**. Va de 0 a 1 y permite comparar sistemas de tamaños muy distintos. | Planificador (corredores), Monitor (semáforo, ranking, sube/baja) |
| **Índice de día de la semana** | promedio del día ÷ promedio general | Un día normal vale **×1.00**; si el lunes vale ×1.23, ese día se viaja 23% más de lo habitual. Revela el ciclo laboral. | Monitor (factor del día), Patrones (perfil semanal) |
| **Índice de mes** | promedio del mes ÷ promedio anual | Temporadas altas y bajas del año (×1.00 = promedio). | Monitor (factor del mes), Patrones (estacionalidad) |
| **Tendencia** | pendiente de la recta sobre los totales mensuales (R² = fuerza del ajuste) | Si la demanda crece, se mantiene o cae con los años. | Patrones, Metodología |
| **Z-score** | (día − media del mismo día de la semana) ÷ desviación | Cuánto se aleja un día de lo esperado; **z ≥ 2.5** = día atípico. | Patrones (anomalías), Metodología |
| **Crecimiento** | (periodo2 − periodo1) ÷ periodo1 | El cambio porcentual de un periodo a otro, por sistema. | Comparativas |

### 4.2 Forma de exponer (cómo se ve cada variable)

- **Barras y metros relativos**: todo volumen se normaliza como % del máximo correspondiente, para que una tarjeta nunca engañe por escala.
- **Semáforo**: la presión en colores — verde (libre), amarillo (moderado), rojo (saturado) — en Planificador y Monitor.
- **Gráficas SVG propias**: series mensuales con línea promedio, zona del pico y días atípicos marcados; sobreposición para comparar dos periodos.
- **Índices ×1.00**: en vez de "140,000 viajes" se lee "el martes es ×1.12" (12% sobre el promedio), que es comparable entre sistemas.
- **Tablas de índices y de crecimiento**: cada fila muestra la variable en % con signo, para que suben/bajan se lean de un vistazo.
- **Explicación en lenguaje natural**: cada panel explica *por qué* pasa, no solo muestra el número.

---

## 5. Los datos: de dónde salen

Datos de SEMOVI (`datos.cdmx.gob.mx`), 7 fuentes crudas (~65 MB) que el pipeline **limpia y agrega** a archivos ligeros (`modo_diario.csv`, `metro_linea_diario.csv`, `metro_estacion_mensual.csv`) que son los que consume el navegador.

Origen crudo → cobertura: Metro 2010 → 2026 (día × línea × estación); Metrobús desde 2005; Ecobici, RTP, Trolebús, Cablebús y Tren Ligero desde 2022 (fechas de publicación de cada fuente). De ~1.25 M filas crudas se pasa a ~53.7 k filas diarias por sistema + ~72.7 k de línea diaria.

Detalle completo del pipeline en la sección **"De crudo a limpio"** más abajo; los crudos quedan en `data/crudos/` solo para consulta y la app nunca los lee.

---

## 6. Preguntas de alguien que quiere entender el proyecto completo de golpe

**¿Solo usan la variable de qué tan lleno está o qué tan solicitado está?**
No. **Presión** (lo solicitado respecto al propio récord) es la más visible porque decide, pero es una de **6 variables** (sección 4.1). Cada vista revela una nueva: las decisiones usan presión, los pronósticos usan índices de día/mes/año, los patrones usan índices + z-score + tendencia, y las comparaciones usan crecimiento y participación.

**¿"Qué tan lleno está" significa cuántas personas van dentro del vagón?**
No. No tenemos aforo (personas embarcadas dentro de una unidad); registramos **pasajeros por día** (demanda/solicitud). La presión compara esa demanda contra el récord del sistema, no contra la capacidad física de los vagones.

**¿Está basado en datos en tiempo real, GPS o tráfico?**
No. Usamos **histórico diario agregado por SEMOVI**; no hay posiciones, tiempo real ni tiempos de recorrido. El "hoy" es el día más reciente publicado o el que elijas, y se valora con el perfil de ese día de la semana.

**¿Usa inteligencia artificial o machine learning?**
No, a propósito. Todo es **estadística simple y reproducible**: promedios, índices normalizados, regresión lineal con R², z-scores, comparación de periodos y un pronóstico estacional (Holt-Winters) con los 3 factores. Cualquier persona puede verificar cada número con los scripts del repo.

**¿Cómo comparan sistemas de tamaños tan distintos (Metro vs Cablebús)?**
Porque todo se **normaliza** antes de comparar: presión = ÷ su máximo histórico; índices = ÷ su propio promedio. Así el Metro de 4 M de viajes y el Cablebús de 40 k ocupan el mismo rango 0–1 o ×0.8–×1.2, y las comparaciones no favorecen al más grande.

**¿Por qué algunos sistemas solo tienen datos desde 2022?**
Porque SEMOVI publica cada fuente desde su propia fecha. **No inventamos datos ni rellenamos con ceros** lo que no existe: trabajamos con lo publicado por sistema (por eso el "hoy" de un sistema viejo como Metrobús usa 2005→hoy).

**¿Qué tan confiable es el pronóstico del Monitor?**
Es una **descomposición estacional** sobre más de una década de historia (promedio × día × mes × año). Mostramos el **margen típico** (±%) de cada día. Asume que el patrón histórico se mantiene: no anticipa eventos únicos (obras, lluvias, marchas) ni caídas nunca antes vistas.

**¿Un solo dato de pasajeros por día no pierde mucha información?**
Sí, se pierde la intra-diaria (horarios pico). Es la resolución que publica SEMOVI para todos los sistemas por igual, y permite compararlos **uniformemente**. El Pipeline conserva también el detalle línea × día del Metro y estación × mes.

**¿Esto sirve para planear capacidad (turnos, frecuencias, camiones)?**
Para **demanda histórica y tendencia**, sí: muestra si un corredor está saturado frente a su récord, si la demanda crece o se estanca por sistema, y qué día/mes son los más intensos. No es un censo de ocupación física ni sustituye un estudio de aforo.

**¿Se puede verificar que los números no están mal?**
Sí. Metodología lista **hallazgos verificables** por construcción (la tendencia viene con R²; el mayor día atípico se puede buscar en el dataset; el crecimiento entre periodos usa exactamente los mismos filtros y fechas). Todo el proceso es reproducible con los scripts del repo.

---

## Stack y comandos

**Stack**: React 19 + TypeScript + Vite, gráficas SVG propias, Oxlint, Tailwind (v4) solo como base.

```sh
node scripts/download-crudos.mjs   # (opcional) guarda los crudos en data/crudos/
node scripts/preprocess.mjs        # limpia y agrega fuentes a public/data/metro/
npm run dev                        # desarrollo
npm run lint                       # oxlint
npm run build                      # tsc -b && vite build
```

## De crudo a limpio (qué hace el preprocesado)

`scripts/preprocess.mjs` hace cuatro cosas, en orden:

1. **Descarga** las 7 fuentes a `.tmp-datos/` (caché). Paso opcional equivalente con descarga directa a `data/crudos/`.
2. **Limpia cada CSV**: elimina el BOM, corrige doble codificación (`Ã©` → `é`, mojibake), quita comillas/espacios, y descarta fechas vacías o afluencias no numéricas (por eso el `NaN` de Metrobús desaparece).
3. **Agrega por dimensión útil**:
   - Metro: `1,180,921` filas (día×línea×estación) → `metro_linea_diario.csv` con `72,672` (12 líneas × 6,056 días) y `metro_estacion_mensual.csv` (estación × mes). Se descarta el detalle crudo.
   - Los 6 sistemas restantes: las filas desglosadas (por género, servicio, tipo de pago, línea) se **suman por fecha**, quedando un total diario.
4. **Emite `modo_diario.csv`**: una fila `fecha,modo,afluencia` por cada fecha que el sistema tenga dato (los que empezaron en 2022 no se rellenan con ceros), y escribe `metadatos.json` con las cifras del proceso (filas crudas procesadas, días, líneas).