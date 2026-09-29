import { useState } from 'react'
import {
  Download, FilePlus2, FileText, Sheet, CalendarDays, MapPin, Workflow, RefreshCw, CircleCheck, Timer,
  TriangleAlert, Undo2, ArrowUp, ArrowDown, Minus, Truck, ShieldCheck, Undo, Recycle, FlaskConical, Info, X,
} from 'lucide-react'
import { PageHeader, PageTag } from '@/components/layout/PageHeader'
import { Pestana } from '@/components/layout/ModuloUI'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { KpiCard } from '@/components/ui/KpiCard'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/DropdownMenu'
import { usePermissions } from '@/hooks/usePermissions'
import { useReporteOperativo } from '@/services/query/useReportes'
import { useZonas } from '@/services/query/useCatalogos'
import { reporteService } from '@/services/reporteService'
import { descargarArchivo } from '@/services/trazabilidadService'
import { cn } from '@/lib/utils'
import { PERIODOS, rangoDePeriodo, isoLocal, pct, num, fecha, mensajeError } from './components/formato'
import { SectoresPanel, CausasPanel, BalanceResiduos } from './components/VistaEntregas'
import { VistaIncidencias, VistaDevoluciones, VistaResiduos } from './components/VistasDetalle'
import { PruebasFuncionales } from './components/PruebasFuncionales'
import { ReportePersonalizadoDialog } from './components/ReportePersonalizadoDialog'

const TODOS = 'TODOS'
const FLUJOS = [
  { value: TODOS, label: 'Todos los flujos (despachos, incidencias, retornos, residuos)' },
  { value: 'entregas', label: 'Pedidos y despachos' },
  { value: 'incidencias', label: 'Incidencias y contingencias' },
  { value: 'devoluciones', label: 'Devoluciones y calidad' },
  { value: 'residuos', label: 'Gestión ambiental y residuos' },
]
const PESTANAS = [
  { value: 'entregas', label: 'Pedidos y despachos', icon: Truck },
  { value: 'incidencias', label: 'Incidencias y contingencias', icon: TriangleAlert },
  { value: 'devoluciones', label: 'Devoluciones y calidad', icon: Undo },
  { value: 'residuos', label: 'Gestión ambiental y residuos', icon: Recycle },
  { value: 'pruebas', label: 'Evaluación de pruebas', icon: FlaskConical },
]

const BORRADOR_INICIAL = { periodo: '30', desde: isoLocal(new Date(Date.now() - 29 * 864e5)), hasta: isoLocal(new Date()), zonaId: TODOS, flujo: TODOS }

function aplicar(borrador) {
  return {
    ...rangoDePeriodo(borrador),
    ...(borrador.zonaId !== TODOS && { zonaId: borrador.zonaId }),
  }
}

/** Variación frente al periodo anterior; `mejorSiBaja` invierte el color (tiempos y tasas de fallas). */
function Tendencia({ delta, unidad = '%', mejorSiBaja = false }) {
  if (delta === null || delta === undefined) return <span className="font-sans text-xs font-normal text-gray-500 ml-2">sin periodo previo</span>
  if (delta === 0) return <span className="inline-flex items-center gap-0.5 font-sans text-xs font-normal text-gray-600 ml-2"><Minus className="h-3 w-3" aria-hidden="true" />Estable</span>
  const mejora = mejorSiBaja ? delta < 0 : delta > 0
  const Flecha = delta > 0 ? ArrowUp : ArrowDown
  return (
    <span className={cn('inline-flex items-center gap-0.5 font-sans text-xs font-normal ml-2', mejora ? 'text-success' : 'text-danger')} title="Frente al periodo anterior de igual duración">
      <Flecha className="h-3 w-3" aria-hidden="true" />{delta > 0 ? '+' : ''}{num(delta)}{unidad === 'min' ? ' min' : unidad}
    </span>
  )
}

function Progreso({ valor, maximo = 100, tono }) {
  const ancho = valor === null || valor === undefined ? 0 : Math.min(100, (valor / maximo) * 100)
  return <div className="h-1 bg-gray-100 mt-2" aria-hidden="true"><div className={cn('h-1', tono)} style={{ width: `${ancho}%` }} /></div>
}

export default function ReportesPage() {
  const { can } = usePermissions()
  const [borrador, setBorrador] = useState(BORRADOR_INICIAL)
  const [aplicado, setAplicado] = useState(BORRADOR_INICIAL)
  const [filtros, setFiltros] = useState(() => aplicar(BORRADOR_INICIAL))
  const [vista, setVista] = useState('entregas')
  const [personalizado, setPersonalizado] = useState(false)
  const [descargando, setDescargando] = useState(null)
  const [aviso, setAviso] = useState(null)

  const { data: reporte, isLoading, isError, isFetching, refetch } = useReporteOperativo(filtros)
  const { data: zonasData } = useZonas({ activo: 'true' }, { page: 1, limit: 100 })
  const zonas = zonasData?.data || []
  const set = (k) => (v) => setBorrador((b) => ({ ...b, [k]: v }))
  const rangoValido = borrador.periodo !== 'personalizado' || (borrador.desde && borrador.hasta && borrador.desde <= borrador.hasta)

  const filtrar = () => {
    const nuevos = aplicar(borrador)
    setAplicado(borrador)
    // Mismo periodo relativo: se recalcula "ahora" y se fuerza la consulta
    if (JSON.stringify(nuevos) === JSON.stringify(filtros)) refetch()
    else setFiltros(nuevos)
    if (borrador.flujo !== TODOS) setVista(borrador.flujo)
  }

  // Devuelve el mensaje de error (o null) para que el diálogo lo muestre
  const descargar = async (formato, params) => {
    setDescargando(formato)
    setAviso(null)
    try {
      const blob = formato === 'pdf' ? await reporteService.exportPdf(params) : await reporteService.exportCsv(params)
      descargarArchivo(blob, `reporte-operativo-${isoLocal(new Date())}.${formato}`)
      return null
    } catch (err) {
      const mensaje = await mensajeError(err, 'No se pudo generar el reporte')
      setAviso(mensaje)
      return mensaje
    } finally {
      setDescargando(null)
    }
  }
  const exportarEjecutivo = (formato) => descargar(formato, { ...filtros, ...(aplicado.flujo !== TODOS && { secciones: aplicado.flujo }) })

  const ind = reporte?.indicadores
  const metas = reporte?.metas
  const ref = reporte ? `RPT-${isoLocal(new Date(reporte.periodo.desde)).replaceAll('-', '')}-${isoLocal(new Date(reporte.periodo.hasta)).replaceAll('-', '')}-VAL` : '—'
  const cargando = isLoading || !reporte

  return (
    <div>
      <PageHeader
        modulo="09"
        seccion="Análisis operativo y consolidación de datos"
        tags={reporte?.datosDemo && <PageTag variant="success">● Modo demostración / datos de prueba</PageTag>}
        title="Reportes y Rendimiento Operativo"
        description="Consolidación de volúmenes de pedidos, tiempos de ciclo, tipología de incidencias, retornos en logística inversa y balance de residuos en el eje Valera - Carvajal."
        actions={
          can('reportes.export') && (
            <>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" loading={!!descargando && !personalizado} disabled={!!descargando || !reporte}>
                    {!descargando && <Download className="h-4 w-4" aria-hidden="true" />} Exportar reporte ejecutivo (PDF / Excel)
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onSelect={() => exportarEjecutivo('pdf')}><FileText className="h-4 w-4 mr-2" aria-hidden="true" />PDF ejecutivo</DropdownMenuItem>
                  <DropdownMenuItem onSelect={() => exportarEjecutivo('csv')}><Sheet className="h-4 w-4 mr-2" aria-hidden="true" />CSV para Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button size="lg" onClick={() => setPersonalizado(true)}>
                <FilePlus2 className="h-5 w-5" aria-hidden="true" /> Generar reporte personalizado
              </Button>
            </>
          )
        }
      >
        <p className="mt-3 font-mono text-xs text-gray-600">REF: {ref} · Auditoría: activa{reporte ? ` · ${fecha(reporte.periodo.desde)} al ${fecha(reporte.periodo.hasta)}` : ''}</p>
      </PageHeader>

      {aviso && (
        <p role="alert" className="mb-6 flex items-center justify-between gap-3 bg-danger-light text-[#a2191f] px-4 py-3 text-sm">
          {aviso}
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso"><X className="h-4 w-4" aria-hidden="true" /></button>
        </p>
      )}

      {/* Filtros */}
      <form
        className="bg-white p-4 mb-6 grid grid-cols-1 md:grid-cols-2 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)_minmax(0,1.2fr)_auto] gap-4 items-end"
        onSubmit={(e) => { e.preventDefault(); filtrar() }}
        aria-label="Filtros del reporte"
      >
        <div className="grid gap-2 min-w-0">
          <Label htmlFor="rf-periodo" className="flex items-center gap-1.5"><CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />Período operativo</Label>
          <Select value={borrador.periodo} onValueChange={set('periodo')}>
            <SelectTrigger id="rf-periodo"><SelectValue /></SelectTrigger>
            <SelectContent>{PERIODOS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
          </Select>
          {borrador.periodo === 'personalizado' && (
            <div className="grid grid-cols-2 gap-2">
              <Input aria-label="Desde" type="date" value={borrador.desde} max={borrador.hasta} onChange={(e) => set('desde')(e.target.value)} />
              <Input aria-label="Hasta" type="date" value={borrador.hasta} min={borrador.desde} max={isoLocal(new Date())} onChange={(e) => set('hasta')(e.target.value)} />
            </div>
          )}
        </div>
        <div className="grid gap-2 min-w-0">
          <Label htmlFor="rf-zona" className="flex items-center gap-1.5"><MapPin className="h-3.5 w-3.5" aria-hidden="true" />Eje territorial</Label>
          <Select value={borrador.zonaId} onValueChange={set('zonaId')}>
            <SelectTrigger id="rf-zona"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value={TODOS}>Todos los sectores (Valera centro y periferia)</SelectItem>
              {zonas.map((z) => <SelectItem key={z.id} value={z.id}>{z.nombre}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="grid gap-2 min-w-0">
          <Label htmlFor="rf-flujo" className="flex items-center gap-1.5"><Workflow className="h-3.5 w-3.5" aria-hidden="true" />Tipo de flujo operacional</Label>
          <Select value={borrador.flujo} onValueChange={set('flujo')}>
            <SelectTrigger id="rf-flujo"><SelectValue /></SelectTrigger>
            <SelectContent>{FLUJOS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button type="submit" className="bg-gray-900 hover:bg-gray-700 h-10" disabled={!rangoValido || isFetching}>
          <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden="true" /> Filtrar y actualizar
        </Button>
      </form>

      {isError && <p role="alert" className="mb-6 bg-danger-light text-[#a2191f] px-4 py-3 text-sm">No se pudo generar el reporte con los filtros indicados.</p>}

      {/* Indicadores principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Eficacia de entrega en ruta"
          icon={CircleCheck}
          tone="primary"
          loading={cargando}
          value={<>{pct(ind?.eficacia.valor)}<Tendencia delta={ind?.eficacia.delta} unidad=" pts" /></>}
          detail={ind && (
            <>
              <p className="flex justify-between gap-2"><span>{ind.eficacia.conformes} entregas conformes de {ind.eficacia.cerradas}</span><span className="font-mono text-success whitespace-nowrap">Meta ≥ {metas.eficaciaMinima}%</span></p>
              <Progreso valor={ind.eficacia.valor} tono={ind.eficacia.valor >= metas.eficaciaMinima ? 'bg-success' : 'bg-warning'} />
            </>
          )}
        />
        <KpiCard
          label="Tiempo promedio de ciclo"
          icon={Timer}
          tone="primary"
          loading={cargando}
          value={<>{num(ind?.ciclo.minutos)}<span className="font-sans text-sm font-normal text-gray-600 ml-1">min</span><Tendencia delta={ind?.ciclo.delta} unidad="min" mejorSiBaja /></>}
          detail={ind && (
            <>
              <p className="flex justify-between gap-2"><span>Salida de planta a entrega final ({ind.ciclo.entregas} entregas)</span><span className="font-mono whitespace-nowrap">Std: {metas.cicloEstandarMin} min</span></p>
              <Progreso valor={ind.ciclo.minutos} maximo={metas.cicloEstandarMin} tono={ind.ciclo.minutos <= metas.cicloEstandarMin ? 'bg-primary' : 'bg-danger'} />
            </>
          )}
        />
        <KpiCard
          label="Tasa de incidencias"
          icon={TriangleAlert}
          tone="danger"
          loading={cargando}
          value={<>{pct(ind?.incidencias.valor)}<Tendencia delta={ind?.incidencias.delta} unidad=" pts" mejorSiBaja /></>}
          detail={ind && (
            <>
              <p className="flex justify-between gap-2"><span>{ind.incidencias.casos} incidencias en {ind.incidencias.despachadas} paradas</span><span className="font-mono text-danger whitespace-nowrap">Umbral &lt; {metas.incidenciasMaxima}%</span></p>
              <Progreso valor={ind.incidencias.valor} maximo={metas.incidenciasMaxima * 2} tono={ind.incidencias.valor < metas.incidenciasMaxima ? 'bg-success' : 'bg-danger'} />
            </>
          )}
        />
        <KpiCard
          label="Logística inversa / retornos"
          icon={Undo2}
          loading={cargando}
          value={<>{pct(ind?.retornos.valor)}<Tendencia delta={ind?.retornos.delta} unidad=" pts" mejorSiBaja /></>}
          detail={ind && (
            <>
              <p className="flex justify-between gap-2">
                <span>{ind.retornos.casos} devoluciones: {ind.retornos.decisiones.REINGRESO} reingresos, {ind.retornos.decisiones.CUARENTENA} cuarentena, {ind.retornos.decisiones.DESCARTE} merma</span>
                <span className={cn('font-mono whitespace-nowrap', ind.retornos.cavaConforme === false ? 'text-danger' : 'text-success')}>
                  {ind.retornos.cavaConforme === null ? 'Cava s/ datos' : ind.retornos.cavaConforme ? 'Control cava OK' : 'Revisar cava'}
                </span>
              </p>
              <Progreso valor={ind.retornos.valor} maximo={metas.retornosMaximo * 2} tono={ind.retornos.valor < metas.retornosMaximo ? 'bg-success' : 'bg-danger'} />
            </>
          )}
        />
      </div>

      <div className="bg-white mb-6 flex flex-wrap border-b border-gray-100" role="group" aria-label="Secciones del reporte">
        {PESTANAS.map((p) => (
          <Pestana key={p.value} activa={vista === p.value} onClick={() => setVista(p.value)} icon={p.icon}>{p.label}</Pestana>
        ))}
      </div>

      {vista !== 'pruebas' && cargando && <div className="h-64 bg-white animate-pulse" />}

      {reporte && vista === 'entregas' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,3fr)_minmax(0,2fr)] gap-6">
            <SectoresPanel reporte={reporte} />
            <CausasPanel reporte={reporte} />
          </div>
          <BalanceResiduos reporte={reporte} />
        </div>
      )}
      {reporte && vista === 'incidencias' && <VistaIncidencias reporte={reporte} />}
      {reporte && vista === 'devoluciones' && <VistaDevoluciones reporte={reporte} />}
      {reporte && vista === 'residuos' && (
        <div className="space-y-6">
          <BalanceResiduos reporte={reporte} />
          <VistaResiduos reporte={reporte} />
        </div>
      )}
      {vista === 'pruebas' && <PruebasFuncionales />}

      <aside className="mt-6 flex gap-3 border-l-4 border-primary bg-white p-5 text-sm text-gray-700">
        <Info className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="font-semibold text-gray-900">Nota metodológica</p>
          <p>
            Los indicadores se calculan con consultas agregadas sobre las tablas de pedidos, despachos, incidencias, devoluciones,
            temperaturas manuales y residuos de PostgreSQL. <strong>Entrega conforme</strong>: parada entregada sin incidencias sobre el total de paradas cerradas;
            <strong> tiempo de ciclo</strong>: salida del despacho a entrega registrada. Cada indicador se compara con el periodo anterior de igual duración.
            {reporte?.datosDemo && ' El periodo incluye datos de demostración generados para la validación de la interfaz.'}
          </p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-gray-600"><ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />Metas de referencia: entrega conforme ≥ {metas?.eficaciaMinima ?? 92}%, ciclo ≤ {metas?.cicloEstandarMin ?? 40} min, incidencias &lt; {metas?.incidenciasMaxima ?? 5}%, retornos &lt; {metas?.retornosMaximo ?? 3}%.</p>
        </div>
      </aside>

      {personalizado && <ReportePersonalizadoDialog zonas={zonas} onGenerar={descargar} onClose={() => setPersonalizado(false)} />}
    </div>
  )
}
