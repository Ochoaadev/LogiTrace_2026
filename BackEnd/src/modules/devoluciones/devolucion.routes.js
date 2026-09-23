const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Listar devoluciones - por implementar' })
})

router.get('/:id', (req, res) => {
  res.json({ message: 'Obtener devolución - por implementar' })
})

router.post('/', (req, res) => {
  res.json({ message: 'Crear devolución - por implementar' })
})

router.put('/:id', (req, res) => {
  res.json({ message: 'Actualizar devolución - por implementar' })
})

router.post('/:id/evaluacion', (req, res) => {
  res.json({ message: 'Evaluar devolución - por implementar' })
})

module.exports = router
