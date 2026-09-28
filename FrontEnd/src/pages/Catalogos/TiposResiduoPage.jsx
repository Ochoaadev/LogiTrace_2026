import { useState, useEffect } from 'react'
import { tipoResiduoService } from '../../services/catalogoService'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import FormField from '../../components/ui/FormField'

const TIPO_RESIDUO_COLUMNS = [
  { key: 'codigo', header: 'Código' },
  { key: 'nombre', header: 'Nombre' },
  { key: 'unidadBase', header: 'Unidad' },
]

export default function TiposResiduoPage() {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState({ codigo: '', nombre: '', unidadBase: 'kg', activo: true })
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const fetch = async () => { setLoading(true); try { const res = await tipoResiduoService.getAll({ page, limit: 10, search }); setItems(res.data); setTotalPages(res.pagination.totalPages) } catch (e) { console.error(e) } finally { setLoading(false) } }

  useEffect(() => { fetch() }, [page, search])

  const handleOpenCreate = () => { setEditing(null); setFormData({ codigo: '', nombre: '', unidadBase: 'kg', activo: true }); setErrors({}); setModalOpen(true) }
  const handleOpenEdit = (i) => { setEditing(i); setFormData({ codigo: i.codigo, nombre: i.nombre, unidadBase: i.unidadBase, activo: i.activo }); setErrors({}); setModalOpen(true) }
  const handleCloseModal = () => { setModalOpen(false); setEditing(null); setFormData({ codigo: '', nombre: '', unidadBase: 'kg', activo: true }) }
  const handleChange = (e) => { const { name, value } = e.target; setFormData((p) => ({ ...p, [name]: value })); if (errors[name]) setErrors((p) => ({ ...p, [name]: '' })) }

  const validate = () => { const ne = {}; if (!formData.codigo.trim()) ne.codigo = 'Código obligatorio'; if (!formData.nombre.trim()) ne.nombre = 'Nombre obligatorio'; if (!formData.unidadBase.trim()) ne.unidadBase = 'Unidad obligatoria'; setErrors(ne); return Object.keys(ne).length === 0 }

  const handleSubmit = async (e) => { e.preventDefault(); if (!validate()) return; setSubmitting(true); try { if (editing) await tipoResiduoService.update(editing.id, formData); else await tipoResiduoService.create(formData); handleCloseModal(); fetch() } catch (err) { if (err.errors) setErrors(Object.fromEntries(err.errors.map(e=>[e.campo,e.mensaje]))); else setErrors({ submit: err.message || 'Error' }) } finally { setSubmitting(false) } }

  const handleDelete = async (id) => { if (!window.confirm('Eliminar?')) return; try { await tipoResiduoService.delete(id); fetch() } catch (e) { alert(e.message) } }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between"><div><h1 className="text-2xl font-bold text-gray-800">Tipos de Residuo</h1><p className="text-gray-600">Catálogo de tipos de residuo</p></div><button onClick={handleOpenCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Nuevo</button></div>
      <input type="text" placeholder="Buscar..." value={search} onChange={(e)=>{setSearch(e.target.value);setPage(1)}} className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500" />
      <Table columns={TIPO_RESIDUO_COLUMNS} data={items} loading={loading} onRowClick={handleOpenEdit} actionButtons={(r)=>(<div className="flex gap-2"><button onClick={()=>handleOpenEdit(r)} className="text-blue-600 text-sm">Editar</button><button onClick={()=>handleDelete(r.id)} className="text-red-600 text-sm">Eliminar</button></div>)} />
      <div className="flex items-center justify-between"><span className="text-sm text-gray-600">Página {page} de {totalPages}</span><div className="flex gap-2"><button onClick={()=>setPage(p=>Math.max(1,p-1))} disabled={page===1||loading} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Ant</button><button onClick={()=>setPage(p=>Math.min(totalPages,p+1))} disabled={page===totalPages||loading} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Sig</button></div></div>
      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editing?'Editar':'Nuevo'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><FormField label="Código*" name="codigo" value={formData.codigo} onChange={handleChange} error={errors.codigo} required /><FormField label="Nombre*" name="nombre" value={formData.nombre} onChange={handleChange} error={errors.nombre} required /></div>
          <FormField label="Unidad Base*" name="unidadBase" value={formData.unidadBase} onChange={handleChange} error={errors.unidadBase} required placeholder="kg, litros, unidad" />
          <FormField type="checkbox" label="Activo" name="activo" value={formData.activo} onChange={handleChange} />
          {errors.submit && <p className="text-red-600 text-sm">{errors.submit}</p>}
          <div className="flex justify-end gap-3 pt-4 border-t"><button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button><button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting?'Guardando...':'Guardar'}</button></div>
        </form>
      </Modal>
    </div>
  )
}