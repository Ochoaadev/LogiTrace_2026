const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const { port, corsOrigins } = require('./config/env')
const routes = require('./routes')
const prisma = require('./config/database')
const { errorMiddleware } = require('./middlewares/errorMiddleware')

const app = express()

app.use(morgan('dev'))
// Los orígenes permitidos salen de CORS_ORIGINS (.env); antes se apagaba el CORS entero
// en producción (origin: '') y se usaba una IP de LAN fija en desarrollo, lo que causaba
// bloqueos intermitentes de preflight al cambiar de red.
app.use(cors({
  origin: corsOrigins,
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

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

app.use('/api', routes)

app.use(errorMiddleware)

module.exports = app
