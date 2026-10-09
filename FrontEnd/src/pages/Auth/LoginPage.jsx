import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Network, CircleUser, KeyRound, Eye, EyeOff, ArrowRight, Info, TriangleAlert } from 'lucide-react'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Checkbox } from '@/components/ui/Checkbox'
import { useAuth } from '@/hooks/useAuth'
import { TemaToggle } from '@/components/ui/TemaToggle'

/** Acceso al sistema (Figma "InicioSesion"). */
function LoginPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [verClave, setVerClave] = useState(false)
  const [recordar, setRecordar] = useState(true)
  const [trampa, setTrampa] = useState('') // campo invisible: solo un bot lo rellena
  const [ayuda, setAyuda] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email.trim(), password, recordar, trampa)
      // Vuelve a la pantalla que se intentaba abrir antes de iniciar sesión
      navigate(location.state?.from?.pathname || '/dashboard', { replace: true })
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex flex-col bg-gray-50 px-4">
      <TemaToggle className="absolute right-3 top-3" />
      <main className="flex-1 flex flex-col items-center justify-center py-10 animar-entrada">
        <div className="flex flex-col items-center text-center mb-8">
          <span className="h-11 w-11 flex items-center justify-center bg-primary mb-5" aria-hidden="true">
            <Network className="h-6 w-6 text-white" />
          </span>
          <h1 className="text-[1.9rem] leading-none text-gray-900">
            <span className="font-light">Logi</span><span className="font-semibold text-primary">Trace</span>
          </h1>
          <p className="mt-3 text-xs text-gray-700">SuperTequeños C.A. · Planta Valera, Edo. Trujillo</p>
        </div>

        <section className="w-full max-w-[25rem] bg-white p-7 sm:p-8" aria-labelledby="titulo-acceso">
          <h2 id="titulo-acceso" className="text-lg font-semibold text-gray-900">Acceso al Sistema</h2>
          <p className="text-xs text-gray-600 mt-1">Ingrese con sus credenciales institucionales</p>

          <form onSubmit={handleSubmit} className="mt-6 grid gap-5">
            {/* Protección contra bots: invisible para las personas y fuera del orden de tabulación */}
            <div aria-hidden="true" className="absolute -left-[9999px] h-px w-px overflow-hidden">
              <label htmlFor="sitio_web">Sitio web</label>
              <input id="sitio_web" name="sitio_web" type="text" tabIndex={-1} autoComplete="off" value={trampa} onChange={(e) => setTrampa(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email" className="text-xs font-semibold text-gray-900">Usuario / Correo Institucional</Label>
              <div className="relative">
                <CircleUser className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" aria-hidden="true" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nombre@supertequenos.com"
                  disabled={loading}
                  className="pl-10 h-11"
                />
              </div>
            </div>

            <div className="grid gap-2">
              <div className="flex items-center justify-between gap-3">
                <Label htmlFor="password" className="text-xs font-semibold text-gray-900">Contraseña</Label>
                <button type="button" onClick={() => setAyuda((a) => !a)} aria-expanded={ayuda} aria-controls="ayuda-clave" className="text-xs text-primary hover:underline">
                  ¿Olvidó su contraseña?
                </button>
              </div>
              <div className="relative">
                <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" aria-hidden="true" />
                <Input
                  id="password"
                  type={verClave ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  disabled={loading}
                  className="pl-10 pr-11 h-11"
                />
                <button
                  type="button"
                  onClick={() => setVerClave((v) => !v)}
                  aria-label={verClave ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  aria-pressed={verClave}
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-9 w-9 flex items-center justify-center text-gray-600 hover:text-gray-900"
                >
                  {verClave ? <EyeOff className="h-4 w-4" aria-hidden="true" /> : <Eye className="h-4 w-4" aria-hidden="true" />}
                </button>
              </div>
              {ayuda && (
                <p id="ayuda-clave" role="status" className="flex gap-2 bg-primary-light px-3 py-2 text-xs text-[#002d9c]">
                  <Info className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  Por seguridad, las contraseñas solo las restablece el administrador del sistema. Solicítelo a su supervisor o al administrador de LogiTrace.
                </p>
              )}
            </div>

            <div className="flex items-start justify-between gap-3">
              <label htmlFor="recordar" className="flex items-start gap-2 text-xs text-gray-700 cursor-pointer">
                <Checkbox id="recordar" checked={recordar} onCheckedChange={(v) => setRecordar(v === true)} className="mt-px" />
                <span>
                  Recordar sesión
                  <span className="block text-gray-500">{recordar ? 'Se mantiene al cerrar el navegador' : 'Termina al cerrar el navegador'}</span>
                </span>
              </label>
              <span className="text-xs text-gray-500 text-right">Terminal Valera-P1</span>
            </div>

            {error && (
              <p role="alert" className="flex gap-2 bg-danger-light px-3 py-2 text-sm text-[#a2191f]">
                <TriangleAlert className="h-4 w-4 mt-0.5 flex-shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-12 w-full flex items-center justify-between gap-3 bg-primary px-4 text-sm font-semibold uppercase tracking-wide text-white hover:bg-primary-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <span className="flex-1 text-center">{loading ? 'Verificando credenciales…' : 'Ingresar a LogiTrace'}</span>
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" aria-hidden="true" /> : <ArrowRight className="h-4 w-4" aria-hidden="true" />}
            </button>
          </form>
        </section>
      </main>

      <footer className="pb-8 text-center">
        <p className="text-xs text-gray-900">SuperTequeños C.A. — Sistema LogiTrace | Planta Valera</p>
        <p className="mt-1 text-[11px] text-gray-600">RIF: J-30948210-4 · Valera, Edo. Trujillo, Venezuela</p>
      </footer>
    </div>
  )
}

export default LoginPage
