"use client";

import * as React from "react";
import {
  ColumnDef,
  ColumnFiltersState,
  RowSelectionState,
  SortingState,
  VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { DataTablePagination } from "@/components/ui/data-table-pagination";
import { DataTableViewOptions } from "@/components/ui/data-table-view-options";

type DataTableProps<TData, TValue> = {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  filterColumnId?: string;
  filterPlaceholder?: string;
  emptyMessage?: string;
  onRowClick?: (row: TData) => void;
  initialColumnVisibility?: VisibilityState;
  enableRowSelection?: boolean;
  getRowId?: (originalRow: TData, index: number) => string;
  onRowSelectionChange?: (selectedRowIds: string[]) => void;
  toolbarActions?: React.ReactNode;
};

export function DataTable<TData, TValue>({
  columns,
  data,
  filterColumnId,
  filterPlaceholder = "Search…",
  emptyMessage = "No results.",
  onRowClick,
  initialColumnVisibility,
  enableRowSelection = false,
  getRowId,
  onRowSelectionChange,
  toolbarActions,
}: DataTableProps<TData, TValue>) {
  const [sorting, setSorting] = React.useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(
    []
  );
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    initialColumnVisibility ?? {}
  );
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>({});

  const table = useReactTable({
    data,
    columns,
    getRowId,
    enableRowSelection,
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
    },
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  });

  const filterColumn = filterColumnId
    ? table.getColumn(filterColumnId)
    : undefined;
  const clickableRows = Boolean(onRowClick);
  const validRowIds = React.useMemo(
    () =>
      data.map((row, index) => (getRowId ? getRowId(row, index) : String(index))),
    [data, getRowId]
  );

  React.useEffect(() => {
    if (!enableRowSelection) {
      return;
    }

    setRowSelection((current) => {
      const validIds = new Set(validRowIds);
      const nextEntries = Object.entries(current).filter(
        ([rowId, selected]) => selected && validIds.has(rowId)
      );
      if (nextEntries.length === Object.keys(current).length) {
        return current;
      }
      return Object.fromEntries(nextEntries);
    });
  }, [enableRowSelection, validRowIds]);

  React.useEffect(() => {
    onRowSelectionChange?.(
      Object.entries(rowSelection)
        .filter(([, selected]) => selected)
        .map(([rowId]) => rowId)
    );
  }, [onRowSelectionChange, rowSelection]);

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {filterColumn ? (
          <Input
            placeholder={filterPlaceholder}
            value={(filterColumn.getFilterValue() as string) ?? ""}
            onChange={(event) => filterColumn.setFilterValue(event.target.value)}
            className="h-10 w-full text-sm sm:max-w-md"
          />
        ) : (
          <div />
        )}
        <div className="flex flex-wrap items-center justify-end gap-2">
          {toolbarActions}
          <DataTableViewOptions table={table} />
        </div>
      </div>

      <div className="rounded-xl border bg-card/40 shadow-sm p-2 sm:p-3">
        <div className="rounded-lg border bg-background overflow-hidden">
          <Table className="text-sm">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow
                  key={headerGroup.id}
                  className="bg-muted/40 hover:bg-muted/40"
                >
                  {headerGroup.headers.map((header) => (
                    <TableHead key={header.id} className="text-foreground">
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && "selected"}
                    className={clickableRows ? "cursor-pointer odd:bg-muted/10 hover:bg-muted/30" : "odd:bg-muted/10 hover:bg-muted/30"}
                    onClick={onRowClick ? () => onRowClick(row.original) : undefined}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {emptyMessage}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      <DataTablePagination table={table} />
    </div>
  );
}
