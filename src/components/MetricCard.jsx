import { cls } from './ui';

const CARD =
  'metric-card relative overflow-hidden rounded-xl border border-border bg-card p-8 text-center shadow-card transition-all duration-300 before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-bar hover:-translate-y-[5px] hover:scale-[1.02] hover:border-primary hover:shadow-hover';

/** Raised card with a gradient top bar. */
export function MetricCard({ className, ...props }) {
  return <div className={cls(CARD, className)} {...props} />;
}

/** Card with a small uppercase title and a big value. */
export function Metric({ title, value }) {
  return (
    <MetricCard>
      <h4 className="metric-title mb-2 text-[0.9rem] font-semibold tracking-[0.05em] text-muted uppercase">{title}</h4>
      <p className="metric-value block text-[2rem] leading-none font-bold text-primary [text-shadow:0_0_10px_rgba(43,108,176,0.3)]">
        {value}
      </p>
    </MetricCard>
  );
}
