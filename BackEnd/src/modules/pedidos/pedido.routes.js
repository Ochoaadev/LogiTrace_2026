const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Listar pedidos - por implementar' })
})

router.get('/:id', (req, res) => {
  res.json({ message: 'Obtener pedido - por implementar' })
})

router.post('/', (req, res) => {
  res.json({ message: 'Crear pedido - por implementar' })
})

router.put('/:id', (req, res) => {
  res.json({ message: 'Actualizar pedido - por implementar' })
})

router.patch('/:id/estado', (req, res) => {
  res.json({ message: 'Cambiar estado del pedido - por implementar' })
})

module.exports = router
