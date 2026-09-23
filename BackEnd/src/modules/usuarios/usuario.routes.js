const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Listar usuarios - por implementar' })
})

router.get('/:id', (req, res) => {
  res.json({ message: 'Obtener usuario - por implementar' })
})

router.post('/', (req, res) => {
  res.json({ message: 'Crear usuario - por implementar' })
})

router.put('/:id', (req, res) => {
  res.json({ message: 'Actualizar usuario - por implementar' })
})

router.delete('/:id', (req, res) => {
  res.json({ message: 'Eliminar usuario - por implementar' })
})

module.exports = router
