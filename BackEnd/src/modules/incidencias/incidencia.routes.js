const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Listar incidencias - por implementar' })
})

router.get('/:id', (req, res) => {
  res.json({ message: 'Obtener incidencia - por implementar' })
})

router.post('/', (req, res) => {
  res.json({ message: 'Crear incidencia - por implementar' })
})

router.put('/:id', (req, res) => {
  res.json({ message: 'Actualizar incidencia - por implementar' })
})

router.patch('/:id/estado', (req, res) => {
  res.json({ message: 'Cambiar estado de la incidencia - por implementar' })
})

module.exports = router
