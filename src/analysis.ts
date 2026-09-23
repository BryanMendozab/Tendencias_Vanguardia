// Analítica avanzada: modelos estadísticos puros sobre series de movilidad CDMX.
// Regresión lineal, estacionalidad, anomalías (z-score por día-semana), pronóstico
// Holt-Winters, percentiles/umbrales y correlaciones.

export type PuntoDiario = { fecha: string; modo: string; afluencia: number }
export type PuntoLinea = { fecha: string; linea: string; afluencia: number }
export type PuntoEstacion = { linea: string; estacion: string; anio: string; mes: string; afluencia: number }

export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
export const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

export function normalizeNombre(valor: string) {
  return valor.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
}

export function diaSemana(fecha: string) {
  return new Date(`${fecha}T00:00:00Z`).getUTCDay()
}
export function mesDe(fecha: string) {
  return Number(fecha.slice(5, 7)) - 1
}
export function anioDe(fecha: string) {
  return Number(fecha.slice(0, 4))
}
export function claveMes(fecha: string) {
  return fecha.slice(0, 7)
}
export function inRange(fecha: string, start: string, end: string) {
  return fecha >= start && fecha <= end
}

export function agruparSerie<T extends { fecha: string }>(rows: T[], valor: (r: T) => number) {
  const map = new Map<string, number>()
  for (const fila of rows) map.set(fila.fecha, (map.get(fila.fecha) ?? 0) + valor(fila))
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([fecha, afluencia]) => ({ fecha, afluencia }))
}

export function serieMensual<T extends { fecha: string }>(rows: T[], valor: (r: T) => number) {
  const map = new Map<string, number>()
  for (const fila of rows) {
    const k = claveMes(fila.fecha)
    map.set(k, (map.get(k) ?? 0) + valor(fila))
  }
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([label, value]) => ({ label, value }))
}

export function media(valores: number[]) {
  return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : 0
}

export function desviacion(valores: number[]) {
  if (valores.length < 2) return 0
  const m = media(valores)
  return Math.sqrt(valores.reduce((acc, v) => acc + (v - m) * (v - m), 0) / (valores.length - 1))
}

export function percentil(valores: number[], p: number) {
  const ordenados = [...valores].sort((a, b) => a - b)
  if (!ordenados.length) return 0
  const idx = (ordenados.length - 1) * p
  const base = Math.floor(idx)
  const resto = idx - base
  if (base + 1 < ordenados.length) return ordenados[base] + resto * (ordenados[base + 1] - ordenados[base])
  return ordenados[base]
}

export function pearson(xs: number[], ys: number[]) {
  const n = xs.length
  if (n < 2) return 0
  const mx = media(xs); const my = media(ys)
  let num = 0; let dx2 = 0; let dy2 = 0
  for (let i = 0; i < n; i += 1) {
    const dx = xs[i] - mx; const dy = ys[i] - my
    num += dx * dy; dx2 += dx * dx; dy2 += dy * dy
  }
  if (!dx2 || !dy2) return 0
  return num / Math.sqrt(dx2 * dy2)
}

export function correlacionSeries(a: { fecha: string; value: number }[], b: { fecha: string; value: number }[]) {
  const bMap = new Map(b.map((r) => [r.fecha, r.value]))
  const pares = a.filter((r) => bMap.has(r.fecha)).map((r) => [r.value, bMap.get(r.fecha) as number])
  return { n: pares.length, r: pearson(pares.map((p) => p[0]), pares.map((p) => p[1])) }
}

export type Regresion = { pendiente: number; intercepto: number; r2: number; n: number; predecir: (x: number) => number }

export function regresionLineal(ys: number[]): Regresion {
  const n = ys.length
  if (n < 2) {
    const y0 = ys[0] ?? 0
    return { pendiente: 0, intercepto: y0, r2: 0, n, predecir: () => y0 }
  }
  const xs = ys.map((_, i) => i)
  const mx = media(xs); const my = media(ys)
  let num = 0; let den = 0
  for (let i = 0; i < n; i += 1) {
    num += (xs[i] - mx) * (ys[i] - my)
    den += (xs[i] - mx) * (xs[i] - mx)
  }
  const pendiente = den ? num / den : 0
  const intercepto = my - pendiente * mx
  const predecir = (x: number) => pendiente * x + intercepto
  let sst = 0; let ssr = 0
  for (let i = 0; i < n; i += 1) {
    sst += (ys[i] - my) * (ys[i] - my)
    ssr += (ys[i] - predecir(i)) * (ys[i] - predecir(i))
  }
  const r2 = sst ? 1 - ssr / sst : 0
  return { pendiente, intercepto, r2: Math.max(0, Math.min(1, r2)), n, predecir }
}

export function clasificarTendencia(pendiente: number, r2: number, promedio: number) {
  const rel = Math.abs((pendiente / Math.max(promedio, 1)) * 100)
  if (rel < 0.2 || r2 < 0.05) return 'Estable'
  return pendiente > 0 ? 'Creciente' : 'Decreciente'
}

export function resumenPeriodo<T extends { fecha: string }>(rows: T[], valor: (r: T) => number, start: string, end: string) {
  const puntos = rows.filter((r) => inRange(r.fecha, start, end))
  const serie = agruparSerie(puntos, valor)
  const total = serie.reduce((a, r) => a + r.afluencia, 0)
  const valores = serie.map((r) => r.afluencia)
  let pico: { fecha: string; afluencia: number } | undefined
  for (const r of serie) if (!pico || r.afluencia > pico.afluencia) pico = r
  return { total, promedio: media(valores), desviacion: desviacion(valores), dias: serie.length, pico, serie }
}

export function indicesEstacionales<T extends { fecha: string }>(rows: T[], valor: (r: T) => number) {
  const totales = new Array(12).fill(0) as number[]
  const counts = new Array(12).fill(0) as number[]
  for (const fila of rows) {
    const m = mesDe(fila.fecha)
    totales[m] += valor(fila)
    counts[m] += 1
  }
  const promedios = totales.map((t, i) => (counts[i] ? t / counts[i] : 0))
  const granPromedio = media(promedios)
  return promedios.map((p) => (granPromedio ? p / granPromedio : 0))
}

export function perfilSemana<T extends { fecha: string }>(rows: T[], valor: (r: T) => number) {
  const totales = new Array(7).fill(0) as number[]
  const counts = new Array(7).fill(0) as number[]
  for (const fila of rows) {
    const d = diaSemana(fila.fecha)
    totales[d] += valor(fila)
    counts[d] += 1
  }
  const promedios = totales.map((t, i) => (counts[i] ? t / counts[i] : 0))
  const granPromedio = media(promedios)
  return promedios.map((p) => (granPromedio ? p / granPromedio : 0))
}

export type Anomalia = { fecha: string; afluencia: number; esperado: number; z: number }

export function detectarAnomalias<T extends { fecha: string }>(rows: T[], valor: (r: T) => number, umbral = 2.5) {
  const serie = agruparSerie(rows, valor)
  const porDia = new Array(7).fill(null).map(() => [] as number[])
  for (const p of serie) porDia[diaSemana(p.fecha)].push(p.afluencia)
  const statsDia = porDia.map((arr) => ({ media: media(arr), desv: desviacion(arr) }))
  return serie.map((p): Anomalia => {
    const s = statsDia[diaSemana(p.fecha)]
    const z = s.desv ? (p.afluencia - s.media) / s.desv : 0
    return { fecha: p.fecha, afluencia: p.afluencia, esperado: s.media, z }
  }).filter((a) => Math.abs(a.z) >= umbral).sort((a, b) => Math.abs(b.z) - Math.abs(a.z))
}

export type PrediccionDia = {
  fecha: string
  prediccion: number
  promedio: number
  factorDiaSemana: number
  factorMes: number
  factorAno: number
  desviacionRel: number
  pronosticoMensual: { etiqueta: string; valor: number } | null
}

// Pronóstico de un día a partir del histórico (sin IA): el día esperado es el
// promedio histórico × estacionalidad del mes × lo que va de este año vs el anterior.
export function predecirDia<T extends { fecha: string }>(rows: T[], valor: (r: T) => number, fecha: string): PrediccionDia | null {
  const serie = agruparSerie(rows, valor)
  if (!serie.length) return null
  const dow = diaSemana(fecha)
  const mes = Number(fecha.slice(5, 7)) - 1
  const anio = Number(fecha.slice(0, 4))
  const valores = serie.map((r) => r.afluencia)
  const promedio = media(valores)
  const porDia = new Array(7).fill(null).map(() => [] as number[])
  for (const r of serie) porDia[diaSemana(r.fecha)].push(r.afluencia)
  const mediaDow = media(porDia[dow])
  const factorDiaSemana = promedio ? mediaDow / promedio : 1
  const desviacionRel = mediaDow ? desviacion(porDia[dow]) / mediaDow : 0
  const factorMes = indicesEstacionales(serie, (r) => r.afluencia)[mes] || 1
  const ventanaAnio = (y: number) => {
    const arr: number[] = []
    for (const p of serie) {
      if (Number(p.fecha.slice(0, 4)) === y && diaSemana(p.fecha) === dow && Number(p.fecha.slice(5, 7)) - 1 <= mes) arr.push(p.afluencia)
    }
    return arr
  }
  const mediaCur = media(ventanaAnio(anio))
  const mediaPrev = media(ventanaAnio(anio - 1))
  const factorAno = mediaCur && mediaPrev ? mediaCur / mediaPrev : 1
  const prediccion = Math.max(0, promedio * factorDiaSemana * factorMes * factorAno)
  const mensual = serieMensual(serie, (r) => r.afluencia)
  const hw = pronosticoHoltWinters(mensual.map((m) => m.value), 12, 1)
  const pronosticoMensual = hw.predicciones.length
    ? { etiqueta: `${MESES[(mes + 1) % 12]} ${fecha.slice(0, 4)}`, valor: hw.predicciones[0] }
    : null
  return { fecha, prediccion, promedio, factorDiaSemana, factorMes, factorAno, desviacionRel, pronosticoMensual }
}

export type Pronostico = {
  alfa: number; beta: number; gamma: number; sse: number; mae: number; mape: number
  ajustados: number[]
  predicciones: number[]
}

// Suavizado exponencial triple de Holt-Winters (multiplicativo). Búsqueda de
// parámetros por rejilla minimizando la suma de errores cuadráticos (SSE).
export function pronosticoHoltWinters(valores: number[], periodos = 12, pasos = 12): Pronostico {
  const n = valores.length
  const vacio: Pronostico = { alfa: 0, beta: 0, gamma: 0, sse: 0, mae: 0, mape: 0, ajustados: [], predicciones: [] }
  if (n < periodos * 2) return vacio

  let mejor: { sse: number; alfa: number; beta: number; gamma: number; ajustados: number[] } | undefined
  for (const alfa of [0.1, 0.2, 0.3, 0.4, 0.5, 0.7]) {
    for (const beta of [0.05, 0.1, 0.2, 0.3]) {
      for (const gamma of [0.1, 0.2, 0.3, 0.4]) {
        const nivel = new Array(n).fill(0) as number[]
        const tend = new Array(n).fill(0) as number[]
        const est = new Array(n).fill(1) as number[]
        const ajustados = new Array(n).fill(0) as number[]
        const mediaPrimera = media(valores.slice(0, periodos))
        for (let i = 0; i < periodos; i += 1) est[i] = mediaPrimera ? valores[i] / mediaPrimera : 1
        nivel[periodos - 1] = mediaPrimera
        tend[periodos - 1] = (valores[periodos] - valores[0]) / periodos
        let sse = 0
        for (let t = periodos; t < n; t += 1) {
          const nivelPrev = nivel[t - 1]; const tendPrev = tend[t - 1]
          const estPrev = est[t - periodos] || 1
          ajustados[t] = (nivelPrev + tendPrev) * estPrev
          nivel[t] = alfa * (valores[t] / estPrev) + (1 - alfa) * (nivelPrev + tendPrev)
          tend[t] = beta * (nivel[t] - nivelPrev) + (1 - beta) * tendPrev
          est[t] = gamma * (valores[t] / nivel[t]) + (1 - gamma) * estPrev
          const err = ajustados[t] - valores[t]
          sse += err * err
        }
        if (!mejor || sse < mejor.sse) mejor = { sse, alfa, beta, gamma, ajustados }
      }
    }
  }
  if (!mejor) return vacio

  const { nivel, tend, est } = estadoFinal(valores, mejor.alfa, mejor.beta, mejor.gamma, periodos)
  const predicciones = [] as number[]
  for (let k = 1; k <= pasos; k += 1) {
    const s = est[(n - 1 + k) % periodos] || 1
    predicciones.push((nivel + tend * k) * s)
  }
  const ajustados = mejor.ajustados
  let mae = 0; let mape = 0; let cuenta = 0
  for (let t = periodos; t < n; t += 1) {
    mae += Math.abs(ajustados[t] - valores[t])
    if (valores[t]) mape += Math.abs((ajustados[t] - valores[t]) / valores[t])
    cuenta += 1
  }
  return {
    ...mejor,
    mae: cuenta ? mae / cuenta : 0,
    mape: cuenta ? (mape / cuenta) * 100 : 0,
    ajustados,
    predicciones,
  }
}

function estadoFinal(valores: number[], alfa: number, beta: number, gamma: number, periodos: number) {
  const n = valores.length
  const nivel = new Array(n).fill(0) as number[]
  const tend = new Array(n).fill(0) as number[]
  const est = new Array(n).fill(1) as number[]
  const mediaPrimera = media(valores.slice(0, periodos))
  for (let i = 0; i < periodos; i += 1) est[i] = mediaPrimera ? valores[i] / mediaPrimera : 1
  nivel[periodos - 1] = mediaPrimera
  tend[periodos - 1] = (valores[periodos] - valores[0]) / periodos
  for (let t = periodos; t < n; t += 1) {
    const estPrev = est[t - periodos] || 1
    nivel[t] = alfa * (valores[t] / estPrev) + (1 - alfa) * (nivel[t - 1] + tend[t - 1])
    tend[t] = beta * (nivel[t] - nivel[t - 1]) + (1 - beta) * tend[t - 1]
    est[t] = gamma * (valores[t] / nivel[t]) + (1 - gamma) * estPrev
  }
  return { nivel: nivel[n - 1], tend: tend[n - 1], est }
}