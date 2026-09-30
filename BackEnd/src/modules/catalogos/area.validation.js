const { body } = require('express-validator')

// Área en el mapa (zonas de despacho y tipos de sector): centro con latitud y longitud juntas
// (null las borra al editar) y radio de cobertura opcional
const centroYRadio = [
  body('latitudCentro').optional({ values: 'null' }).isFloat({ min: -90, max: 90 }).withMessage('Latitud del centro fuera de rango').toFloat(),
  body('longitudCentro').optional({ values: 'null' }).isFloat({ min: -180, max: 180 }).withMessage('Longitud del centro fuera de rango').toFloat(),
  body('longitudCentro').custom((lng, { req }) => {
    if ((req.body.latitudCentro != null) !== (lng != null)) throw new Error('Indique latitud y longitud del centro juntas')
    return true
  }),
  body('radioMetros').optional({ values: 'null' }).isInt({ min: 50, max: 100000 }).withMessage('El radio debe estar entre 50 m y 100 km').toInt(),
]

module.exports = { centroYRadio }
