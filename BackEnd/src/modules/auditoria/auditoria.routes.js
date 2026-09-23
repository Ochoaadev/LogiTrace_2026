const express = require('express')
const router = express.Router()

router.get('/', (req, res) => {
  res.json({ message: 'Listar auditoría - por implementar' })
})

module.exports = router
