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

// Wrapper and label spacing of each variant. The control look is the same for both (Preline input recipe).
const FIELD_STYLES = {
  default: {
    group: 'mb-8',
    label: 'mb-[0.8rem] text-[1.05rem] font-semibold',
  },
  compact: {
    group: 'mb-[1.2rem] phone:mb-4',
    label: 'mb-[0.4rem] text-[0.9rem] font-medium',
  },
};

// Preline input recipe (preline-ui). This string is the contract: do not reword it.
const INPUT_RECIPE =
  'py-2.5 sm:py-3 px-4 rounded-full block w-full bg-layer border-layer-line sm:text-sm text-foreground placeholder:text-muted-foreground-1 focus:border-primary-focus focus:ring-primary-focus disabled:opacity-50 disabled:pointer-events-none';
// A pill cannot hold several lines of text: the textarea keeps the recipe with a softer radius.
const TEXTAREA_RECIPE = INPUT_RECIPE.replace('rounded-full', 'rounded-2xl');

// Added on top of the recipe. Preflight is off, so controls would not inherit the app font and the recipe's
// `border-layer-line` (colour only) would draw the browser's `inset` border: `border` sets the solid style.
// A select needs room for the arrow `@tailwindcss/forms` draws (the recipe `px-4` would put the text under it).
const INPUT_EXTRAS = 'font-sans border';
const SELECT_EXTRAS = 'pe-9';

// Error look, driven by the `error` prop. `!` because the recipe sets the same properties.
export const INPUT_ERROR = 'border-red-500! focus:border-red-500! focus:ring-red-500!';

// File inputs and photo uploads keep their own look: the pill recipe does not fit the native file button.
const FILE_CONTROL =
  'w-full rounded-lg border-2 px-[1.2rem] py-4 font-sans text-[1.05rem] text-ink outline-none transition-all duration-300';
const FILE_CONTROL_OK = 'border-border bg-white focus:border-primary focus:shadow-[0_0_0_3px_rgba(43,108,176,0.15)]';
const FILE_CONTROL_ERROR = 'border-[#e53e3e] bg-[#fff5f5] focus:border-[#c53030]';

function controlClasses({ Control, type, error, unit, controlClass }) {
  if (type === 'file') return cls(FILE_CONTROL, error ? FILE_CONTROL_ERROR : FILE_CONTROL_OK, controlClass);
  return cls(
    Control === 'textarea' ? TEXTAREA_RECIPE : INPUT_RECIPE,
    INPUT_EXTRAS,
    Control === 'select' && SELECT_EXTRAS,
    error && INPUT_ERROR,
    unit && 'pr-12',
    controlClass,
  );
}

/**
 * Wrapper of a form control: group (`form-group`, `error` hook class only while active), label, the control
 * (`children`), optional help text and the error message. `Field` uses it for native controls; the Preline
 * widgets (`SelectField`, `DatePickerField`) use it around their plugin-driven markup, so layout and error
 * styling are the same everywhere.
 * - `labelFor`: the id the label points to (defaults to `id`); `labelId`: id of the label itself
 * - `error`: adds the `error` hook class to the group and shows `errorMessage`
 * - `groupId`/`className`: id and extra classes of the wrapper; `after`: extra content below the control
 */
export function FieldGroup({
  id,
  label,
  labelFor = id,
  labelId,
  variant = 'default',
  error = false,
  errorMessage,
  help,
  helpId,
  groupId,
  className,
  after,
  children,
}) {
  const style = FIELD_STYLES[variant];

  return (
    <div id={groupId} className={cls('form-group', error && 'error', style.group, className)}>
      <label id={labelId} htmlFor={labelFor} className={cls('block text-ink', style.label)}>
        {label}
      </label>
      {children}
      {help && (
        <small id={helpId} className="mt-[0.8rem] block text-[0.95rem] leading-[1.5] text-muted opacity-90">
          {help}
        </small>
      )}
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
  const classes = controlClasses({ Control, type: control.type, error, unit, controlClass });
  const controlElement = (
    <Control name={id} {...control} id={id} className={classes}>
      {children}
    </Control>
  );

  return (
    <FieldGroup
      id={id}
      label={label}
      variant={variant}
      error={error}
      errorMessage={errorMessage}
      help={help}
      helpId={helpId}
      groupId={groupId}
      className={className}
      after={after}
    >
      {/* With a unit, the control and the unit share a box so the unit is centred on the control itself. */}
      {unit ? (
        <div className="relative">
          {controlElement}
          <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center font-semibold text-muted">{unit}</span>
        </div>
      ) : (
        controlElement
      )}
    </FieldGroup>
  );
}

// Preline button recipes (preline-ui). These strings are the contract: do not reword them.
const BUTTON_PRIMARY =
  'py-3 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-full bg-primary border border-primary-line text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none';
const BUTTON_SECONDARY =
  'py-3 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-full bg-layer border border-layer-line text-layer-foreground shadow-2xs hover:bg-layer-hover focus:outline-hidden focus:bg-layer-hover disabled:opacity-50 disabled:pointer-events-none';

// Small buttons of the modal footers and the link button of the table cells (Preline recipes, same contract).
const BUTTON_PRIMARY_SM =
  'py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg bg-primary border border-primary-line text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-focus disabled:opacity-50 disabled:pointer-events-none';
const BUTTON_SECONDARY_SM =
  'py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg bg-layer border border-layer-line text-layer-foreground shadow-2xs hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus disabled:opacity-50 disabled:pointer-events-none';
/** Action link or button inside a table cell (Preline recipe). The `link` button variant uses it too. */
export const TABLE_LINK =
  'inline-flex items-center gap-x-2 text-sm font-semibold rounded-lg text-primary hover:text-primary-hover focus:outline-hidden focus:text-primary-focus disabled:opacity-50 disabled:pointer-events-none';

// Added on top of the recipes. Preflight is off, so native buttons would not inherit the app font
// (`font-sans`); `justify-center` keeps the label centred when the button is stretched (`w-full`); and
// `hover:text-shadow-none` stops the base `a:hover` glow when the button is rendered as a link.
const BUTTON_EXTRAS = 'justify-center font-sans cursor-pointer hover:text-shadow-none';

// `hook` = semantic class for tests/specs (no styles); `look` = recipe; `layout` = extra classes; `spinner` = spinner colour.
const BUTTONS = {
  primary: { hook: '', look: BUTTON_PRIMARY, sm: BUTTON_PRIMARY_SM, spinner: 'text-primary-foreground' },
  secondary: { hook: '', look: BUTTON_SECONDARY, sm: BUTTON_SECONDARY_SM, spinner: 'text-layer-foreground' },
  // Text-only action inside a table cell; `size` does not apply. The padding keeps the tap target at 24px+ and the
  // negative margins keep the row height and the text aligned with the other cells.
  link: { hook: '', look: TABLE_LINK, sm: TABLE_LINK, layout: 'bg-transparent border-0 px-2 py-1.5 -mx-2 -my-1.5', spinner: 'text-primary' },
  // Legacy names kept for the call sites: call-to-action link/button and full-width form submit (both primary).
  cta: { hook: 'cta-button', look: BUTTON_PRIMARY, sm: BUTTON_PRIMARY_SM, spinner: 'text-primary-foreground' },
  submit: { hook: 'submit-button', look: BUTTON_PRIMARY, sm: BUTTON_PRIMARY_SM, spinner: 'text-primary-foreground', layout: 'w-full' },
};

/**
 * Preline ring spinner. The default markup is the Preline recipe; `size` and `tone` replace the default
 * size/colour classes (the ring uses `currentColor`, so the colour is the text colour) and `className`
 * adds more. `label` is the screen reader text: pass `null` when the spinner sits next to a text that
 * already says what is loading (e.g. inside a button), so it does not add a second message.
 */
export function Spinner({
  size = 'size-6',
  tone = 'text-muted-foreground-2',
  label = 'Loading...',
  className,
  ...props
}) {
  return (
    <div
      className={cls('animate-spin inline-block', size, 'border-3 border-current border-t-transparent rounded-[999px]', tone, className)}
      role="status"
      aria-label="loading"
      {...props}
    >
      {label !== null && <span className="sr-only">{label}</span>}
    </div>
  );
}

/**
 * Preline pill button. `variant`: `primary`, `secondary`, `link` (text action for table cells), or the legacy
 * hooks `cta` (default) and `submit` (full width). `size="sm"` gives the compact rounded-lg button of the modal
 * footers. Renders `as` (default `button`). While `processing` it ignores clicks and shows the spinner
 * before its content; the `processing` class is only present while it is active.
 */
export function Button({
  as: Tag = 'button',
  variant = 'cta',
  size,
  processing = false,
  className,
  children,
  ...props
}) {
  const { hook, look, sm, layout, spinner } = BUTTONS[variant];
  return (
    <Tag className={cls(hook, size === 'sm' ? sm : look, BUTTON_EXTRAS, layout, processing && 'processing pointer-events-none', className)} {...props}>
      {processing && <Spinner size="size-4" tone={spinner} label={null} />}
      {children}
    </Tag>
  );
}
