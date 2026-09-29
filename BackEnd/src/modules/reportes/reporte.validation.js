const { query } = require('express-validator')

const operativoValidation = [
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
  query('zonaId').optional().isUUID().withMessage('Sector inválido'),
  query('secciones').optional().matches(/^(entregas|incidencias|devoluciones|residuos)(,(entregas|incidencias|devoluciones|residuos))*$/).withMessage('Secciones inválidas'),
]

const kpiValidation = [
  query('fechaDesde').optional().isISO8601().withMessage('Fecha desde inválida'),
  query('fechaHasta').optional().isISO8601().withMessage('Fecha hasta inválida'),
]

const timelineValidation = [
  query('dias').optional().isInt({ min: 1, max: 365 }).withMessage('Días debe estar entre 1 y 365'),
]

const limitValidation = [
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Límite debe estar entre 1 y 50'),
]

module.exports = {
  timelineValidation,
  limitValidation,
  operativoValidation,
  kpiValidation,
}