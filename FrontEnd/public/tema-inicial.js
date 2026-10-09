// Aplica el tema guardado (o el del sistema) antes de pintar, para evitar el destello claro.
// En un archivo aparte (no en línea en index.html) para que la política de seguridad de contenido
// pueda prohibir los scripts en línea.
try {
  var t = localStorage.getItem('logitrace-tema')
  var oscuro = t ? t === 'oscuro' || t === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  document.documentElement.dataset.theme = oscuro ? 'dark' : 'light'
} catch (e) {
  document.documentElement.dataset.theme = 'light'
}
