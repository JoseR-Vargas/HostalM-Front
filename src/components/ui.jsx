/**
 * Small Tailwind-based primitives shared by the pages. The semantic class names kept next to the
 * utilities (`section-title`, `form-group`, `error`, `cta-button`...) are hooks for tests and
 * specs, not styles: state classes such as `error` are only present while the state is active.
 */

export const cls = (...parts) => parts.filter(Boolean).join(' ');

const GRADIENT_TEXT = 'bg-clip-text text-transparent';

export function SectionTitle({ as: Tag = 'h3', className, children }) {
  return (
    <Tag
      className={cls(
        'section-title mt-4 bg-title text-[3rem] tablet:text-center tablet:text-[2rem] phone:text-[1.6rem]',
        GRADIENT_TEXT,
        className,
      )}
    >
      {children}
    </Tag>
  );
}

export function SectionSubtitle({ as: Tag = 'h4', children }) {
  return <Tag className="my-8 text-center text-[1.5rem] font-semibold text-secondary">{children}</Tag>;
}

/** Title + subtitle shown on top of the form pages. */
export function PageHeading({ title, subtitle }) {
  return (
    <>
      <SectionTitle className="mb-8 text-center">{title}</SectionTitle>
      <p className="mb-16 text-center text-[1.3rem] leading-[1.6] text-muted">{subtitle}</p>
    </>
  );
}

/** Page body below the fixed header: titled section with a centered column. */
export function PageSection({ title, subtitle, children }) {
  return (
    <section className="border-t border-border bg-band pt-[120px] pb-[100px] tablet:pt-[140px] phone:pt-[170px] phone:pb-10">
      <div className="mx-auto flex w-full max-w-full flex-col items-center px-4">
        <PageHeading title={title} subtitle={subtitle} />
        {children}
      </div>
    </section>
  );
}

const BANNER_TONES = {
  error: 'border-[#e53e3e] bg-[#fed7d7] text-[#c53030]',
  success: 'border-[#38a169] bg-[#c6f6d5] text-[#22543d]',
};

/** Coloured message box. Callers add the padding/margins. */
export function Banner({ tone, className, ...props }) {
  return <div data-tone={tone} className={cls('rounded-lg border-l-4', BANNER_TONES[tone], className)} {...props} />;
}

const CARD_BASE =
  'contact-form relative mx-auto max-w-[700px] overflow-hidden rounded-xl border border-border bg-card p-16 shadow-card before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-bar tablet:max-w-[90%] tablet:px-6 tablet:py-8 phone:max-w-[95%] phone:px-4 phone:py-6';

/** White card of the forms (a `form` or a plain `div`). Nothing inside it is scaled by a transform. */
export function FormCard({ as: Tag = 'div', className, ...props }) {
  return <Tag className={cls(CARD_BASE, '**:transform-none!', className)} {...props} />;
}

export function FormRow({ children }) {
  return <div className="mb-8 grid grid-cols-[1fr_1fr] gap-8 tablet:grid-cols-[1fr]">{children}</div>;
}

const FIELD_STYLES = {
  default: {
    group: 'mb-8',
    label: 'mb-[0.8rem] text-[1.05rem] font-semibold',
    control: 'rounded-lg border-2 px-[1.2rem] py-4 text-[1.05rem] transition-all duration-300',
    bg: 'bg-white',
  },
  compact: {
    group: 'mb-[1.2rem] phone:mb-4',
    label: 'mb-[0.4rem] text-[0.9rem] font-medium',
    control:
      'rounded-lg border-2 p-3 text-[1rem] transition-[border-color] duration-200 phone:p-[0.65rem] autofill:shadow-[inset_0_0_0_1000px_#fdfdfd] autofill:[-webkit-text-fill-color:var(--color-ink)]',
    bg: 'bg-[#fdfdfd]',
  },
};

const CONTROL_BASE = 'w-full font-sans text-ink outline-none';
const CONTROL_OK =
  'border-border focus:border-primary focus:bg-[rgba(248,249,250,0.8)] focus:shadow-[0_0_0_3px_rgba(43,108,176,0.15),0_0_15px_rgba(43,108,176,0.1)]';
const CONTROL_ERROR =
  'border-[#e53e3e] bg-[#fff5f5] focus:border-[#c53030] focus:bg-[#fff5f5] focus:shadow-[0_0_0_3px_rgba(229,62,62,0.15)]';

/**
 * Label + control + optional help text, error message and unit.
 * - `as`: the control element (`input`, `select`, `textarea`); `name` defaults to `id`
 * - `error`: highlights the control and shows `errorMessage` (the group gets the `error` hook class)
 * - `groupId`/`className`: id and extra classes of the wrapper
 * - `children`: content of the control (e.g. the `option`s); `after`: extra content below it (counter, ...)
 */
export function Field({
  id,
  label,
  as: Control = 'input',
  variant = 'default',
  error = false,
  errorMessage,
  help,
  helpId,
  unit,
  groupId,
  className,
  controlClass,
  after,
  children,
  ...control
}) {
  const style = FIELD_STYLES[variant];
  const classes = cls(
    CONTROL_BASE,
    style.control,
    error ? CONTROL_ERROR : cls(CONTROL_OK, style.bg),
    unit && 'pr-12',
    controlClass,
  );

  return (
    <div id={groupId} className={cls('form-group', error && 'error', style.group, unit && 'relative', className)}>
      <label htmlFor={id} className={cls('block text-ink', style.label)}>
        {label}
      </label>
      <Control name={id} {...control} id={id} className={classes}>
        {children}
      </Control>
      {help && (
        <small id={helpId} className="mt-[0.8rem] block text-[0.95rem] leading-[1.5] text-muted opacity-90">
          {help}
        </small>
      )}
      {unit && <span className="pointer-events-none absolute top-1/2 right-4 font-semibold text-muted">{unit}</span>}
      {after}
      {errorMessage && (
        <Banner
          tone="error"
          className={cls('error-message mt-2 p-3 text-[0.85rem] leading-[1.3]', error ? 'block' : 'hidden')}
        >
          {errorMessage}
        </Banner>
      )}
    </div>
  );
}

const BUTTONS = {
  cta: [
    'cta-button',
    'inline-flex animate-pulse-glow items-center gap-2 rounded-xl px-10 py-[1.2rem] text-[1.1rem] font-semibold shadow-glow hover:[animation-play-state:paused]',
  ],
  submit: [
    'submit-button',
    'w-full rounded-xl px-10 py-[1.2rem] font-sans text-[1.1rem] font-bold shadow-glow hover:-translate-y-0.5 hover:shadow-[0_8px_32px_rgba(0,0,0,0.12),0_0_20px_rgba(43,108,176,0.2)] hover:brightness-110 active:translate-y-0',
  ],
};

// While processing the button ignores clicks, fades and shows a spinner (its `::after`) in the centre.
const PROCESSING =
  "processing pointer-events-none relative opacity-70 after:absolute after:top-1/2 after:left-1/2 after:size-5 after:[transform:translate(-50%,-50%)] after:animate-spin-centered after:rounded-[50%] after:border-2 after:border-transparent after:border-t-white after:content-['']";

const BUTTON_BASE = 'cursor-pointer border-none bg-transparent bg-brand tracking-[0.05em] text-white uppercase transition-all duration-300';

/** Gradient call-to-action (`cta`, pulsing) or full-width form `submit`. Renders `as` (default `button`). */
export function Button({ as: Tag = 'button', variant = 'cta', processing = false, className, ...props }) {
  const [hook, styles] = BUTTONS[variant];
  return <Tag className={cls(hook, BUTTON_BASE, styles, processing && PROCESSING, className)} {...props} />;
}
