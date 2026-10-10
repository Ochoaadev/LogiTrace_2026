// Punto de entrada de la API en Vercel: la misma aplicación Express del backend, como función.
// vercel.json reenvía aquí todas las rutas /api/*; Express recibe la ruta original y la resuelve igual
// que en el servidor propio (BackEnd/src/server.js).
module.exports = require('../BackEnd/src/app')
