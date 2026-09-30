// Genera un JWT_SECRET aleatorio para producción (64 caracteres):  npm run secreto
console.log(require('crypto').randomBytes(48).toString('base64url'))
