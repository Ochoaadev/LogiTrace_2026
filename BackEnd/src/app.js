const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const helmet = require('helmet')
const { port, corsOrigins } = require('./config/env')
const routes = require('./routes')
const prisma = require('./config/database')
const { errorMiddleware } = require('./middlewares/errorMiddleware')
const { auditoriaMiddleware } = require('./middlewares/auditoriaMiddleware')
const { forzarHttps, sanearEntrada, limiteGeneral } = require('./middlewares/seguridadMiddleware')

const app = express()
// Detrás de un proxy inverso (Caddy/Nginx con HTTPS): req.ip es la IP real del cliente, necesaria
// para el límite de intentos de login. Solo se activa con TRUST_PROXY=1 para no confiar en cabeceras falsas.
if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY) || process.env.TRUST_PROXY)

app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'))

// Cabeceras de seguridad (helmet): sin X-Powered-By, nosniff, sin marcos (clickjacking), CSP estricta
// (la API solo devuelve JSON, PDF y CSV), política de referer y, en producción, HSTS (HTTPS obligatorio
// en el navegador durante un año). Las cabeceras de la aplicación web las pone el proxy (docs/despliegue.md).
const PRODUCCION = process.env.NODE_ENV === 'production'
app.use(helmet({
  contentSecurityPolicy: { directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"] } },
  crossOriginResourcePolicy: { policy: 'same-site' },
  hsts: PRODUCCION ? { maxAge: 31536000, includeSubDomains: true } : false,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}))
app.use(forzarHttps)
// Los orígenes permitidos salen de CORS_ORIGINS (.env); antes se apagaba el CORS entero
// en producción (origin: '') y se usaba una IP de LAN fija en desarrollo, lo que causaba
// bloqueos intermitentes de preflight al cambiar de red.
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}))
// Cuerpos limitados a 100 kB: ninguna operación legítima envía más y evita peticiones gigantes
app.use(express.json({ limit: '100kb' }))
app.use(express.urlencoded({ extended: false, limit: '100kb' }))
app.use(cookieParser())
app.use(sanearEntrada)

// El header del frontend consulta /api/health (el proxy de Vite solo reenvía /api).
// Verifica también PostgreSQL: "en línea" significa servidor + base de datos disponibles.
async function health(req, res) {
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'ok', timestamp: new Date().toISOString() })
  } catch {
    res.status(503).json({ status: 'error', database: 'unavailable', timestamp: new Date().toISOString() })
  }
}
app.get(['/health', '/api/health'], health)

// Registra en Auditoria cada operación de escritura exitosa (usuario, acción, IP)
app.use('/api', limiteGeneral, auditoriaMiddleware, routes)

app.use(errorMiddleware)

module.exports = app
