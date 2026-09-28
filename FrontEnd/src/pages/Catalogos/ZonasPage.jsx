import { useState, useEffect } from 'react'
import { zonaService } from '../../services/catalogoService'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import FormField from '../../components/ui/FormField'

const ZONA_COLUMNS = [
  { key: 'codigo', header: 'Código' },
  { key: 'nombre', header: 'Nombre' },
  { key: 'municipio', header: 'Municipio' },
]

export default function ZonasPage() {
  const [zonas, setZonas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({ codigo: '', nombre: '', municipio: '', activo: true })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const fetchZonas = async () => {
    setLoading(true)
    try {
      const res = await zonaService.getAll({ page, limit: 10, search })
      setZonas(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchZonas() }, [page, search])

  const handleOpenCreate = () => { setEditing(null); setFormData({ codigo: '', nombre: '', municipio: '', activo: true }); setErrors({}); setModalOpen(true) }
  const handleOpenEdit = (zona) => { setEditing(zona); setFormData({ codigo: zona.codigo, nombre: zona.nombre, municipio: zona.municipio || '', activo: zona.activo }); setErrors({}); setModalOpen(true) }
  const handleCloseModal = () => { setModalOpen(false); setEditing(null); setFormData({ codigo: '', nombre: '', municipio: '', activo: true }) }
  const handleChange = (e) => { const { name, value } = e.target; setFormData((prev) => ({ ...prev, [name]: value })); if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' })) }

  const validate = () => { const newErrors = {}; if (!formData.codigo.trim()) newErrors.codigo = 'El código es obligatorio'; if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio'; setErrors(newErrors); return Object.keys(newErrors).length === 0 }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setSubmitting(true)
    try {
      if (editing) await zonaService.update(editing.id, formData)
      else await zonaService.create(formData)
      handleCloseModal()
      fetchZonas()
    } catch (err) {
      if (err.errors) setErrors(Object.fromEntries(err.errors.map((e) => [e.campo, e.mensaje])))
      else setErrors({ submit: err.message || 'Error al guardar' })
    } finally { setSubmitting(false) }
  }

  const handleDelete = async (id) => { if (!window.confirm('¿Eliminar esta zona?')) return; try { await zonaService.delete(id); fetchZonas() } catch (err) { alert(err.message || 'Error al eliminar') } }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-800">Zonas de Despacho</h1><p className="text-gray-600">Catálogo de zonas de entrega</p></div>
        <button onClick={handleOpenCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Nueva Zona</button>
      </div>
      <input type="text" placeholder="Buscar..." value={search} onChange={(e)=>{setSearch(e.target.value);setPage(1)}} className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
      <Table columns={ZONA_COLUMNS} data={zonas} loading={loading} onRowClick={handleOpenEdit} actionButtons={(row)=>(<div className="flex gap-2"><button onClick={()=>handleOpenEdit(row)} className="text-blue-600 text-sm">Editar</button><button onClick={()=>handleDelete(row.id)} className="text-red-600 text-sm">Eliminar</button></div>)} />
      <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Página {page} de {totalPages}</span><div className="flex gap-2"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1||loading} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Anterior</button><button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages||loading} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Siguiente</button></div></div>
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editing?'Editar Zona':'Nueva Zona'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Código*" name="codigo" value={formData.codigo} onChange={handleChange} error={errors.codigo} required />
            <FormField label="Nombre*" name="nombre" value={formData.nombre} onChange={handleChange} error={errors.nombre} required />
          </div>
          <FormField label="Municipio" name="municipio" value={formData.municipio} onChange={handleChange} />
          <FormField type="checkbox" label="Activo" name="activo" value={formData.activo} onChange={handleChange} />
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