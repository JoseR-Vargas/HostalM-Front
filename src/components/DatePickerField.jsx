import { useCallback, useEffect, useRef, useState } from 'react';
import { RECEIPT_MONTHS, formatReceiptDate } from '../lib/receipts';
import { FieldGroup, INPUT_ERROR, cls } from './ui';

/*
 * Preline Advanced Datepicker (npm `@preline/datepicker`, which bundles Vanilla Calendar Pro) wired to React, with
 * the label / error markup of `Field`.
 *
 * The form value stays what `<input type="date">` produced: `YYYY-MM-DD` (or `''`). The plugin shows the date to the
 * user as `DD/MM/YYYY`, but never owns it:
 * - Until the plugin is loaded, or if its chunk never loads, the field is the native date input (controlled).
 *   When the plugin is ready the input is REPLACED (`key` change) by the plugin's own `readonly` text input. A
 *   replacement, not a mutation: the plugin clones and swaps its input on `destroy()`, so it needs a node that React
 *   does not keep controlling.
 * - React is the source of truth: outside changes (form reset, defaults) are pushed into the calendar; picks are
 *   reported through the plugin's `change.hs.datepicker` event.
 * - The plugin is loaded on demand (dynamic `import()`, own chunk, plus lodash which it reads from `window._`).
 * - The calendar popup is appended to <body> by the plugin, so the form card's `overflow-hidden` cannot clip it.
 */

// Recipe of the plugin options (the `data-hs-datepicker` attribute). Strings are kept as given, except for the
// `aria-label`s added to the arrows (the recipe's buttons have no accessible name).
const ARROW_PREV =
  '<button data-vc-arrow="prev" aria-label="Mes anterior"><svg class="shrink-0 size-4" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"></path></svg></button>';
const ARROW_NEXT =
  '<button data-vc-arrow="next" aria-label="Mes siguiente"><svg class="shrink-0 size-4" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m9 18 6-6-6-6"></path></svg></button>';

// The plugin sets `dateMin` to TODAY when it is not given, which would forbid past receipts (the native input had
// no limit). The oldest receipt the hostal can issue is far newer than this.
const DATE_MIN = '2020-01-01';
const DATE_MAX = '2050-12-31';

const PLUGIN_ATTRIBUTE = JSON.stringify({
  type: 'default',
  applyUtilityClasses: true,
  dateMin: DATE_MIN,
  dateMax: DATE_MAX,
  mode: 'custom-select',
  // 'light' keeps the plugin from adding its `dark:` classes (the site has no dark theme).
  selectedTheme: 'light',
  templates: { arrowPrev: ARROW_PREV, arrowNext: ARROW_NEXT },
});

// Spanish calendar, weeks starting on Monday (es-AR).
// Centered under the field: a left-aligned popup would be squeezed (or shifted flush to the edge) on a phone.
const CALENDAR_LOCALE = { locale: 'es-AR', firstWeekday: 1, positionToInput: 'center' };

const INPUT_CLASSES =
  'hs-datepicker py-3 px-4 block w-full bg-layer border-layer-line rounded-lg sm:text-sm text-foreground placeholder:text-muted-foreground-1 focus:border-primary-focus focus:ring-primary-focus disabled:opacity-50 disabled:pointer-events-none';
// Added on top of the recipe: Preflight is off (app font, solid border style), and the field is a clickable box.
const INPUT_EXTRAS = 'font-sans border cursor-pointer';
const NATIVE_CLASSES = cls(INPUT_CLASSES.replace('hs-datepicker ', ''), 'font-sans border');

let pluginPromise;

/**
 * Loads lodash (the plugin reads `_` as a global, so it must exist before the plugin runs) and the plugin in its
 * manual-init build. Cached; a failed load is not cached, so a later mount retries.
 */
function loadDatepickerPlugin() {
  if (!pluginPromise) {
    pluginPromise = (async () => {
      const { default: lodash } = await import('lodash');
      window._ = lodash;
      const { default: HSDatepicker } = await import('@preline/datepicker/non-auto.mjs');
      return HSDatepicker;
    })();
    pluginPromise.catch(() => {
      pluginPromise = undefined;
    });
  }
  return pluginPromise;
}

/** The month `<select>` of the calendar is built with English names: translate them before the plugin reads them. */
function localizeMonths(calendar) {
  calendar.context.mainElement?.querySelectorAll('[data-hs-select].--month option').forEach((option) => {
    const name = RECEIPT_MONTHS[Number(option.value)];
    if (name) option.textContent = name;
  });
}

/**
 * Runs `localizeMonths` before each of the plugin's own calendar hooks. The hooks are wrapped AFTER construction:
 * a callback passed as a constructor option would REPLACE the plugin's (it merges the options over its own
 * callbacks), and with them the setup of the month / year selects. The calendar is only built on the first click,
 * so this is in time.
 */
function hookMonthNames(calendar) {
  for (const hook of ['onShow', 'onCreateDateEls']) {
    const original = calendar[hook];
    calendar[hook] = (self) => {
      localizeMonths(self);
      return original?.(self);
    };
  }
}

/** `DD/MM/YYYY` for the input, `''` when there is no date. */
const toDisplay = (value) => (value ? formatReceiptDate(value) : '');

/**
 * Props: `id` (id of the input, e.g. `fechaRecibo`), `name` (defaults to `id`), `label`, `value` (`YYYY-MM-DD` or
 * `''`), `placeholder`, `onChange({ target: { name, value } })`, `error` / `errorMessage` / `groupId` as in `Field`.
 * The plugin's input carries `data-ready="true"`.
 */
export default function DatePickerField({
  id,
  name = id,
  label,
  value,
  placeholder = 'Seleccioná la fecha',
  onChange,
  error = false,
  errorMessage,
  groupId,
  className,
}) {
  const inputRef = useRef(null);
  const instanceRef = useRef(null);
  const appliedRef = useRef(value); // the value the calendar currently shows
  const [Plugin, setPlugin] = useState(null);
  const [ready, setReady] = useState(false);

  // The latest props, for the plugin listeners (attached once). `value` is also the last value reported upward.
  const latest = useRef({ onChange, name, value });
  useEffect(() => {
    latest.current = { onChange, name, value };
  });

  const emit = useCallback((next) => {
    const current = latest.current;
    if (next === current.value) return;
    latest.current = { ...current, value: next };
    current.onChange?.({ target: { name: current.name, value: next } });
  }, []);

  // First phase: load the plugin. (Its constructor is only called once the plugin's own <input> is in the DOM.)
  useEffect(() => {
    let disposed = false; // StrictMode: the first, cancelled run must not set state
    loadDatepickerPlugin().then(
      (HSDatepicker) => {
        if (!disposed) setPlugin(() => HSDatepicker);
      },
      (error) => {
        // The native date input stays usable.
        if (!disposed) console.warn('Advanced Datepicker is not available; using the native date input.', error);
      },
    );
    return () => {
      disposed = true;
    };
  }, []);

  // Second phase: build the calendar on the plugin's input.
  useEffect(() => {
    const input = inputRef.current;
    if (!Plugin || !input) return undefined;

    // The (minified) class name does not start with "HS", so the plugin cannot create its own instance
    // collection, yet `destroy()` filters it: create it first (that is what `autoInit()` does).
    window.$hsDatepickerCollection ||= [];
    if (window.$hsDatepickerCollection.some((entry) => entry.element.el === input)) return undefined;

    const onPluginChange = (event) => {
      const picked = event.detail?.payload?.selectedDates?.[0] ?? '';
      // The plugin has just written its own format (`YYYY/MM/DD`); show ours instead.
      input.value = toDisplay(picked);
      appliedRef.current = picked;
      emit(picked);
      // The plugin leaves the popup open after a pick (it is meant for ranges and times too): a single date is done.
      instanceRef.current?.vanillaCalendar?.hide?.();
    };

    let instance;
    try {
      instance = new Plugin(input, {
        ...CALENDAR_LOCALE,
        selectedDates: latest.current.value ? [latest.current.value] : [],
      });
      hookMonthNames(instance.vanillaCalendar);
    } catch (error) {
      console.warn('Advanced Datepicker is not available; using the native date input.', error);
      return undefined;
    }
    instanceRef.current = instance;
    appliedRef.current = latest.current.value;
    input.value = toDisplay(latest.current.value);
    input.addEventListener('change.hs.datepicker', onPluginChange);
    setReady(true);

    return () => {
      instanceRef.current = null;
      input.removeEventListener('change.hs.datepicker', onPluginChange);
      try {
        // Removes the popup (appended to <body>), the listeners and the collection entry. In the page this only
        // runs on unmount: `destroy()` swaps the input for a clone, so the input must not outlive it.
        instance.destroy();
      } catch {
        // Already torn down.
      }
    };
  }, [Plugin, emit]);

  // React is the source of truth: mirror outside changes (form reset, defaults) into the calendar.
  useEffect(() => {
    const instance = instanceRef.current;
    const input = inputRef.current;
    if (!instance || !input) return;
    if (appliedRef.current === value) return;
    appliedRef.current = value;
    // The month and year too, or the calendar would keep showing the old month (and the new date out of sight).
    const [year, month] = value.split('-').map(Number);
    instance.vanillaCalendar?.set(
      value ? { selectedDates: [value], selectedMonth: month - 1, selectedYear: year } : { selectedDates: [] },
    );
    input.value = toDisplay(value);
  }, [ready, value]);

  return (
    <FieldGroup id={id} label={label} error={error} errorMessage={errorMessage} groupId={groupId} className={className}>
      {Plugin ? (
        <input
          key="plugin"
          ref={inputRef}
          id={id}
          name={name}
          type="text"
          readOnly
          autoComplete="off"
          placeholder={placeholder}
          defaultValue={toDisplay(value)}
          data-hs-datepicker={PLUGIN_ATTRIBUTE}
          data-ready={ready ? 'true' : 'false'}
          className={cls(INPUT_CLASSES, INPUT_EXTRAS, error && INPUT_ERROR)}
        />
      ) : (
        <input
          key="native"
          id={id}
          name={name}
          type="date"
          data-ready="false"
          value={value}
          onChange={(event) => emit(event.target.value)}
          className={cls(NATIVE_CLASSES, error && INPUT_ERROR)}
        />
      )}
    </FieldGroup>
  );
}
