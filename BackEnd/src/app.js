const express = require('express')
const cors = require('cors')
const morgan = require('morgan')
const cookieParser = require('cookie-parser')
const { port } = require('./config/env')
const routes = require('./routes')
const { errorMiddleware } = require('./middlewares/errorMiddleware')

const app = express()

app.use(morgan('dev'))
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? '' : 'http://localhost:5173',
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cookieParser())

app.use('/api', routes)

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() })
})

app.use(errorMiddleware)

module.exports = app
