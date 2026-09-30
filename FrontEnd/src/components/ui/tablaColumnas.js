import { legacyCreateColumnHelper as createColumnHelper } from '@tanstack/react-table/legacy'

// Definición de columnas para DataTable (separada del componente para que Vite recargue en caliente
// Table.jsx: un archivo de componentes no debe exportar también funciones)
export const columnHelper = createColumnHelper()

export function createTableColumns(columns) {
  // Varias columnas pueden leer el mismo campo (p. ej. dos columnas sobre "lote"); TanStack usa el
  // accessorKey como id y React recibía claves repetidas. Se desambigua con un sufijo.
  const usados = new Set()
  const idUnico = (base, i) => {
    const id = usados.has(base) ? `${base}_${i}` : base
    usados.add(id)
    return id
  }

  return columns.map((col, i) => {
    if (col.accessorKey) {
      return columnHelper.accessor(col.accessorKey, {
        id: idUnico(col.id || col.accessorKey, i),
        header: col.header,
        // Se pasa la fila de TanStack (no row.original): todas las páginas leen row.original.
        // Antes llegaba el objeto de datos y row.original era undefined, lo que rompía las listas.
        cell: col.cell ? (info) => col.cell(info.getValue(), info.row) : (info) => info.getValue(),
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
