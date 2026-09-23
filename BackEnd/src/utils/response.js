function success(res, data = null, message = 'Operación exitosa') {
  return res.json({
    success: true,
    message,
    data,
  })
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
