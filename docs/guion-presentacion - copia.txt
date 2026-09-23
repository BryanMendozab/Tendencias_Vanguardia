# Guion de presentación — Movilidad CDMX

**Materia:** SIS1407 · Big Data y Analytics Avanzado
**Reto seleccionado:** Proyecto 02 · Análisis de tendencias

---

## Cómo usar este documento

- Son **13 diapositivas**. Para cada una hay **dos textos**:
  1. **Texto en diapositiva** — lo que se pone en pantalla (breve, con viñetas; no leer verbatim).
  2. **Guion del expositor** — la explicación más detallada con la que se desarrolla el tema en voz.
- Tiempo estimado total: **8–10 minutos** (≈45 segundos por diapositiva). La diapositiva de **demostración (7 y 8)** puede alargarse si se muestra la app en vivo.
- Los **números de los hallazgos (9, 10, 11) son reales**, calculados sobre `public/data/metro/`. Aun así, recomendamos verificar en vivo en la app (vista **Patrones** y **Comparativas**) porque muestran lectura automática de la serie.

---

## Resumen de la entrega (para el evaluador)

El guion cubre, en orden, los puntos pedidos en el reto:

| Punto de entrega | Dónde se cubre |
| --- | --- |
| Objetivo y problema seleccionado | Diapositiva 2 |
| Dataset utilizado y fuente | Diapositiva 3 |
| Herramientas usadas para limpiar/analizar/visualizar | Diapositivas 4 y 5 |
| Proceso de análisis (qué hicieron y por qué) | Diapositiva 5 y 6 |
| Gráficas, dashboard o demostración funcional | Diapositivas 7 y 8 |
| Mínimo 3 hallazgos relevantes | Diapositivas 9, 10 y 11 |
| Conclusiones y presentación breve | Diapositivas 12 (y 13) |

También responde las observaciones previas del profesor:

| Observación del profesor | Cómo se atiende |
| --- | --- |
| "Poder comparar años, meses (jun 2025 vs jun 2026)" | Diapositiva 8 → bloques de periodos con año + mes en Comparativas |
| "Varios filtros a lo largo del tiempo" | Diapositivas 7 y 8 → selectores de fecha, sistema, línea y dos periodos independientes |
| "Solo ventas / pocos registros" | Diapositivas 3 y 5 → 7 sistemas reales, 1.18 M de filas crudas del Metro, dato abierto |
| "Validar filtros" | Diapositiva 8 → cada filtro recalcula KPIs, gráficas y tablas |

---

# Diapositiva 1 — Portada

**Texto en diapositiva**

> **Movilidad CDMX**
> Big Data & Advanced Analytics
> *De grandes volúmenes de datos a decisiones inteligentes*
>
> SIS1407 · Big Data y Analytics Avanzado · Proyecto: Análisis de tendencias
> Equipo 3 · [nombres de los integrantes]

**Guion del expositor**

> "Buenos días. Somos el Equipo 3 y les presentamos nuestro proyecto de Big Data y Analytics: **Movilidad CDMX**. Elegimos el reto de *Análisis de tendencias*: tomar datos reales y abiertos del transporte público de la Ciudad de México y convertirlos en conocimiento y decisiones. En los próximos minutos les mostraremos el problema que elegimos, de dónde vienen los datos, cómo los procesamos y qué encontramos."

---

# Diapositiva 2 — Objetivo y problema seleccionado

**Texto en diapositiva**

> **Problema**
> Los datos abiertos de afluencia no dicen por sí solos *qué conviene usar* ni *si el tráfico sube o baja*.
>
> **Objetivo**
> Convertir ~30 mil millones de viajes registrados en dos decisiones sencillas:
> - **Qué línea tomar** y cuándo está menos saturada.
> - **Cómo cambia la demanda** con el tiempo (tendencia, patrones, anomalías).
>
> **Pregunta guía:** ¿cómo me decido entre 7 sistemas de tamaño muy distinto con la misma base?

**Guion del expositor**

> "El problema es real: la Secretaría de Movilidad publica millones de registros de pasajeros al día, pero esos números crudos no contestan nada útil por sí solos. No me dicen si hoy conviene más el Metro que el Metrobús, ni si la demanda está creciendo o cayendo.
> Entonces planteamos un objetivo práctico: tomar esa masa de datos y reducirla a *decisiones*. Concretamente dos: primero, **qué línea o sistema me conviene usar** según qué tan solicitado está cada uno ese día; y segundo, **entender cómo evoluciona la demanda** — si crece, si tiene temporadas, y qué días son anómalos.
> La dificultad: comparamos sistemas de tamaños muy distintos — el Metro mueve millones de viajes al día y el Cablebús decenas de miles. Si comparamos volúmenes crudos, el Metro siempre "gana" y es sesgo. Por eso nuestro análisis normaliza todo: es la idea central que explicaremos en la diapositiva 6."

---

# Diapositiva 3 — Dataset utilizado y fuente

**Texto en diapositiva**

> **Sistema vs Viajes históricos (dato abierto SEMOVI)**
>
> - **Fuente:** datos.cdmx.gob.mx · Secretaría de Movilidad (SEMOVI) · licencia **CC-BY-4.0**.
> - **7 sistemas:** Metro, Metrobús, Ecobici, RTP, Tren Ligero, Cablebús y Trolebús.
> - **Cobertura:** 2005 → 2026 (Metrobús) y 2010 → 2026 (Metro); los demás desde 2022.
> - **Volumen:** Metro con 1,180,920 filas crudas → día × línea × estación; se agrega a **53,732 filas diarias** y **72,672 filas día × línea**.
> - No se inventan datos: los sistemas sin publicación en un año no se rellenan con ceros.

**Guion del expositor**

> "Los datos son **abiertos y reales**, publicados por SEMOVI en el portal de datos abiertos de la CDMX con licencia CC-BY-4.0: cualquiera puede descargarlos y verificar lo que presentamos.
> Trabajamos con **7 sistemas de transporte** y cada uno mide lo mismo: *pasajeros transportados por día*. La cobertura no es uniforme porque cada organismo publica desde su propia fecha: Metrobús desde 2005, Metro desde 2010, y los más nuevos (RTP, Ecobici, etc.) desde 2022. Un punto ético importante: **no inventamos ni rellenamos con ceros** los años sin dato.
> En volumen, el Metro es el caso más grande: 1,180,920 filas crudas una por día, línea y estación. Ese detalle lo agregamos a archivos ligeros que consume la aplicación: 53,732 registros diarios por sistema y 72,672 de línea del Metro."

---

# Diapositiva 4 — Herramientas usadas

**Texto en diapositiva**

> **Análisis y visualización (sin IA, a propósito)**
>
> - App web **React 19 + TypeScript + Vite**, gráficas **SVG propias** (sin librería de charts), lint con **Oxlint**.
> - Pipeline de datos en **Node.js** (`download-crudos.mjs`, `preprocess.mjs`).
> - Estadística clásica y **reproducible**: promedios, índices, regresión lineal con R², z-scores y Holt-Winters.

**Guion del expositor**

> "La decisión técnica más importante: **no usamos IA ni machine learning**. Escogimos una estadística simple, transparente y reproducible, para que cualquier persona pueda ver el proceso y los números y verificar que son correctos.
> La aplicación es un dashboard web con React y TypeScript. Las gráficas son **SVG que dibujamos nosotros mismos**, lo que mantiene todo liviano y controlado. Para preparar los datos escribimos dos scripts en Node: uno descarga las fuentes y otro las limpia y agrega. Un detalle que vale la pena mencionar: la calidad de las herramientas se nota en cosas invisibles, como que el Metro se publica a veces como 'Línea' con acento y a veces sin acento; nuestro procesador lo normaliza para que las 12 líneas queden bien identificadas (diapositiva 5)."

---

# Diapositiva 5 — Proceso de análisis

**Texto en diapositiva**

> **Pipeline: de crudo a decisión**
>
> 1. **Descargar** 7 fuentes (~65 MB) desde SEMOVI.
> 2. **Limpiar**: quitar BOM, corregir codificación, eliminar fechas vacías o afluencias inválidas.
> 3. **Normalizar**: unificar nombres (ej. 'Línea' con/sin tilde → 12 líneas en vez de 24 etiquetas).
> 4. **Agregar**: Metro por día×línea y estación×mes; los demás por día total (modo_diario).
> 5. **Embeber** los CSV ligeros en la app + `metadatos.json` con trazabilidad.

**Guion del expositor**

> "El proceso es la parte de 'limpiar y preparar'. Primero descargamos las 7 fuentes, unos 65 MB. En la limpieza quitamos el BOM de los archivos, corregimos caracteres mal codificados y descartamos registros sin fecha o sin afluencia numérica.
> Después viene un paso clave de **calidad**: al inspeccionar el Metro encontramos que la misma línea aparecía con dos grafías —'Linea 1' y 'Línea 1'— porque la fuente cambió de formato por años. Si no la normalizamos, el sistema creería que hay 24 líneas y no 12. Así que unificamos los nombres *antes* de agrupar.
> Finalmente agregamos: el detalle crudo del Metro se resume por **día×línea** y por **estación×mes**, y cada sistema queda con su total diario. El resultado son archivos de algunos cientos de KB que carga el navegador, y un `metadatos.json` que documenta todo el proceso — trazabilidad."

---

# Diapositiva 6 — Las variables del análisis

**Texto en diapositiva**

> **6 variables normalizadas (base de todas las vistas)**
>
> | Variable | Qué significa |
> | --- | --- |
> | **Presión** | viajes del día ÷ máximo histórico del sistema (0–1). Compara tamaños distintos |
> | **Índice de día** | promedio del día ÷ promedio general (×1.00 = día normal) |
> | **Índice de mes** | promedio del mes ÷ promedio anual (temporada) |
> | **Tendencia** | pendiente de regresión sobre los totales mensuales, con R² |
> | **Z-score** | cuántas desviaciones se aleja un día de lo esperado (≥ 2.5 = atípico) |
> | **Crecimiento** | (periodo 2 − periodo 1) ÷ periodo 1 |

**Guion del expositor**

> "Esta es la idea que sostiene todo el proyecto: para comparar sistemas de tamaños muy distintos, **normalizamos**.
> La más visible es la **presión**: dividimos los viajes del día entre el máximo histórico propio de cada sistema. Así el Metro y el Cablebús caen en el mismo rango de 0 a 1, y el semáforo (verde, amarillo, rojo) significa lo mismo para ambos.
> Con los **índices de día y de mes** vemos ciclos: si el martes vale ×1.11, ese día se viaja 11% más que el promedio; si diciembre vale ×0.95, es temporada baja. La **tendencia** con su R² dice si la demanda crece, se estanca o cae de largo plazo. El **z-score** marca días atípicos y el **crecimiento** cuantifica el cambio entre dos periodos. Cada vista de la app usa únicamente estas 6 variables — por eso todo se lee igual en todos los sistemas."

---

# Diapositiva 7 — Demostración funcional I: Planificador y Monitor

**Texto en diapositiva**

> **Planificador** → "¿Qué línea me conviene tomar hoy?"
> - Eliges origen y destino por zona; los corredores se ordenan de menor a mayor **presión**.
>
> **Monitor** → "¿Cómo estará hoy la demanda y por qué?"
> - Pronóstico estacional: **promedio × día de la semana × mes × año** (descomposición, sin IA).
> - Semáforo de saturación, ranking de "qué sistema conviene" y explicación en palabras.
> - Compara **lo que va del año** contra el tramo del año anterior.

**Guion del expositor**

> "Vamos a la aplicación. *(Si se proyecta en vivo: abrir la app, ir al Planificador.)* En el **Planificador** elijo origen y destino por zona —por ejemplo Poniente a Centro— y la app ordena las líneas del menos al más presionado; la recomendación es tomar la que está más lejos de su récord histórico.
> En el **Monitor**, elegimos una fecha y la app pronostica la demanda con una descomposición estacional: el promedio histórico, multiplicado por el factor del día de la semana, por el del mes, y por lo que va del año contra el anterior. No es magia: es que un jueves de octubre históricamente se comporta igual que otros jueves de octubre. El panel además explica *por qué* sale ese número y marca en semáforo si el sistema estará libre o saturado.
> Aquí ya se ve el primer tipo de filtro temporal: **podemos mover el día** con el calendario y ver cómo cambian las recomendaciones."

---

# Diapositiva 8 — Demostración funcional II: Patrones y Comparativas

**Texto en diapositiva**

> **Patrones** → patrones semanales, estacionalidad, anomalías (z-score) y tendencia.
>
> **Comparativas** → dos periodos independientes (**año y mes**): p. ej. **junio 2025 vs junio 2026**
> - Filtros: sistema, línea del Metro, fecha o periodo, y sistemas a excluir.
> - Todos los filtros recalculan KPIs, gráficas y tablas al instante.

**Guion del expositor**

> "La vista **Patrones** mueve los índices que definimos: el perfil de la semana, la estacionalidad por mes, la tendencia de largo plazo y la lista de días atípicos por z-score.
> La vista **Comparativas** es donde atendemos una observación importante del profesor: poder **comparar años y meses**. Aquí hay dos periodos independientes y cada uno elige año y mes. Por ejemplo: periodo 1 = junio 2025 y periodo 2 = junio 2026; la gráfica alinea ambos sobre los mismos 12 meses del año y la tabla reporta el **crecimiento porcentual por sistema**. También comparamos sistemas frente a frente en el mismo periodo, con chips para incluir o excluir el que quieras.
> Nota para el expositor: menciona que **todos los filtros son funcionales y validados**: cambiar cualquiera de ellos recalcula las estadísticas, las gráficas y las tablas — eso responde la observación previa de 'validar filtros'. *(Mostrar 1 cambio en vivo, p. ej. solo Metro / línea 2 / periodo.)*"

---

# Diapositiva 9 — Hallazgo 1: el patrón laboral domina

**Texto en diapositiva**

> **Hallazgo 1 · Ciclo laboral claro**
> - Entre semana **×1.11** sobre el promedio; el fin de semana cae a **×0.74**.
> - Pico: **viernes ×1.13** · Valle: **domingo ×0.58**.
> - Mes más intenso: **febrero ×1.06** · más flojo: **diciembre ×0.95**.
> *(números sobre los 7 sistemas, perfil completo del histórico)*

**Guion del expositor**

> "Primer hallazgo: la demanda de transporte de la CDMX es **eminentemente laboral**. Si normalizamos cada día contra su promedio histórico, de lunes a viernes la demanda supera el promedio —el pico es el viernes con ×1.13— y el fin de semana cae fuerte: el domingo es el día más flojo con ×0.58, la mitad del promedio.
> Ese patrón es consistente y muy estable: por eso el pronóstico del Monitor se construye sobre él. También hay temporada: febrero es el mes más intenso y diciembre el más flojo, lo cual es coherente con las vacaciones y fiestas de fin de año. La implicación de decisión es directa: si quieres viajar holgado, evita los viernes; si algo requiere mantenimiento, es más lógico en fin de semana."

---

# Diapositiva 10 — Hallazgo 2: la demanda del Metro está muy concentrada

**Texto en diapositiva**

> **Hallazgo 2 · Desigualdad entre líneas**
> - Línea 2 ≈ **4,051 millones** de viajes históricos — la más usada.
> - Línea 3 ≈ 3,376 M y Línea 1 ≈ 3,286 M le siguen.
> - Línea 4 ≈ **446 millones** — ~**9 veces menos** que la Línea 2.
> - La normalización por presión evita que estos tamaños sesguen las comparaciones.

**Guion del expositor**

> "Segundo hallazgo: las líneas del Metro son **muy desiguales**. La Línea 2 es la más demandada con unos 4 mil millones de viajes en todo el histórico; la Línea 3 y la 1 la siguen de cerca. En el extremo opuesto, la Línea 4 ronda los 446 millones de viajes: **nueve veces menos** que la Línea 2.
> Eso no es un problema del análisis — es un hecho del sistema — pero explica dos cosas. Primero, por qué es tan importante **comparar normalizado**: si solo viéramos volúmenes, la Línea 2 siempre dominaría y la 4 jamás aparecería. Con la presión, cada línea se mide contra *su propio* récord. Segundo, permite decisiones de operación: mantenimiento, frecuencia de trenes o inversión no deberían tratarse igual en una línea que mueve 9 veces más gente."

---

# Diapositiva 11 — Hallazgo 3: las anomalías son reales y detectables

**Texto en diapositiva**

> **Hallazgo 3 · Días atípicos detectados por z-score (umbral 2.5)**
> - **2020: 51 días** con demanda muy por debajo de lo esperado (z mín −3.1) → pandemia.
> - La detección usa la media del *mismo día de la semana*, no una media global.
> - Ejemplo en vivo: la vista Patrones lista cada día anómalo, cuánto se desvió y su z.

**Guion del expositor**

> "Tercer hallazgo: los días anómalos **se detectan solos, sin etiquetas previas**. Nuestro z-score compara cada día contra lo esperado para su mismo día de la semana — no contra una media global— porque así no confundimos 'es martes' con 'es anómalo'.
> Y la señal más fuerte del dataset lo confirma: en **2020** el sistema marca **51 días atípicos**, todos con demanda muy por debajo del esperado y z mínimo de −3.1: es el efecto de la pandemia. En 2021 aún hay 24.
> Esto demuestra que la herramienta no es decorativa: si mañana ocurre una caída o un pico sin precedentes, el dashboard lo resalta automáticamente, junto con cuánto se desvió y en qué fecha. *(Opcional: mostrar la tabla de anomalías en Patrones.)*"

---

# Diapositiva 12 — Conclusiones

**Texto en diapositiva**

> **Lo que logramos**
> - Datos abiertos y reales → canalizados a **decisiones simples**: qué tomar y cuándo.
> - Comparaciones **justas** entre tamaños distintos, gracias a la normalización.
> - Método **sin IA, transparente y reproducible** (scripts + documentación).
> - Cubre las observaciones previas: múltiples filtros, comparación de años/meses y datos de alto volumen.
>
> **Limitaciones honestas**
> - La presión es un *proxy* de saturación: no hay aforo físico ni tiempos GPS.
> - Resolución diaria (SEMOVI no publica horario pico).
> - Correlación y pronóstico no anticipan eventos únicos (marchas, fallas, clima).

**Guion del expositor**

> "Para cerrar: logramos lo que buscaba la materia, la secuencia completa de datos → información → conocimiento → decisión. Con datos abiertos reales construimos un dashboard donde el usuario **decide** (qué línea tomar) y **entiende** (por qué, con patrones, tendencias y anomalías).
> Y somos honestos con las limitaciones: la presión es una *aproximación* de cuán lleno está un sistema — no medimos personas dentro del vagón ni tiempos GPS; la SEMOVI publica un total diario, no el horario pico; y un pronóstico estacional no anticipa eventos únicos como marchas o fallas.
> Finalmente, todo es reproducible: los scripts del repositorio descargan, limpian y agregan los datos, y la metodología está documentada en la propia app (vista Metodología). Así cualquiera puede verificar cada número que presentamos."


## Consejos para la presentación

1. **Ensaya la demo a pantalla completa** con `npm run dev` y datos descargados; ten a la mano un escenario "jun 2025 vs jun 2026" en Comparativas.
2. **No leas las diapositivas**: el texto en pantalla es apoyo visual; la explicación detallada es tu guion.
3. **Mantén los hallazgos con números**: es lo que más convence (viernes ×1.13, Línea 2 ≈ 4,051 M, 51 días atípicos en 2020).
4. **Distribución del tiempo**: diapositivas 7 y 8 son las más largas (demo); acórta 1, 4 y 13 si te pasas.
5. **Prepara respuestas**: "¿por qué no usan IA?" → transparencia y reproducibilidad exigida por el reto; "¿la presión es el aforo?" → no, es demanda sobre el récord propio.