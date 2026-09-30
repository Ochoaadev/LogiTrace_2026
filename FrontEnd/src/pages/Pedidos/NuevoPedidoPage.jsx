import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ReceiptText, FilePlus2, History, UserRound, Package, MapPinned, Plus, Trash2, Save, CircleCheck, CircleAlert, Sparkles } from 'lucide-react'
import { PageHeader } from '@/components/layout/PageHeader'
import { Pestana, Pestanas, Panel } from '@/components/layout/ModuloUI'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Label } from '@/components/ui/Label'
import { Textarea } from '@/components/ui/Textarea'
import { Badge } from '@/components/ui/Badge'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { MapaSelector } from '@/components/MapaSelector'
import { useProductos, useZonas, useTiposSector } from '@/services/query/useCatalogos'
import { useCreatePedido } from '@/services/query/usePedidos'
import { pedidoService } from '@/services/pedidoService'
import { PRIORIDADES, getPrioridadConfig } from '@/schemas/pedidoSchema'
import { areaSugerida, textoDistancia } from '@/lib/zonas'
import { cn } from '@/lib/utils'
import { ClienteSelector } from './ClienteSelector'

const SIN_ZONA = 'SIN_ZONA'
const ITEM_VACIO = { productoId: '', cantidad: '' }
const mensaje = (err, porDefecto) => err?.errors?.map((e) => e.mensaje).join(' · ') || err?.message || porDefecto
const hoyISO = () => new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().slice(0, 10)

/** Selector de zona de despacho o tipo de sector con la sugerencia calculada desde el mapa. */
function CampoArea({ id, etiqueta, vacio, genero, valor, opciones, sugerida, ubicacion, onElegir }) {
  return (
    <div className="grid gap-2 content-start">
      <Label htmlFor={id}>{etiqueta}</Label>
      <Select value={valor} onValueChange={onElegir}>
        <SelectTrigger id={id}><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value={SIN_ZONA}>{vacio}</SelectItem>
          {opciones.map((o) => <SelectItem key={o.id} value={o.id}>{o.nombre}</SelectItem>)}
        </SelectContent>
      </Select>
      {sugerida && (
        valor === sugerida.zona.id ? (
          <p className="flex items-center gap-1.5 text-xs text-gray-600">
            <Sparkles className="h-3.5 w-3.5 text-primary flex-shrink-0" aria-hidden="true" />
            Sugerido por la ubicación (a {textoDistancia(sugerida.metros)} del centro)
          </p>
        ) : (
          <button type="button" className="text-left text-xs text-primary hover:underline" onClick={() => onElegir(sugerida.zona.id)}>
            Según la ubicación: {sugerida.zona.nombre}. Usar
          </button>
        )
      )}
      {ubicacion && !sugerida && opciones.some((o) => o.latitudCentro != null) && (
        <p className="text-xs text-[#8a3800]">El punto queda fuera de las áreas marcadas: elija {genero} a mano.</p>
      )}
    </div>
  )
}

/**
 * Registro de pedidos ("emisión rápida"). Antes la pantalla enviaba los productos en un campo que
 * el backend no reconoce y omitía la dirección obligatoria: ningún pedido podía registrarse desde
 * la interfaz. Ahora también guarda la ubicación de entrega (mapa o GPS) que usan los mapas de
 * despacho, trazabilidad y la ruta del repartidor.
 */
export default function NuevoPedidoPage() {
  const navigate = useNavigate()
  const crear = useCreatePedido()
  const { data: productosData } = useProductos({ activo: 'true' }, { page: 1, limit: 100 })
  const { data: zonasData } = useZonas({ activo: 'true' }, { page: 1, limit: 100 })
  const { data: sectoresData } = useTiposSector({ activo: 'true' }, { page: 1, limit: 100 })
  const productos = productosData?.data || []
  const zonas = zonasData?.data || []
  const sectores = sectoresData?.data || []

  const [form, setForm] = useState({
    clienteId: '', telefonoContacto: '', metodoEntrega: 'DOMICILIO', direccionEntrega: '', referenciaEntrega: '',
    zonaId: SIN_ZONA, tipoSectorId: SIN_ZONA, prioridad: 'NORMAL', fechaEntrega: '', observaciones: '',
  })
  const [items, setItems] = useState([{ ...ITEM_VACIO }])
  const [ubicacion, setUbicacion] = useState(null)
  const [cliente, setCliente] = useState(null)
  // Zona de despacho y tipo de sector sugeridos desde el punto de entrega: { zonaId: {zona, metros}, tipoSectorId: … }
  const [sugeridas, setSugeridas] = useState({})
  const [manual, setManual] = useState({}) // lo que el operador eligió a mano no se sobrescribe
  const [anterior, setAnterior] = useState(null) // último pedido del cliente (para reutilizar su dirección)
  const [error, setError] = useState(null)
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }))

  const retiro = form.metodoEntrega === 'RETIRO_EN_ESTABLECIMIENTO'
  const itemsValidos = items.filter((i) => i.productoId && Number(i.cantidad) >= 1)
  const repetidos = new Set(items.map((i) => i.productoId).filter(Boolean)).size !== items.filter((i) => i.productoId).length
  const valido = form.clienteId && itemsValidos.length === items.length && !repetidos && (retiro || form.direccionEntrega.trim())
  const unidades = itemsValidos.reduce((s, i) => s + Number(i.cantidad), 0)

  const elegirCliente = async (c) => {
    setCliente(c)
    setForm((f) => ({ ...f, clienteId: c?.id || '', telefonoContacto: c ? f.telefonoContacto || c.telefono || '' : '' }))
    setAnterior(null)
    if (!c) return
    try {
      const { data } = await pedidoService.getByCliente(c.id, { page: 1, limit: 1 })
      setAnterior(data?.[0] || null)
    } catch {
      // sin historial disponible: el formulario sigue igual
    }
  }

  // Al marcar la entrega se proponen zona y sector (el área más pequeña que contenga el punto),
  // salvo en los campos que el operador ya eligió a mano
  const calcularSugeridas = (punto) => ({ zonaId: areaSugerida(zonas, punto), tipoSectorId: areaSugerida(sectores, punto) })
  const cambiarUbicacion = (punto, fijados = manual) => {
    setUbicacion(punto)
    const s = calcularSugeridas(punto)
    setSugeridas(s)
    setForm((f) => {
      const nuevo = { ...f }
      for (const k of ['zonaId', 'tipoSectorId']) if (!fijados[k]) nuevo[k] = s[k] ? s[k].zona.id : SIN_ZONA
      return nuevo
    })
  }
  const elegirArea = (campo) => (id) => {
    setManual((m) => ({ ...m, [campo]: id !== SIN_ZONA }))
    set(campo)(id)
  }

  const usarAnterior = () => {
    setForm((f) => ({
      ...f,
      direccionEntrega: anterior.direccionEntrega || '',
      referenciaEntrega: anterior.referenciaEntrega || '',
      zonaId: anterior.zonaId || SIN_ZONA,
      telefonoContacto: anterior.telefonoContacto || f.telefonoContacto,
    }))
    // La zona del pedido anterior se respeta solo si sigue vigente
    const zonaVigente = zonas.some((z) => z.id === anterior.zonaId)
    const fijados = { zonaId: zonaVigente }
    setManual(fijados)
    if (!zonaVigente) setForm((f) => ({ ...f, zonaId: SIN_ZONA }))
    if (anterior.latitudEntrega && anterior.longitudEntrega) {
      cambiarUbicacion({ lat: Number(anterior.latitudEntrega), lng: Number(anterior.longitudEntrega) }, fijados)
    }
  }

  const cambiarItem = (i, k, v) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, [k]: v } : x)))

  const onSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    try {
      const { data } = await crear.mutateAsync({
        clienteId: form.clienteId,
        metodoEntrega: form.metodoEntrega,
        prioridad: form.prioridad,
        direccionEntrega: retiro ? 'Retiro en planta El Murachí' : form.direccionEntrega.trim(),
        ...(form.referenciaEntrega.trim() && { referenciaEntrega: form.referenciaEntrega.trim() }),
        ...(form.zonaId !== SIN_ZONA && { zonaId: form.zonaId }),
        ...(!retiro && form.tipoSectorId !== SIN_ZONA && { tipoSectorId: form.tipoSectorId }),
        ...(form.telefonoContacto.trim() && { telefonoContacto: form.telefonoContacto.trim() }),
        ...(form.fechaEntrega && { fechaEntrega: new Date(`${form.fechaEntrega}T12:00:00`).toISOString() }),
        ...(form.observaciones.trim() && { observaciones: form.observaciones.trim() }),
        ...(ubicacion && !retiro && { latitudEntrega: ubicacion.lat.toFixed(6), longitudEntrega: ubicacion.lng.toFixed(6) }),
        items: items.map((i) => ({ productoId: i.productoId, cantidad: Number(i.cantidad), unidad: productos.find((p) => p.id === i.productoId)?.unidadBase || 'unidad' })),
      })
      navigate(`/pedidos/${data.id}`)
    } catch (err) {
      setError(mensaje(err, 'No se pudo registrar el pedido'))
    }
  }

  return (
    <div>
      <PageHeader
        modulo="02"
        seccion="Operaciones de planta & despacho · emisión"
        title="Registrar nuevo pedido"
        description="Emisión rápida de pedidos de preventa: cliente, productos y punto de entrega. El pedido queda registrado y listo para preparación en cava."
      >
        <Pestanas etiqueta="Vistas de pedidos">
          <Pestana activa={false} onClick={() => navigate('/pedidos')} icon={ReceiptText}>Listado de pedidos (activos)</Pestana>
          <Pestana activa onClick={() => {}} icon={FilePlus2}>Nuevo pedido / emisión rápida</Pestana>
          <Pestana activa={false} onClick={() => navigate('/pedidos?vista=historial')} icon={History}>Historial y consulta</Pestana>
        </Pestanas>
      </PageHeader>

      <form onSubmit={onSubmit} className="grid grid-cols-1 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-6 items-start">
        <div className="min-w-0 space-y-6">
          <Panel titulo="1 · Cliente y contacto" icon={UserRound}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="grid gap-2 md:col-span-2">
                <Label htmlFor="np-cliente">Cliente *</Label>
                <ClienteSelector cliente={cliente} onElegir={elegirCliente} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="np-tel">Teléfono de contacto</Label>
                <Input id="np-tel" maxLength={30} placeholder="0271-0000000" value={form.telefonoContacto} onChange={(e) => set('telefonoContacto')(e.target.value)} />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="np-prioridad">Prioridad</Label>
                <Select value={form.prioridad} onValueChange={set('prioridad')}>
                  <SelectTrigger id="np-prioridad"><SelectValue /></SelectTrigger>
                  <SelectContent>{PRIORIDADES.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            </div>
          </Panel>

          <Panel
            titulo="2 · Productos"
            icon={Package}
            extra={<Button type="button" variant="secondary" size="sm" onClick={() => setItems((xs) => [...xs, { ...ITEM_VACIO }])}><Plus className="h-4 w-4" aria-hidden="true" /> Agregar producto</Button>}
          >
            <ul className="space-y-3">
              {items.map((item, i) => {
                const producto = productos.find((p) => p.id === item.productoId)
                const repetido = item.productoId && items.findIndex((x) => x.productoId === item.productoId) !== i
                return (
                  <li key={i} className="grid grid-cols-[minmax(0,1fr)_7rem_auto] gap-2 items-end bg-gray-50 p-3">
                    <div className="grid gap-1.5 min-w-0">
                      <Label htmlFor={`np-prod-${i}`} className="text-xs">Producto {i + 1}</Label>
                      <Select value={item.productoId} onValueChange={(v) => cambiarItem(i, 'productoId', v)}>
                        <SelectTrigger id={`np-prod-${i}`} className="bg-white" error={repetido ? 'repetido' : undefined}><SelectValue placeholder="Seleccione…" /></SelectTrigger>
                        <SelectContent>{productos.map((p) => <SelectItem key={p.id} value={p.id}>{p.nombre} · {p.codigo}</SelectItem>)}</SelectContent>
                      </Select>
                    </div>
                    <div className="grid gap-1.5">
                      <Label htmlFor={`np-cant-${i}`} className="text-xs">Cantidad{producto ? ` (${producto.unidadBase})` : ''}</Label>
                      <Input id={`np-cant-${i}`} type="number" min="1" step="1" inputMode="numeric" value={item.cantidad} onChange={(e) => cambiarItem(i, 'cantidad', e.target.value)} className="bg-white font-mono" />
                    </div>
                    <Button type="button" variant="ghost" size="icon" className="text-danger" aria-label={`Quitar producto ${i + 1}`} disabled={items.length === 1} onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}>
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    {repetido && <p className="col-span-3 text-xs text-danger">Este producto ya está en el pedido: sume la cantidad en la línea anterior.</p>}
                  </li>
                )
              })}
            </ul>
            <p className="mt-3 text-xs text-gray-600">Las cantidades se expresan en la unidad base de cada producto, la misma con la que se descuenta el inventario de la cava.</p>
          </Panel>

          <Panel titulo="3 · Entrega y ubicación" icon={MapPinned}>
            <div className="grid gap-4">
              <fieldset className="grid grid-cols-2 gap-2">
                <legend className="sr-only">Método de entrega</legend>
                {[['DOMICILIO', 'Despacho a domicilio'], ['RETIRO_EN_ESTABLECIMIENTO', 'Retiro en planta']].map(([v, t]) => (
                  <button key={v} type="button" aria-pressed={form.metodoEntrega === v} onClick={() => set('metodoEntrega')(v)}
                    className={cn('px-3 py-3 text-sm text-left', form.metodoEntrega === v ? 'bg-primary-light text-[#002d9c] outline-2 outline-primary font-medium' : 'bg-gray-50 text-gray-900 hover:bg-gray-100')}>
                    {t}
                  </button>
                ))}
              </fieldset>

              {!retiro && (
                <>
                  {anterior && (
                    <p className="flex flex-wrap items-center justify-between gap-2 bg-primary-light px-3 py-2 text-sm text-[#002d9c]">
                      <span className="flex items-center gap-2 min-w-0"><History className="h-4 w-4 flex-shrink-0" aria-hidden="true" /><span className="truncate">Último pedido ({anterior.codigo}): {anterior.direccionEntrega}</span></span>
                      <Button type="button" variant="outline" size="sm" onClick={usarAnterior}>Usar esta dirección</Button>
                    </p>
                  )}
                  <div className="grid gap-2">
                    <Label htmlFor="np-dir">Dirección de entrega *</Label>
                    <Textarea id="np-dir" rows={2} maxLength={500} placeholder="Av. / calle, sector, edificio o local…" value={form.direccionEntrega} onChange={(e) => set('direccionEntrega')(e.target.value)} />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="np-ref">Punto de referencia</Label>
                    <Input id="np-ref" maxLength={180} placeholder="Frente a la plaza, portón azul…" value={form.referenciaEntrega} onChange={(e) => set('referenciaEntrega')(e.target.value)} />
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <CampoArea id="np-zona" etiqueta="Zona de despacho" vacio="Sin zona asignada" genero="la zona"
                      valor={form.zonaId} opciones={zonas} sugerida={sugeridas.zonaId} ubicacion={ubicacion} onElegir={elegirArea('zonaId')} />
                    <CampoArea id="np-sector" etiqueta="Tipo de sector" vacio="Sin tipo de sector" genero="el sector"
                      valor={form.tipoSectorId} opciones={sectores} sugerida={sugeridas.tipoSectorId} ubicacion={ubicacion} onElegir={elegirArea('tipoSectorId')} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Ubicación en el mapa (GPS de la entrega)</Label>
                    <MapaSelector valor={ubicacion} onChange={cambiarUbicacion} />
                    <p className="text-xs text-gray-600">Con la ubicación marcada, el repartidor recibe la ruta en su teléfono y el pedido aparece en los mapas de despacho y trazabilidad.</p>
                  </div>
                </>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="np-fecha">Fecha de entrega solicitada</Label>
                  <Input id="np-fecha" type="date" min={hoyISO()} value={form.fechaEntrega} onChange={(e) => set('fechaEntrega')(e.target.value)} />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="np-obs">Observaciones</Label>
                <Textarea id="np-obs" rows={2} maxLength={500} placeholder="Instrucciones especiales para la preparación o la entrega…" value={form.observaciones} onChange={(e) => set('observaciones')(e.target.value)} />
              </div>
            </div>
          </Panel>
        </div>

        {/* Resumen fijo a la derecha en escritorio */}
        <aside className="xl:sticky xl:top-0 space-y-4 min-w-0">
          <Panel titulo="Resumen del pedido" icon={ReceiptText}>
            <dl className="space-y-3 text-sm">
              <div><dt className="label-caps text-gray-600">Cliente</dt><dd className="text-gray-900">{cliente?.razonSocial || '—'}</dd></div>
              <div>
                <dt className="label-caps text-gray-600">Productos</dt>
                <dd>
                  {itemsValidos.length ? (
                    <ul className="mt-1 space-y-1">
                      {itemsValidos.map((i) => {
                        const p = productos.find((x) => x.id === i.productoId)
                        return <li key={i.productoId} className="flex justify-between gap-2"><span className="truncate">{p?.nombre}</span><span className="font-mono whitespace-nowrap">{i.cantidad} {p?.unidadBase}</span></li>
                      })}
                    </ul>
                  ) : '—'}
                  {itemsValidos.length > 0 && <p className="mt-1 font-mono text-xs text-gray-600">{itemsValidos.length} producto(s) · {unidades} unidades</p>}
                </dd>
              </div>
              <div><dt className="label-caps text-gray-600">Prioridad</dt><dd><Badge variant={getPrioridadConfig(form.prioridad).color}>{getPrioridadConfig(form.prioridad).label}</Badge></dd></div>
              <div>
                <dt className="label-caps text-gray-600">Entrega</dt>
                <dd className="text-gray-900">{retiro ? 'Retiro en planta' : form.direccionEntrega.trim() || '—'}</dd>
                {!retiro && (
                  <dd className={cn('mt-1 flex items-center gap-1.5 text-xs', ubicacion ? 'text-success' : 'text-[#8a3800]')}>
                    {ubicacion ? <CircleCheck className="h-3.5 w-3.5" aria-hidden="true" /> : <CircleAlert className="h-3.5 w-3.5" aria-hidden="true" />}
                    {ubicacion ? 'Ubicación GPS marcada' : 'Sin ubicación en el mapa (recomendada)'}
                  </dd>
                )}
              </div>
            </dl>
            {error && <p role="alert" className="mt-4 bg-danger-light px-3 py-2 text-sm text-[#a2191f]">{error}</p>}
            <div className="mt-5 grid gap-2">
              <Button type="submit" size="lg" disabled={!valido || crear.isPending} loading={crear.isPending}>
                {!crear.isPending && <Save className="h-5 w-5" aria-hidden="true" />} Registrar pedido
              </Button>
              <Button type="button" variant="ghost" onClick={() => navigate('/pedidos')}>Cancelar</Button>
            </div>
            {!valido && <p className="mt-3 text-xs text-gray-600">Complete el cliente, al menos un producto con cantidad{retiro ? '' : ' y la dirección de entrega'}.</p>}
          </Panel>
        </aside>
      </form>
    </div>
  )
}
