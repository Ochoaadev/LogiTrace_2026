import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/Select'
import { FormField } from '@/components/ui/FormField'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card'
import { Separator } from '@/components/ui/Separator'
import { Label } from '@/components/ui/Label'
import { Badge } from '@/components/ui/Badge'
import { DataTable, createTableColumns, getCoreRowModel, getSortedRowModel, getPaginationRowModel } from '@/components/ui/Table'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useProductos, useClientes, useZonas } from '@/services/query/useCatalogos'
import { pedidoService } from '@/services/pedidoService'
import { pedidoSchema, ESTADOS_PEDIDO, PRIORIDADES, getEstadoConfig, getPrioridadConfig } from '@/schemas/pedidoSchema'
import { cn } from '@/lib/utils'
import {
  ChevronLeft, ChevronRight, CheckCircle, XCircle,
  Plus, Trash2, Package, MapPin, Calendar, Flag,
  ArrowLeft, ArrowRight
} from 'lucide-react'

const STEPS = [
  { id: 1, label: 'Cliente y Productos', icon: Package },
  { id: 2, label: 'Detalles', icon: MapPin },
  { id: 3, label: 'Confirmar', icon: Flag },
]

const PRODUCTO_COLUMNS = [
  { accessorKey: 'producto', header: 'Producto', cell: (_, row) => row.original.producto?.nombre || '—' },
  { accessorKey: 'cantidad', header: 'Cant.', cell: (val) => <span className="font-mono">{val}</span> },
  { accessorKey: 'precioUnitario', header: 'P. Unit.', cell: (val) => `$${Number(val).toLocaleString('es-ES', { minimumFractionDigits: 2 })}` },
  { accessorKey: 'subtotal', header: 'Subtotal', cell: (_, row) => `$${(Number(row.original.cantidad) * Number(row.original.precioUnitario)).toLocaleString('es-ES', { minimumFractionDigits: 2 })}` },
]

export default function NuevoPedidoPage() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [step, setStep] = useState(1)
  const { data: productos } = useProductos({ page: 1, limit: 50 })
  const { data: clientes } = useClientes({ page: 1, limit: 100 })
  const { data: zonas } = useZonas({ page: 1, limit: 100 })

  const methods = useForm({
    resolver: zodResolver(pedidoSchema),
    defaultValues: {
      clienteId: '',
      productos: [{ productoId: '', cantidad: 1, precioUnitario: 0 }],
      prioridad: 'NORMAL',
      zonaId: '',
      fechaEntregaSolicitada: '',
      observaciones: '',
    },
  })

  const { fields: productoFields, append: appendProducto, remove: removeProducto } = useFieldArray({
    control: methods.control,
    name: 'productos',
  })

  const createPedido = useMutation({
    mutationFn: (data) => pedidoService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pedidos'] })
      navigate('/pedidos')
    },
  })

  const subtotal = useMemo(() => {
    return methods.watch('productos').reduce((sum, p) => {
      return sum + (Number(p.cantidad) * Number(p.precioUnitario || 0))
    }, 0)
  }, [methods])

  const totalProductos = useMemo(() => {
    return methods.watch('productos').reduce((sum, p) => sum + Number(p.cantidad || 0), 0)
  }, [methods])

  const canGoNext = step < 3 && (step === 1 ? methods.getValues('clienteId') && productoFields.length > 0 : true)

  const handleProductoChange = (index, field, value) => {
    const producto = productos?.data?.find(p => p.id === value)
    if (field === 'productoId' && producto) {
      methods.setValue(`productos.${index}.precioUnitario`, producto.precioVenta || 0)
    }
    methods.setValue(`productos.${index}.${field}`, value)
  }

  const renderStepIndicator = () => (
    <div className="flex items-center justify-between mb-8">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.id}>
          <div className="flex items-center">
            <div className={cn(
              'w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium',
              i + 1 < step ? 'bg-primary text-white' :
              i + 1 === step ? 'bg-primary text-white' :
              'bg-gray-200 text-gray-500'
            )}>
              {i + 1 < step ? <CheckCircle className="h-5 w-5" /> : s.id}
            </div>
            <span className={cn('ml-2 text-sm font-medium hidden sm:block', i + 1 <= step ? 'text-gray-900' : 'text-gray-400')}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div className={cn('flex-1 h-1 mx-2', i + 1 < step ? 'bg-primary' : 'bg-gray-200')} />
          )}
        </React.Fragment>
      ))}
    </div>
  )

  const renderStep1 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>1. Seleccionar Cliente</CardTitle>
          <CardDescription>Elige el cliente para este pedido</CardDescription>
        </CardHeader>
        <CardContent>
          <FormField
            form={methods}
            name="clienteId"
            label="Cliente *"
            type="select"
            selectOptions={clientes?.data?.map(c => ({ value: c.id, label: c.razonSocial || c.nombre })) || []}
            placeholder="Buscar cliente..."
            rules={{ required: 'Cliente es requerido' }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Productos del Pedido</CardTitle>
            <CardDescription>Mínimo 1 producto requerido</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={() => appendProducto({ productoId: '', cantidad: 1, precioUnitario: 0 })}>
            <Plus className="h-4 w-4 mr-1" /> Agregar
          </Button>
        </CardHeader>
        <CardContent>
          {productoFields.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <Package className="h-12 w-12 mx-auto text-gray-300 mb-2" />
              <p>No hay productos agregados</p>
            </div>
          ) : (
            <>
              <DataTable
                columns={createTableColumns(PRODUCTO_COLUMNS)}
                data={productoFields.map((f, i) => ({
                  ...f,
                  producto: productos?.data?.find(p => p.id === f.productoId),
                  subtotal: Number(f.cantidad) * Number(f.precioUnitario || 0),
                }))}
                keyField="id"
                showPagination={false}
                sortable={false}
                loading={false}
              />
              <div className="mt-4 grid grid-cols-3 gap-4">
                {productoFields.map((_, index) => (
                  <Card key={index} className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Label className="font-medium">Producto #{index + 1}</Label>
                      {productoFields.length > 1 && (
                        <Button variant="ghost" size="icon" onClick={() => removeProducto(index)}>
                          <Trash2 className="h-4 w-4 text-danger" />
                        </Button>
                      )}
                    </div>
                    <FormField
                      form={methods}
                      name={`productos.${index}.productoId`}
                      label="Producto *"
                      type="select"
                      selectOptions={productos?.data?.map(p => ({ value: p.id, label: `${p.nombre} - $${Number(p.precioVenta).toLocaleString('es-ES', { minimumFractionDigits: 2 })} (Stock: ${p.stock})` })) || []}
                      placeholder="Seleccionar producto..."
                      rules={{ required: 'Producto requerido' }}
                    />
                    <div className="grid grid-cols-2 gap-3 mt-3">
                      <FormField
                        form={methods}
                        name={`productos.${index}.cantidad`}
                        label="Cantidad *"
                        type="input"
                        inputClassName="w-full"
                        rules={{ required: 'Requerido', min: { value: 1, message: 'Mínimo 1' } }}
                      />
                      <FormField
                        form={methods}
                        name={`productos.${index}.precioUnitario`}
                        label="Precio Unit. *"
                        type="input"
                        inputClassName="w-full"
                        rules={{ required: 'Requerido', min: { value: 0, message: 'Inválido' } }}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )

  const renderStep2 = () => (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Detalles de Entrega</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              form={methods}
              name="prioridad"
              label="Prioridad"
              type="select"
              selectOptions={PRIORIDADES.map(p => ({ value: p.value, label: p.label }))}
              rules={{ required: 'Prioridad requerida' }}
            />
            <FormField
              form={methods}
              name="zonaId"
              label="Zona de Despacho"
              type="select"
              selectOptions={zonas?.data?.map(z => ({ value: z.id, label: z.nombre })) || []}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <FormField
              form={methods}
              name="fechaEntregaSolicitada"
              label="Fecha Entrega Solicitada"
              type="input"
              inputClassName="w-full"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Observaciones</CardTitle>
        </CardHeader>
        <CardContent>
          <FormField
            form={methods}
            name="observaciones"
            label="Notas adicionales"
            type="textarea"
            placeholder="Instrucciones especiales, referencias, etc."
          />
        </CardContent>
      </Card>
    </div>
  )

  const renderStep3 = () => {
    const values = methods.getValues()
    const cliente = clientes?.data?.find(c => c.id === values.clienteId)
    const items = values.productos.map((p, i) => {
      const prod = productos?.data?.find(pr => pr.id === p.productoId)
      return { ...p, producto: prod }
    })

    return (
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Resumen del Pedido</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-gray-500">Cliente</p>
                <p className="font-medium">{cliente?.razonSocial || cliente?.nombre || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Prioridad</p>
                <p className="font-medium">
                  <Badge variant={getPrioridadConfig(values.prioridad).color}>{getPrioridadConfig(values.prioridad).label}</Badge>
                </p>
              </div>
              <div>
                <p className="text-gray-500">Zona</p>
                <p className="font-medium">{zonas?.data?.find(z => z.id === values.zonaId)?.nombre || '—'}</p>
              </div>
              <div>
                <p className="text-gray-500">Fecha Entrega</p>
                <p className="font-medium">{values.fechaEntregaSolicitada ? new Date(values.fechaEntregaSolicitada).toLocaleDateString('es-ES') : 'No especificada'}</p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="font-medium mb-3">Productos ({items.length})</h4>
              <DataTable
                columns={createTableColumns(PRODUCTO_COLUMNS)}
                data={items.map(p => ({
                  ...p,
                  subtotal: Number(p.cantidad) * Number(p.precioUnitario || 0),
                }))}
                keyField="id"
                showPagination={false}
                sortable={false}
                loading={false}
              />
            </div>

            <Separator />

            <div className="flex justify-end space-x-4 text-right">
              <div className="text-sm text-gray-600">
                <p>Total productos: <span className="font-medium">{totalProductos}</span></p>
                <p className="text-xl font-bold text-gray-900 mt-1">Subtotal: ${subtotal.toLocaleString('es-ES', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={() => setStep(2)}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Volver
          </Button>
          <Button onClick={handleSubmit} disabled={createPedido.isPending}>
            {createPedido.isPending ? 'Creando...' : 'Confirmar y Crear Pedido'}
          </Button>
        </div>
      </div>
    )
  }

  const handleSubmit = methods.handleSubmit(async (data) => {
    await createPedido.mutateAsync(data)
  })

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nuevo Pedido</h1>
          <p className="text-gray-600 mt-1">Complete la información en 3 pasos</p>
        </div>
        <Button variant="ghost" onClick={() => navigate('/pedidos')}>
          ← Volver a lista
        </Button>
      </div>

      {renderStepIndicator()}

      <Card>
        <CardContent className="p-6">
          {step === 1 && renderStep1()}
          {step === 2 && renderStep2()}
          {step === 3 && renderStep3()}
        </CardContent>
      </Card>

      <div className="flex justify-between">
        <Button
          variant="outline"
          onClick={() => setStep(s => s - 1)}
          disabled={step === 1}
        >
          <ChevronLeft className="h-4 w-4 mr-1" /> Anterior
        </Button>
        <div className="flex gap-2">
          {step < 3 && (
            <Button onClick={() => setStep(s => s + 1)} disabled={!canGoNext}>
              Siguiente <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}