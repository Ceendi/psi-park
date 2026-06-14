import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import { cn } from '@/shared/lib/cn';

export interface Column<T> {
  key: string;
  header: ReactNode;
  render?: (row: T) => ReactNode;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  className?: string;
}

export interface TableSort {
  key: string;
  dir: 'asc' | 'desc';
}

export interface TableProps<T> {
  columns: Column<T>[];
  data: T[];
  rowKey: (row: T) => string | number;
  sort?: TableSort;
  onSortChange?: (key: string) => void;
  emptyMessage?: ReactNode;
  rowClassName?: (row: T) => string | undefined;
  className?: string;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' } as const;

export function Table<T>({
  columns,
  data,
  rowKey,
  sort,
  onSortChange,
  emptyMessage = 'Brak danych',
  rowClassName,
  className,
}: TableProps<T>) {
  return (
    <div className={cn('overflow-x-auto rounded-lg border border-ink-100', className)}>
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-100 bg-ink-50/60">
            {columns.map((column) => {
              const active = sort?.key === column.key;
              return (
                <th
                  key={column.key}
                  scope="col"
                  className={cn(
                    'px-4 py-3 font-mono text-[11px] font-semibold uppercase tracking-wider text-ink-500',
                    ALIGN[column.align ?? 'left'],
                  )}
                >
                  {column.sortable && onSortChange ? (
                    <button
                      type="button"
                      onClick={() => onSortChange(column.key)}
                      className="inline-flex items-center gap-1 transition hover:text-ink-900"
                    >
                      {column.header}
                      {active ? (
                        sort.dir === 'asc' ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 opacity-50" />
                      )}
                    </button>
                  ) : (
                    column.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-4 py-12 text-center text-sm text-ink-500">
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={rowKey(row)}
                className={cn('border-b border-ink-100 last:border-0 transition hover:bg-ink-50/50', rowClassName?.(row))}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn('px-4 py-3.5 text-ink-900', ALIGN[column.align ?? 'left'], column.className)}
                  >
                    {column.render
                      ? column.render(row)
                      : String((row as Record<string, unknown>)[column.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
