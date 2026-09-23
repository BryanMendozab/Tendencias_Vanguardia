#!/usr/bin/env node
// Descarga las fuentes CRUDAS (sin procesar) de movilidad CDMX a data/crudos/.
// Es la materia prima del pipeline; la app NUNCA lee estos archivos, solo lee
// los agregados limpios de public/data/metro/ (ver preprocess.mjs).
import { mkdir, writeFile, stat } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { SOURCES } from './sources.mjs'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const OUT = join(ROOT, 'data', 'crudos')

async function download(source) {
  const path = join(OUT, `${source.id}.csv`)
  try {
    const existing = await stat(path)
    if (existing.size > 0) {
      console.log(`[${source.id}] ya existe ${(existing.size / 1024 / 1024).toFixed(1)} MB (omito)`)
      return
    }
  } catch { /* no existe */ }
  console.log(`[${source.id}] descargando ${source.nombre}...`)
  const response = await fetch(source.url, { redirect: 'follow' })
  if (!response.ok) throw new Error(`${source.id}: HTTP ${response.status}`)
  const buffer = Buffer.from(await response.arrayBuffer())
  await writeFile(path, buffer)
  console.log(`[${source.id}] ok ${(buffer.length / 1024 / 1024).toFixed(1)} MB`)
}

async function main() {
  await mkdir(OUT, { recursive: true })
  for (const source of SOURCES) await download(source)
  console.log(`\nCrudos en ${OUT}`)
}

main().catch((error) => { console.error(error); process.exit(1) })