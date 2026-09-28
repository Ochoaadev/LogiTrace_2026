import { useState, useEffect } from 'react'
import { clienteService } from '../../services/catalogoService'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import FormField from '../../components/ui/FormField'

const CLIENTE_COLUMNS = [
  { key: 'codigo', header: 'Código' },
  { key: 'razonSocial', header: 'Razón Social' },
  { key: 'nombreContacto', header: 'Contacto' },
  { key: 'tipoDocumento', header: 'Tipo Doc' },
  { key: 'numeroDocumento', header: 'N° Documento' },
  { key: 'telefono', header: 'Teléfono' },
]

export default function ClientesPage() {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const initialForm = {
    codigo: '',
    razonSocial: '',
    nombreContacto: '',
    tipoDocumento: 'J',
    numeroDocumento: '',
    telefono: '',
    email: '',
    activo: true,
  }

  const fetchClientes = async () => {
    setLoading(true)
    try {
      const res = await clienteService.getAll({ page, limit: 10, search })
      setClientes(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [page, search])

  const handleOpenCreate = () => {
    setEditing(null)
    setFormData(initialForm)
    setErrors({})
    setModalOpen(true)
  }

  const handleOpenEdit = (cliente) => {
    setEditing(cliente)
    setFormData({
      codigo: cliente.codigo,
      razonSocial: cliente.razonSocial,
      nombreContacto: cliente.nombreContacto || '',
      tipoDocumento: cliente.tipoDocumento || 'J',
      numeroDocumento: cliente.numeroDocumento || '',
      telefono: cliente.telefono || '',
      email: cliente.email || '',
      activo: cliente.activo,
    })
    setErrors({})
    setModalOpen(true)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditing(null)
    setFormData(initialForm)
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.codigo.trim()) newErrors.codigo = 'El código es obligatorio'
    if (!formData.razonSocial.trim()) newErrors.razonSocial = 'La razón social es obligatoria'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      if (editing) {
        await clienteService.update(editing.id, formData)
      } else {
        await clienteService.create(formData)
      }
      handleCloseModal()
      fetchClientes()
    } catch (err) {
      if (err.errors) {
        setErrors(Object.fromEntries(err.errors.map((e) => [e.campo, e.mensaje])))
      } else {
        setErrors({ submit: err.message || 'Error al guardar' })
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('¿Eliminar este cliente?')) return
    try {
      await clienteService.delete(id)
      fetchClientes()
    } catch (err) {
      alert(err.message || 'Error al eliminar')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Clientes</h1>
          <p className="text-gray-600">Catálogo de clientes</p>
        </div>
        <button onClick={handleOpenCreate} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Nuevo Cliente
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por código, razón social o contacto..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-80 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Table columns={CLIENTE_COLUMNS} data={clientes} loading={loading} onRowClick={handleOpenEdit} actionButtons={(row) => (
        <div className="flex items-center justify-end gap-2">
          <button onClick={() => handleOpenEdit(row)} className="text-blue-600 hover:text-blue-800 text-sm font-medium">Editar</button>
          <button onClick={() => handleDelete(row.id)} className="text-red-600 hover:text-red-800 text-sm font-medium">Eliminar</button>
        </div>
      )} />

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">Página {page} de {totalPages}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1 || loading} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Anterior</button>
          <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages || loading} className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50">Siguiente</button>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editing ? 'Editar Cliente' : 'Nuevo Cliente'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Código*" name="codigo" value={formData.codigo} onChange={handleChange} error={errors.codigo} required />
            <FormField label="Razón Social*" name="razonSocial" value={formData.razonSocial} onChange={handleChange} error={errors.razonSocial} required />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Contacto" name="nombreContacto" value={formData.nombreContacto} onChange={handleChange} />
            <FormField type="select" label="Tipo Doc" name="tipoDocumento" value={formData.tipoDocumento} onChange={handleChange} options={[{value:'J',label:'J - Jurídico'},{value:'V',label:'V - Natural'}]} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="N° Documento" name="numeroDocumento" value={formData.numeroDocumento} onChange={handleChange} />
            <FormField label="Teléfono" name="telefono" value={formData.telefono} onChange={handleChange} />
            <FormField label="Email" name="email" type="email" value={formData.email} onChange={handleChange} />
          </div>
          <FormField type="checkbox" label="Activo" name="activo" value={formData.activo} onChange={handleChange} />
          {errors.submit && <p className="text-red-600 text-sm">{errors.submit}</p>}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">{submitting ? 'Guardando...' : 'Guardar'}</button>
          </div>
        </form>
      </Modal>
    </div>
  )
}