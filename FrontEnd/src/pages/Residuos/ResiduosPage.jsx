import { useDeferredValue, useState } from 'react'
import {
  Droplets, Wheat, Recycle, BadgeCheck, FileText, Plus, ShieldCheck, Search, Download, RefreshCw,
  ClipboardList, Building2, Truck, ChartColumn, BookOpen, TriangleAlert, Route, X,
} from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Pestana, Panel } from '@/components/layout/ModuloUI'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { KpiCard } from '@/components/ui/KpiCard'
import { DataTable } from '@/components/ui/Table'
import { PaginacionServidor } from '@/components/ui/PaginacionServidor'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { usePermissions } from '@/hooks/usePermissions'
import { useResiduos, useResiduosResumen } from '@/services/query/useResiduos'
import { residuoService } from '@/services/residuoService'
import { descargarArchivo } from '@/services/trazabilidadService'
import { ESTADOS_RESIDUO } from '@/schemas/residuoSchema'
import { cn } from '@/lib/utils'
import { RegistroResiduo } from './components/RegistroResiduo'
import { ResiduoDialog } from './components/ResiduoDialog'
import { VistaGestores, VistaRetiros, VistaIndicadores } from './components/Vistas'
import { columnasResiduos } from './components/columnas'
import { cantidad, fecha, mensajeError } from './components/formato'

// Agrupación de los tipos del catálogo en las cuatro tarjetas del Figma
const ACEITE = ['RES-004']
const MERMA = ['RES-001', 'RES-005']
const SOLIDOS = ['RES-002', 'RES-003']

const TODOS = 'TODOS'
const hoy = () => new Date().toISOString().slice(0, 10)

// Total de un grupo de tipos: valor principal en la unidad indicada y el resto como detalle
function totalGrupo(porTipo = [], codigos, unidad) {
  const tipos = porTipo.filter((t) => codigos.includes(t.codigo))
  const cantidades = tipos.flatMap((t) => t.cantidades)
  return {
    principal: cantidades.filter((c) => c.unidad === unidad).reduce((s, c) => s + c.total, 0),
    otras: cantidades.filter((c) => c.unidad !== unidad),
    registros: tipos.reduce((s, t) => s + t.registros, 0),
    desdeDevolucion: tipos.reduce((s, t) => s + t.desdeDevolucion, 0),
    destino: tipos.map((t) => t.destinoHabitual).find(Boolean),
  }
}

const NORMAS = [
  {
    titulo: 'Almacenamiento seguro de aceites',
    texto: 'Los tambores de aceite vegetal usado deben rotularse inmediatamente y ubicarse sobre tarimas de contención, alejados de hornos y fuentes de calor.',
  },
  {
    titulo: 'Protocolo estricto de inocuidad',
    texto: 'La merma derivada de devoluciones con quiebre de frío no puede retornar al proceso productivo bajo ninguna circunstancia: su destino es exclusivamente este módulo.',
    alerta: true,
  },
  {
    titulo: 'Enfoque de sostenibilidad',
    texto: 'Este módulo complementa la logística inversa y aporta trazabilidad ambiental verificable sin sobredimensionar la complejidad técnica del sistema.',
  },
]

const CIRCUITO = [
  { titulo: 'Almacenamiento seguro (planta)', texto: 'Área techada y ventilada contigua al muelle. Tambores de polietileno de alta densidad con precinto foliado.' },
  { titulo: 'Destino orgánico (compost)', texto: 'Mermas degradables de masa y rechazos térmicos se trasvasan a contenedores herméticos para compostaje agronómico.' },
  { titulo: 'Valorización de sólidos y aceite', texto: 'Aceite usado y cartón clasificado se entregan a gestores autorizados con emisión del manifiesto de disposición final.' },
]

export default function ResiduosPage() {
  const { can } = usePermissions()
  const [vista, setVista] = useState('bitacora')
  const [search, setSearch] = useState('')
  const [tipo, setTipo] = useState(TODOS)
  const [estado, setEstado] = useState(TODOS)
  const [gestorFiltro, setGestorFiltro] = useState(null)
  const [page, setPage] = useState(1)
  const [abierto, setAbierto] = useState(null)
  const [descarga, setDescarga] = useState(null)
  const [aviso, setAviso] = useState(null)
  const busqueda = useDeferredValue(search)

  const filtros = {
    search: busqueda.trim(),
    ...(tipo !== TODOS && { tipoResiduoId: tipo }),
    ...(estado !== TODOS && { estado }),
    ...(gestorFiltro && { gestorId: gestorFiltro }),
  }
  const { data, isLoading, isError, refetch, isFetching } = useResiduos(filtros, { page, limit: 10 })
  const { data: resumen, isLoading: cargandoResumen } = useResiduosResumen()
  const residuos = data?.data || []
  const tipos = resumen?.porTipo || []
  const gestores = resumen?.gestores || []
  const gestorFiltrado = gestores.find((g) => g.id === gestorFiltro)

  const aceite = totalGrupo(tipos, ACEITE, 'litros')
  const merma = totalGrupo(tipos, MERMA, 'kg')
  const solidos = totalGrupo(tipos, SOLIDOS, 'kg')

  const filtrar = (fn) => (v) => { fn(v); setPage(1) }

  const descargar = async (clave, pedir, nombre, porDefecto) => {
    setDescarga(clave)
    setAviso(null)
    try {
      descargarArchivo(await pedir(), nombre)
    } catch (err) {
      setAviso(await mensajeError(err, porDefecto))
    } finally {
      setDescarga(null)
    }
  }
  const exportarCsv = () => descargar('csv', () => residuoService.exportCsv(filtros), `residuos-${hoy()}.csv`, 'No se pudo exportar la bitácora')
  const manifiesto = (params = {}) =>
    descargar('manifiesto', () => residuoService.manifiestoPdf(params), `manifiesto-residuos-${hoy()}.pdf`, 'No se pudo generar el manifiesto')

  const irARegistro = () => {
    setVista('bitacora')
    // Tras cambiar de pestaña el formulario ya está montado
    setTimeout(() => document.getElementById('rs-tipo')?.focus(), 0)
  }

  const verRegistrosGestor = (id) => {
    setGestorFiltro(id)
    setPage(1)
    setVista('bitacora')
  }

  const trazable = resumen?.trazabilidad

  return (
    <div>
      <PageHeader
        modulo="08"
        seccion="Sostenibilidad operativa y control de desechos"
        title="Gestión de Residuos Operativos"
        description="Registro, clasificación y control de disposición ambiental de residuos sólidos, orgánicos de manufactura y aceite vegetal usado en la planta de SuperTequeños C.A. (El Murachí, Valera)."
        actions={
          <>
            {can('residuos.export') && (
              <Button variant="outline" onClick={() => manifiesto()} loading={descarga === 'manifiesto'} disabled={!!descarga}>
                {descarga !== 'manifiesto' && <FileText className="h-4 w-4" aria-hidden="true" />} Manifiesto de entrega ambiental
              </Button>
            )}
            {can('residuos.create') && (
              <Button size="lg" onClick={irARegistro}>
                <Plus className="h-5 w-5" aria-hidden="true" /> Registrar nuevo residuo
              </Button>
            )}
          </>
        }
      >
        {trazable && trazable.vigentes > 0 && (
          <p className="mt-4 inline-flex flex-wrap items-center gap-x-4 gap-y-1 border border-gray-200 px-4 py-2 text-sm">
            <span className="flex items-center gap-2 text-gray-700">
              <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
              Destino seguro: <strong className="text-gray-900">{trazable.porcentaje}% trazable</strong>
            </span>
            <span className={cn('font-mono text-xs', resumen.pendientesSinGestor ? 'text-danger' : 'text-success')}>
              {resumen.pendientesSinGestor ? `${resumen.pendientesSinGestor} registro(s) sin gestor asignado` : 'Todos los registros con destino asignado'}
            </span>
          </p>
        )}
      </PageHeader>

      {aviso && (
        <p role="alert" className="mb-6 flex items-center justify-between gap-3 bg-danger-light text-[#a2191f] px-4 py-3 text-sm">
          {aviso}
          <button type="button" onClick={() => setAviso(null)} aria-label="Cerrar aviso"><X className="h-4 w-4" aria-hidden="true" /></button>
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          className="border-l-4 border-primary"
          label="Aceite de cocina usado (ACU)"
          icon={Droplets}
          tone="primary"
          loading={cargandoResumen}
          value={<>{cantidad(aceite.principal)}<span className="font-sans text-sm font-normal text-gray-600 ml-1">litros</span></>}
          detail={
            <>
              <p>{aceite.registros} registro(s) este mes</p>
              <p className="flex items-center gap-1.5 mt-1"><Truck className="h-3.5 w-3.5" aria-hidden="true" />Destino: {aceite.destino || 'sin gestor habitual'}</p>
            </>
          }
        />
        <KpiCard
          className="border-l-4 border-danger"
          label="Descarte de masa / merma"
          icon={Wheat}
          tone="danger"
          loading={cargandoResumen}
          value={<>{cantidad(merma.principal)}<span className="font-sans text-sm font-normal text-gray-600 ml-1">kg</span></>}
          detail={
            <>
              {merma.otras.length > 0 && <p>+ {merma.otras.map((c) => `${cantidad(c.total)} ${c.unidad}`).join(' · ')}</p>}
              <p className={merma.desdeDevolucion ? 'text-danger' : undefined}>
                {merma.desdeDevolucion ? `Incluye ${merma.desdeDevolucion} descarte(s) de devoluciones` : 'Sin descartes de devoluciones este mes'}
              </p>
              <p className="flex items-center gap-1.5 mt-1"><Truck className="h-3.5 w-3.5" aria-hidden="true" />Destino: {merma.destino || 'sin gestor habitual'}</p>
            </>
          }
        />
        <KpiCard
          className="border-l-4 border-gray-500"
          label="Residuos sólidos (plást./cartón)"
          icon={Recycle}
          loading={cargandoResumen}
          value={<>{cantidad(solidos.principal)}<span className="font-sans text-sm font-normal text-gray-600 ml-1">kg clasificados</span></>}
          detail={
            <>
              <p>{solidos.registros} registro(s) este mes{solidos.otras.length > 0 && ` · + ${solidos.otras.map((c) => `${cantidad(c.total)} ${c.unidad}`).join(' · ')}`}</p>
              <p className="flex items-center gap-1.5 mt-1"><Truck className="h-3.5 w-3.5" aria-hidden="true" />Destino: {solidos.destino || 'sin gestor habitual'}</p>
            </>
          }
        />
        <KpiCard
          className="border-l-4 border-success"
          label="Entregas a gestores"
          icon={BadgeCheck}
          tone="success"
          loading={cargandoResumen}
          value={<>{String(resumen?.retiros.periodo ?? 0).padStart(2, '0')}<span className="font-sans text-sm font-normal text-gray-600 ml-1">retiros este mes</span></>}
          detail={
            <>
              <p className={resumen?.pendientesRetiro ? 'text-[#8a3800]' : 'text-success'}>
                {resumen?.pendientesRetiro ? `${resumen.pendientesRetiro} registro(s) por retirar` : 'Sin residuos pendientes en planta'}
              </p>
              <p className="mt-1">{resumen?.retiros.ultimo ? `Último retiro: ${fecha(resumen.retiros.ultimo.fecha)} (${resumen.retiros.ultimo.gestor})` : 'Sin retiros registrados'}</p>
            </>
          }
        />
      </div>

      <div className="bg-white mb-6 flex overflow-x-auto overflow-y-hidden border-b border-gray-100" role="group" aria-label="Vistas del módulo">
        <Pestana activa={vista === 'bitacora'} onClick={() => setVista('bitacora')} icon={ClipboardList} contador={data?.pagination?.total}>Bitácora de residuos generados</Pestana>
        <Pestana activa={vista === 'gestores'} onClick={() => setVista('gestores')} icon={Building2}>Gestores y destinos finales</Pestana>
        <Pestana activa={vista === 'retiros'} onClick={() => setVista('retiros')} icon={Truck} contador={resumen?.pendientesRetiro}>Manifiestos y retiros</Pestana>
        <Pestana activa={vista === 'indicadores'} onClick={() => setVista('indicadores')} icon={ChartColumn}>Indicadores de sostenibilidad</Pestana>
      </div>

      {vista === 'bitacora' && (
        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
          <div className="min-w-0 space-y-6">
            <div className="bg-white p-4 flex flex-wrap items-center gap-3">
              <div className="relative flex-1 min-w-[14rem]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-600 pointer-events-none" aria-hidden="true" />
                <Input aria-label="Buscar residuos" placeholder="Buscar por N° de registro, origen, devolución o gestor…" value={search} onChange={(e) => filtrar(setSearch)(e.target.value)} className="pl-9" />
              </div>
              <Select value={tipo} onValueChange={filtrar(setTipo)}>
                <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por tipo"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Tipo: todos los residuos</SelectItem>
                  {tipos.map((t) => <SelectItem key={t.id} value={t.id}>{t.nombre}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={estado} onValueChange={filtrar(setEstado)}>
                <SelectTrigger className="w-full sm:w-52" aria-label="Filtrar por estado"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value={TODOS}>Estado: todos</SelectItem>
                  {ESTADOS_RESIDUO.map((e) => <SelectItem key={e.value} value={e.value}>{e.label}</SelectItem>)}
                </SelectContent>
              </Select>
              {can('residuos.export') && (
                <Button variant="outline" onClick={exportarCsv} loading={descarga === 'csv'} disabled={!!descarga}>
                  {descarga !== 'csv' && <Download className="h-4 w-4" aria-hidden="true" />} CSV
                </Button>
              )}
              <Button variant="outline" size="icon" onClick={() => refetch()} aria-label="Actualizar bitácora" title="Actualizar">
                <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} aria-hidden="true" />
              </Button>
              {gestorFiltrado && (
                <button type="button" onClick={() => filtrar(setGestorFiltro)(null)} className="inline-flex items-center gap-1.5 bg-primary-light text-[#002d9c] px-3 py-1.5 text-xs">
                  Gestor: {gestorFiltrado.nombre} <X className="h-3.5 w-3.5" aria-label="Quitar filtro de gestor" />
                </button>
              )}
            </div>

            <section className="bg-white" aria-labelledby="registros-residuos">
              <div className="flex flex-wrap items-center justify-between gap-2 p-4">
                <h2 id="registros-residuos" className="label-caps text-gray-900">
                  Registros operativos de residuos <span className="font-mono normal-case tracking-normal text-gray-600">({residuos.length} ítems en vista)</span>
                </h2>
                <span className="text-xs text-gray-600">Planta El Murachí · Control diario</span>
              </div>
              {isError ? (
                <p role="alert" className="bg-danger-light text-[#a2191f] px-4 py-3 text-sm">No se pudieron cargar los residuos.</p>
              ) : (
                <>
                  <DataTable
                    columns={columnasResiduos()}
                    data={residuos}
                    loading={isLoading}
                    sortable={false}
                    pagination={false}
                    showPagination={false}
                    onRowClick={(r) => setAbierto(r.id)}
                    emptyMessage={search || tipo !== TODOS || estado !== TODOS || gestorFiltro ? 'Ningún residuo coincide con los filtros.' : 'Aún no hay residuos registrados.'}
                  />
                  <PaginacionServidor pagination={data?.pagination} onPageChange={setPage} etiqueta="registros" />
                </>
              )}
            </section>

            <Panel titulo="Circuito de disposición y logística inversa local" icon={Route} extra={<span className="font-mono text-xs text-success">Eje Valera · Carvajal</span>}>
              <ol className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {CIRCUITO.map((p, i) => (
                  <li key={p.titulo} className="border-l-2 border-primary bg-gray-50 p-4">
                    <p className="text-sm font-semibold text-gray-900">{i + 1}. {p.titulo}</p>
                    <p className="mt-2 text-xs text-gray-600">{p.texto}</p>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-1 gap-6 content-start min-w-0">
            {can('residuos.create') && <RegistroResiduo tipos={tipos} gestores={gestores} />}
            <Panel titulo="Normas y procedimientos internos de planta" icon={BookOpen}>
              <ol className="space-y-4">
                {NORMAS.map((n, i) => (
                  <li key={n.titulo} className="flex gap-3">
                    {n.alerta ? (
                      <TriangleAlert className="h-5 w-5 text-danger flex-shrink-0" aria-hidden="true" />
                    ) : (
                      <span className="font-mono text-xs bg-gray-100 h-5 min-w-5 px-1 flex items-center justify-center flex-shrink-0">{String(i + 1).padStart(2, '0')}</span>
                    )}
                    <div>
                      <p className={cn('text-sm font-semibold', n.alerta ? 'text-danger' : 'text-gray-900')}>{n.titulo}</p>
                      <p className="text-xs text-gray-600">{n.texto}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </Panel>
          </div>
        </div>
      )}

      {vista === 'gestores' && (
        <VistaGestores gestores={gestores} cargando={cargandoResumen} onVerRegistros={verRegistrosGestor} onManifiesto={manifiesto} />
      )}

      {vista === 'retiros' && (
        <VistaRetiros gestores={gestores} resumen={resumen} onAbrir={setAbierto} onManifiesto={manifiesto} generando={descarga === 'manifiesto'} />
      )}

      {vista === 'indicadores' && <VistaIndicadores resumen={resumen} cargando={cargandoResumen} />}

      {abierto && <ResiduoDialog id={abierto} gestores={gestores} onClose={() => setAbierto(null)} />}
    </div>
  )
}
