// Los controladores de listas pasan { total, page, limit } como meta; antes esos argumentos
// se ignoraban y el frontend nunca recibía la paginación (ni el 201 de las creaciones).
function success(res, data = null, message = 'Operación exitosa', status = 200, meta = null) {
  const body = { success: true, message, data }
  if (meta && meta.total !== undefined && meta.limit) {
    body.pagination = { ...meta, totalPages: Math.ceil(meta.total / meta.limit) }
  }
  return res.status(status).json(body)
}

function error(res, message = 'Error en la operación', status = 500) {
  return res.status(status).json({
    success: false,
    message,
  })
}

function paginated(res, data, total, page, limit) {
  return res.json({
    success: true,
    data,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  })
}

module.exports = { success, error, paginated }
