import {
  createColumnHelper,
  createPaginatedRowModel,
  rowPaginationFeature,
  tableFeatures,
  useTable,
} from '@tanstack/react-table';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OutputError } from './OutputError';
import { csvRows, jsonRows, type Row, type Rows } from './rows';

const PAGE_SIZE = 20;

const features = tableFeatures({
  rowPaginationFeature,
  paginatedRowModel: createPaginatedRowModel(),
});
const helper = createColumnHelper<typeof features, Row>();
const initialState = { pagination: { pageIndex: 0, pageSize: PAGE_SIZE } };

function DataTable({ value }: { value: Rows }) {
  const columns = useMemo(
    () =>
      helper.columns(
        value.columns.map((key) => helper.accessor((row) => row[key], { id: key, header: key })),
      ),
    [value.columns],
  );
  const table = useTable({ features, columns, data: value.rows, initialState });
  const { pageIndex } = table.state.pagination;

  return (
    <div className="flex flex-col gap-2">
      <Table className="text-xs">
        <TableHeader>
          {table.getHeaderGroups().map((group) => (
            <TableRow key={group.id}>
              {group.headers.map((header) => (
                <TableHead key={header.id}>
                  <table.FlexRender header={header} />
                </TableHead>
              ))}
            </TableRow>
          ))}
        </TableHeader>
        <TableBody>
          {table.getRowModel().rows.map((row) => (
            <TableRow key={row.id}>
              {row.getAllCells().map((cell) => (
                <TableCell key={cell.id}>
                  <table.FlexRender cell={cell} />
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
      {table.getPageCount() > 1 && (
        <div className="flex items-center justify-end gap-2 text-xs text-muted-foreground">
          <span>
            Page {pageIndex + 1} of {table.getPageCount()} ({table.getRowCount()} rows)
          </span>
          <Button
            variant="outline"
            size="icon-xs"
            aria-label="Previous page"
            disabled={!table.getCanPreviousPage()}
            onClick={() => {
              table.previousPage();
            }}
          >
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            size="icon-xs"
            aria-label="Next page"
            disabled={!table.getCanNextPage()}
            onClick={() => {
              table.nextPage();
            }}
          >
            <ChevronRight />
          </Button>
        </div>
      )}
    </div>
  );
}

const PARSERS = { csv: csvRows, json: jsonRows };

/** A CSV or JSON output as a paginated table, or why it cannot be one. */
export default function TableOutput({ text, format }: { text: string; format: 'csv' | 'json' }) {
  const result = useMemo(() => PARSERS[format](text), [text, format]);
  return result.ok ? <DataTable value={result.value} /> : <OutputError message={result.message} />;
}
