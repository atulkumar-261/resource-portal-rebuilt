import { type ColumnDef, flexRender, getCoreRowModel, getFilteredRowModel, getPaginationRowModel, useReactTable } from "@tanstack/react-table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useState, type ReactNode } from "react";

interface Props<T extends object> {
  data: T[];
  columns: ColumnDef<T, any>[];
  searchPlaceholder?: string;
  toolbar?: ReactNode;
  pageSize?: number;
}

export function DataTable<T extends object>({ data, columns, searchPlaceholder = "Search...", toolbar, pageSize = 10 }: Props<T>) {
  const [globalFilter, setGlobalFilter] = useState("");
  const table = useReactTable({
    data,
    columns,
    state: { globalFilter },
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize } },
    globalFilterFn: "includesString",
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <Input placeholder={searchPlaceholder} value={globalFilter} onChange={(e) => setGlobalFilter(e.target.value)} className="max-w-xs" />
        {toolbar && <div className="flex items-center gap-2">{toolbar}</div>}
      </div>
      <div className="border border-slate-200 rounded overflow-x-auto bg-white">
        <table className="w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((h) => (
                  <th key={h.id} className="text-left px-4 py-2 font-semibold border-b border-slate-200">
                    {flexRender(h.column.columnDef.header, h.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={columns.length}>No records found</td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="border-b border-slate-100 hover:bg-slate-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-2 align-top">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex items-center justify-between text-xs text-slate-600">
        <div>
          {table.getFilteredRowModel().rows.length === 0
            ? "0 records"
            : `${table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to ${Math.min(
                (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                table.getFilteredRowModel().rows.length
              )} of ${table.getFilteredRowModel().rows.length}`}
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => table.previousPage()} disabled={!table.getCanPreviousPage()}>Prev</Button>
          <Button size="sm" variant="outline" onClick={() => table.nextPage()} disabled={!table.getCanNextPage()}>Next</Button>
        </div>
      </div>
    </div>
  );
}
