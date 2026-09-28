import { useState, useEffect } from 'react'
import { vehiculoService } from '../../services/catalogoService'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import FormField from '../../components/ui/FormField'

const TIPO_OPTIONS = [
  { value: 'MOTO', label: 'Moto' },
  { value: 'VEHICULO_LIVIANO', label: 'Vehículo Liviano' },
  { value: 'FURGON', label: 'Furgón' },
  { value: 'OTRO', label: 'Otro' },
]

const VEHICULO_COLUMNS = [
  { key: 'codigo', header: 'Código' },
  { key: 'tipo', header: 'Tipo', render: (v) => TIPO_OPTIONS.find(o=>o.value===v)?.label || v },
  { key: 'placa', header: 'Placa' },
  { key: 'capacidadCarga', header: 'Capacidad', render: (v) => v ? `${v} kg` : '-' },
  { key: 'esTermico', header: 'Térmico', render: (v) => v ? 'Sí' : 'No' },
]

export default function VehiculosPage() {
  const [vehiculos, setVehiculos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({ codigo: '', tipo: 'MOTO', placa: '', descripcion: '', capacidadCarga: '', unidadCapacidad: 'kg', esTermico: false, activo: true })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const fetchVehiculos = async () => {
    setLoading(true)
    try {
      const res = await vehiculoService.getAll({ page, limit: 10, search })
      setVehiculos(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch (err) { console.error(err) } finally { setLoading(false) }
  }

  useEffect(() => { fetchVehiculos() }, [page, search])

  const handleOpenCreate = () => { setEditing(null); setFormData({ codigo: '', tipo: 'MOTO', placa: '', descripcion: '', capacidadCarga: '', unidadCapacidad: 'kg', esTermico: false, activo: true }); setErrors({}); setModalOpen(true) }
  const handleOpenEdit = (v) => { setEditing(v); setFormData({ codigo: v.codigo, tipo: v.tipo, placa: v.placa || '', descripcion: v.descripcion || '', capacidadCarga: v.capacidadCarga || '', unidadCapacidad: v.unidadCapacidad || 'kg', esTermico: v.esTermico, activo: v.activo }); setErrors({}); setModalOpen(true) }
  const handleCloseModal = () => { setModalOpen(false); setEditing(null); setFormData({ codigo: '', tipo: 'MOTO', placa: '', descripcion: '', capacidadCarga: '', unidadCapacidad: 'kg', esTermico: false, activo: true }) }
  const handleChange = (e) => { const { name, value, type } = e.target; setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? e.target.checked : value })); if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' })) }

  const validate = () => { const newErrors = {}; if (!formData.codigo.trim()) newErrors.codigo = 'El código es obligatorio'; if (!formData.tipo) newErrors.tipo = 'El tipo es obligatorio'; setErrors(newErrors); return Object.keys(newErrors).length === 0 }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      if (editing) await vehiculoService.update(editing.id, formData)
      else await vehiculoService.create(formData)
      handleCloseModal()
      fetchVehiculos()
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((e) => [e.campo, e.mensaje])))
      else setErrors({ submit: err.message || 'Error al guardar' })
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => { if (!window.confirm('¿Eliminar este vehículo?')) return; try { await vehiculoService.delete(id); fetchVehiculos() } catch (err) { alert(err.message || 'Error al eliminar') } }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-800">Vehículos</h1><p className="text-gray-600">Catálogo de vehículos</p></div>
        <button onClick={handleOpenCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Nuevo Vehículo</button>
      </div>
      <input type="text" placeholder="Buscar por código o placa..." value={search} onChange={(e)=>{setSearch(e.target.value);setPage(1)}} className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
      <Table columns={VEHICULO_COLUMNS} data={vehiculos} loading={loading} onRowClick={handleOpenEdit} actionButtons={(row)=>(<div className="flex gap-2"><button onClick={()=>handleOpenEdit(row)} className="text-blue-600 text-sm">Editar</button><button onClick={()=>handleDelete(row.id)} className="text-red-600 text-sm">Eliminar</button></div>)} />
      <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Página {page} de {totalPages}</span><div className="flex gap-2"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1||loading} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Anterior</button><button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages||loading} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Siguiente</button></div></div>
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editing?'Editar Vehículo':'Nuevo Vehículo'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Código*" name="codigo" value={formData.codigo} onChange={handleChange} error={errors.codigo} required />
            <FormField type="select" label="Tipo*" name="tipo" value={formData.tipo} onChange={handleChange} options={TIPO_OPTIONS} error={errors.tipo} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Placa" name="placa" value={formData.placa} onChange={handleChange} />
            <FormField label="Capacidad (kg)" name="capacidadCarga" type="number" step="0.01" value={formData.capacidadCarga} onChange={handleChange} />
            <FormField label="Unidad" name="unidadCapacidad" value={formData.unidadCapacidad} onChange={handleChange} />
          </div>
          <FormField label="Descripción" name="descripcion" value={formData.descripcion} onChange={handleChange} />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField type="checkbox" label="Es Térmico" name="esTermico" value={formData.esTermico} onChange={handleChange} />
            <FormField type="checkbox" label="Activo" name="activo" value={formData.activo} onChange={handleChange} />
          </div>
          {errors.submit && <p className="text-red-600 text-sm">{errors.submit}</p>}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting?'Guardando...':'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}