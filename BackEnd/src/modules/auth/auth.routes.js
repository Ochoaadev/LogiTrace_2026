const express = require('express')
const router = express.Router()

router.post('/login', (req, res) => {
  res.json({ message: 'Login endpoint - por implementar' })
})

router.post('/register', (req, res) => {
  res.json({ message: 'Register endpoint - por implementar' })
})

router.post('/logout', (req, res) => {
  res.json({ message: 'Logout endpoint - por implementar' })
})

module.exports = router
