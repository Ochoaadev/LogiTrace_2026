const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Listar trazabilidad - por implementar' })
})

router.get('/pedido/:pedidoId', (req, res) => {
  res.json({ message: 'Trazabilidad de un pedido - por implementar' })
})

router.get('/despacho/:despachoId', (req, res) => {
  res.json({ message: 'Trazabilidad de un despacho - por implementar' })
})

module.exports = router
