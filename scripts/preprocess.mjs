#!/usr/bin/env node
// Preprocesamiento del dataset de movilidad CDMX (SEMOVI, CC-BY-4.0).
// Descarga fuentes, limpia codificacion, agrega y emite archivos ligeros en public/data/metro/.
import { mkdir, readFile, writeFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCES } from './sources.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const TMP = join(ROOT, '.tmp-datos')
const OUT = join(ROOT, 'public', 'data', 'metro')

const MOJIBAKE = {
  'Ã¡': 'á', 'Ã©': 'é', 'Ã­': 'í', 'Ã³': 'ó', 'Ãº': 'ú', 'Ã±': 'ñ',
  'Ã¼': 'ü', 'Ã­Ã¡': 'ía', 'Ã°': 'ð', 'Ãª': 'ê', 'Ã ' : 'á',
  'â€™': "'", 'â€œ': '"', 'â€\u009d': '"',
}

function clean(text) {
  if (text === undefined || text === null) return ''
  let out = String(text)
  for (const [from, to] of Object.entries(MOJIBAKE)) out = out.split(from).join(to)
  return out.trim()
}

function stripBom(text) {
  return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text
}

function parseCsv(text) {
  const lines = stripBom(text).split(/\r?\n/)
  const result = []
  let row = []
  let current = ''
  let quoted = false
  const pushCell = () => { row.push(clean(current)); current = '' }

  const processLine = (i) => {
    while (i < lines.length) {
      const line = lines[i]
      for (let j = 0; j < line.length; j += 1) {
        const char = line[j]
        if (char === '"' && line[j + 1] === '"') { current += '"'; j += 1 }
        else if (char === '"') quoted = !quoted
        else if (char === ',' && !quoted) pushCell()
        else current += char
      }
      if (!quoted) {
        pushCell()
        if (row.some((cell) => cell !== '')) result.push(row)
        row = []
        return i + 1
      }
      current += '\n'
      i += 1
    }
    return i
  }

  let i = 0
  while (i < lines.length && i < 10000000) i = processLine(i)
  return result
}

async function download(id) {
  const source = SOURCES.find((s) => s.id === id)
  const path = join(TMP, `${id}.csv`)
  try {
    const existing = await stat(path)
    if (existing.size > 0) {
      console.log(`  [${id}] usa cache ${(existing.size / 1024 / 1024).toFixed(1)} MiB`)
      return existing.size
    }
  } catch { /* no cache */ }
  console.log(`  [${id}] descargando ${source.nombre}...`)
  const response = await fetch(source.url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`${id}: HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(path, buffer)
  console.log(`  [${id}] ok ${(buffer.length / 1024 / 1024).toFixed(1)} MiB`)
  return buffer.length
}

async function main() {
  await mkdir(TMP, { recursive: true })
  await mkdir(OUT, { recursive: true })

  console.log('Descarga de fuentes SEMOVI/CDMX...')
  for (const source of SOURCES) await download(source.id)

  console.log('\nProcesando...')
  const registro = {}

  // ---------- Metro ----------
  const metroRows = parseCsv(await readFile(join(TMP, 'metro.csv'), 'utf8'))
  const metroHeader = metroRows[0]
  const metroData = metroRows.slice(1)
  const idxFecha = metroHeader.indexOf('fecha')
  const idxLinea = metroHeader.indexOf('linea')
  const idxEstacion = metroHeader.indexOf('estacion')
  const idxAfluencia = metroHeader.indexOf('afluencia')
  // La fuente publica el mismo nombre de linea con y sin acento (y con Unicode
  // descompuesto: "Li\u0301nea"). Se normaliza a una sola grafia antes de agrupar.
  const nombreLinea = (valor) => clean(valor).normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()
  const byDate = new Map(); const byDateLinea = new Map(); const byKey = new Map()
  let metroN = 0
  for (const r of metroData) {
    const fecha = r[idxFecha]
    const aflu = Number(r[idxAfluencia])
    if (!fecha || !Number.isFinite(aflu)) continue
    metroN += 1
    if (!byDate.has(fecha)) byDate.set(fecha, 0)
    byDate.set(fecha, byDate.get(fecha) + aflu)
    const linea = nombreLinea(r[idxLinea])
    const lineaKey = `${fecha}|${linea}`
    byDateLinea.set(lineaKey, (byDateLinea.get(lineaKey) ?? 0) + aflu)
    const key = `${fecha}|${linea}|${r[idxEstacion]}`
    byKey.set(key, (byKey.get(key) ?? 0) + aflu)
  }
  const metroLineas = [...new Set(metroData.map((r) => nombreLinea(r[idxLinea])).filter(Boolean))].sort((a, b) => {
    const token = (nombre) => nombre.replace(/^Linea\s+/i, '')
    const esNum = (n) => n.trim() !== '' && Number.isInteger(Number(n))
    const ta = token(a); const tb = token(b)
    const na = esNum(ta); const nb = esNum(tb)
    if (na && nb) return Number(ta) - Number(tb)
    if (na && !nb) return -1
    if (!na && nb) return 1
    return ta.localeCompare(tb)
  })
  let metroLineaCsv = 'fecha,linea,afluencia\n'
  for (const [key, value] of [...byDateLinea.entries()].sort()) metroLineaCsv += `${key.split('|').join(',')},${value}\n`
  await writeFile(join(OUT, 'metro_linea_diario.csv'), metroLineaCsv)
  registro.metroLineaDiario = { filas: byDateLinea.size }

  // estacion-mensual
  const keys = [...byKey.keys()]
  const estacionMensual = new Map()
  for (const key of keys) {
    const [fecha, linea, estacion] = key.split('|')
    const mes = `${fecha.slice(0, 4)}-${fecha.slice(5, 7)}`
    const k = `${linea}|${estacion}|${mes}`
    estacionMensual.set(k, (estacionMensual.get(k) ?? 0) + byKey.get(key))
  }
  let estacionCsv = 'linea,estacion,anio,mes,afluencia\n'
  for (const [key, value] of [...estacionMensual.entries()].sort()) {
    const [linea, estacion, mes] = key.split('|')
    estacionCsv += `${linea},${estacion},${mes.slice(0, 4)},${mes.slice(5)},${value}\n`
  }
  await writeFile(join(OUT, 'metro_estacion_mensual.csv'), estacionCsv)
  registro.metroEstacionMensual = { filas: estacionMensual.size }

  // ---------- modo_diario (todos los modos) ----------
  const serieMetrobus = new Map()
  const mbSimple = parseCsv(await readFile(join(TMP, 'metrobus.csv'), 'utf8'))
  const mbHeader = mbSimple[0]
  const mbFecha = mbHeader.indexOf('fecha')
  let mbValor = mbHeader.findIndex((h) => /afluencia/i.test(h))
  if (mbValor === -1) mbValor = mbHeader.length - 1
  for (const r of mbSimple.slice(1)) {
    const fecha = r[mbFecha]; const v = Number(r[mbValor])
    if (fecha && Number.isFinite(v)) serieMetrobus.set(fecha, (serieMetrobus.get(fecha) ?? 0) + v)
  }
  registro.metrobus = { dias: [...serieMetrobus.keys()].length, minimo: [...serieMetrobus.keys()].sort()[0] }

  const series = new Map([['Metro', byDate]])
  series.set('Ecobici', new Map())
  const eco = parseCsv(await readFile(join(TMP, 'ecobici.csv'), 'utf8'))
  const ecoHeader = eco[0]
  const ecoFecha = ecoHeader.indexOf('fecha')
  const ecoViajes = ecoHeader.indexOf('viajes')
  for (const r of eco.slice(1)) {
    const fecha = r[ecoFecha]; const v = Number(r[ecoViajes])
    if (fecha && Number.isFinite(v)) series.get('Ecobici').set(fecha, (series.get('Ecobici').get(fecha) ?? 0) + v)
  }
  registro.ecobici = { filas: eco.length - 1, dias: series.get('Ecobici').size }
  series.set('Metrobús', serieMetrobus)

  for (const extra of [['rtp', 'RTP'], ['trenligero', 'Tren Ligero'], ['cablebus', 'Cablebús'], ['trolebus', 'Trolebús']]) {
    const [id, modo] = extra
    const filas = parseCsv(await readFile(join(TMP, `${id}.csv`), 'utf8'))
    const header = filas[0]
    const fechaIdx = header.indexOf('fecha')
    let valorIdx = header.findIndex((h) => /afluencia_total/i.test(h))
    if (valorIdx === -1) valorIdx = header.findIndex((h) => /afluencia/i.test(h))
    if (valorIdx === -1) valorIdx = header.length - 1
    const serie = new Map()
    for (const r of filas.slice(1)) {
      const fecha = r[fechaIdx]; const v = Number(r[valorIdx])
      if (fecha && Number.isFinite(v)) serie.set(fecha, (serie.get(fecha) ?? 0) + v)
    }
    series.set(modo, serie)
    registro[id] = { filas: filas.length - 1, dias: serie.size }
  }

  const todasFechas = new Set()
  for (const serie of series.values()) for (const fecha of serie.keys()) todasFechas.add(fecha)
  const fechasOrdenadas = [...todasFechas].sort()

  let modoCsv = 'fecha,modo,afluencia\n'
  for (const fecha of fechasOrdenadas) {
    for (const [modo, serie] of series.entries()) {
      const v = serie.get(fecha)
      if (v !== undefined) modoCsv += `${fecha},${modo},${v}\n`
    }
  }
  await writeFile(join(OUT, 'modo_diario.csv'), modoCsv)
  registro.modoDiario = { filas: fechasOrdenadas.length * series.size, fechas: fechasOrdenadas.length, modos: [...series.keys()] }

  const metadatos = {
    proyecto: 'Movilidad CDMX - Big Data & Advanced Analytics',
    licencia: 'CC-BY-4.0-ESP',
    fuentePortal: 'https://datos.cdmx.gob.mx/',
    organizacion: 'Secretaría de Movilidad (SEMOVI)',
    generado: new Date().toISOString(),
    fuentes: SOURCES.map((s) => ({ id: s.id, nombre: s.nombre, organismo: s.organismo, url: s.url })),
    resumen: {
      metroFilasProcesadas: metroN,
      metroDias: byDate.size,
      metroLineas: metroLineas,
    },
    registro,
  }
  await writeFile(join(OUT, 'metadatos.json'), JSON.stringify(metadatos, null, 2))

  console.log('\nResumen:')
  console.log(JSON.stringify(registro, null, 2))
  console.log(`\nSalida en ${OUT}`)
}

main().catch((error) => { console.error(error); process.exit(1) })