/* eslint-disable react/prop-types -- presentational primitives */
import { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '../../lib/cn';
import { EmptyState, Skeleton } from './Feedback';

/**
 * columns: [{ key, header, render(row), sortValue(row), align: 'right', className, stop: true (clicks don't open the row) }]
 * selectable + selected (array of keys) + onSelect(keys) adds a checkbox column.
 */
export function DataTable({
  columns,
  rows,
  rowKey = 'id',
  selectable = false,
  selected = [],
  onSelect,
  onRowClick,
  loading = false,
  empty,
  pageSize = 8,
  caption,
  className,
}) {
  const [sort, setSort] = useState(null);
  const [page, setPage] = useState(0);

  useEffect(() => setPage(0), [rows.length, sort]);

  const sorted = useMemo(() => {
    if (!sort) return rows;
    const column = columns.find((c) => c.key === sort.key);
    const value = column.sortValue || ((r) => r[column.key]);
    return [...rows].sort((a, b) => {
      const [x, y] = [value(a), value(b)];
      if (x === y) return 0;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return (x > y ? 1 : -1) * (sort.dir === 'asc' ? 1 : -1);
    });
  }, [rows, sort, columns]);

  const pages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const visible = sorted.slice(page * pageSize, page * pageSize + pageSize);
  const keyOf = (row) => (typeof rowKey === 'function' ? rowKey(row) : row[rowKey]);
  const allVisibleSelected =
    visible.length > 0 && visible.every((r) => selected.includes(keyOf(r)));

  function toggleSort(column) {
    if (!column.sortValue && !column.sortable) return;
    setSort((s) =>
      s?.key === column.key
        ? s.dir === 'asc'
          ? { key: column.key, dir: 'desc' }
          : null
        : { key: column.key, dir: 'asc' },
    );
  }

  function toggleRow(key) {
    onSelect(selected.includes(key) ? selected.filter((k) => k !== key) : [...selected, key]);
  }

  function toggleAll() {
    const keys = visible.map(keyOf);
    onSelect(
      allVisibleSelected
        ? selected.filter((k) => !keys.includes(k))
        : [...new Set([...selected, ...keys])],
    );
  }

  return (
    <div className={cn('min-w-0', className)}>
      <div className="scrollbar-thin overflow-x-auto">
        <table className="w-full border-collapse text-body">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="border-b border-line">
              {selectable && (
                <th scope="col" className="w-10 py-3 pr-2 pl-5 text-left">
                  <input
                    type="checkbox"
                    aria-label="Select all rows on this page"
                    checked={allVisibleSelected}
                    onChange={toggleAll}
                    className="size-4"
                  />
                </th>
              )}
              {columns.map((c, i) => {
                const sortable = Boolean(c.sortValue || c.sortable);
                const dir = sort?.key === c.key ? sort.dir : null;
                const SortIcon = dir === 'asc' ? ArrowUp : dir === 'desc' ? ArrowDown : ArrowUpDown;
                return (
                  <th
                    key={c.key}
                    scope="col"
                    aria-sort={dir ? (dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={cn(
                      'py-3 text-xs font-medium whitespace-nowrap text-ink-3',
                      i === 0 && !selectable ? 'pl-5' : 'pl-3',
                      i === columns.length - 1 ? 'pr-5' : 'pr-3',
                      c.align === 'right' ? 'text-right' : 'text-left',
                    )}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(c)}
                        className="inline-flex items-center gap-1 hover:text-ink"
                      >
                        {c.header}
                        <SortIcon
                          size={12}
                          aria-hidden="true"
                          className={dir ? 'text-brand-700' : ''}
                        />
                      </button>
                    ) : (
                      c.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {loading &&
              Array.from({ length: Math.min(pageSize, 5) }, (_, r) => (
                <tr key={`sk-${r}`} className="h-[52px] border-b border-line last:border-0">
                  {selectable && <td className="pl-5" />}
                  {columns.map((c, i) => (
                    <td
                      key={c.key}
                      className={cn(i === 0 && !selectable ? 'pl-5' : 'pl-3', 'pr-3')}
                    >
                      <Skeleton className="h-3.5 w-3/4" />
                    </td>
                  ))}
                </tr>
              ))}
            {!loading &&
              visible.map((row) => {
                const key = keyOf(row);
                return (
                  <tr
                    key={key}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    onKeyDown={
                      onRowClick
                        ? (e) => {
                            if (e.key === 'Enter') onRowClick(row);
                          }
                        : undefined
                    }
                    tabIndex={onRowClick ? 0 : undefined}
                    className={cn(
                      'h-[52px] border-b border-line transition-colors last:border-0 hover:bg-brand-50',
                      onRowClick && 'cursor-pointer',
                      selected.includes(key) && 'bg-brand-50',
                    )}
                  >
                    {selectable && (
                      <td className="pr-2 pl-5" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          aria-label={`Select row ${key}`}
                          checked={selected.includes(key)}
                          onChange={() => toggleRow(key)}
                          className="size-4"
                        />
                      </td>
                    )}
                    {columns.map((c, i) => (
                      <td
                        key={c.key}
                        onClick={c.stop ? (e) => e.stopPropagation() : undefined}
                        className={cn(
                          'py-2 text-ink',
                          i === 0 && !selectable ? 'pl-5' : 'pl-3',
                          i === columns.length - 1 ? 'pr-5' : 'pr-3',
                          c.align === 'right' && 'text-right',
                          c.className,
                        )}
                      >
                        {c.render ? c.render(row) : row[c.key]}
                      </td>
                    ))}
                  </tr>
                );
              })}
          </tbody>
        </table>
      </div>
      {!loading && rows.length === 0 && (empty || <EmptyState title="Nothing here yet" />)}
      {!loading && rows.length > pageSize && (
        <div className="flex items-center justify-between gap-3 border-t border-line px-5 py-3 text-xs text-ink-3">
          <span>
            Showing {page * pageSize + 1}–{Math.min(sorted.length, (page + 1) * pageSize)} of{' '}
            {sorted.length}
          </span>
          <span className="flex items-center gap-1">
            <button
              type="button"
              aria-label="Previous page"
              disabled={page === 0}
              onClick={() => setPage((p) => p - 1)}
              className="grid size-7 place-items-center rounded-md border border-line hover:bg-brand-50 disabled:opacity-40"
            >
              <ChevronLeft size={14} />
            </button>
            <span className="px-2 font-semibold text-ink">
              {page + 1} / {pages}
            </span>
            <button
              type="button"
              aria-label="Next page"
              disabled={page >= pages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="grid size-7 place-items-center rounded-md border border-line hover:bg-brand-50 disabled:opacity-40"
            >
              <ChevronRight size={14} />
            </button>
          </span>
        </div>
      )}
    </div>
  );
}
