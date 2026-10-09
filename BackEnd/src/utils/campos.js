/**
 * Solo los campos de la lista llegan a la base de datos. Las validaciones comprueban el formato de
 * los campos esperados pero no descartan los extra: sin este filtro, una petición manipulada podía
 * fijar estado, repartidor, fechas o ids saltándose el flujo (asignación masiva).
 */
function permitir(data, campos) {
  return Object.fromEntries(Object.entries(data || {}).filter(([k, v]) => campos.includes(k) && v !== undefined))
}

module.exports = { permitir }
