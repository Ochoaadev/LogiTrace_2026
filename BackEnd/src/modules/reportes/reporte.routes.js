const express = require('express')
const router = express.Router()

router.get('/pedidos', (req, res) => {
  res.json({ message: 'Reporte de pedidos - por implementar' })
})

router.get('/despachos', (req, res) => {
  res.json({ message: 'Reporte de despachos - por implementar' })
})

router.get('/incidencias', (req, res) => {
  res.json({ message: 'Reporte de incidencias - por implementar' })
})

router.get('/devoluciones', (req, res) => {
  res.json({ message: 'Reporte de devoluciones - por implementar' })
})

router.get('/inventario', (req, res) => {
  res.json({ message: 'Reporte de inventario - por implementar' })
})

router.get('/rendimiento', (req, res) => {
  res.json({ message: 'Reporte de rendimiento - por implementar' })
})

module.exports = router
