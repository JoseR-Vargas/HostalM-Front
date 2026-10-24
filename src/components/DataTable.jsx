import { cls } from './ui';

// Preline table recipes (preline-ui). These strings are the contract: do not reword them.
const WRAPPER = 'min-w-full';
const SCROLL =
  'border border-table-line overflow-x-auto [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-track]:bg-scrollbar-track [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb';
const TABLE = 'min-w-full divide-y divide-table-line';
const TH = 'px-6 py-3 text-start text-xs font-medium text-muted-foreground-1 uppercase';
const TBODY = 'divide-y divide-table-line';
const TD = 'px-6 py-4 whitespace-nowrap text-sm text-foreground first:font-medium';

// Added on top of the recipes. `w-full max-w-full` keeps the wrapper (a flex item of the page column) inside
// the viewport, so a wide table scrolls inside its own box instead of widening the page; `border-collapse`
// replaces the Preflight rule that `divide-y` needs to draw the lines between rows (Preflight is off);
// `bg-layer` gives the box a background. `hover:bg-layer-hover` highlights the row under the pointer.
const WRAPPER_EXTRAS = 'w-full max-w-full my-4';
const SCROLL_EXTRAS = 'bg-layer';
const TABLE_EXTRAS = 'border-collapse';
const TR = 'hover:bg-layer-hover';
// Cells with images, long names or several links: they wrap instead of stretching the row.
const TD_WRAP = 'min-w-48 whitespace-normal!';

/**
 * Preline table in a horizontally scrollable box. `containerId`/`id`/`bodyId` are the ids of the wrapper
 * (`.table-container`), table and tbody; `columns` are the header labels.
 */
export function DataTable({ containerId, id, bodyId, columns, children }) {
  return (
    <div id={containerId} className={cls('table-container', WRAPPER, WRAPPER_EXTRAS)}>
      <div className={cls(SCROLL, SCROLL_EXTRAS)}>
        <table id={id} className={cls(TABLE, TABLE_EXTRAS)}>
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col" className={TH}>
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody id={bodyId} className={TBODY}>
            {children}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function Tr({ className, ...props }) {
  return <tr className={cls(TR, className)} {...props} />;
}

/** Table cell. `label` is the column name (`data-label`); `wrap` lets long content break onto several lines. */
export function Td({ label, wrap = false, className, ...props }) {
  return <td data-label={label} className={cls(TD, wrap && TD_WRAP, className)} {...props} />;
}

/** Dashed box shown instead of a table (no records, load failure). */
export function EmptyState({ children, ...props }) {
  return (
    <div
      className="my-8 rounded-xl border-2 border-dashed border-[#dee2e6] bg-[linear-gradient(135deg,#f8f9fa,#e9ecef)] px-8 py-12 text-center"
      {...props}
    >
      <p className="text-[1.1rem] font-medium text-muted">{children}</p>
    </div>
  );
}
