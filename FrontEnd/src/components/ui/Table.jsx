import * as React from 'react'
import { cn } from '@/lib/utils'
import {
  legacyCreateColumnHelper as createColumnHelper,
  useLegacyTable as useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
} from '@tanstack/react-table/legacy'
import { flexRender } from '@tanstack/react-table/flex-render'
import { ChevronUp, ChevronDown, ChevronsUpDown, Check, Minus } from 'lucide-react'

// Re-export for convenience
export {
  flexRender,
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
}

const columnHelper = createColumnHelper()

export function createTableColumns(columns) {
  return columns.map((col) => {
    if (col.accessorKey) {
      return columnHelper.accessor(col.accessorKey, {
        header: col.header,
        cell: col.cell ? (info) => col.cell(info.getValue(), info.row.original) : (info) => info.getValue(),
        enableSorting: col.sortable !== false,
        enableFiltering: col.filterable !== false,
        size: col.width,
        meta: col.meta,
      })
    }
    if (col.id) {
      return columnHelper.display({
        id: col.id,
        header: col.header,
        cell: col.cell,
        size: col.width,
      })
    }
    return col
  })
}

export function DataTable({
  columns,
  data,
  keyField = 'id',
  onRowClick,
  className,
  sortable = true,
  filterable = false,
  pagination = true,
  pageSize = 10,
  showPagination = true,
  showRowNumbers = false,
  selection,
  emptyMessage = 'No hay datos disponibles',
  loading = false,
}) {
  const [sorting, setSorting] = React.useState([])
  const [globalFilter, setGlobalFilter] = React.useState('')
  const [paginationState, setPaginationState] = React.useState({ pageIndex: 0, pageSize })
  const [rowSelection, setRowSelection] = React.useState({})

  const table = useReactTable({
    data,
    columns,
    state: { sorting, globalFilter, pagination: paginationState, rowSelection },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPaginationState,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: sortable ? getSortedRowModel() : undefined,
    getFilteredRowModel: filterable ? getFilteredRowModel() : undefined,
    getPaginationRowModel: pagination ? getPaginationRowModel() : undefined,
  })

  const handleRowSelectionChange = React.useCallback(
    (rowId, selected) => {
      if (!selection) return
      const newSelection = { ...rowSelection, [rowId]: selected }
      setRowSelection(newSelection)
      const selectedRows = data.filter((_, i) => newSelection[data[i][keyField]])
      selection.onChange(selectedRows)
    },
    [selection, data, keyField, rowSelection]
  )

  const toggleAllRowsSelected = React.useCallback(() => {
    if (!selection) return
    const allSelected = data.every((row) => rowSelection[row[keyField]])
    const newSelection = data.reduce((acc, row) => ({ ...acc, [row[keyField]]: !allSelected }), {})
    setRowSelection(newSelection)
    selection.onChange(allSelected ? [] : data)
  }, [selection, data, keyField, rowSelection])

  if (loading) {
    return (
      <div className={cn('overflow-x-auto rounded-lg border border-gray-200', className)}>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              {columns.map((col) => (
                <th key={col.id} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="h-4 bg-gray-200 animate-pulse rounded" style={{ width: '100px' }} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {[...Array(5)].map((_, i) => (
              <tr key={i}>
                {columns.map((col) => (
                  <td key={col.id} className="px-4 py-3">
                    <div className="h-4 bg-gray-200 animate-pulse rounded w-3/4" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  return (
    <div className={cn('rounded-lg border border-gray-200', className)}>
      {filterable && (
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <div className="relative max-w-md">
            <input
              type="search"
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              placeholder="Buscar en toda la tabla..."
              className="w-full h-10 rounded-md border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 placeholder:text-gray-400 focus:border-primary focus:ring-2 focus:ring-primary-light focus:outline-none"
            />
          </div>
        </div>
      )}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {selection?.enabled && (
                  <th className="px-4 py-3 w-12">
                    <input
                      type="checkbox"
                      checked={data.length > 0 && data.every((row) => rowSelection[row[keyField]])}
                      onChange={toggleAllRowsSelected}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                      aria-label="Seleccionar todas las filas"
                    />
                  </th>
                )}
                {showRowNumbers && <th className="px-4 py-3 w-10 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>}
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className={cn(
                      'px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider',
                      header.column.getCanSort() && 'cursor-pointer select-none hover:bg-gray-100',
                      header.column.getSize()
                    )}
                    style={{ width: header.column.getSize() }}
                  >
                    <div className="flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() && (
                        <span className="inline-flex items-center">
                          {header.column.getIsSorted() === 'asc' ? (
                            <ChevronUp className="h-3.5 w-3.5 text-primary" />
                          ) : header.column.getIsSorted() === 'desc' ? (
                            <ChevronDown className="h-3.5 w-3.5 text-primary" />
                          ) : (
                            <ChevronsUpDown className="h-3.5 w-3.5 text-gray-400" />
                          )}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td colSpan={columns.length + (selection?.enabled ? 1 : 0) + (showRowNumbers ? 1 : 0)} className="px-4 py-8 text-center text-gray-500">
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row, rowIndex) => (
                <tr
                  key={row.id}
                  className={cn(
                    onRowClick && 'hover:bg-gray-50 cursor-pointer',
                    selection?.enabled && 'hover:bg-gray-50'
                  )}
                  onClick={() => onRowClick?.(row.original)}
                >
                  {selection?.enabled && (
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={rowSelection[row.id]}
                        onChange={(e) => handleRowSelectionChange(row.id, e.target.checked)}
                        className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                        aria-label={`Seleccionar fila ${rowIndex + 1}`}
                      />
                    </td>
                  )}
                  {showRowNumbers && (
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {pagination ? paginationState.pageIndex * paginationState.pageSize + rowIndex + 1 : rowIndex + 1}
                    </td>
                  )}
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className={cn('px-4 py-3 text-sm text-gray-900', cell.column.getSize())}
                      style={{ width: cell.column.getSize() }}
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {showPagination && pagination && (
        <div className="border-t border-gray-200 px-4 py-3 sm:px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <span>
                Mostrando <strong>{table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}</strong> a{' '}
                <strong>{Math.min((table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize, data.length)}</strong>{' '}
                de <strong>{data.length}</strong> resultados
              </span>
              <select
                value={table.getState().pagination.pageSize}
                onChange={(e) => table.setPageSize(Number(e.target.value))}
                className="ml-2 h-8 rounded-md border border-gray-300 bg-white px-2 text-sm focus:border-primary focus:ring-2 focus:ring-primary-light"
                aria-label="Registros por página"
              >
                {[10, 25, 50, 100].map((size) => (
                  <option key={size} value={size}>
                    {size} por página
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.previousPage()}
                disabled={!table.getCanPreviousPage()}
                aria-label="Página anterior"
              >
                <ChevronUp className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => table.nextPage()}
                disabled={!table.getCanNextPage()}
                aria-label="Página siguiente"
              >
                <ChevronDown className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export { columnHelper }
export default DataTable