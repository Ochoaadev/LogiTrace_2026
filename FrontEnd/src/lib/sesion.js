// Token de acceso de la sesión, SOLO en memoria. Antes se guardaba (junto con el de renovación) en
// localStorage / sessionStorage, donde cualquier script inyectado podía leerlo. Ahora el token de
// renovación vive en una cookie httpOnly que JavaScript no puede leer, y este token corto (15 min)
// se pide de nuevo al recargar la página o al vencer (services/api.js).
let token = null

// Restos de la versión anterior: se borran una vez del almacenamiento del navegador
for (const almacen of [() => localStorage, () => sessionStorage]) {
  for (const clave of ['accessToken', 'refreshToken', 'user', 'token', 'usuario']) {
    try {
      almacen().removeItem(clave)
    } catch {
      // almacenamiento no disponible
    }
  }
}

export const sesion = {
  token: () => token,
  fijarToken: (nuevo) => { token = nuevo || null },
  limpiar: () => { token = null },
}
