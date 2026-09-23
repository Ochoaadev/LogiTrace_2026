const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Listar inventario - por implementar' })
})

router.get('/:id', (req, res) => {
  res.json({ message: 'Obtener item de inventario - por implementar' })
})

router.post('/', (req, res) => {
  res.json({ message: 'Agregar item al inventario - por implementar' })
})

router.put('/:id', (req, res) => {
  res.json({ message: 'Actualizar item del inventario - por implementar' })
})

router.post('/movimiento', (req, res) => {
  res.json({ message: 'Registrar movimiento de inventario - por implementar' })
})

module.exports = router
