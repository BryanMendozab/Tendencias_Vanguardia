import type { ReactNode } from 'react'
import { useEffect, useMemo, useState } from 'react'
import { Activity, ArrowDownRight, ArrowLeftRight, ArrowUpRight, CalendarRange, Database, FileText, Gauge, MapPin, Route, Scale, TrendingUp, Zap } from 'lucide-react'
import {
  DIAS, MESES,
  clasificarTendencia, detectarAnomalias, diaSemana, indicesEstacionales, inRange, media, normalizeNombre,
  perfilSemana, predecirDia, regresionLineal, resumenPeriodo, serieMensual,
} from './analysis'
import type { PuntoDiario, PuntoLinea, PrediccionDia } from './analysis'
import './App.css'

type Periodo = { start: string; end: string }
type PeriodoPick = { anio: string; mes: string }
type Overlay = { values: (number | null)[]; offset?: number; dashed?: boolean; stroke?: string }
type StatsSerie = { valores: number[]; porDia: number[][]; max: number }

const PALETA = ['#d9a05b', '#6aa5f0', '#5db7a0', '#a08ee6', '#d78bb0', '#7cc59a', '#9aa3b5']

const fmtFull = new Intl.NumberFormat('es-MX', { maximumFractionDigits: 0 })
const fmtCompact = new Intl.NumberFormat('es-MX', { notation: 'compact', maximumFractionDigits: 1 })
const fmtNum = (n: number) => (Math.abs(n) >= 10000 ? fmtCompact.format(n) : fmtFull.format(n))
const fmtPct = (valor: number) => `${valor >= 0 ? '+' : ''}${valor.toFixed(1)}%`
const fmtFecha = (iso: string, largo = false) => {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00Z`)
  return new Intl.DateTimeFormat('es-MX', largo ? { weekday: 'long', day: 'numeric', month: 'long' } : { day: 'numeric', month: 'short', year: 'numeric' }).format(d)
}
const pad = (n: number) => String(n).padStart(2, '0')
const finMes = (k: string) => {
  const [yy, mm] = k.split('-').map(Number)
  return `${k}-${pad(new Date(Date.UTC(yy, mm, 0)).getUTCDate())}`
}
const rangoDe = (p: PeriodoPick): Periodo => (p.mes ? { start: `${p.anio}-${p.mes}-01`, end: finMes(`${p.anio}-${p.mes}`) } : { start: `${p.anio}-01-01`, end: `${p.anio}-12-31` })
const etiqueta = (p: PeriodoPick) => (p.mes ? `${MESES[Number(p.mes) - 1]} ${p.anio}` : p.anio)

const ZONAS = ['Poniente', 'Centro', 'Oriente', 'Norte', 'Sur'] as const

const CORREDORES = [
  { linea: 'Linea 1', ruta: 'Observatorio → Pantitlán', zonas: ['Poniente', 'Centro', 'Oriente'] },
  { linea: 'Linea 2', ruta: 'Cuatro Caminos → Tasqueña', zonas: ['Norte', 'Centro', 'Sur'] },
  { linea: 'Linea 3', ruta: 'Indios Verdes → Universidad', zonas: ['Norte', 'Centro', 'Sur'] },
  { linea: 'Linea 4', ruta: 'Martín Carrera → Santa Anita', zonas: ['Norte', 'Centro'] },
  { linea: 'Linea 5', ruta: 'Politécnico → Pantitlán', zonas: ['Norte', 'Oriente'] },
  { linea: 'Linea 6', ruta: 'El Rosario → Martín Carrera', zonas: ['Poniente', 'Norte'] },
  { linea: 'Linea 7', ruta: 'El Rosario → Barranca del Muerto', zonas: ['Poniente', 'Norte'] },
  { linea: 'Linea 8', ruta: 'Garibaldi → Constitución de 1917', zonas: ['Centro', 'Sur'] },
  { linea: 'Linea 9', ruta: 'Tacubaya → Pantitlán', zonas: ['Poniente', 'Centro', 'Oriente'] },
  { linea: 'Linea 12', ruta: 'Mixcoac → Tláhuac', zonas: ['Poniente', 'Sur', 'Oriente'] },
  { linea: 'Linea A', ruta: 'Pantitlán → La Paz', zonas: ['Oriente', 'Centro'] },
  { linea: 'Linea B', ruta: 'Buenavista → Ciudad Azteca', zonas: ['Centro', 'Norte'] },
]

function csvLine(line: string) {
  const result: string[] = []
  let current = ''
  let quoted = false
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index]
    if (char === '"' && line[index + 1] === '"') { current += '"'; index += 1 }
    else if (char === '"') quoted = !quoted
    else if (char === ',' && !quoted) { result.push(current); current = '' }
    else current += char
  }
  result.push(current)
  return result
}

function parseCsv(text: string): string[][] {
  const lines = text.trim().split(/\r?\n/)
  return lines.map((line) => csvLine(line)).filter((row) => row.some((c) => c !== ''))
}

function SeriesChart({ values, labels, overlays = [], flagMask = [], peakLabel, unit }: { values: (number | null)[]; labels: string[]; overlays?: Overlay[]; flagMask?: boolean[]; peakLabel?: string; unit?: string }) {
  const all = overlays.flatMap((o) => o.values)
  const max = Math.max(...[...values, ...all].filter((v): v is number => v !== null), 1)
  const width = 700
  const height = 158
  const padL = 46
  const padR = 10
  const span = Math.max(values.length, ...overlays.map((o) => (o.offset ?? 0) + o.values.length))
  const maxIndex = Math.max(0, span - 1)
  const x = (index: number) => padL + (maxIndex ? (index * (width - padL - padR)) / maxIndex : 0)
  const basY = height - 9
  const y = (v: number) => 10 + (1 - v / max) * (basY - 10)
  const puntos = (vs: (number | null)[], offset = 0): Array<[number, number] | null> => vs.map((v, i) => (v === null ? null : [x(i + offset), y(v)] as [number, number]))
  const segmentos = (pts: Array<[number, number] | null>) => {
    const out: Array<Array<[number, number]>> = []
    let cur: Array<[number, number]> = []
    for (const p of pts) {
      if (p) cur.push(p)
      else if (cur.length) { out.push(cur); cur = [] }
    }
    if (cur.length) out.push(cur)
    return out
  }
  const dDe = (segs: Array<Array<[number, number]>>) => segs.map((s) => `M${s.map((p) => `${p[0]},${p[1]}`).join(' L')}`).join(' ')
  const polyDe = (pts: Array<[number, number]>) => pts.map((p) => `${p[0]},${p[1]}`).join(' ')
  const labelsShown = labels.length <= 14
  const labelsList = labelsShown ? labels : labels.filter((_, i) => i % Math.ceil(labels.length / 14) === 0)
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => f * max)
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${width} ${height}`} className="trend-chart" role="img" aria-label="Serie temporal de afluencia">
        <defs>
          <linearGradient id="area-fill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#d9a05b" stopOpacity=".14" />
            <stop offset="100%" stopColor="#d9a05b" stopOpacity="0" />
          </linearGradient>
        </defs>
        {unit ? <text x={padL} y={8} className="axis-title">{unit}</text> : null}
        {ticks.map((t) => (
          <g key={t}>
            <line x1={padL} x2={width - padR} y1={y(t)} y2={y(t)} className="grid-line" />
            <text x={padL - 6} y={y(t) + 3} textAnchor="end" className="axis-label">{fmtNum(t)}</text>
          </g>
        ))}
        {overlays.map((overlay, oi) => {
          const segs = segmentos(puntos(overlay.values, overlay.offset ?? 0))
          return segs.length ? <path key={`overlay-${oi}`} d={dDe(segs)} fill="none" stroke={overlay.stroke ?? '#9aa3b5'} strokeWidth={overlay.offset ? 2 : 2.5} strokeDasharray={overlay.dashed ? '6 5' : undefined} strokeLinecap="round" strokeLinejoin="round" opacity={0.9} /> : null
        })}
        {segmentos(puntos(values)).map((seg, si) => (
          <polygon key={`area-${si}`} points={`${padL},${basY} ${polyDe(seg)} ${width - padR},${basY}`} fill="url(#area-fill)" />
        ))}
        <path d={dDe(segmentos(puntos(values)))} fill="none" stroke="#d9a05b" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        {values.map((value, index) => (
          value === null ? null : <circle key={index} cx={x(index)} cy={y(value)} r={flagMask[index] ? 4 : 3} className={flagMask[index] ? 'chart-dot flag' : 'chart-dot'} fill={flagMask[index] ? '#d68a82' : undefined} />
        ))}
      </svg>
      <div className="chart-labels" style={{ paddingLeft: padL, paddingRight: padR }}>{labelsList.map((label, i) => <span key={i}>{label}</span>)}</div>
      {peakLabel ? <div className="chart-peak-above">{peakLabel}</div> : null}
    </div>
  )
}

function StatCard({ titulo, valor, cambio, cambioTexto, icono }: { titulo: string; valor: string; cambio?: number; cambioTexto?: string; icono: ReactNode }) {
  return (
    <article className="stat-card">
      <div className="stat-top">{titulo}<span className="stat-icon">{icono}</span></div>
      <strong>{valor}</strong>
      {cambio !== undefined ? (
        <div className={`stat-change ${cambio >= 0 ? 'positive' : 'negative'}`}>
          {cambio >= 0 ? <ArrowUpRight size={15} /> : <ArrowDownRight size={15} />}
          {fmtPct(cambio)}
          {cambioTexto ? <span>{cambioTexto}</span> : null}
        </div>
      ) : null}
    </article>
  )
}

function Panel({ titulo, descripcion, children }: { titulo: string; descripcion?: string; children: ReactNode }) {
  return (
    <article className="panel">
      <div className="panel-header"><div><h2>{titulo}</h2>{descripcion ? <p>{descripcion}</p> : null}</div></div>
      {children}
    </article>
  )
}

function PeriodoPicker({ value, onChange, anios }: { value: PeriodoPick; onChange: (p: PeriodoPick) => void; anios: string[] }) {
  return (
    <div className="periodo-picker">
      <select value={value.anio} onChange={(e) => onChange({ ...value, anio: e.target.value })}>
        {anios.map((y) => <option key={y}>{y}</option>)}
      </select>
      <select value={value.mes} onChange={(e) => onChange({ ...value, mes: e.target.value })}>
        <option value="">Año completo</option>
        {MESES.map((m, i) => <option key={m} value={pad(i + 1)}>{m}</option>)}
      </select>
    </div>
  )
}

function nivel(fraccion: number) {
  if (fraccion < 0.7) return { clase: 'libre', etiqueta: 'Flujo libre' }
  if (fraccion < 0.85) return { clase: 'moderado', etiqueta: 'Tráfico normal' }
  return { clase: 'saturado', etiqueta: 'Alta saturación' }
}

function Semaforo({ fraccion }: { fraccion: number }) {
  const n = nivel(fraccion)
  return (
    <div className={`semaforo ${n.clase}`}>
      <span className="semaforo-dot" />
      <div><strong>{n.etiqueta}</strong><small>presión {(fraccion * 100).toFixed(0)}% del máximo histórico</small></div>
    </div>
  )
}

function Meter({ fraccion }: { fraccion: number }) {
  const n = nivel(fraccion)
  return <div className={`meter ${n.clase}`}><div className="meter-fill" style={{ width: `${Math.min(fraccion, 1) * 100}%` }} /></div>
}

function ordenLineas(lista: string[]) {
  const token = (nombre: string) => nombre.replace(/^Linea\s+/i, '')
  const esNum = (n: string) => n.trim() !== '' && Number.isInteger(Number(n))
  return lista.sort((a, b) => {
    const ta = token(a); const tb = token(b)
    const na = esNum(ta); const nb = esNum(tb)
    if (na && nb) return Number(ta) - Number(tb)
    if (na && !nb) return -1
    if (!na && nb) return 1
    return ta.localeCompare(tb)
  })
}

function App() {
  const [diario, setDiario] = useState<PuntoDiario[]>([])
  const [linea, setLinea] = useState<PuntoLinea[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [nav, setNav] = useState<'Datos' | 'Planificador' | 'Monitor' | 'Patrones' | 'Comparativas' | 'Metodología'>('Datos')
  const [modo, setModo] = useState('Todos')
  const [lineaSel, setLineaSel] = useState('Todas')
  const [fechaSel, setFechaSel] = useState('')
  const [origen, setOrigen] = useState('Centro')
  const [destino, setDestino] = useState('Norte')
  const [per1, setPer1] = useState<PeriodoPick>({ anio: '2025', mes: '' })
  const [per2, setPer2] = useState<PeriodoPick>({ anio: '2026', mes: '' })
  const [perSis, setPerSis] = useState<PeriodoPick>({ anio: '2026', mes: '' })
  const [excluidos, setExcluidos] = useState<string[]>([])

  useEffect(() => {
    Promise.all([
      fetch('/data/metro/modo_diario.csv').then((r) => r.text()),
      fetch('/data/metro/metro_linea_diario.csv').then((r) => r.text()),
    ])
      .then(([diarioText, lineaText]) => {
        setDiario(parseCsv(diarioText).slice(1).map((row) => ({ fecha: row[0], modo: row[1], afluencia: Number(row[2]) || 0 })))
        setLinea(parseCsv(lineaText).slice(1).map((row) => ({ fecha: row[0], linea: normalizeNombre(row[1]), afluencia: Number(row[2]) || 0 })))
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  const modos = useMemo(() => ['Todos', ...new Set(diario.map((r) => r.modo))].sort((a, b) => (a === 'Todos' ? -1 : b === 'Todos' ? 1 : a.localeCompare(b))), [diario])
  const lineas = useMemo(() => ordenLineas([...new Set(linea.map((r) => r.linea))]), [linea])
  const anios = useMemo(() => [...new Set(diario.map((r) => r.fecha.slice(0, 4)))].sort(), [diario])

  const hoyDow = new Date().getDay()

  const ultimaFecha = useMemo(() => {
    const fechas = diario.map((r) => r.fecha).sort()
    return fechas.length ? fechas[fechas.length - 1] : ''
  }, [diario])
  const minFecha = useMemo(() => (diario.length ? diario.map((r) => r.fecha).sort()[0] : ''), [diario])

  const fechaRef = useMemo(() => {
    const fechas = [...new Set(diario.map((r) => r.fecha))].sort()
    for (let i = fechas.length - 1; i >= 0; i -= 1) {
      if (diaSemana(fechas[i]) === hoyDow) return fechas[i]
    }
    return fechas[fechas.length - 1] ?? ''
  }, [diario, hoyDow])

  const fechaConsulta = fechaSel || fechaRef

  const filasTodos = useMemo(() => {
    const suma = new Map<string, number>()
    for (const r of diario) suma.set(r.fecha, (suma.get(r.fecha) ?? 0) + r.afluencia)
    return [...suma].map(([fecha, afluencia]) => ({ fecha, modo: 'Todos' as const, afluencia }))
  }, [diario])

  const esMetro = modo === 'Metro'

  const daily = useMemo(() => {
    if (modo === 'Todos') return filasTodos
    if (!esMetro) return diario.filter((r) => r.modo === modo)
    if (lineaSel === 'Todas') return diario.filter((r) => r.modo === 'Metro')
    return linea.filter((r) => r.linea === lineaSel).map((r) => ({ fecha: r.fecha, modo: 'Metro' as const, afluencia: r.afluencia }))
  }, [diario, linea, esMetro, modo, lineaSel, filasTodos])

  const p1 = useMemo(() => rangoDe(per1), [per1])
  const p2 = useMemo(() => rangoDe(per2), [per2])
  const pSis = useMemo(() => rangoDe(perSis), [perSis])

  const toggleExcluir = (m: string) => setExcluidos((prev) => (prev.includes(m) ? prev.filter((x) => x !== m) : [...prev, m]))

  const rows1 = useMemo(() => daily.filter((r) => inRange(r.fecha, p1.start, p1.end)), [daily, p1])
  const rows2 = useMemo(() => daily.filter((r) => inRange(r.fecha, p2.start, p2.end)), [daily, p2])
  const stat1 = useMemo(() => resumenPeriodo(rows1, (r) => r.afluencia, p1.start, p1.end), [rows1, p1])
  const stat2 = useMemo(() => resumenPeriodo(rows2, (r) => r.afluencia, p2.start, p2.end), [rows2, p2])
  const serieP1 = useMemo(() => serieMensual(rows1, (r) => r.afluencia), [rows1])
  const serieP2 = useMemo(() => serieMensual(rows2, (r) => r.afluencia), [rows2])
  const alineadoPeriodos = useMemo(() => {
    const v1 = new Array(12).fill(null) as (number | null)[]
    const v2 = new Array(12).fill(null) as (number | null)[]
    for (const m of serieP1) v1[Number(m.label.slice(5)) - 1] = (v1[Number(m.label.slice(5)) - 1] ?? 0) + m.value
    for (const m of serieP2) v2[Number(m.label.slice(5)) - 1] = (v2[Number(m.label.slice(5)) - 1] ?? 0) + m.value
    return { labels: MESES, v1, v2 }
  }, [serieP1, serieP2])

  const mensual = useMemo(() => serieMensual(daily, (r) => r.afluencia), [daily])
  const regresion = useMemo(() => regresionLineal(mensual.map((m) => m.value)), [mensual])
  const tendenciaEtiqueta = clasificarTendencia(regresion.pendiente, regresion.r2, media(mensual.map((m) => m.value)))
  const crecimientoGeneral = stat1.total ? ((stat2.total - stat1.total) / stat1.total) * 100 : 0

  const perfil = useMemo(() => perfilSemana(daily, (r) => r.afluencia), [daily])
  const indices = useMemo(() => indicesEstacionales(daily, (r) => r.afluencia), [daily])
  const anomalias = useMemo(() => detectarAnomalias(daily, (r) => r.afluencia).slice(0, 10), [daily])
  const maxAnomZ = anomalias.reduce((m, a) => Math.max(m, Math.abs(a.z)), 1)
  const maxPerfil = Math.max(...perfil, 1)
  const maxIndice = Math.max(...indices, 1)

  const tlg = (m: string) => (m.slice(0, 1) + m.slice(1).toLowerCase())

  const lineaDiario = useMemo(() => new Map(linea.map((r) => [`${r.fecha}|${r.linea}`, r.afluencia] as const)), [linea])
  const modoDiario = useMemo(() => {
    const map = new Map<string, number>(diario.map((r) => [`${r.fecha}|${r.modo}`, r.afluencia] as const))
    for (const r of filasTodos) map.set(`${r.fecha}|Todos`, r.afluencia)
    return map
  }, [diario, filasTodos])

  const statsLinea = useMemo(() => {
    const map = new Map<string, StatsSerie>()
    for (const r of linea) {
      let s = map.get(r.linea)
      if (!s) { s = { valores: [], porDia: Array.from({ length: 7 }, () => [] as number[]), max: 0 }; map.set(r.linea, s) }
      s.valores.push(r.afluencia)
      s.porDia[diaSemana(r.fecha)].push(r.afluencia)
    }
    for (const s of map.values()) s.max = Math.max(...s.valores)
    return map
  }, [linea])

  const statsModo = useMemo(() => {
    const map = new Map<string, StatsSerie>()
    const acumular = (r: { fecha: string; modo: string; afluencia: number }) => {
      let s = map.get(r.modo)
      if (!s) { s = { valores: [], porDia: Array.from({ length: 7 }, () => [] as number[]), max: 0 }; map.set(r.modo, s) }
      s.valores.push(r.afluencia)
      s.porDia[diaSemana(r.fecha)].push(r.afluencia)
    }
    for (const r of diario) acumular(r)
    for (const r of filasTodos) acumular(r)
    for (const s of map.values()) s.max = Math.max(...s.valores)
    return map
  }, [diario, filasTodos])

  const mediaPeriodo = useMemo(() => {
    const uno = new Map<string, number[]>()
    const dos = new Map<string, number[]>()
    const todas = [...diario, ...filasTodos]
    for (const r of todas) {
      if (inRange(r.fecha, p1.start, p1.end)) { const arr = uno.get(r.modo) ?? []; arr.push(r.afluencia); uno.set(r.modo, arr) }
      else if (inRange(r.fecha, p2.start, p2.end)) { const arr = dos.get(r.modo) ?? []; arr.push(r.afluencia); dos.set(r.modo, arr) }
    }
    const med = (m: Map<string, number[]>) => { const o: Record<string, number> = {}; for (const [k, v] of m) o[k] = media(v); return o }
    return { uno: med(uno), dos: med(dos) }
  }, [diario, filasTodos, p1, p2])

  const resumenSistemas = useMemo(() => {
    return modos.slice(1).map((m) => {
      const rows = diario.filter((r) => r.modo === m)
      const fechas = rows.map((r) => r.fecha).sort()
      const total = rows.reduce((s, r) => s + r.afluencia, 0)
      const pico = rows.reduce<{ afluencia: number } | undefined>((b, r) => (!b || r.afluencia > b.afluencia ? r : b), undefined)
      return { modo: m, total, dias: new Set(fechas).size, inicio: fechas[0] ?? '', fin: fechas[fechas.length - 1] ?? '', pico: pico?.afluencia ?? 0 }
    }).sort((a, b) => b.total - a.total)
  }, [diario, modos])
  const maxSistemaTotal = resumenSistemas.reduce((m, s) => Math.max(m, s.total), 0)

  const resumenLineas = useMemo(() => {
    return lineas.map((l) => {
      const rows = linea.filter((r) => r.linea === l)
      return { linea: l, total: rows.reduce((s, r) => s + r.afluencia, 0), dias: new Set(rows.map((r) => r.fecha)).size }
    }).sort((a, b) => b.total - a.total)
  }, [linea, lineas])
  const maxLineaTotal = resumenLineas.reduce((m, l) => Math.max(m, l.total), 0)

  const sistemasActivos = useMemo(() => resumenSistemas.filter((s) => !excluidos.includes(s.modo)), [resumenSistemas, excluidos])

  const serieSis = useMemo(() => {
    return sistemasActivos.map((s, i) => {
      const rows = diario.filter((r) => r.modo === s.modo && inRange(r.fecha, pSis.start, pSis.end))
      const m = serieMensual(rows, (r) => r.afluencia)
      const max = Math.max(...m.map((x) => x.value), 1)
      return { modo: s.modo, color: PALETA[i % PALETA.length], values: m.map((x) => (x.value / max) * 100), labels: m.map((x) => MESES[Number(x.label.slice(5)) - 1]) }
    })
  }, [sistemasActivos, diario, pSis])

  const mesSistemas = useMemo(() => {
    return sistemasActivos.map((s) => {
      const rows = diario.filter((r) => r.modo === s.modo && inRange(r.fecha, pSis.start, pSis.end))
      return { modo: s.modo, total: rows.reduce((a, r) => a + r.afluencia, 0) }
    }).sort((a, b) => b.total - a.total)
  }, [sistemasActivos, diario, pSis])
  const maxMesSistema = Math.max(...mesSistemas.map((x) => x.total), 1)

  const perfilSistemas = useMemo(() => {
    return modos.slice(1).map((m) => {
      const rows = diario.filter((r) => r.modo === m)
      const rowsP = rows.filter((r) => inRange(r.fecha, pSis.start, pSis.end))
      const total = rowsP.reduce((a, r) => a + r.afluencia, 0)
      const dias = new Set(rowsP.map((r) => r.fecha)).size
      const p = perfilSemana(rows, (r) => r.afluencia)
      const c1 = mediaPeriodo.uno[m]
      const c2 = mediaPeriodo.dos[m]
      return { modo: m, total, dias, intens: dias ? total / dias : 0, finde: media([p[0], p[6]]), ch: c1 && c2 ? (c2 / c1 - 1) * 100 : null }
    }).sort((a, b) => b.total - a.total)
  }, [modos, diario, pSis, mediaPeriodo])
  const activosP = perfilSistemas.filter((s) => !excluidos.includes(s.modo))
  const maxActivoP = Math.max(...activosP.map((s) => s.total), 1)
  const sumaActivos = activosP.reduce((a, s) => a + s.total, 0)

  const prediccionesModo = useMemo(() => modos.slice(1).map((m) => {
    const rows = diario.filter((r) => r.modo === m)
    const max = Math.max(...rows.map((r) => r.afluencia), 1)
    const p = predecirDia(rows, (r) => r.afluencia, fechaConsulta)
    return { modo: m, max, p }
  }), [modos, diario, fechaConsulta])

  const predLineas = useMemo(() => lineas.map((l) => {
    const rows = linea.filter((r) => r.linea === l)
    const p = predecirDia(rows, (r) => r.afluencia, fechaConsulta)
    const max = Math.max(...rows.map((r) => r.afluencia), 1)
    return p ? { linea: l, p, max } : null
  }).filter((x): x is { linea: string; p: PrediccionDia; max: number } => x !== null), [lineas, linea, fechaConsulta])

  const dowF = diaSemana(fechaConsulta)
  const mesF = Number(fechaConsulta.slice(5, 7)) - 1
  const anioCur = fechaConsulta.slice(0, 4)
  const anioPrev = `${Number(anioCur) - 1}`

  const focusRows = esMetro && lineaSel !== 'Todas'
    ? linea.filter((r) => r.linea === lineaSel).map((r) => ({ fecha: r.fecha, afluencia: r.afluencia }))
    : daily.map((r) => ({ fecha: r.fecha, afluencia: r.afluencia }))
  const focusPred = predecirDia(focusRows, (r) => r.afluencia, fechaConsulta)
  const maxFocus = Math.max(...focusRows.map((r) => r.afluencia), 1)

  const rankingSistemas = prediccionesModo.map((s) => (s.p ? {
    modo: s.modo,
    frac: s.p.prediccion / s.max,
    rel: (s.p.prediccion / s.p.promedio - 1) * 100,
    pred: s.p.prediccion,
  } : null)).filter((x): x is { modo: string; frac: number; rel: number; pred: number } => x !== null)
    .sort((a, b) => a.frac - b.frac)

  const variablesSistemas = prediccionesModo.map((s) => (s.p ? {
    modo: s.modo,
    pronostico: (s.p.prediccion / s.p.promedio - 1) * 100,
    dia: (s.p.factorDiaSemana - 1) * 100,
    mes: (s.p.factorMes - 1) * 100,
    ano: (s.p.factorAno - 1) * 100,
  } : null)).filter((x): x is { modo: string; pronostico: number; dia: number; mes: number; ano: number } => x !== null)
  const cuan = (arr: number[]) => arr.filter((v) => v >= 0).length

  const presionSerie = (s: StatsSerie, valor: number, fecha: string) => {
    const dow = diaSemana(fecha)
    const mediaDow = media(s.porDia[dow])
    const mediaVieja = media(s.porDia.slice(1, 6).flat())
    const mediaFinde = media([...s.porDia[0], ...s.porDia[6]])
    const fraccion = valor / (s.max || 1)
    const delta = mediaDow ? ((valor / mediaDow) - 1) * 100 : null
    return { valor, mediaDow, mediaVieja, mediaFinde, fraccion, delta, dow }
  }

  const presionLinea = (nombre: string, fecha: string) => {
    const s = statsLinea.get(nombre)
    const valor = lineaDiario.get(`${fecha}|${nombre}`)
    return s && valor !== undefined ? presionSerie(s, valor, fecha) : null
  }

  const presionModo = (nombre: string, fecha: string) => {
    const s = statsModo.get(nombre)
    const valor = modoDiario.get(`${fecha}|${nombre}`)
    return s && valor !== undefined ? presionSerie(s, valor, fecha) : null
  }

  const candidatos = CORREDORES
    .map((c) => ({ ...c, p: presionLinea(c.linea, fechaConsulta) }))
    .filter((c): c is { linea: string; ruta: string; zonas: string[]; p: NonNullable<ReturnType<typeof presionLinea>> } => c.p !== null)
    .filter((c) => c.zonas.includes(origen) && c.zonas.includes(destino))
    .sort((a, b) => a.p.fraccion - b.p.fraccion)

  const pMetroHoy = presionModo('Metro', ultimaFecha)
  let topSaturada: { linea: string; fraccion: number } | null = null
  for (const l of lineas) {
    const p = presionLinea(l, ultimaFecha)
    if (p && (!topSaturada || p.fraccion > topSaturada.fraccion)) topSaturada = { linea: l, fraccion: p.fraccion }
  }

  const tipoHistorico = esMetro && lineaSel === 'Todas' ? 'todo el Metro' : esMetro ? lineaLegible() : modo === 'Todos' ? 'todos los sistemas' : modo
  function lineaLegible() {
    return lineaSel.replace('Linea ', 'Línea ')
  }

  const laboralPorSistema = useMemo(() => {
    return modos.slice(1).map((m) => {
      const p = perfilSemana(diario.filter((r) => r.modo === m), (r) => r.afluencia)
      const lab = media([p[1], p[2], p[3], p[4], p[5]])
      const finde = media([p[0], p[6]])
      return { modo: m, lab, finde, laboral: lab > 1 && finde < 1 }
    }).sort((a, b) => b.lab - a.lab)
  }, [modos, diario])

  const patrones = useMemo(() => {
    const lab = media([perfil[1], perfil[2], perfil[3], perfil[4], perfil[5]])
    const finde = media([perfil[0], perfil[6]])
    const out: string[] = []
    if (lab > 1 && finde < 1) out.push(`Entre semana la demanda supera el promedio (×${lab.toFixed(2)}) y el fin de semana queda por debajo (×${finde.toFixed(2)}): el patrón laboral domina.`)
    else out.push(`La semana oscila entre ×${Math.min(...perfil).toFixed(2)} y ×${Math.max(...perfil).toFixed(2)}; no hay un ciclo laboral claro.`)
    const picoDia = perfil.indexOf(Math.max(...perfil))
    const flojoDia = perfil.indexOf(Math.min(...perfil))
    out.push(`El ${DIAS[picoDia]} concentra la mayor demanda (×${perfil[picoDia].toFixed(2)}); el ${DIAS[flojoDia]} la menor (×${perfil[flojoDia].toFixed(2)}).`)
    const mesPico = indices.indexOf(Math.max(...indices))
    const mesBajo = indices.indexOf(Math.min(...indices))
    out.push(`En el año, el mes más intenso es ${MESES[mesPico]} (×${indices[mesPico].toFixed(2)}) y el más flojo ${MESES[mesBajo]} (×${indices[mesBajo].toFixed(2)}).`)
    const anom = anomalias[0]
    if (anom) out.push(`El día más atípico es ${fmtFecha(anom.fecha)}: ${fmtPct((anom.afluencia / anom.esperado - 1) * 100)} sobre lo esperado, con z ${Math.abs(anom.z).toFixed(1)}.`)
    out.push(`Tendencia de largo plazo: ${tendenciaEtiqueta}; cambia ${fmtNum(Math.abs(regresion.pendiente))} viajes/mes (R² ${(regresion.r2 * 100).toFixed(0)}%).`)
    return out
  }, [perfil, indices, anomalias, tendenciaEtiqueta, regresion])

  const filasCrecimiento = resumenSistemas.map((s) => {
    const a = mediaPeriodo.uno[s.modo]
    const b = mediaPeriodo.dos[s.modo]
    return a !== undefined && b !== undefined ? { modo: s.modo, a, b, ch: (b / a - 1) * 100 } : null
  }).filter((f): f is { modo: string; a: number; b: number; ch: number } => f !== null)
    .filter((f) => !excluidos.includes(f.modo))
  const maxAbsCh = Math.max(...filasCrecimiento.map((f) => Math.abs(f.ch)), 1)

  const barSistema = (total: number) => `${Math.max(6, Math.sqrt(total / maxSistemaTotal) * 100).toFixed(1)}%`

  if (loading) return <div className="data-state">Cargando datos de movilidad CDMX...</div>
  if (error) return <div className="data-state error">No se pudieron cargar los datos: {error}</div>

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <nav className="main-nav">
          <span className="nav-label">HERRAMIENTAS</span>
          {([['Datos', Database], ['Planificador', Route], ['Monitor', Gauge], ['Patrones', Zap]] as const).map(([label, Icon]) => (
            <button className={`nav-item ${nav === label ? 'active' : ''}`} key={label} onClick={() => setNav(label)}><Icon size={17} />{label}</button>
          ))}
          <span className="nav-label second">ANÁLISIS</span>
          <button className={`nav-item ${nav === 'Comparativas' ? 'active' : ''}`} onClick={() => setNav('Comparativas')}><Scale size={17} />Comparativas</button>
          <button className={`nav-item ${nav === 'Metodología' ? 'active' : ''}`} onClick={() => setNav('Metodología')}><FileText size={17} />Metodología</button>
        </nav>
      </aside>

      <main className="content">
        <div className="page-inner">

          {nav === 'Datos' ? (
            <>
              <section className="heading-row">
                <div>
                  <h2 className="head-h2">Los datos con los que trabajamos</h2>
                  <p className="head-p">Siete sistemas de transporte de la CDMX con registro diario de pasajeros. Aquí definimos las variables con las que se explican todas las demás vistas.</p>
                </div>
              </section>

              <section className="cont-grid">
                {resumenSistemas.map((s) => (
                  <article className="cont-card" key={s.modo}>
                    <div className="cont-head"><strong>{s.modo}</strong><span>{fmtFull.format(s.dias)} días</span></div>
                    <div className="cont-total">{fmtNum(s.total)} <small>viajes</small></div>
                    <div className="cont-bar"><div style={{ width: barSistema(s.total) }} /></div>
                    <div className="cont-foot"><span>{s.inicio.slice(0, 4)}–{s.fin.slice(0, 4)}</span><span>pico {fmtNum(s.pico)}</span></div>
                  </article>
                ))}
              </section>

              <section className="main-grid">
                <Panel titulo="Variables y comparaciones del análisis" descripcion="la base de todas las demás vistas">
                  <div className="method-text">
                    <p>Medimos la afluencia diaria de cada sistema. Sobre ese dato construimos unas pocas variables simples (entre 0 y 1, o en porcentaje), justo para poder comparar sistemas de tamaños muy distintos:</p>
                    <ul>
                      <li><b>Presión:</b> viajes del día ÷ máximo histórico del sistema. Dice cuánto se llena cada uno respecto a su propio récord; enciende el semáforo y ordena las opciones.</li>
                      <li><b>Índice de día de la semana:</b> promedio del día ÷ promedio general. Un día normal vale ×1.00; si el lunes vale ×1.23, ese día se viaja 23% más de lo habitual. Así se ve el ciclo laboral.</li>
                      <li><b>Índice de mes:</b> promedio del mes ÷ promedio anual. Muestra las temporadas altas y bajas del año.</li>
                      <li><b>Tendencia:</b> la pendiente de la recta ajustada a los totales mensuales (con su R²): dice si la demanda crece, se mantiene o cae con los años.</li>
                      <li><b>Z-score:</b> cuántas desviaciones se aleja un día de lo esperado para su propio día de la semana; z ≥ 2.5 es un día atípico.</li>
                      <li><b>Crecimiento:</b> (periodo2 − periodo1) ÷ periodo1: el cambio porcentual de un periodo a otro, por sistema.</li>
                    </ul>
                    <p>Estas son las comparaciones que hacemos con esas variables:</p>
                    <ul>
                      <li><b>Un periodo contra otro</b> (por ejemplo 2025 vs 2026) por volumen mensual.</li>
                      <li><b>Sistemas frente a frente</b> en el mismo periodo, cada uno como % de su propio máximo.</li>
                      <li><b>Cada día contra su histórico</b> del mismo día de la semana.</li>
                      <li><b>Lo que va del año</b> contra el tramo equivalente del año anterior.</li>
                    </ul>
                    <p className="disclaimer">Las vistas siguientes usan únicamente estas variables, ya presentadas aquí.</p>
                  </div>
                </Panel>
                <Panel titulo="Detalle por línea del Metro" descripcion="las 12 líneas por volumen total">
                  <div className="linea-list">
                    {resumenLineas.map((l) => (
                      <div className="linea-row" key={l.linea}>
                        <strong>{tlg(l.linea)}</strong>
                        <div className="linea-track"><div style={{ width: `${(l.total / maxLineaTotal) * 100}%` }} /></div>
                        <b>{fmtNum(l.total)}</b>
                      </div>
                    ))}
                  </div>
                </Panel>
              </section>
            </>
          ) : null}

          {nav === 'Planificador' ? (
            <>
              <section className="heading-row">
                <div>
                  <h2 className="head-h2">¿Qué línea me conviene tomar hoy?</h2>
                  <p className="head-p">Elige origen y destino por zona. Cada opción se ordena con la variable <b>presión</b> (afluencia ÷ máximo histórico) que definimos en Datos, de la menos a la más llena.</p>
                </div>
                <div className="tool-actions">
                  <span className="meta-note">hoy {DIAS[hoyDow]}</span>
                  <label className="date-chip"><CalendarRange size={15} /><span className="date-esp">{fmtFecha(fechaConsulta)}</span><input type="date" className="date-native" min={minFecha || '2005-01-01'} max={ultimaFecha} value={fechaConsulta} onChange={(e) => setFechaSel(e.target.value)} /></label>
                </div>
              </section>

              <section className="zone-picker">
                <div className="zone-group"><span className="zone-label"><MapPin size={14} /> ORIGEN</span>
                  {ZONAS.map((z) => (
                    <button key={z} type="button" className={`zone-chip ${origen === z ? 'active' : ''}`} onClick={() => setOrigen(z)}>{z}</button>
                  ))}
                </div>
                <ArrowLeftRight size={17} className="zone-arrow" />
                <div className="zone-group"><span className="zone-label"><MapPin size={14} /> DESTINO</span>
                  {ZONAS.map((z) => (
                    <button key={z} type="button" className={`zone-chip ${destino === z ? 'active' : ''}`} onClick={() => setDestino(z)}>{z}</button>
                  ))}
                </div>
              </section>

              <section className="corridor-head">
                <strong>{origen} → {destino}</strong>
                <span>{fmtFecha(fechaConsulta, true)}</span>
              </section>

              <section className="main-grid">
                <Panel titulo="Opciones" descripcion="corredores de menor a mayor presión">
                  {candidatos.length ? (
                    <div className="corridor-list">
                      {candidatos.slice(0, 3).map((c, i) => (
                        <div className={`corridor-row ${i === 0 ? 'top' : ''}`} key={c.linea}>
                          <div className="corridor-badge">{i + 1}</div>
                          <div className="corridor-main"><strong>{tlg(c.linea)}</strong><small>{c.ruta}</small></div>
                          <div className="corridor-meter">
                            <Meter fraccion={c.p.fraccion} />
                            <div className="corridor-labels"><span>{nivel(c.p.fraccion).etiqueta} · {(c.p.fraccion * 100).toFixed(0)}%</span></div>
                          </div>
                          <div className="corridor-delta">
                            <b className={c.p.delta !== null && c.p.delta >= 0 ? 'negative' : 'positive'}>{c.p.delta === null ? '—' : fmtPct(c.p.delta)}</b>
                            <small>vs {DIAS[c.p.dow]} habitual</small>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="empty-note">Sin corredor de Metro directo entre {origen} y {destino}; considera un transbordo.</p>
                  )}
                </Panel>
                <Panel titulo="Recomendación" descripcion="menor presión, viaje más holgado">
                  {candidatos.length ? (
                    <div className="method-text">
                      <p><b>Hoy conviene:</b> {tlg(candidatos[0].linea)} — presión {(candidatos[0].p.fraccion * 100).toFixed(0)}%, {fmtPct(candidatos[0].p.delta ?? 0)} vs su {DIAS[candidatos[0].p.dow]} habitual.</p>
                      <p><b>Evita:</b> {tlg(candidatos[candidatos.length - 1].linea)}, al {(candidatos[candidatos.length - 1].p.fraccion * 100).toFixed(0)}% de su máximo.</p>
                      <p className="disclaimer">Entre semana la demanda sube; en fin de semana baja.</p>
                    </div>
                  ) : (
                    <div className="method-text">
                      {origen === destino ? <p className="disclaimer">Origen y destino son la misma zona; elige una distinta.</p> : <p><b>Sin corredor directo:</b> presión de cada sistema para {fmtFecha(fechaConsulta)}.</p>}
                      <div className="meter-list">
                        {modos.slice(1).map((m) => {
                          const pm = presionModo(m, fechaConsulta)
                          return pm ? (
                            <div className="meter-row" key={m}>
                              <div className="meter-name"><strong>{m}</strong><small>{fmtNum(pm.valor)} viajes</small></div>
                              <Meter fraccion={pm.fraccion} />
                            </div>
                          ) : null
                        })}
                      </div>
                      <p className="disclaimer">Presión = demanda del día ÷ máximo histórico.</p>
                    </div>
                  )}
                </Panel>
              </section>
            </>
          ) : null}

          {nav === 'Monitor' ? (
            <>
              <section className="heading-row">
                <div>
                  <h2 className="head-h2">¿Cómo estará hoy la demanda de {tipoHistorico}?</h2>
                  <p className="head-p">Pronóstico para {fmtFecha(fechaConsulta)} que combina las variables que vimos en Datos: el promedio, el día de la semana, la estacionalidad del mes y lo que va de {anioCur} frente a {anioPrev}.</p>
                </div>
                <div className="tool-actions">
                  <span className="meta-note">hoy {DIAS[hoyDow]}</span>
                  <label className="date-chip"><CalendarRange size={15} /><span className="date-esp">{fmtFecha(fechaConsulta)}</span><input type="date" className="date-native" min={minFecha || '2005-01-01'} max={ultimaFecha} value={fechaConsulta} onChange={(e) => setFechaSel(e.target.value)} /></label>
                </div>
              </section>

              <section className="ctrl-bar">
                <label className="ctrl-field"><span>Sistema</span>
                  <select value={modo} onChange={(e) => { setModo(e.target.value); setLineaSel('Todas') }}>
                    {modos.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                {esMetro ? (
                  <label className="ctrl-field"><span>Línea</span>
                    <select value={lineaSel} onChange={(e) => setLineaSel(e.target.value)}>
                      <option>Todas</option>
                      {lineas.map((l) => <option key={l}>{tlg(l)}</option>)}
                    </select>
                  </label>
                ) : null}
              </section>

              {focusPred ? (
                <>
                  <section className="stats-grid">
                    <StatCard titulo={`Pronóstico · ${fmtFecha(fechaConsulta)}`} valor={fmtNum(focusPred.prediccion)} cambio={(focusPred.prediccion / focusPred.promedio - 1) * 100} cambioTexto={`vs promedio histórico ${fmtNum(focusPred.promedio)}/día`} icono={<Activity size={17} />} />
                    <StatCard titulo={`Día ${DIAS[dowF]}`} valor={fmtPct((focusPred.factorDiaSemana - 1) * 100)} cambio={(focusPred.factorDiaSemana - 1) * 100} cambioTexto={`×${focusPred.factorDiaSemana.toFixed(2)} vs el promedio`} icono={<TrendingUp size={17} />} />
                    <StatCard titulo={`Mes ${MESES[mesF]}`} valor={fmtPct((focusPred.factorMes - 1) * 100)} cambio={(focusPred.factorMes - 1) * 100} cambioTexto={`×${focusPred.factorMes.toFixed(2)} por temporada`} icono={<TrendingUp size={17} />} />
                    <StatCard titulo={`${anioCur} vs ${anioPrev}`} valor={fmtPct((focusPred.factorAno - 1) * 100)} cambio={(focusPred.factorAno - 1) * 100} cambioTexto="lo que va del año" icono={<TrendingUp size={17} />} />
                  </section>

                  <section className="main-grid">
                    <Panel titulo="Por qué este número" descripcion="predicción = promedio × día × mes × año">
                      <div className="method-text">
                        <p><b>El {DIAS[dowF]} es un día {focusPred.factorDiaSemana >= 1 ? 'por encima' : 'por debajo'} del promedio (×{focusPred.factorDiaSemana.toFixed(2)}).</b> Es el factor que más pesa: el patrón laboral domina al fin de semana.</p>
                        <p><b>{MESES[mesF]} aporta ×{focusPred.factorMes.toFixed(2)}:</b> es un mes de demanda {focusPred.factorMes >= 1 ? 'alta' : 'baja'} en la temporada.</p>
                        <p><b>Este {anioCur} va {fmtPct((focusPred.factorAno - 1) * 100)} vs {anioPrev}:</b> la tendencia del año en curso corrige el pronóstico.</p>
                        <p className="disclaimer">Margen típico del {DIAS[dowF]}: ±{Math.round(focusPred.desviacionRel * 100)}%. Sin IA; solo descomposición estacional.</p>
                      </div>
                    </Panel>
                    <Panel titulo="Estado esperado" descripcion={focusPred.pronosticoMensual ? `y prolongación al próximo mes` : `presión pronosticada`}>
                      <Semaforo fraccion={focusPred.prediccion / maxFocus} />
                      <div className="kv2">
                        <div><span>Máximo histórico</span><b>{fmtNum(maxFocus)}</b></div>
                        <div><span>Presión prevista</span><b>{((focusPred.prediccion / maxFocus) * 100).toFixed(0)}% del máximo</b></div>
                        {focusPred.pronosticoMensual ? <div><span>Siguiente mes ({focusPred.pronosticoMensual.etiqueta})</span><b>{fmtNum(focusPred.pronosticoMensual.valor)} viajes</b></div> : null}
                      </div>
                    </Panel>
                  </section>

                  <section className="main-grid">
                    <section className="panel">
                      <div className="panel-header"><div><h2>¿Qué nos conviene usar?</h2><p>menor presión pronosticada para {fmtFecha(fechaConsulta)}</p></div></div>
                      {rankingSistemas.length ? (
                        <>
                          <p className="method-text"><b>Lo más holgado:</b> {tlg(rankingSistemas[0].modo)}, al {Math.min(rankingSistemas[0].frac, 1) * 100}% de su máximo ({fmtPct(rankingSistemas[0].rel)} vs su promedio). <b style={{ fontWeight: 600 }}>A evitar: </b>{tlg(rankingSistemas[rankingSistemas.length - 1].modo)}.</p>
                          <div className="corridor-list">
                            {rankingSistemas.map((r, i) => (
                              <div className={`corridor-row ${i === 0 ? 'top' : ''}`} key={r.modo}>
                                <div className="corridor-badge">{i + 1}</div>
                                <div className="corridor-main"><strong>{tlg(r.modo)}</strong><small>pronóstico {fmtNum(r.pred)} viajes</small></div>
                                <div className="corridor-meter"><Meter fraccion={r.frac} /><div className="corridor-labels"><span>presión prevista {(r.frac * 100).toFixed(0)}%</span></div></div>
                                <div className="corridor-delta"><b className={r.rel >= 0 ? 'negative' : 'positive'}>{fmtPct(r.rel)}</b><small>vs su promedio</small></div>
                              </div>
                            ))}
                          </div>
                        </>
                      ) : (
                        <p className="empty-note">Sin serie histórica para pronosticar.</p>
                      )}
                    </section>
                    <section className="panel">
                      <div className="panel-header"><div><h2>{esMetro ? 'Líneas del Metro' : 'Desglose por sistema'}</h2><p>presión pronosticada</p></div></div>
                      <div className="meter-list">
                        {(esMetro ? predLineas : prediccionesModo).map((item) => {
                          const nombre = 'linea' in item ? item.linea : item.modo
                          const pr = 'linea' in item ? item.p : item.p
                          if (!pr) return null
                          const frac = pr.prediccion / ('linea' in item ? item.max : item.max)
                          const rel = (pr.prediccion / pr.promedio - 1) * 100
                          return (
                            <div className="meter-row" key={nombre}>
                              <div className="meter-name"><strong>{tlg(nombre)}</strong><small>{fmtNum(pr.prediccion)}</small></div>
                              <Meter fraccion={frac} />
                              <b className={rel >= 0 ? 'negative' : 'positive'}>{fmtPct(rel)}</b>
                            </div>
                          )
                        })}
                      </div>
                    </section>
                  </section>

                  <Panel titulo="Qué sube y qué baja (todos los sistemas)" descripcion={`para ${fmtFecha(fechaConsulta)}: ${cuan(variablesSistemas.map((v) => v.dia))} de ${variablesSistemas.length} con día laboral al alza · ${cuan(variablesSistemas.map((v) => v.mes))} con mes al alza · ${cuan(variablesSistemas.map((v) => v.ano))} con año al alza`}>
                    <div className="prev">
                      <div className="prev-head"><span>Sistema</span><span>Pronóstico vs promedio</span><span>Efecto del día</span><span>Efecto del mes</span><span>Este año vs anterior</span></div>
                      {variablesSistemas.map((v) => (
                        <div className="prev-row" key={v.modo}>
                          <div className="prev-name"><strong>{v.modo}</strong></div>
                          <b className={`prev-val ${v.pronostico >= 0 ? 'prev-up' : 'prev-down'}`}>{v.pronostico >= 0 ? '↑' : '↓'} {fmtPct(v.pronostico)}</b>
                          <b className={`prev-val ${v.dia >= 0 ? 'prev-up' : 'prev-down'}`}>{v.dia >= 0 ? '↑' : '↓'} {fmtPct(v.dia)}</b>
                          <b className={`prev-val ${v.mes >= 0 ? 'prev-up' : 'prev-down'}`}>{v.mes >= 0 ? '↑' : '↓'} {fmtPct(v.mes)}</b>
                          <b className={`prev-val ${v.ano >= 0 ? 'prev-up' : 'prev-down'}`}>{v.ano >= 0 ? '↑' : '↓'} {fmtPct(v.ano)}</b>
                        </div>
                      ))}
                    </div>
                    <p className="disclaimer" style={{ marginTop: 10 }}>↑ = variable por encima de su promedio; ↓ = por debajo. Útil para ver qué sistemas crecen y cuáles se contraen.</p>
                  </Panel>
                </>
              ) : (
                <Panel titulo="Sin serie para pronosticar">
                  <p className="empty-note">No hay histórico de {modo} para {fmtFecha(fechaConsulta) || 'la fecha elegida'}.</p>
                </Panel>
              )}
            </>
          ) : null}

          {nav === 'Patrones' ? (
            <>
              <section className="heading-row">
                <div>
                  <h2 className="head-h2">Patrones y anomalías</h2>
                  <p className="head-p">Aplicamos los índices de día de la semana y de mes, el z-score y la tendencia que definimos en Datos a {tipoHistorico}.</p>
                </div>
              </section>

              <section className="ctrl-bar">
                <label className="ctrl-field"><span>Sistema</span>
                  <select value={modo} onChange={(e) => { setModo(e.target.value); setLineaSel('Todas') }}>
                    {modos.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                {esMetro ? (
                  <label className="ctrl-field"><span>Línea</span>
                    <select value={lineaSel} onChange={(e) => setLineaSel(e.target.value)}>
                      <option>Todas</option>
                      {lineas.map((l) => <option key={l}>{tlg(l)}</option>)}
                    </select>
                  </label>
                ) : null}
              </section>

              <Panel titulo="Patrones detectados" descripcion={`lectura automática de la serie · ${tipoHistorico}`}>
                <div className="hallazgos">
                  {patrones.map((t, i) => (
                    <div key={i}><span>{i + 1}</span><p>{t}</p></div>
                  ))}
                </div>
              </Panel>

              <section className="main-grid">
                <Panel titulo="Perfil de la semana" descripcion="×1.00 = día promedio">
                  <div className="bars">
                    {perfil.map((v, i) => (
                      <div className="bar-col" key={i}>
                        <div className="bar-zone">
                          <div className={`bar-top ${i === 0 || i === 6 ? 'weekend' : ''}`} style={{ height: `${(v / maxPerfil) * 100}%` }} />
                          <div className="bar-av" style={{ bottom: `${(1 / maxPerfil) * 100}%` }} />
                        </div>
                        <span className="bar-val">×{v.toFixed(2)}</span>
                        <span className="bar-tag">{DIAS[i].slice(0, 3)}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
                <Panel titulo="Estacionalidad por mes" descripcion="×1.00 = promedio">
                  <div className="bars">
                    {indices.map((v, i) => (
                      <div className="bar-col" key={i}>
                        <div className="bar-zone">
                          <div className={`bar-top ${v >= 1 ? 'alto' : ''}`} style={{ height: `${(v / maxIndice) * 100}%` }} />
                          <div className="bar-av" style={{ bottom: `${(1 / maxIndice) * 100}%` }} />
                        </div>
                        <span className="bar-val">×{v.toFixed(2)}</span>
                        <span className="bar-tag">{MESES[i]}</span>
                      </div>
                    ))}
                  </div>
                </Panel>
              </section>

              <Panel titulo="Semana laboral por sistema" descripcion={`×1.00 = promedio del sistema · ${tipoHistorico}`}>
                <div className="lab-head"><span>Sistema</span><span>Lunes–Viernes</span><span>Sábado–Domingo</span><span>Lectura</span></div>
                <div className="lab-list">
                  {laboralPorSistema.map((s) => (
                    <div className="lab-row" key={s.modo}>
                      <strong>{s.modo}</strong>
                      <b>{s.lab.toFixed(2)}</b>
                      <b>{s.finde.toFixed(2)}</b>
                      <span>{s.laboral ? 'Entre semana sobre el promedio; fin de semana por debajo.' : 'Configuración poco laboral.'}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel titulo="Días más atípicos" descripcion="z-score ≥ 2.5 vs el mismo día de la semana">
                {anomalias.length ? (
                  <div className="anom-list">
                    {anomalias.map((a) => {
                      const pct = a.esperado ? (a.afluencia / a.esperado - 1) * 100 : null
                      return (
                        <div className="anom-row" key={a.fecha}>
                          <div className="anom-date"><strong>{fmtFecha(a.fecha)}</strong><span>{DIAS[diaSemana(a.fecha)].slice(0, 3)}</span></div>
                          <div className="anom-track"><div style={{ width: `${(Math.abs(a.z) / maxAnomZ) * 100}%` }} /></div>
                          <div className="anom-nums"><b>{fmtNum(a.afluencia)}</b><span>esp. {fmtNum(a.esperado)} · z {a.z.toFixed(1)}</span></div>
                          <b className={a.z >= 0 ? 'negative' : 'positive'}>{pct === null ? '—' : fmtPct(pct)}</b>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <p className="empty-note">Sin anomalías con umbral 2.5 en este histórico.</p>
                )}
              </Panel>
            </>
          ) : null}

          {nav === 'Comparativas' ? (
            <>
              <section className="heading-row">
                <div>
                  <h2 className="head-h2">Cómo cambió la demanda</h2>
                  <p className="head-p">Aquí se combinan las variables del crecimiento entre periodos y la participación, definidas en Datos: un periodo contra otro y varios sistemas en un mismo periodo.</p>
                </div>
              </section>

              <section className="stats-head">
                <span>ENFOCAR</span>
                <label className="ctrl-field"><span>Sistema</span>
                  <select value={modo} onChange={(e) => { setModo(e.target.value); setLineaSel('Todas') }}>
                    {modos.map((m) => <option key={m}>{m}</option>)}
                  </select>
                </label>
                {esMetro ? (
                  <label className="ctrl-field"><span>Línea</span>
                    <select value={lineaSel} onChange={(e) => setLineaSel(e.target.value)}>
                      <option>Todas</option>
                      {lineas.map((l) => <option key={l}>{tlg(l)}</option>)}
                    </select>
                  </label>
                ) : null}
              </section>

              <section className="periodos2">
                <div className="padre-box"><span className="p-label">PERIODO 1</span><PeriodoPicker value={per1} onChange={setPer1} anios={anios} /></div>
                <span className="vs-pill">VS</span>
                <div className="padre-box"><span className="p-label">PERIODO 2</span><PeriodoPicker value={per2} onChange={setPer2} anios={anios} /></div>
                <span className="periodo-note">{etiqueta(per1)} vs {etiqueta(per2)}</span>
              </section>

              <section className="main-grid">
                <Panel titulo="Comparación de periodos" descripcion={`meses del año alineados · ${tipoHistorico}`}>
                  <>
                    <SeriesChart values={alineadoPeriodos.v1} labels={alineadoPeriodos.labels} overlays={[{ values: alineadoPeriodos.v2, stroke: '#6aa5f0' }]} unit="viajes" />
                    <div className="multi-legend">
                      <span><i style={{ background: '#d9a05b' }} />{etiqueta(per1)}</span>
                      <span><i style={{ background: '#6aa5f0' }} />{etiqueta(per2)}</span>
                    </div>
                  </>
                </Panel>
                <Panel titulo="Tendencia de largo plazo" descripcion="regresión sobre toda la serie">
                  <div className="kv2">
                    <div><span>Pendiente</span><b>{fmtNum(Math.abs(regresion.pendiente))} /mes</b></div>
                    <div><span>Ajuste (R²)</span><b>{(regresion.r2 * 100).toFixed(0)}%</b></div>
                    <div><span>Lectura</span><b>{tendenciaEtiqueta}</b></div>
                  </div>
                </Panel>
              </section>

              <Panel titulo="Comparación entre sistemas" descripcion={perSis.mes ? 'demanda total del mes, en volumen (cada sistema mide su propio dato)' : 'ritmo relativo: cada sistema como % de su propio máximo (no es volumen)'}>
                <>
                  <div className="chart-period">
                    <PeriodoPicker value={perSis} onChange={setPerSis} anios={anios} />
                  </div>
                  <div className="chips-row">
                    {resumenSistemas.map((s) => (
                      <button key={s.modo} className={`chip ${!excluidos.includes(s.modo) ? 'on' : ''}`} onClick={() => toggleExcluir(s.modo)}>{s.modo}</button>
                    ))}
                  </div>
                  {perSis.mes ? (
                    mesSistemas.length ? (
                      <div className="sys-month">
                        {mesSistemas.map((s) => (
                          <div className="sys-row" key={s.modo}>
                            <strong>{s.modo}</strong>
                            <div className="linea-track"><div style={{ width: `${(s.total / maxMesSistema) * 100}%` }} /></div>
                            <b>{fmtNum(s.total)}</b>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="empty-note">Marca al menos un sistema.</p>
                    )
                  ) : serieSis.length ? (
                    <>
                      <SeriesChart values={serieSis[0].values} labels={serieSis[0].labels} overlays={serieSis.slice(1).map((s) => ({ values: s.values, stroke: s.color }))} unit="% del propio máximo" />
                      <div className="multi-legend">
                        {serieSis.map((s) => (
                          <span key={s.modo}><i style={{ background: s.color }} />{s.modo}</span>
                        ))}
                      </div>
                    </>
                  ) : (
                    <p className="empty-note">Marca al menos un sistema.</p>
                  )}
                </>
              </Panel>

              <Panel titulo="Crecimiento por sistema" descripcion={`${etiqueta(per1)} → ${etiqueta(per2)}`}>
                <div className="growth-list">
                  {filasCrecimiento.map((f) => (
                    <div className="growth-row" key={f.modo}>
                      <strong>{f.modo}</strong>
                      <div className="growth-track"><div className={f.ch >= 0 ? 'up' : 'down'} style={{ width: `${(Math.abs(f.ch) / maxAbsCh) * 100}%` }} /></div>
                      <b className={f.ch >= 0 ? 'positive' : 'negative'}>{fmtPct(f.ch)}</b>
                      <span>{fmtNum(f.a)} → {fmtNum(f.b)}</span>
                    </div>
                  ))}
                </div>
              </Panel>

              <Panel titulo="Perfil por sistema" descripcion={`variables distintas al volumen · periodo ${etiqueta(perSis)} y crecimiento ${etiqueta(per1)} → ${etiqueta(per2)}`}>
                <div className="compv">
                  <div className="compv-head"><span>Sistema</span><span>Participación en el periodo</span><span>% total</span><span>Fin de semana ×</span><span>Crec. promedio</span></div>
                  {activosP.length ? activosP.map((s) => (
                    <div className="compv-row" key={s.modo}>
                      <div className="compv-name"><strong>{s.modo}</strong><small>{fmtNum(s.intens)} viajes/día</small></div>
                      <div className="linea-track"><div style={{ width: `${(s.total / maxActivoP) * 100}%` }} /></div>
                      <b>{sumaActivos ? ((s.total / sumaActivos) * 100).toFixed(1) : '—'}%</b>
                      <b>{s.finde.toFixed(2)}</b>
                      <b className={s.ch !== null && s.ch >= 0 ? 'positive' : 'negative'}>{s.ch === null ? '—' : fmtPct(s.ch)}</b>
                    </div>
                  )) : (
                    <p className="empty-note">Marca al menos un sistema.</p>
                  )}
                </div>
              </Panel>
            </>
          ) : null}

          {nav === 'Metodología' ? (
            <>
              <section className="heading-row">
                <div>
                  <h2 className="head-h2">Cómo se construyó y cómo se usa</h2>
                  <p className="head-p">Cada vista solo combina las variables presentadas en Datos. Aquí está el proceso completo y los hallazgos verificables del proyecto.</p>
                </div>
              </section>

              <section className="met-grid">
                <div className="met-card">
                  <h3>Problema</h3>
                  <p>Los datos abiertos de afluencia no dicen por sí solos qué conviene usar ni si el tráfico sube o baja. El objetivo es convertir millones de registros en dos decisiones sencillas: <b>qué línea tomar</b> y <b>cuándo hay más tráfico</b>.</p>
                </div>

                <div className="met-card">
                  <h3>Datos</h3>
                  <p>Afluencia diaria publicada por SEMOVI (datos.cdmx.gob.mx, CC-BY-4.0): Metro por línea, estación y día; y Metrobús, Ecobici, RTP, Tren Ligero, Cablebús y Trolebús por día.</p>
                </div>

                <div className="met-card">
                  <h3>Proceso</h3>
                  <ol>
                    <li>Limpieza y normalización de nombres; se agregan ~74 mil filas diarias.</li>
                    <li>Presión (demanda ÷ máximo histórico) para semaforizar y ordenar.</li>
                    <li>Perfil semanal, estacionalidad y z-scores para patrones y anomalías.</li>
                    <li>Regresión lineal para la tendencia de largo plazo.</li>
                    <li>Comparación por periodos y entre sistemas.</li>
                    <li>Recomendación de corredor por zonas.</li>
                  </ol>
                </div>

                <div className="met-card">
                  <h3>Herramientas</h3>
                  <p>React + TypeScript + Vite para la interfaz; la estadística vive en <code>src/analysis.ts</code> sin IA.</p>
                </div>

                <div className="met-card wide">
                  <h3>Hallazgos (verificables)</h3>
                  <div className="hallazgos">
                    <div><span>1</span><p><b>Tendencia:</b> la serie de {tipoHistorico} cambia {fmtNum(Math.abs(regresion.pendiente))} pasajeros/mes (R² {(regresion.r2 * 100).toFixed(0)}%): <b>{tendenciaEtiqueta}</b>.</p></div>
                    <div><span>2</span><p><b>Periodos:</b> {etiqueta(per1)} movió {fmtNum(stat1.total)} y {etiqueta(per2)} {fmtNum(stat2.total)}: <b>{fmtPct(crecimientoGeneral)}</b>.</p></div>
                    <div><span>3</span><p><b>Saturación de punta:</b> en {fmtFecha(ultimaFecha)} la línea más presionada fue <b>{topSaturada ? tlg(topSaturada.linea) : '—'}</b>, al {(topSaturada?.fraccion ?? 0) * 100}% de su máximo.</p></div>
                    {pMetroHoy ? <div><span>4</span><p><b>Demanda laboral:</b> el Metro mueve {fmtNum(pMetroHoy.mediaVieja)} en día hábil vs {fmtNum(pMetroHoy.mediaFinde)} en fin de semana.</p></div> : null}
                  </div>
                </div>

                <div className="met-card">
                  <h3>Conclusiones</h3>
                  <p>Base estadística reproducible para decidir el momento y el corredor de viaje, y para leer patrones, cambios y anomalías de la demanda. <b>Limitaciones:</b> la presión es un proxy de saturación (no hay tiempos ni GPS); la correlación no implica causalidad.</p>
                </div>
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  )
}

export default App