const catalogoOperativoService = require('./catalogoOperativo.service')
const { success } = require('../../utils/response')

// Genera los handlers list/getById de un catálogo de solo lectura.
function readHandlers(listFn, getFn, listMessage, getMessage) {
  return {
    list: async (req, res, next) => {
      try {
        const result = await listFn(req.query)
        return success(res, result.data, listMessage, 200, {
          total: result.total,
          page: result.page,
          limit: result.limit,
        })
      } catch (err) {
        next(err)
      }
    },
    getById: async (req, res, next) => {
      try {
        const item = await getFn(req.params.id)
        return success(res, item, getMessage)
      } catch (err) {
        next(err)
      }
    },
  }
}

const s = catalogoOperativoService

module.exports = {
  repartidores: readHandlers(s.listRepartidores, s.getRepartidorById, 'Repartidores obtenidos', 'Repartidor obtenido'),
  rutas: readHandlers(s.listRutas, s.getRutaById, 'Rutas obtenidas', 'Ruta obtenida'),
  lotes: readHandlers(s.listLotes, s.getLoteById, 'Lotes obtenidos', 'Lote obtenido'),
  ubicaciones: readHandlers(s.listUbicaciones, s.getUbicacionById, 'Ubicaciones obtenidas', 'Ubicación obtenida'),
}
