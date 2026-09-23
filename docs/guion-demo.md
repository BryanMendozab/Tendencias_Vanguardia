# Guion de demostración — Movilidad CDMX

**Uso:** primero recorre los pasos tú solo para entender cada función; después úsalos como guion de ensayo frente al público. Cada paso tiene tres partes: **Haz clic en** (qué tocar), **Verás que** (qué observar) y **Explica al público** (qué decir, 1–2 frases).

**Materiales:** `npm run dev` y la app abierta en `http://localhost:5173` a pantalla completa.

---

## Antes de empezar (2 min)

**Verás que** la página tiene una **sidebar izquierda** con dos grupos:
- **HERRAMIENTAS:** Datos · Planificador · Monitor · Patrones
- **ANÁLISIS:** Comparativas · Metodología

El resto es el contenido de la vista activa. La app carga 53,732 registros diarios de 7 sistemas de transporte (Metro, Metrobús, Ecobici, RTP, Tren Ligero, Cablebús y Trolebús) entre **jul 2005 y jul 2026**.

**Explica al público:**
> "Antes de empezar, una definición: todo lo que veremos es **demanda** — pasajeros que SEMOVI contó. No es aforo físico ni tiempos GPS; es el número de viajes que recaptura cada sistema por día. Todo el análisis compara esta demanda normalizada."

**Nota de la fecha de hoy:** si el día de hoy es miércoles, el selector de fecha de la app abre en el último **miércoles** de los datos (en esta agenda, **miércoles 29 jul 2026**, porque los datos llegan al viernes 31 jul 2026). La regla: la app elige la última fecha con el mismo día de la semana que hoy, para que la demo siempre caiga en un día "comparable".

---

## Vista Datos — "¿con qué trabaja todo esto?" (1 min)

**Haz clic en:** `Datos` en la sidebar.

**Verás que:**
1. **7 tarjetas**, una por sistema. Cada una muestra: total de viajes históricos, días con datos, año más antiguo–más reciente y el valor pico. La barra gris compara los volúmenes: el **Metro** (decenas de miles de millones) destaca, **Cablebús** apenas se ve. Esta diferencia de escala es *la* razón por la que todo el proyecto usa presión/índices y no volúmenes crudos.
2. Panel **"Variables y comparaciones del análisis"**: define las **6 variables** (Presión, Índice de día, Índice de mes, Tendencia, Z-score, Crecimiento) y las comparaciones que usaremos. Es **solo lectura** — nada se puede tocar aquí; se explica solo.
3. Panel **"Detalle por línea del Metro"**: 12 líneas ordenadas de más a menos volumen (Línea 2 primera, Línea 4 al final con ~446 millones).

**Explica al público:**
> "Aquí está la materia prima: siete mundos de muy distinto tamaño. Si comparáramos números crudos, el Metro siempre 'ganaría'. Por eso nuestro dashboard nunca compara crudos: normaliza cada sistema contra su propio récord. Eso es lo que significa la presión, y es la idea que sostiene todo lo demás."

---

## Vista Planificador — decisión nº 1: "¿qué línea me conviene tomar hoy?" (2 min)

**Haz clic en:** `Planificador` en la sidebar.

**Verás que** el encabezado dice *"¿Qué línea me conviene tomar hoy?"* y hay un **chip de fecha** arriba a la derecha.

**Paso 1 · La fecha**

**Haz clic en:** el chip de la fecha (muestra *mié 29 jul*). Se abre un calendario nativo; elige otro día cualquiera (ej. viernes 17 jul) y luego vuelve a **29 jul**.

**Verás que** al cambiar la fecha, la lista de corredores y la recomendación cambian: todo se recalcula para ese día.

**Explica al público:**
> "El primer control es el tiempo. El Planificador responde una sola pregunta: 'si viajara HOY, ¿qué línea me conviene?'. Al cambiar la fecha, la recomendación cambia — porque la demanda de un viernes no es la de un domingo."

**Paso 2 · El origen y el destino**

**Haz clic en:** `ORIGEN` → `Poniente`. Luego `DESTINO` → `Centro`.

**Verás que** aparece una **lista de corredores** (las líneas del Metro que conectan esas dos zonas) ordenadas de menor a mayor presión:
- **Semáforo** de color (verde/amarillo/rojo según qué tan cerca está de su récord).
- **% de presión** (ej. 62% = hoy lleva 62% de su máximo histórico).
- **Δ vs día habitual** (ej. "−8% vs su martes típico").

**Explica al público:**
> "Elegí ir de Poniente a Centro. La app ordena las líneas que conectan ambas zonas de la **menos a la más saturada**, medidas contra su propio récord histórico. Así, aunque la Línea 1 mueve muchísima más gente que la 4, ambas se comparan de forma justa."

**Paso 3 · La recomendación**

**Verás que** debajo aparece una tarjeta: **"Hoy conviene: [línea]"** y otras en **"Evita"**, o la explicación de por qué hoy conviene usar el sistema X.

**Explica al público:**
> "Y la conclusión se dice sola: hoy conviene la línea con menor presión. Ese es el primer tipo de decisión que resuelve el proyecto — y la lista completa de funciones de la vista es justo esto: fecha + zonas → corredores ordenados → recomendación."

**Paso 4 (opcional) · Sin corredor directo**

**Haz clic en:** `ORIGEN` → `Norte` y `DESTINO` → `Sur`.

**Verás que** no hay una línea que conecte directamente ambas zonas; la app muestra qué sistema conviene con su presión.

**Explica al público:**
> "Noten que también contempla el caso real: si no existe corredor directo, no inventa una ruta; recomienda qué sistema tomar en general."

---

## Vista Monitor — "cómo estará el sistema y por qué" (2 min)

**Haz clic en:** `Monitor` en la sidebar.

**Paso 1 · Los controles**

**Verás que** arriba hay tres controles: **fecha** (comparte el mismo chip del Planificador), **Sistema** y, si Sistema es **Metro**, aparece **Línea**.

**Haz clic en:** asegúrate de que Sistema sea `Metro`. En el menú Línea verás las 12 líneas en orden (1→9, 12, A, B) — esto es importante: están ordenadas naturalmente, no alfabéticamente.

**Explica al público:**
> "Este es el pronóstico. El Monitor predice la demanda de cualquier día usando una descomposición estacional simple: el promedio histórico, multiplicado por el factor del día de la semana, por el del mes y por lo que va del año contra el año anterior. Sin IA: pura estadística."

**Paso 2 · Las 4 tarjetas**

**Verás que** la fila de estadísticas muestra:
- **Pronóstico** para la fecha (y este valor comparado con el promedio: "la previsión equivale a ×1.02 veces el promedio").
- **Día** — factor del día de la semana (ej. miércoles ×1.12).
- **Mes** — factor estacional del mes (ej. julio ×0.98).
- **Año vs año anterior** — cómo va este año comparado con el tramo equivalente del anterior.

**Explica al público:**
> "Lo valioso es que no nos da un número solitario: cada factor está justificado. 'miércoles ×1.12' significa que, históricamente, los miércoles se viaja 12% más que el promedio. Cualquier persona puede verificar cada pieza."

**Paso 3 · "Por qué este número"**

**Verás que** el panel explica en palabras la fórmula: *promedio × día × mes × año*, y menciona un **margen típico** (±%).

**Explica al público:**
> "La app siempre puede decir POR QUÉ da ese número. Para la presentación es la parte que responde 'y esto, ¿de dónde salió?' sin quedarse en magia."

**Paso 4 · Estado esperado + "Qué nos conviene usar"**

**Verás que** hay un **semáforo** con la presión prevista (verde/amarillo/rojo), el **máximo histórico** de referencia, y una proyección del **siguiente mes** (Holt-Winters: da más peso a los meses recientes). Debajo, el ranking "Qué nos conviene usar" ordena los 7 sistemas por presión prevista.

**Explica al público:**
> "El semáforo compara la previsión contra el récord del sistema. Abajo, el ranking dice qué sistema conviene usar en esa fecha — combinando 7 sistemas en una sola comparación normalizada."

**Paso 5 · "Qué sube y qué baja"**

**Haz clic en:** cambia **Sistema** a `Metrobús` y después a `Cablebús` (dos o tres sistemas de distinto tamaño).

**Verás que** los totales, semáforos y el ranking cambian al instante, y la tabla muestra cuáles sistemas están subiendo y cuáles bajando.

**Explica al público:**
> "Todo recalcula al vuelo: Metrobús, Cablebús, cualquiera. Como todo está normalizado, los mismos controles sirven para sistemas 100 veces más chicos que el Metro."

---

## Vista Patrones — "¿por qué pasa?" (2 min)

**Haz clic en:** `Patrones` en la sidebar.

**Paso 1 · Sistema y Línea**

**Haz clic en:** si prefieres verlo global, deja Sistema en `Todos`. Después prueba `Metro` en Sistema (y podrás elegir Línea).

**Explica al público:**
> "Esta vista no predice, explica: qué patrones repetidos tiene la demanda y qué días se salen de lo normal."

**Paso 2 · "Patrones detectados"**

**Verás que** el panel superior escribe un resumen automático en lenguaje natural con 5 patrones (carácter laboral, día pico, mes de temporada, día más atípico y tendencia).

**Explica al público:**
> "El resumen se redacta solo con los datos. Enseguida veremos cada pieza."

**Paso 3 · Perfil de la semana**

**Verás que** la gráfica de barras muestra los 7 días normalizados a ×1.00:

- Lunes **×1.06**, Martes **×1.11**, Miércoles **×1.12**, Jueves **×1.11**, Viernes **×1.13**.
- Sábado **×0.89**, Domingo **×0.58**.
- El fin de semana queda resaltado (fondo distinto).

**Explica al público:**
> "El patrón más claro y estable de todo el dataset: la demanda es laboral. El viernes es el día pico, ×1.13 del promedio, y el domingo cae a ×0.58 — la mitad. Ésta es la razón por la que el pronóstico del Monitor se construye así."

**Paso 4 · Estacionalidad por mes**

**Verás que** las barras por mes del año: **febrero ×1.06** (temporada alta) y **diciembre ×0.95** (la más floja).

**Explica al público:**
> "A escala anual también hay ciclo: febrero es el mes más intenso y diciembre el más flojo, coherente con vacaciones y fiestas de fin de año."

**Paso 5 · Semana laboral por sistema**

**Verás que** la tabla compara, por sistema, el promedio de lunes a viernes frente al de sábado y domingo (ej. lo laboral vs lo de fin de semana en cada sistema).

**Explica al público:**
> "¿Todos los sistemas son igual de laborales? La tabla dice que no: unos cargan más entre semana y otros tienen presencia de fin de semana. Cada sistema tiene su propia 'huella'."

**Paso 6 · Días más atípicos**

**Verás que** la lista de **días atípicos** (Z-score ≥ 2.5), ordenada por desviación, con la fecha y cuánto se desvió. Deja Sistema en `Todos` y verás **51 días en 2020** por debajo de lo esperado (z mínimo −3.1) y 24 en 2021.

**Explica al público:**
> "Los días anómalos no están etiquetados en los datos: el z-score los descubre comparando cada día contra lo esperado para su mismo día de la semana. En 2020 la app marca 51 días atípicos, todos por debajo: es el efecto de la pandemia detectado sin que ningún humano se lo haya dicho."

---

## Vista Comparativas — "comparar años, meses y sistemas" (2 min)

**Haz clic en:** `Comparativas` en la sidebar.

**Paso 1 · El enfoque**

**Haz clic en:** en el bloque **ENFOCAR**, deja Sistema en `Todos` (o elige `Metro` para ver las líneas). Éste es el sistema/línea que protagoniza las gráficas.

**Explica al público:**
> "Aquí está la respuesta a la observación de 'poder comparar años y meses'. Esta vista tiene su propio control de tiempo: dos periodos independientes, cada uno con año y mes."

**Paso 2 · Los dos periodos (demo E2: jun 2025 vs jun 2026)**

**Haz clic en:** en **PERIODO 1**, elige año `2025` y mes `jun`. En **PERIODO 2**, elige año `2026` y mes `jun`.

**Verás que** la gráfica **"Comparación de periodos"** alinea ambos sobre los mismos 12 meses del año (una línea por periodo; el periodo 2 en azul). Así se ve *el mismo mes en dos años diferentes* y qué meses suben o bajan.

**Explica al público:**
> "Pusimos junio 2025 contra junio 2026. La gráfica alinea ambos sobre el mismo calendario mensual, y la tabla de abajo reporta el crecimiento porcentual por sistema. Este es exactamente el tipo de comparación que se pedía en las observaciones: filtro de tiempo real, sin hardcodear nada."

**Paso 3 · Tendencia de largo plazo**

**Haz clic en:** debajo, el bloque **"Tendencia de largo plazo"**. Prueba cambiar ENFOCAR Sistema a `Metro` y Línea a `Linea 4`.

**Verás que** se dibuja la regresión sobre toda la serie del sistema enfocado con su **pendiente (viajes/mes)** y su **R²**. Cambiar el enfoque recalcula al instante.

**Explica al público:**
> "¿La demanda crece o cae? La tendencia de largo plazo responde con una regresión lineal (toda la serie del sistema enfocado). El R² dice qué tan pareja es esa tendencia, y al cambiar de enfoque todo se recalcula."

**Paso 4 · Comparación entre sistemas**

**Haz clic en:** en **"Comparación entre sistemas"**, usa el selector de fecha de esa sección. Si eliges `2026` (año): verás series **relativas** — cada sistema al % de su propio máximo. Usa los **chips** de abajo para incluir/excluir sistemas (clic en un chip activo = lo quita; el chip se apaga).

**Verás que** quitar un sistema cambia la gráfica al momento: esto demuestra que los filtros **sí funcionan y son validados**.

**Explica al público:**
> "Para comparar sistemas de tamaños tan distintos los volvemos relativos: cada uno como % de su propio máximo, y podemos apagar y prender sistemas con estos chips. Cuando toco un chip, todo se recalcula — nada es una imagen estática."

**Paso 5 · Crecimiento y perfil por sistema**

**Verás que** las últimas secciones muestran **"Crecimiento por sistema"** (barras de % del periodo 1 al 2, alimentadas por los periodos que elegiste en el Paso 2) y **"Perfil por sistema"** (participación %, factor de fin de semana y crecimiento promedio por sistema).

**Explica al público:**
> "Y para cerrar la vista: qué creció entre los dos periodos que elegimos, y el perfil general de cada sistema. Todo lo de esta pantalla depende de los mismos dos periodos, los mismos filtros — una sola fuente de verdad."

---

## Vista Metodología — "¿cómo se verifica todo esto?" (30 s)

**Haz clic en:** `Metodología` en la sidebar.

**Verás que** se presentan: **Problema**, **Datos** (fuentes y licencia), **Proceso** (6 pasos del pipeline: descargar → limpiar → normalizar → agregar → graficar → concluir), **Herramientas**, los **Hallazgos** y las **Conclusiones/limitaciones** (la presión es proxy de saturación; datos con resolución diaria; las predicciones no anticipan eventos únicos).

**Explica al público:**
> "Y si quieren verificar cualquier cosa: aquí está el proceso completo, las fuentes oficiales (SEMOVI, CC-BY-4.0) y las limitaciones honestas. Todo es reproducible con los scripts del repositorio."

---

## Escenarios de ensayo

### E1 · Planificador: viernes vs domingo (2 min)
1. Vista **Planificador**. Fecha → viernes 17 jul. ORIGEN `Poniente`, DESTINO `Centro`.
2. Anota la recomendación ("hoy conviene…") y la presión del mejor corredor.
3. Fecha → domingo 19 jul. Mira la recomendación y las presiones.
4. **Qué se observa:** cambian la presión y hasta el sistema recomendado, porque la demanda de fin de semana es estructuralmente menor (domingo ×0.58).
5. **Frase:** "El mismo viaje, dos días distintos, respuestas distintas. El dato cambia la decisión."

### E2 · Comparativas: jun 2025 vs jun 2026 (2 min)
1. Vista **Comparativas**. ENFOCAR Sistema `Todos` (o `Metro`).
2. PERIODO 1 → 2025/`jun`. PERIODO 2 → 2026/`jun`.
3. Mira la gráfica alineada y el bloque "Crecimiento por sistema". Prueba apagar un chip de "Comparación entre sistemas".
4. **Qué se observa:** qué sistemas crecieron de 2025 a 2026, y que cada filtro recalcula.
5. **Frase:** "Junio del 26 contra junio del 25: comparación de periodos real, con filtros que funcionan".

### E3 · Monitor: Metro Línea 2 en la última fecha (2 min)
1. Vista **Monitor**. Fecha → **31 jul 2026** (el último día de los datos), Sistema `Metro`, Línea `Linea 2`.
2. Lee las 4 tarjetas y luego el panel "Por qué este número" (trata de leer la fórmula en voz alta).
3. Mira el semáforo de presión prevista y el "siguiente mes".
4. **Qué se observa:** el pronóstico se puede descomponer y justificar pieza por pieza; el semáforo juzga contra el récord de la Línea 2.
5. **Frase:** "No es magia: promedio × día × mes × año, y cada factor se explica."

---

## Cierre — la frase-resumen

> "Un solo origen de datos real y abierto → **dos decisiones**: **qué tomar** (el Planificador) y **cuándo o cuánto va a cambiar** (el Monitor, con los Patrones y las Comparativas que lo justifican). Todo normalizado, sin IA y reproducible."

**Ritmo sugerido:** Datos (1) → Planificador (2) → Monitor (2) → Patrones (2) → Comparativas (2) → Metodología (0.5) → cierre. Total ≈ 9–10 min con la demo.