import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { productoService } from '../../services/catalogoService'
import Table from '../../components/ui/Table'
import Modal from '../../components/ui/Modal'
import FormField from '../../components/ui/FormField'

const PRODUCTO_COLUMNS = [
  { key: 'codigo', header: 'Código' },
  { key: 'nombre', header: 'Nombre' },
  { key: 'unidadBase', header: 'Unidad' },
  { key: 'esPerecedero', header: 'Perecedero', render: (v) => (v ? 'Sí' : 'No') },
]

// Fuera del componente: antes se declaraba después del useState que lo usa y la página fallaba al abrir
const initialForm = {
  codigo: '',
  nombre: '',
  descripcion: '',
  unidadBase: 'unidad',
  esPerecedero: true,
  activo: true,
}

export default function ProductosPage() {
  const navigate = useNavigate()
  const [productos, setProductos] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState(null)
  const [formData, setFormData] = useState(initialForm)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)

  const fetchProductos = async () => {
    setLoading(true)
    try {
      const res = await productoService.getAll({ page, limit: 10, search })
      setProductos(res.data)
      setTotalPages(res.pagination.totalPages)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchProductos()
  }, [page, search])

  const handleOpenCreate = () => {
    setEditing(null)
    setFormData(initialForm)
    setErrors({})
    setModalOpen(true)
  }

  const handleOpenEdit = (producto) => {
    setEditing(producto)
    setFormData({
      codigo: producto.codigo,
      nombre: producto.nombre,
      descripcion: producto.descripcion || '',
      unidadBase: producto.unidadBase,
      esPerecedero: producto.esPerecedero,
      activo: producto.activo,
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
    const { name, value, type } = e.target
    setFormData((prev) => ({ ...prev, [name]: type === 'checkbox' ? e.target.checked : value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const newErrors = {}
    if (!formData.codigo.trim()) newErrors.codigo = 'El código es obligatorio'
    if (!formData.nombre.trim()) newErrors.nombre = 'El nombre es obligatorio'
    if (!formData.unidadBase.trim()) newErrors.unidadBase = 'La unidad base es obligatoria'
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setSubmitting(true)
    try {
      if (editing) {
        await productoService.update(editing.id, formData)
      } else {
        await productoService.create(formData)
      }
      handleCloseModal()
      fetchProductos()
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
    if (!window.confirm('¿Eliminar este producto?')) return
    try {
      await productoService.delete(id)
      fetchProductos()
    } catch (err) {
      alert(err.message || 'Error al eliminar')
    }
  }

  const actionButtons = (row) => (
    <div className="flex items-center justify-end gap-2">
      <button
        onClick={() => handleOpenEdit(row)}
        className="text-blue-600 hover:text-blue-800 text-sm font-medium"
      >
        Editar
      </button>
      <button
        onClick={() => handleDelete(row.id)}
        className="text-red-600 hover:text-red-800 text-sm font-medium"
      >
        Eliminar
      </button>
    </div>
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Productos</h1>
          <p className="text-gray-600">Catálogo de productos</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Nuevo Producto
        </button>
      </div>

      <div className="relative">
        <input
          type="text"
          placeholder="Buscar por código o nombre..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1) }}
          className="w-64 px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <Table
        columns={PRODUCTO_COLUMNS}
        data={productos}
        loading={loading}
        onRowClick={handleOpenEdit}
        actionButtons={actionButtons}
      />

      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">
          Página {page} de {totalPages}
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1 || loading}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Anterior
          </button>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages || loading}
            className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50 disabled:opacity-50"
          >
            Siguiente
          </button>
        </div>
      </div>

      <Modal isOpen={modalOpen} onClose={handleCloseModal} title={editing ? 'Editar Producto' : 'Nuevo Producto'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField label="Código*" name="codigo" value={formData.codigo} onChange={handleChange} error={errors.codigo} required />
            <FormField label="Nombre*" name="nombre" value={formData.nombre} onChange={handleChange} error={errors.nombre} required />
          </div>
          <FormField label="Descripción" name="descripcion" value={formData.descripcion} onChange={handleChange} placeholder="Descripción opcional" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <FormField label="Unidad Base*" name="unidadBase" value={formData.unidadBase} onChange={handleChange} error={errors.unidadBase} required placeholder="unidad, kg, litros" />
            <FormField type="checkbox" label="Es Perecedero" name="esPerecedero" value={formData.esPerecedero} onChange={handleChange} />
            <FormField type="checkbox" label="Activo" name="activo" value={formData.activo} onChange={handleChange} />
          </div>
          {errors.submit && <p className="text-red-600 text-sm">{errors.submit}</p>}
          <div className="flex justify-end gap-3 pt-4 border-t">
            <button type="button" onClick={handleCloseModal} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">Cancelar</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
              {submitting ? 'Guardando...' : 'Guardar'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  )
}