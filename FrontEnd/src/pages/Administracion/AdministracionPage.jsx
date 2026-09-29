import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { UserPlus, Users, ShieldCheck, SlidersHorizontal, Factory, IdCard, Bike, Snowflake, Database, GraduationCap } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Pestana, Pestanas } from '@/components/layout/ModuloUI'
import { Button } from '@/components/ui/Button'
import { KpiCard } from '@/components/ui/KpiCard'
import { usePermissions } from '@/hooks/usePermissions'
import { useAdministracionResumen, useParametrosPlanta } from '@/services/query/useAdministracion'
import { cn } from '@/lib/utils'
import { UsuariosPanel } from './components/UsuariosPanel'
import { RolesResumen, MatrizPermisos, CatalogosNegocio, ParametrosPlanta, MonitorAuditoria } from './components/Paneles'

const VISTAS = ['usuarios', 'roles', 'catalogos', 'parametros']
const TIPO_VEHICULO = { MOTO: 'moto', MOTOCICLETA: 'moto', FURGON: 'furgón', CAMIONETA: 'camioneta', CAMION: 'camión', CARRO: 'carro', SIN_VEHICULO: 'sin vehículo' }

export default function AdministracionPage() {
  const { can } = usePermissions()
  const [params, setParams] = useSearchParams()
  const vista = VISTAS.includes(params.get('vista')) ? params.get('vista') : 'usuarios'
  const cambiarVista = (v) => setParams({ vista: v }, { replace: true })
  const [nuevoUsuario, setNuevoUsuario] = useState(false)
  const { data: resumen, isLoading } = useAdministracionResumen()
  const { data: parametros } = useParametrosPlanta()

  const cuentas = resumen?.cuentas
  const cava = resumen?.cava
  const vehiculos = Object.entries(resumen?.enRuta.vehiculos || {}).map(([t, n]) => `${n} ${TIPO_VEHICULO[t] || t.toLowerCase()}`).join(' · ')
  const catalogos = resumen?.catalogos || []
  const conforme = cava && cava.temperaturaC <= cava.limiteC

  return (
    <div>
      <PageHeader
        modulo="10"
        seccion="Seguridad, control de acceso y parámetros"
        title="Administración y Configuración del Sistema"
        description="Gestión de usuarios locales, asignación de roles por perfiles operativos, catálogos de causas y parámetros generales de LogiTrace (Planta El Murachí, Valera)."
        actions={can('admin.usuarios.create') && (
          <Button size="lg" onClick={() => { cambiarVista('usuarios'); setNuevoUsuario(true) }}>
            <UserPlus className="h-5 w-5" aria-hidden="true" /> Registrar nuevo usuario
          </Button>
        )}
      >
        <Pestanas etiqueta="Vistas de administración">
          <Pestana activa={vista === 'usuarios'} onClick={() => cambiarVista('usuarios')} icon={Users} contador={cuentas?.activas}>Usuarios y accesos</Pestana>
          <Pestana activa={vista === 'roles'} onClick={() => cambiarVista('roles')} icon={ShieldCheck}>Roles y permisos RBAC</Pestana>
          <Pestana activa={vista === 'catalogos'} onClick={() => cambiarVista('catalogos')} icon={SlidersHorizontal}>Catálogos del negocio</Pestana>
          <Pestana activa={vista === 'parametros'} onClick={() => cambiarVista('parametros')} icon={Factory}>Parámetros de planta</Pestana>
        </Pestanas>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-6">
        <KpiCard
          label="Cuentas activas"
          icon={IdCard}
          tone="primary"
          loading={isLoading}
          value={<>{cuentas?.activas ?? 0}<span className="font-sans text-sm font-normal text-gray-600 ml-2">de {cuentas?.total ?? 0}</span></>}
          detail={cuentas && (cuentas.activas === cuentas.total ? <span className="text-success">100 % operativas</span> : `${cuentas.total - cuentas.activas} cuenta(s) desactivada(s)`)}
        />
        <KpiCard
          label="En ruta activa"
          icon={Bike}
          tone="success"
          loading={isLoading}
          value={<>{resumen?.enRuta.despachos ?? 0}<span className="font-sans text-sm font-normal text-gray-600 ml-2">despacho(s)</span></>}
          detail={vehiculos || 'Ningún despacho en ruta'}
        />
        <KpiCard
          label="Control de inocuidad"
          icon={Snowflake}
          tone={cava && !conforme ? 'danger' : 'primary'}
          loading={isLoading}
          value={cava ? <>{cava.temperaturaC.toFixed(1)}<span className="font-sans text-sm font-normal text-gray-600 ml-1">°C</span></> : '—'}
          detail={cava
            ? <><p className={conforme ? 'text-success' : 'text-danger'}>{conforme ? 'Dentro del límite' : 'Fuera del límite'} (objetivo {cava.objetivoC} °C · máx. {cava.limiteC} °C)</p><p>{cava.ubicacion?.nombre} · {new Date(cava.fechaHora).toLocaleString('es-VE', { dateStyle: 'short', timeStyle: 'short' })}</p></>
            : 'Sin mediciones de cava registradas'}
        />
        <KpiCard
          label="Catálogos maestros"
          icon={Database}
          loading={isLoading}
          value={<>{catalogos.length}<span className="font-sans text-sm font-normal text-gray-600 ml-2">{catalogos.reduce((s, c) => s + c.activos, 0)} registros activos</span></>}
          detail={catalogos.length ? catalogos.map((c) => `${c.activos}/${c.total}`).join(' · ') + ' (causas, retornos, residuos, zonas)' : null}
        />
      </div>

      {vista === 'usuarios' && (
        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
          <div className="min-w-0 space-y-6">
            <UsuariosPanel onNuevo={{ abierto: nuevoUsuario, cerrar: () => setNuevoUsuario(false) }} />
            {can('admin.roles.list') && <MonitorAuditoria resumen={resumen?.auditoria} />}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-1 gap-6 content-start min-w-0">
            <RolesResumen porRol={cuentas?.porRol} />
            <ParametrosPlanta parametros={parametros} />
          </div>
        </div>
      )}

      {vista === 'roles' && (
        <div className="grid grid-cols-1 2xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6">
          <MatrizPermisos />
          <RolesResumen porRol={cuentas?.porRol} />
        </div>
      )}

      {vista === 'catalogos' && <CatalogosNegocio resumenCatalogos={catalogos} />}

      {vista === 'parametros' && (
        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-6 items-start">
          <ParametrosPlanta parametros={parametros} detallado />
          <MonitorAuditoria resumen={resumen?.auditoria} />
        </div>
      )}

      <aside className={cn('mt-6 flex gap-3 border-l-4 border-primary bg-white p-5 text-sm text-gray-700')}>
        <GraduationCap className="h-5 w-5 text-primary flex-shrink-0" aria-hidden="true" />
        <div>
          <p className="font-mono text-xs uppercase tracking-wider text-primary">Validación académica</p>
          <p className="mt-1">
            <strong>Nota de alcance:</strong> la seguridad implementa un control de acceso basado en roles (RBAC) con cuatro perfiles,
            verificado en cada solicitud contra la base de datos, y un registro de auditoría de inicios de sesión y operaciones,
            dimensionados a las necesidades de SuperTequeños C.A. sin dependencias externas.
          </p>
        </div>
      </aside>
    </div>
  )
}
