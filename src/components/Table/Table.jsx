import { createContext, useContext, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import styles from './Table.module.css';

const TableContext = createContext(null);

function useTableCtx() {
  const ctx = useContext(TableContext);
  if (!ctx) throw new Error('Table sub-component must be used inside <Table>');
  return ctx;
}

const PAGE_SIZE = 10;

/* ── Root ── */
function Table({ data = [], children, pageSize = PAGE_SIZE, onRowClick }) {
  const [page, setPage] = useState(1);
  const [cols, setCols] = useState([]);

  const totalPages = Math.max(1, Math.ceil(data.length / pageSize));
  const paged = data.slice((page - 1) * pageSize, page * pageSize);

  return (
    <TableContext.Provider value={{ data, paged, page, setPage, totalPages, pageSize, cols, setCols, onRowClick }}>
      <div className={styles.wrapper}>
        {children}
      </div>
    </TableContext.Provider>
  );
}

/* ── Header ── */
function Header({ children }) {
  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>{children}</tr>
        </thead>
        <BodyRows />
      </table>
    </div>
  );
}

/* ── Col definition ── */
function Col({ field, children, align = 'left', render }) {
  const { paged, onRowClick } = useTableCtx();
  // This component acts as both <th> and renders its cells in BodyRows
  // We expose data via context by registering cols
  return (
    <th className={`${styles.th} ${styles[`align-${align}`]}`} data-field={field} data-render={render}>
      {children}
    </th>
  );
}

/* ── Body (internal, rendered by Header) ── */
function BodyRows() {
  const { paged, onRowClick } = useTableCtx();
  return (
    <tbody className={styles.tbody}>
      {paged.map((row, rowIdx) => (
        <TableRow key={row.id ?? rowIdx} row={row} rowIdx={rowIdx} onRowClick={onRowClick} />
      ))}
    </tbody>
  );
}

function TableRow({ row, rowIdx, onRowClick }) {
  return (
    <tr
      className={`${styles.tr} ${onRowClick ? styles.clickable : ''}`}
      onClick={onRowClick ? () => onRowClick(row) : undefined}
    >
      {/* Cells injected by Body sub-component */}
      <RowCells row={row} />
    </tr>
  );
}

/* We use a different approach: Body renders its children (Col) as cells */
function Body({ children }) {
  const { paged, onRowClick } = useTableCtx();

  // Extract col definitions from children
  const colDefs = Array.isArray(children) ? children : [children];

  return (
    <div className={styles.tableWrapper}>
      <table className={styles.table}>
        <thead className={styles.thead}>
          <tr>
            {colDefs.map((col, i) => (
              <th
                key={i}
                className={`${styles.th} ${styles[`align-${col.props.align || 'left'}`]}`}
              >
                {col.props.children}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className={styles.tbody}>
          {paged.map((row, rowIdx) => (
            <tr
              key={row.id ?? rowIdx}
              className={`${styles.tr} ${onRowClick ? styles.clickable : ''}`}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
            >
              {colDefs.map((col, colIdx) => {
                const { field, align = 'left', render } = col.props;
                const value = field ? row[field] : row;
                return (
                  <td key={colIdx} className={`${styles.td} ${styles[`align-${align}`]}`}>
                    {render ? render(value, row) : value}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* Placeholder for RowCells (used internally) */
function RowCells() { return null; }

/* ── Empty state ── */
function Empty({ children }) {
  const { paged } = useTableCtx();
  if (paged.length > 0) return null;
  return (
    <div className={styles.empty}>
      <p>{children || 'No hay datos disponibles'}</p>
    </div>
  );
}

/* ── Pagination ── */
function Pagination() {
  const { page, setPage, totalPages, data, pageSize } = useTableCtx();
  if (data.length <= pageSize) return null;

  const start = (page - 1) * pageSize + 1;
  const end = Math.min(page * pageSize, data.length);

  return (
    <div className={styles.pagination}>
      <span className={styles.paginationInfo}>
        {start}–{end} de {data.length}
      </span>
      <div className={styles.paginationControls}>
        <button
          className={styles.pageBtn}
          onClick={() => setPage((p) => p - 1)}
          disabled={page === 1}
          aria-label="Página anterior"
        >
          <ChevronLeft size={16} />
        </button>
        <span className={styles.pageNumber}>{page} / {totalPages}</span>
        <button
          className={styles.pageBtn}
          onClick={() => setPage((p) => p + 1)}
          disabled={page === totalPages}
          aria-label="Página siguiente"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}

Table.Header     = Header;
Table.Col        = Col;
Table.Body       = Body;
Table.Empty      = Empty;
Table.Pagination = Pagination;

export default Table;
