const ARROW =
  'flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-lg border-none bg-primary text-[1.2rem] text-white transition-all duration-300 hover:bg-primary-dark hover:shadow-glow';

const DEFAULT_IDS = { prev: 'prevMonth', label: 'currentMonthLabel', next: 'nextMonth' };

/** "← Month Year →" pager of the admin pages. `onChange(delta)` receives -1 / +1. */
export default function MonthPager({ label, onChange, ids = DEFAULT_IDS }) {
  return (
    <div className="my-6 flex items-center justify-center gap-6 phone:gap-3">
      <button type="button" className={ARROW} id={ids.prev} onClick={() => onChange(-1)}>
        ←
      </button>
      <span
        className="min-w-[180px] text-center text-[1.2rem] font-semibold text-ink phone:min-w-0 phone:text-[1.05rem]"
        id={ids.label}
      >
        {label}
      </span>
      <button type="button" className={ARROW} id={ids.next} onClick={() => onChange(1)}>
        →
      </button>
    </div>
  );
}
