import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { EmptyState } from "@/components/empty-state";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

interface RowListEmptyState {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: ReactNode;
}

function RowContainer({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("overflow-hidden rounded-xl border bg-card shadow-sm", className)}>{children}</div>;
}

export interface DataTableColumn<T> {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  className?: string;
}

export function DataTable<T>({
  columns,
  rows,
  getRowKey,
  getRowHref,
  emptyState,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  getRowKey: (row: T) => string;
  getRowHref?: (row: T) => string | null | undefined;
  emptyState: RowListEmptyState;
  className?: string;
}) {
  if (rows.length === 0) {
    return <EmptyState {...emptyState} />;
  }

  return (
    <RowContainer className={className}>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            {columns.map((column) => (
              <TableHead key={column.key} className={column.className}>
                {column.header}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => {
            const href = getRowHref?.(row);
            return (
              <TableRow key={getRowKey(row)}>
                {columns.map((column, index) => {
                  const content = column.cell(row);
                  return (
                    <TableCell key={column.key} className={column.className}>
                      {index === 0 && href ? (
                        <Link href={href} className="block font-medium text-foreground hover:underline">
                          {content}
                        </Link>
                      ) : (
                        content
                      )}
                    </TableCell>
                  );
                })}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </RowContainer>
  );
}

export interface RowListProps<T> {
  items: T[];
  getRowKey: (item: T) => string;
  getRowHref?: (item: T) => string | null | undefined;
  renderRow: (item: T) => ReactNode;
  emptyState: RowListEmptyState;
  className?: string;
}

export function RowList<T>({ items, getRowKey, getRowHref, renderRow, emptyState, className }: RowListProps<T>) {
  if (items.length === 0) {
    return <EmptyState {...emptyState} />;
  }

  return (
    <RowContainer className={cn("divide-y", className)}>
      {items.map((item) => {
        const href = getRowHref?.(item);
        const content = renderRow(item);
        const rowClassName = "flex items-center justify-between gap-4 p-4 transition-colors hover:bg-muted";

        return href ? (
          <Link key={getRowKey(item)} href={href} className={rowClassName}>
            {content}
          </Link>
        ) : (
          <div key={getRowKey(item)} className={rowClassName}>
            {content}
          </div>
        );
      })}
    </RowContainer>
  );
}
