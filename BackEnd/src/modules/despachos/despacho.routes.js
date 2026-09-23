const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Listar despachos - por implementar' })
})

router.get('/:id', (req, res) => {
  res.json({ message: 'Obtener despacho - por implementar' })
})

router.post('/', (req, res) => {
  res.json({ message: 'Crear despacho - por implementar' })
})

router.put('/:id', (req, res) => {
  res.json({ message: 'Actualizar despacho - por implementar' })
})

router.patch('/:id/estado', (req, res) => {
  res.json({ message: 'Cambiar estado del despacho - por implementar' })
})

router.patch('/:id/ubicacion', (req, res) => {
  res.json({ message: 'Actualizar ubicación GPS - por implementar' })
})

module.exports = router
