const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Listar residuos - por implementar' })
})

router.post('/', (req, res) => {
  res.json({ message: 'Registrar residuo - por implementar' })
})

router.put('/:id', (req, res) => {
  res.json({ message: 'Actualizar residuo - por implementar' })
})

module.exports = router
