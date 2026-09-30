// Respaldo de la base de datos con pg_dump (formato personalizado, comprimido), conservando los
// últimos RESPALDO_CONSERVAR archivos (14 por defecto).
//
//   npm run respaldo                      → respalda la base de DATABASE_URL en ./respaldos
//   pg_restore --clean --if-exists -d "<url sin ?schema=…>" respaldos/<archivo>.dump   → restaurar
//
// Para respaldos automáticos, programe "npm run respaldo" a diario (Programador de tareas de Windows
// o cron). pg_dump se busca en PG_DUMP, en el PATH o en la instalación estándar de PostgreSQL en Windows.
require('dotenv').config()
const { spawnSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const RAIZ = path.join(__dirname, '..')
const DESTINO = path.resolve(RAIZ, process.env.RESPALDO_DIR || 'respaldos')
const CONSERVAR = Math.max(1, Number(process.env.RESPALDO_CONSERVAR) || 14)

function buscarPgDump() {
  if (process.env.PG_DUMP) return process.env.PG_DUMP
  const enPath = spawnSync(process.platform === 'win32' ? 'where' : 'which', ['pg_dump'], { encoding: 'utf8' })
  if (enPath.status === 0) return enPath.stdout.split(/\r?\n/)[0].trim()
  const base = 'C:/Program Files/PostgreSQL'
  if (fs.existsSync(base)) {
    const versiones = fs.readdirSync(base).filter((v) => /^\d+$/.test(v)).sort((a, b) => b - a)
    for (const v of versiones) {
      const exe = path.join(base, v, 'bin', 'pg_dump.exe')
      if (fs.existsSync(exe)) return exe
    }
  }
  throw new Error('No se encontró pg_dump: indique su ruta en la variable PG_DUMP')
}

function main() {
  const url = process.env.DATABASE_URL
  if (!url) throw new Error('DATABASE_URL no está definida')
  // libpq no entiende el parámetro "schema" de Prisma; la contraseña va por variable de entorno, no en la línea de comandos
  const u = new URL(url)
  const clave = decodeURIComponent(u.password)
  u.password = ''
  u.search = ''
  const nombreBd = u.pathname.slice(1)

  fs.mkdirSync(DESTINO, { recursive: true })
  // Hora local del equipo (AAAAMMDD-HHMM)
  const marca = new Date().toLocaleString('sv-SE').replace(/[-:]/g, '').replace(' ', '-').slice(0, 13)
  const archivo = path.join(DESTINO, `${nombreBd}-${marca}.dump`)

  const r = spawnSync(buscarPgDump(), ['--format=custom', '--no-owner', '--file', archivo, u.toString()], {
    env: { ...process.env, PGPASSWORD: clave },
    stdio: ['ignore', 'inherit', 'inherit'],
  })
  if (r.status !== 0) {
    fs.rmSync(archivo, { force: true })
    throw new Error(`pg_dump terminó con código ${r.status}`)
  }
  const kb = Math.round(fs.statSync(archivo).size / 1024)
  console.log(`Respaldo creado: ${path.relative(RAIZ, archivo)} (${kb} KB)`)

  // Rotación: se eliminan los más antiguos de esta misma base
  const previos = fs.readdirSync(DESTINO).filter((f) => f.startsWith(`${nombreBd}-`) && f.endsWith('.dump')).sort()
  for (const viejo of previos.slice(0, Math.max(0, previos.length - CONSERVAR))) {
    fs.rmSync(path.join(DESTINO, viejo))
    console.log(`Eliminado por antigüedad: ${viejo}`)
  }
}

try {
  main()
} catch (e) {
  console.error('Error en el respaldo:', e.message)
  process.exitCode = 1
}
