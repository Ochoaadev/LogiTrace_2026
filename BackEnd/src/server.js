const app = require('./app')
const { port } = require('./config/env')

app.listen(port, () => {
  console.log(`Servidor corriendo en puerto ${port}`)
})
