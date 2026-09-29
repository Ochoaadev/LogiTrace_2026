require('dotenv').config()

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://192.168.0.123:5173',
  'http://192.168.56.1:5173',
]

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  // CORS_ORIGINS="http://a.com,http://b.com" en .env; si no se define, usa la lista de desarrollo.
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : DEFAULT_CORS_ORIGINS,
}
