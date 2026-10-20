import { cls } from './ui';

const TH =
  'border-b-2 border-border bg-[rgba(248,249,250,0.9)] px-6 py-[1.2rem] text-left text-[1.05rem] font-bold tracking-[0.05em] text-primary uppercase';
const TR =
  'hover:border-l-3 hover:border-l-primary hover:bg-soft hover:transition-all hover:duration-300 tablet:mb-8 tablet:block tablet:rounded-lg tablet:border tablet:border-border tablet:bg-card tablet:p-6 tablet:shadow-[0_2px_8px_rgba(0,0,0,0.1)]';
const TD =
  'border-b border-border px-6 py-4 text-left text-[1.02rem] tablet:mb-2 tablet:flex tablet:items-center tablet:justify-between tablet:leading-normal tablet:last:mb-0 tablet:before:mr-4 tablet:before:flex-1 tablet:before:text-[0.9rem] tablet:before:font-semibold tablet:before:text-muted tablet:before:content-[attr(data-label)]';

/**
 * Card with a table. Up to 768px the header hides and every row becomes a card whose cells show
 * their `label` (see `Td`). `containerId`/`id`/`bodyId` are the ids of the card, table and tbody.
 */
export function DataTable({ containerId, id, bodyId, columns, children }) {
  return (
    <div
      id={containerId}
      className="table-container relative my-4 w-full overflow-hidden rounded-xl border border-border bg-card shadow-card before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-bar"
    >
      <table id={id} className="w-full border-collapse tablet:block">
        <thead className="tablet:hidden">
          <tr>
            {columns.map((column) => (
              <th key={column} className={TH}>
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody id={bodyId} className="tablet:block">
          {children}
        </tbody>
      </table>
    </div>
  );
}

export function Tr({ className, ...props }) {
  return <tr className={cls(TR, className)} {...props} />;
}

export function Td({ label, className, ...props }) {
  return <td data-label={label} className={cls(TD, className)} {...props} />;
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
