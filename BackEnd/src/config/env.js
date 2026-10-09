require('dotenv').config()

const DEFAULT_CORS_ORIGINS = [
  'http://localhost:5173',
  'http://192.168.0.123:5173',
  'http://192.168.56.1:5173',
]

// Sin JWT_SECRET, cualquiera que conozca el valor por defecto podría firmar tokens válidos
const SECRETOS_DE_EJEMPLO = ['default-secret', 'your-super-secret-jwt-key-change-in-production']
if (process.env.NODE_ENV === 'production' && !process.env.JWT_SECRET) {
  throw new Error('JWT_SECRET es obligatorio en producción')
}
// El valor de ejemplo de .env.example o uno corto se adivinan: se exige uno propio de 32+ caracteres
if (process.env.NODE_ENV === 'production' && (SECRETOS_DE_EJEMPLO.includes(process.env.JWT_SECRET) || process.env.JWT_SECRET.length < 32)) {
  throw new Error('JWT_SECRET de producción inválido: use uno propio de al menos 32 caracteres (npm run secreto)')
}

module.exports = {
  port: process.env.PORT || 3000,
  jwtSecret: process.env.JWT_SECRET || 'default-secret',
  // Token de acceso corto (vive solo en la memoria de la página); la sesión se renueva con la cookie
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '15m',
  nodeEnv: process.env.NODE_ENV || 'development',
  databaseUrl: process.env.DATABASE_URL,
  // CORS_ORIGINS="http://a.com,http://b.com" en .env; si no se define, usa la lista de desarrollo.
  corsOrigins: process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
    : DEFAULT_CORS_ORIGINS,
}
