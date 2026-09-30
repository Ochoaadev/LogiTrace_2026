import { Package, Store, MapPinned, Map as MapaIcono, Truck, TriangleAlert, Undo2, Recycle, Building2 } from 'lucide-react'
import {
  productoService, clienteService, zonaService, tipoSectorService, vehiculoService, tipoIncidenciaService,
  motivoDevolucionService, tipoResiduoService, gestorResiduoService,
} from '@/services/catalogoService'

const TIPOS_VEHICULO = [
  { value: 'MOTO', label: 'Moto' },
  { value: 'VEHICULO_LIVIANO', label: 'Vehículo liviano' },
  { value: 'FURGON', label: 'Furgón' },
  { value: 'OTRO', label: 'Otro' },
]
const TIPOS_GESTOR = [
  { value: 'EXTERNO', label: 'Gestor externo autorizado' },
  { value: 'INTERNO', label: 'Gestión interna' },
]
const etiqueta = (opciones, v) => opciones.find((o) => o.value === v)?.label || v

/*
 * Configuración de los catálogos maestros. Cada campo: name, label, type (text | textarea | select |
 * number | email | check), required, max, options, soloAlCrear (el código no se edita) y ayuda.
 * Las columnas usan `valor(fila)` para el texto principal y `detalle(fila)` para la línea secundaria.
 */
export const CATALOGOS = {
  productos: {
    ruta: 'productos', titulo: 'Productos', singular: 'producto', icon: Package, servicio: productoService,
    descripcion: 'Tequeños, empanadas y bebidas que se venden y se controlan en el inventario de la cava.',
    campos: [
      { name: 'codigo', label: 'Código', required: true, max: 30, soloAlCrear: true, placeholder: 'TEQ-005' },
      { name: 'nombre', label: 'Nombre', required: true, max: 120 },
      { name: 'unidadBase', label: 'Unidad base', required: true, max: 20, placeholder: 'unidad', ayuda: 'Unidad en la que se piden y se descuentan del inventario.' },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
      { name: 'esPerecedero', label: 'Producto perecedero (se despacha solo desde la cava)', type: 'check', predeterminado: true },
    ],
    columnas: [
      { header: 'Producto', valor: (f) => f.nombre, detalle: (f) => f.descripcion },
      { header: 'Unidad', valor: (f) => f.unidadBase, mono: true },
      { header: 'Conservación', valor: (f) => (f.esPerecedero ? 'Perecedero · cava' : 'No perecedero') },
    ],
  },
  clientes: {
    ruta: 'clientes', titulo: 'Clientes', singular: 'cliente', icon: Store, servicio: clienteService, permisoCrear: 'clientes.create',
    descripcion: 'Comercios, restaurantes y particulares que reciben pedidos en Valera y zonas aledañas.',
    campos: [
      { name: 'codigo', label: 'Código', max: 20, soloAlCrear: true, placeholder: 'Automático (CLI-###)', ayuda: 'Déjelo vacío para asignar el siguiente código libre.' },
      { name: 'razonSocial', label: 'Razón social / nombre', required: true, max: 150 },
      {
        name: 'tipoDocumento', label: 'Tipo de documento', type: 'select',
        options: [
          { value: 'J', label: 'J · Persona jurídica' },
          { value: 'V', label: 'V · Venezolano' },
          { value: 'E', label: 'E · Extranjero' },
          { value: 'G', label: 'G · Gobierno' },
          { value: 'P', label: 'P · Pasaporte' },
        ],
      },
      { name: 'numeroDocumento', label: 'N° de documento', max: 30, placeholder: 'V-12345678 o J-12345678-9', ayuda: 'Se guarda en formato único: la misma cédula no puede registrarse dos veces.' },
      { name: 'nombreContacto', label: 'Persona de contacto', max: 120 },
      { name: 'telefono', label: 'Teléfono', max: 30, placeholder: '0271-0000000' },
      { name: 'email', label: 'Correo', type: 'email', max: 120 },
    ],
    columnas: [
      { header: 'Cliente', valor: (f) => f.razonSocial, detalle: (f) => [f.tipoDocumento, f.numeroDocumento].filter(Boolean).join(' ') },
      { header: 'Contacto', valor: (f) => f.nombreContacto || '—', detalle: (f) => [f.telefono, f.email].filter(Boolean).join(' · ') },
    ],
  },
  zonas: {
    ruta: 'zonas', titulo: 'Zonas de despacho', singular: 'zona', nuevo: 'Nueva zona', icon: MapPinned, servicio: zonaService,
    descripcion: 'Cobertura logística de las entregas (centro, periferia, rural): agrupa pedidos, rutas e indicadores.',
    campos: [
      { name: 'codigo', label: 'Código', required: true, max: 20, soloAlCrear: true, placeholder: 'ZON-009' },
      { name: 'nombre', label: 'Nombre del sector', required: true, max: 100 },
      { name: 'municipio', label: 'Municipio', max: 100, placeholder: 'Valera' },
      {
        name: 'centro', type: 'ubicacion', campos: ['latitudCentro', 'longitudCentro'], label: 'Centro de la zona en el mapa',
        indicacion: 'Haga clic en el centro del sector',
        ayuda: 'Punto de referencia de la zona.',
      },
      {
        name: 'radioMetros', label: 'Radio de cobertura (metros)', type: 'number', step: '1', anulable: true,
        ayuda: 'Se sugiere el área más pequeña que contenga el punto de entrega. Sin radio, cuenta el centro más cercano.',
      },
    ],
    columnas: [
      { header: 'Zona', valor: (f) => f.nombre },
      { header: 'Municipio', valor: (f) => f.municipio || '—' },
      {
        header: 'Centro en el mapa',
        valor: (f) => (f.latitudCentro != null ? (f.radioMetros ? `Radio ${Number(f.radioMetros).toLocaleString('es-VE')} m` : 'Marcado') : 'Sin marcar'),
        detalle: (f) => (f.latitudCentro != null ? `${Number(f.latitudCentro).toFixed(5)}, ${Number(f.longitudCentro).toFixed(5)}` : 'No participa en la sugerencia'),
      },
    ],
  },
  'tipos-sector': {
    ruta: 'tipos-sector', titulo: 'Tipos de sector', singular: 'tipo de sector', icon: MapaIcono, servicio: tipoSectorService,
    descripcion: 'Uso del suelo del punto de entrega (comercial, residencial, mixto, industrial, equipamiento), independiente de la zona de despacho.',
    campos: [
      { name: 'codigo', label: 'Código', required: true, max: 20, soloAlCrear: true, placeholder: 'SEC-06' },
      { name: 'nombre', label: 'Nombre', required: true, max: 100 },
      { name: 'descripcion', label: 'Sectores que abarca / descripción', type: 'textarea', max: 1000 },
      {
        name: 'centro', type: 'ubicacion', campos: ['latitudCentro', 'longitudCentro'], label: 'Centro en el mapa',
        indicacion: 'Haga clic en el punto de referencia del sector',
      },
      {
        name: 'radioMetros', label: 'Radio de cobertura (metros)', type: 'number', step: '1', anulable: true,
        ayuda: 'Se sugiere el área más pequeña que contenga el punto de entrega. Sin radio, cuenta el centro más cercano.',
      },
    ],
    columnas: [
      { header: 'Tipo de sector', valor: (f) => f.nombre, detalle: (f) => f.descripcion },
      {
        header: 'Centro en el mapa',
        valor: (f) => (f.latitudCentro != null ? (f.radioMetros ? `Radio ${Number(f.radioMetros).toLocaleString('es-VE')} m` : 'Marcado') : 'Sin marcar'),
        detalle: (f) => (f.latitudCentro != null ? `${Number(f.latitudCentro).toFixed(5)}, ${Number(f.longitudCentro).toFixed(5)}` : 'No participa en la sugerencia'),
      },
    ],
  },
  vehiculos: {
    ruta: 'vehiculos', titulo: 'Vehículos', singular: 'vehículo', icon: Truck, servicio: vehiculoService,
    descripcion: 'Flota de reparto: motos y vehículos con su capacidad y si mantienen la cadena de frío.',
    campos: [
      { name: 'codigo', label: 'Código', required: true, max: 20, soloAlCrear: true, placeholder: 'VEH-005' },
      { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: TIPOS_VEHICULO, predeterminado: 'MOTO' },
      { name: 'placa', label: 'Placa', max: 20 },
      { name: 'capacidadCarga', label: 'Capacidad de carga', type: 'number' },
      { name: 'unidadCapacidad', label: 'Unidad de capacidad', max: 20, placeholder: 'kg', predeterminado: 'kg' },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
      { name: 'esTermico', label: 'Unidad térmica (caja o cava refrigerada)', type: 'check' },
    ],
    columnas: [
      { header: 'Vehículo', valor: (f) => `${etiqueta(TIPOS_VEHICULO, f.tipo)}${f.placa ? ` · ${f.placa}` : ''}`, detalle: (f) => f.descripcion },
      { header: 'Capacidad', valor: (f) => (f.capacidadCarga ? `${Number(f.capacidadCarga)} ${f.unidadCapacidad || ''}` : '—'), mono: true },
      { header: 'Cadena de frío', valor: (f) => (f.esTermico ? 'Térmico' : 'Sin refrigeración') },
    ],
  },
  'tipos-incidencia': {
    ruta: 'tipos-incidencia', titulo: 'Tipos de incidencia', singular: 'tipo de incidencia', icon: TriangleAlert, servicio: tipoIncidenciaService,
    descripcion: 'Causas con las que los repartidores y el despacho tipifican las novedades en ruta.',
    campos: [
      { name: 'codigo', label: 'Código', required: true, max: 20, soloAlCrear: true, placeholder: 'INC-008' },
      { name: 'nombre', label: 'Nombre', required: true, max: 100 },
      { name: 'descripcion', label: 'Descripción / criterio', type: 'textarea' },
    ],
    columnas: [{ header: 'Tipo de incidencia', valor: (f) => f.nombre, detalle: (f) => f.descripcion }],
  },
  'motivos-devolucion': {
    ruta: 'motivos-devolucion', titulo: 'Motivos de devolución', singular: 'motivo de devolución', icon: Undo2, servicio: motivoDevolucionService,
    descripcion: 'Causas registradas al activar la logística inversa de un pedido.',
    campos: [
      { name: 'codigo', label: 'Código', required: true, max: 20, soloAlCrear: true, placeholder: 'DEV-008' },
      { name: 'nombre', label: 'Nombre', required: true, max: 100 },
      { name: 'descripcion', label: 'Descripción', type: 'textarea' },
    ],
    columnas: [{ header: 'Motivo', valor: (f) => f.nombre, detalle: (f) => f.descripcion }],
  },
  'tipos-residuo': {
    ruta: 'tipos-residuo', titulo: 'Tipos de residuo', singular: 'tipo de residuo', icon: Recycle, servicio: tipoResiduoService,
    descripcion: 'Clasificación de los residuos de planta y de devoluciones (módulo 08).',
    campos: [
      { name: 'codigo', label: 'Código', required: true, max: 20, soloAlCrear: true, placeholder: 'RES-007' },
      { name: 'nombre', label: 'Nombre', required: true, max: 100 },
      { name: 'unidadBase', label: 'Unidad base', required: true, max: 20, placeholder: 'kg', ayuda: 'kg, litros o unidad.' },
    ],
    columnas: [
      { header: 'Tipo de residuo', valor: (f) => f.nombre },
      { header: 'Unidad', valor: (f) => f.unidadBase, mono: true },
    ],
  },
  'gestores-residuo': {
    ruta: 'gestores-residuo', titulo: 'Gestores de residuo', singular: 'gestor', icon: Building2, servicio: gestorResiduoService,
    descripcion: 'Destinos autorizados que retiran los residuos: recicladoras, compostaje o gestión interna.',
    campos: [
      { name: 'codigo', label: 'Código', required: true, max: 20, soloAlCrear: true, placeholder: 'GES-003' },
      { name: 'nombre', label: 'Nombre', required: true, max: 120 },
      { name: 'tipo', label: 'Tipo', type: 'select', required: true, options: TIPOS_GESTOR, predeterminado: 'EXTERNO' },
      { name: 'contacto', label: 'Contacto', placeholder: 'Nombre y teléfono' },
      { name: 'ubicacion', label: 'Ubicación', placeholder: 'Dirección o sector' },
    ],
    columnas: [
      { header: 'Gestor', valor: (f) => f.nombre, detalle: (f) => etiqueta(TIPOS_GESTOR, f.tipo) },
      { header: 'Contacto', valor: (f) => f.contacto || '—', detalle: (f) => f.ubicacion },
    ],
  },
}

export const ORDEN_CATALOGOS = ['productos', 'clientes', 'zonas', 'tipos-sector', 'vehiculos', 'tipos-incidencia', 'motivos-devolucion', 'tipos-residuo', 'gestores-residuo']
