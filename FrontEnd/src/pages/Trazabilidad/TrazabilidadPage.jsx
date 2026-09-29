import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { QrCode, Printer, Search, Calendar, Filter, FileDown, Info, ArrowLeft, TriangleAlert } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { Skeleton } from '@/components/ui/Skeleton'
import { usePermissions } from '@/hooks/usePermissions'
import { useBuscarExpedientes, useExpediente } from '@/services/query/useTrazabilidad'
import { TrazabilidadService, descargarArchivo } from '@/services/trazabilidadService'
import { cn } from '@/lib/utils'
import { ExpedienteResumen } from './components/ExpedienteResumen'
import { LineaTemporal } from './components/LineaTemporal'
import { PanelLateral } from './components/PanelLateral'
import { MapaRecorrido } from './components/MapaRecorrido'
import { CurvaTermica } from './components/CurvaTermica'
import { RegistrarTemperaturaDialog, ConsultaCodigoDialog } from './components/Dialogos'
import { fechaHora, RESULTADOS, ESTADO_PEDIDO_LABEL } from './components/formato'

export default function TrazabilidadPage() {
  const { can } = usePermissions()
  const [params, setParams] = useSearchParams()
  const q = params.get('q') || ''
  const fecha = params.get('fecha') || ''
  const resultado = params.get('resultado') || 'TODOS'

  // Borrador del formulario; la búsqueda se aplica al enviar (Enter o botón)
  const [borrador, setBorrador] = useState({ q, fecha, resultado })
  const [consultaAbierta, setConsultaAbierta] = useState(false)
  const [tempAbierta, setTempAbierta] = useState(false)
  const [exportando, setExportando] = useState(null)
  const [errorExport, setErrorExport] = useState(null)

  const filtros = {
    ...(q && { q }),
    ...(fecha && { fecha }),
    ...(resultado !== 'TODOS' && { resultado }),
    limit: 20,
  }
  const busqueda = useBuscarExpedientes(filtros)
  const resultados = busqueda.data?.data || []
  const total = busqueda.data?.pagination?.total ?? 0

  // Expediente abierto: el elegido explícitamente, o el único resultado de una búsqueda por código
  const pedidoId = params.get('pedido') || (q && resultados.length === 1 ? resultados[0].id : null)
  const expediente = useExpediente(pedidoId)
  const exp = expediente.data

  const aplicar = (nuevos) => {
    const p = new URLSearchParams()
    if (nuevos.q?.trim()) p.set('q', nuevos.q.trim())
    if (nuevos.fecha) p.set('fecha', nuevos.fecha)
    if (nuevos.resultado && nuevos.resultado !== 'TODOS') p.set('resultado', nuevos.resultado)
    if (nuevos.pedido) p.set('pedido', nuevos.pedido)
    setParams(p)
  }

  const onBuscar = (e) => {
    e.preventDefault()
    aplicar(borrador)
  }

  const onLimpiar = () => {
    const vacio = { q: '', fecha: '', resultado: 'TODOS' }
    setBorrador(vacio)
    aplicar(vacio)
  }

  const abrirExpediente = (id) => aplicar({ q, fecha, resultado, pedido: id })
  const volverAResultados = () => aplicar({ q, fecha, resultado })

  const consultarCodigo = (codigo) => {
    const nuevos = { q: codigo, fecha: '', resultado: 'TODOS' }
    setBorrador(nuevos)
    aplicar(nuevos)
  }

  const exportar = async (tipo) => {
    setErrorExport(null)
    setExportando(tipo)
    try {
      if (tipo === 'pdf') {
        const blob = await TrazabilidadService.exportPdf(exp.pedido.id)
        descargarArchivo(blob, `expediente-${exp.pedido.codigo}.pdf`)
      } else {
        const blob = await TrazabilidadService.exportCsv({ pedidoId: exp.pedido.id })
        descargarArchivo(blob, `trazabilidad-${exp.pedido.codigo}.csv`)
      }
    } catch {
      setErrorExport('No se pudo generar el archivo. Verifique la conexión con el servidor e intente de nuevo.')
    } finally {
      setExportando(null)
    }
  }

  const puedeExportar = can('trazabilidad.export')
  const puedeRegistrarTemp = can('despachos.change_state')

  return (
    <div>
      <PageHeader
        modulo="07"
        seccion="Auditoría operativa y seguimiento histórico"
        title="Trazabilidad de Pedidos y Operaciones"
        description="Consulta cronológica integral de la cadena operativa: desde la recepción de la orden, preparación en cava, asignación de despacho y novedades en ruta, hasta el destino final o la logística inversa."
        actions={
          <>
            <Button variant="secondary" size="lg" onClick={() => setConsultaAbierta(true)}>
              <QrCode className="h-5 w-5" aria-hidden="true" />
              Consultar por código QR / precinto
            </Button>
            {puedeExportar && (
              <Button
                size="lg"
                onClick={() => exportar('pdf')}
                disabled={!exp || !!exportando}
                loading={exportando === 'pdf'}
                title={exp ? undefined : 'Seleccione un expediente'}
              >
                {exportando !== 'pdf' && <Printer className="h-5 w-5" aria-hidden="true" />}
                Imprimir expediente de trazabilidad
              </Button>
            )}
          </>
        }
      />

      {/* Barra de búsqueda */}
      <form onSubmit={onBuscar} className="bg-white p-6 mb-6 grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr_auto] gap-4 items-end">
        <div className="grid gap-2">
          <label htmlFor="termino" className="label-caps">Término de auditoría / identificador</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" aria-hidden="true" />
            <Input
              id="termino"
              placeholder="Pedido, cliente, despacho, precinto, lote, incidencia o devolución"
              value={borrador.q}
              onChange={(e) => setBorrador((b) => ({ ...b, q: e.target.value }))}
              className="pl-9"
            />
          </div>
        </div>
        <div className="grid gap-2">
          <label htmlFor="fecha" className="label-caps flex items-center gap-1.5">
            <Calendar className="h-3.5 w-3.5" aria-hidden="true" /> Fecha operativa
          </label>
          <Input id="fecha" type="date" value={borrador.fecha} onChange={(e) => setBorrador((b) => ({ ...b, fecha: e.target.value }))} />
        </div>
        <div className="grid gap-2">
          <span id="resultado-label" className="label-caps flex items-center gap-1.5">
            <Filter className="h-3.5 w-3.5" aria-hidden="true" /> Resultado operativo
          </span>
          <Select value={borrador.resultado} onValueChange={(v) => setBorrador((b) => ({ ...b, resultado: v }))}>
            <SelectTrigger aria-labelledby="resultado-label"><SelectValue /></SelectTrigger>
            <SelectContent>
              {RESULTADOS.map((r) => <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit">Buscar</Button>
          {(q || fecha || resultado !== 'TODOS') && (
            <Button type="button" variant="ghost" onClick={onLimpiar}>Limpiar</Button>
          )}
        </div>
      </form>

      {errorExport && (
        <p role="alert" className="mb-6 flex items-center gap-2 bg-danger-light text-[#a2191f] px-4 py-3 text-sm">
          <TriangleAlert className="h-4 w-4" aria-hidden="true" /> {errorExport}
        </p>
      )}

      {pedidoId ? (
        <ExpedienteVista
          consulta={expediente}
          hayMasResultados={resultados.length > 1}
          onVolver={volverAResultados}
          puedeExportar={puedeExportar}
          exportando={exportando}
          onExportar={exportar}
          puedeRegistrarTemp={puedeRegistrarTemp}
          onRegistrarTemp={() => setTempAbierta(true)}
        />
      ) : (
        <ListaResultados consulta={busqueda} resultados={resultados} total={total} filtrado={!!(q || fecha || resultado !== 'TODOS')} onAbrir={abrirExpediente} />
      )}

      <aside className="mt-6 bg-white px-6 py-4 flex gap-3 text-sm text-gray-700">
        <Info className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
        <p>
          La trazabilidad en LogiTrace se construye automáticamente a partir de los eventos generados en cada módulo
          operativo. Todos los registros conservan operador y hora exacta; las posiciones provienen del GPS del
          despacho y las temperaturas son mediciones manuales.
        </p>
      </aside>

      <ConsultaCodigoDialog open={consultaAbierta} onOpenChange={setConsultaAbierta} onConsultar={consultarCodigo} />
      {exp && <RegistrarTemperaturaDialog key={exp.pedido.id} open={tempAbierta} onOpenChange={setTempAbierta} expediente={exp} />}
    </div>
  )
}

function ListaResultados({ consulta, resultados, total, filtrado, onAbrir }) {
  if (consulta.isLoading) {
    return <div className="bg-white p-6 space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="h-10 w-full" />)}</div>
  }
  if (consulta.isError) {
    return <p role="alert" className="bg-danger-light text-[#a2191f] px-6 py-4 text-sm">No se pudieron cargar los expedientes. Intente de nuevo.</p>
  }
  if (resultados.length === 0) {
    return (
      <div className="bg-white px-6 py-12 text-center">
        <p className="text-base font-semibold text-gray-900">{filtrado ? 'Sin expedientes para esta búsqueda' : 'Aún no hay expedientes'}</p>
        <p className="mt-1 text-sm text-gray-600">
          {filtrado ? 'Pruebe con otro código, sin fecha o con otro resultado operativo.' : 'Los expedientes aparecen al registrar pedidos.'}
        </p>
      </div>
    )
  }

  return (
    <section className="bg-white" aria-labelledby="resultados">
      <h2 id="resultados" className="px-6 py-4 text-sm text-gray-700">
        {filtrado ? `${total} expediente(s) encontrados` : 'Expedientes recientes'} · seleccione uno para ver su trazabilidad
      </h2>
      <div className="overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-100">
            <tr>
              {['Pedido', 'Fecha', 'Cliente / zona', 'Despacho · precinto', 'Repartidor', 'Estado', 'Novedades'].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-[0.08em] text-gray-900 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {resultados.map((r) => (
              <tr key={r.id} className="border-b border-gray-100 even:bg-gray-50 hover:bg-gray-100">
                <td className="px-4 py-3">
                  <button type="button" onClick={() => onAbrir(r.id)} className="font-mono font-semibold text-primary hover:underline">
                    #{r.codigo}
                  </button>
                </td>
                <td className="px-4 py-3 font-mono text-xs whitespace-nowrap">{fechaHora(r.fechaHora)}</td>
                <td className="px-4 py-3">
                  <p className="text-gray-900">{r.cliente}</p>
                  {r.zona && <p className="text-xs text-gray-600">{r.zona}</p>}
                </td>
                <td className="px-4 py-3 font-mono text-xs">
                  {r.despacho || '—'}
                  {r.precinto && <p className="text-gray-600">{r.precinto}</p>}
                </td>
                <td className="px-4 py-3">{r.repartidor || <span className="text-gray-500 italic">Por asignar</span>}</td>
                <td className="px-4 py-3 whitespace-nowrap">{ESTADO_PEDIDO_LABEL[r.estado] || r.estado}</td>
                <td className="px-4 py-3 text-xs whitespace-nowrap">
                  {r.incidencias > 0 && <span className="mr-2 text-[#a2191f]">{r.incidencias} incidencia(s)</span>}
                  {r.devoluciones > 0 && <span className="text-[#684e00]">{r.devoluciones} devolución(es)</span>}
                  {!r.incidencias && !r.devoluciones && <span className="text-gray-500">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  )
}

function ExpedienteVista({ consulta, hayMasResultados, onVolver, puedeExportar, exportando, onExportar, puedeRegistrarTemp, onRegistrarTemp }) {
  if (consulta.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full" />
        <div className="grid lg:grid-cols-[2fr_1fr] gap-6"><Skeleton className="h-96" /><Skeleton className="h-96" /></div>
      </div>
    )
  }
  if (consulta.isError) {
    return (
      <p role="alert" className="bg-danger-light text-[#a2191f] px-6 py-4 text-sm">
        {consulta.error?.message || 'No se pudo cargar el expediente.'}
      </p>
    )
  }
  const exp = consulta.data
  if (!exp) return null

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
        {hayMasResultados ? (
          <button type="button" onClick={onVolver} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Volver a los resultados
          </button>
        ) : <span />}
        {puedeExportar && (
          <Button variant="ghost" size="sm" onClick={() => onExportar('csv')} disabled={!!exportando} loading={exportando === 'csv'}>
            {exportando !== 'csv' && <FileDown className="h-4 w-4" aria-hidden="true" />}
            Exportar eventos (CSV)
          </Button>
        )}
      </div>

      <ExpedienteResumen expediente={exp} />

      <div className={cn('grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6')}>
        <div className="space-y-6 min-w-0">
          <LineaTemporal eventos={exp.timeline} />
          <CurvaTermica cadenaFrio={exp.cadenaFrio} />
        </div>
        <div className="space-y-6 min-w-0">
          <PanelLateral
            expediente={exp}
            puedeExportar={puedeExportar}
            exportando={exportando === 'pdf'}
            onDescargarPdf={() => onExportar('pdf')}
            puedeRegistrarTemp={puedeRegistrarTemp}
            onRegistrarTemp={onRegistrarTemp}
          />
          <MapaRecorrido gps={exp.gps} zona={exp.pedido.zona} />
        </div>
      </div>
    </div>
  )
}
