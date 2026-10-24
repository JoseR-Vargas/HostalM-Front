import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { FieldGroup, INPUT_ERROR, cls } from './ui';

/*
 * Preline Advanced Select (npm `@preline/select`) wired to React, with the label / error markup of `Field`.
 *
 * The plugin is a vanilla-DOM widget: it hides the native `<select>`, builds its own toggle button and dropdown
 * next to it and keeps the native element in sync. So:
 * - the native `<select id=...>` is ALWAYS rendered (it is the form control of record, and the plugin's source:
 *   the options come from its `<option>`s). Until the plugin is ready, or if its chunk never loads, it is the
 *   visible, fully working control (same look as the plugin's toggle, so the swap is hardly noticeable);
 * - React owns the value (controlled `<select>`); the plugin only mirrors it (`setValue`) and reports user
 *   picks through its `change.hs.select` event. The plugin ALSO fires a native `change` on the `<select>`,
 *   which React's `onChange` sees too: both paths go through `emit`, which ignores a value already emitted;
 * - the plugin and `@floating-ui/dom` are loaded on demand (dynamic `import()`, own chunks): they only weigh on
 *   the pages that mount this component;
 * - the dropdown uses `dropdownScope: "window"` (appended to <body>, positioned by Floating UI): the form
 *   card has `overflow-hidden`, which would clip an in-place dropdown.
 */

const TOGGLE_CLASSES =
  'hs-select-disabled:pointer-events-none hs-select-disabled:opacity-50 relative py-3 ps-4 pe-9 flex text-nowrap w-full cursor-pointer bg-layer border border-layer-line text-layer-foreground rounded-lg text-start text-sm hover:bg-layer-hover focus:outline-hidden focus:bg-layer-focus';
// Added on top of the recipe: Preflight is off, so a <button> would not inherit the app font; and the recipe only
// changes the background on focus, which is not enough of a keyboard focus indicator.
const TOGGLE_EXTRAS = 'font-sans focus-visible:border-primary-focus focus-visible:ring-1 focus-visible:ring-primary-focus';

const DROPDOWN_CLASSES =
  'mt-2 z-50 w-full max-h-72 p-1 space-y-0.5 bg-select border border-select-line rounded-lg shadow-xl overflow-hidden overflow-y-auto focus:outline-hidden [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-thumb]:rounded-none [&::-webkit-scrollbar-track]:bg-scrollbar-track [&::-webkit-scrollbar-thumb]:bg-scrollbar-thumb';

const OPTION_CLASSES =
  'hs-selected:bg-select-item-active py-2 px-4 w-full text-sm text-select-item-foreground cursor-pointer hover:bg-select-item-hover rounded-lg focus:outline-hidden focus:bg-select-item-focus hs-select-disabled:pointer-events-none hs-select-disabled:opacity-50';

// The recipe has a typo in the SVG namespace (`http:.w3.org`): corrected here.
const OPTION_TEMPLATE =
  '<div class="flex justify-between items-center w-full"><span data-title></span><span class="hidden hs-selected:block"><svg class="shrink-0 size-3.5 text-primary" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span></div>';

const EXTRA_MARKUP =
  '<div class="absolute top-1/2 inset-e-3 -translate-y-1/2"><svg class="shrink-0 size-3.5 text-muted-foreground-1" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m7 15 5 5 5-5"/><path d="m7 9 5-5 5 5"/></svg></div>';

// Look of the native `<select>` while the plugin is not ready: the toggle's, minus the plugin-only variants.
const NATIVE_CLASSES =
  'py-3 ps-4 pe-9 block w-full bg-layer border border-layer-line text-layer-foreground rounded-lg text-sm font-sans focus:border-primary-focus focus:ring-primary-focus disabled:opacity-50 disabled:pointer-events-none';

// Border of the plugin's toggle while the field has an error (the native look uses `INPUT_ERROR` directly).
const TOGGLE_ERROR = '[&_[aria-expanded]]:border-red-500!';

let pluginPromise;

/**
 * Loads Floating UI (the plugin reads it from `window.FloatingUIDOM`, which `dropdownScope: "window"` needs) and the
 * plugin in its manual-init build. Cached; a failed load is not cached, so a later mount retries.
 */
function loadSelectPlugin() {
  if (!pluginPromise) {
    pluginPromise = (async () => {
      const floatingUI = await import('@floating-ui/dom');
      window.FloatingUIDOM = floatingUI;
      const { default: HSSelect } = await import('@preline/select/non-auto.mjs');
      return HSSelect;
    })();
    pluginPromise.catch(() => {
      pluginPromise = undefined;
    });
  }
  return pluginPromise;
}

/**
 * Releases everything an instance created. `destroy()` puts the <select> back and removes the wrapper, but it leaves
 * behind what it moved to <body> (the dropdown), the Floating UI auto-update listeners and the keyboard-handler
 * registration.
 */
function destroyInstance(instance) {
  try {
    instance.floatingUIInstance?.destroy?.();
    if (instance.accessibilityComponent) window.HSAccessibilityObserver?.unregisterComponent(instance.accessibilityComponent);
    const { dropdown } = instance;
    instance.destroy();
    dropdown?.remove();
  } catch {
    // The DOM may already be gone (unmount): nothing left to release.
  }
}

/**
 * Props: `id` (id of the `<select>`; `${id}Toggle` is the id of the plugin's button), `name` (defaults to `id`),
 * `label`, `value` (the selected option's value, `''` = none), `options` (list of strings, used as value and text),
 * `placeholder` (text of the empty option and of the closed toggle), `onChange({ target: { name, value } })`,
 * `error` / `errorMessage` / `groupId` as in `Field`.
 * The `<select>` carries `data-ready="true"` once the plugin has taken over.
 */
export default function SelectField({
  id,
  name = id,
  label,
  value,
  options,
  placeholder,
  onChange,
  error = false,
  errorMessage,
  groupId,
  className,
}) {
  const selectRef = useRef(null);
  const instanceRef = useRef(null);
  const [ready, setReady] = useState(false);

  // The latest props, for the plugin listeners (attached once). `value` is also the last value reported upward.
  const latest = useRef({ onChange, name, value });
  useEffect(() => {
    latest.current = { onChange, name, value };
  });

  // Single exit for edits, whichever source fires first: a value that was already reported is ignored.
  const emit = useCallback((next) => {
    const current = latest.current;
    if (next === current.value) return;
    latest.current = { ...current, value: next };
    current.onChange?.({ target: { name: current.name, value: next } });
  }, []);

  // Options of the plugin, as the `data-hs-select` attribute (the plugin reads it when it is constructed).
  const pluginOptions = useMemo(
    () =>
      JSON.stringify({
        placeholder,
        toggleTag: '<button type="button" aria-expanded="false"></button>',
        toggleClasses: cls(TOGGLE_CLASSES, TOGGLE_EXTRAS),
        dropdownClasses: DROPDOWN_CLASSES,
        optionClasses: OPTION_CLASSES,
        optionTemplate: OPTION_TEMPLATE,
        extraMarkup: EXTRA_MARKUP,
        dropdownScope: 'window',
        // Flips above the toggle when there is no room below (the form can sit near the bottom of a short screen).
        dropdownAutoPlacement: true,
      }),
    [placeholder],
  );

  useEffect(() => {
    // StrictMode runs mount -> cleanup -> mount: `disposed` makes the first (already cancelled) load a no-op, so
    // only one instance is ever created per mounted element.
    let disposed = false;
    let instance = null;
    let element = null;
    const onPluginChange = (event) => emit(event.detail?.payload ?? '');
    const keepNative = (error) => {
      if (!disposed) console.warn('Advanced Select is not available; using the native select.', error);
    };

    loadSelectPlugin().then((HSSelect) => {
      element = selectRef.current;
      if (disposed || !element) return;
      // The (minified) class name does not start with "HS", so the plugin may not create its own instance
      // collection; make sure it exists.
      window.$hsSelectCollection ||= [];
      if (window.$hsSelectCollection.some((entry) => entry.element.el === element)) return;

      instance = new HSSelect(element);
      instanceRef.current = instance;
      element.addEventListener('change.hs.select', onPluginChange);
      // A label click and screen readers need the toggle to be the labelled control.
      instance.toggle.id = `${id}Toggle`;
      instance.toggle.setAttribute('aria-labelledby', `${id}Label ${id}Toggle`);
      instance.toggle.setAttribute('aria-haspopup', 'listbox');
      setReady(true);
    }, keepNative).catch(keepNative);

    return () => {
      disposed = true;
      instanceRef.current = null;
      element?.removeEventListener('change.hs.select', onPluginChange);
      if (instance) destroyInstance(instance);
    };
  }, [id, pluginOptions, emit]);

  // React is the source of truth: mirror outside changes (form reset, defaults) into the plugin.
  useEffect(() => {
    const instance = instanceRef.current;
    if (!ready || !instance) return;
    if ((instance.value ?? '') !== value) instance.setValue(value);
  }, [ready, value]);

  return (
    <FieldGroup
      id={id}
      label={label}
      labelId={`${id}Label`}
      labelFor={ready ? `${id}Toggle` : id}
      error={error}
      errorMessage={errorMessage}
      groupId={groupId}
      className={className}
    >
      <div className={error ? TOGGLE_ERROR : undefined}>
        <select
          ref={selectRef}
          id={id}
          name={name}
          value={value}
          onChange={(event) => emit(event.target.value)}
          data-hs-select={pluginOptions}
          data-ready={ready ? 'true' : 'false'}
          className={ready ? 'hidden' : cls(NATIVE_CLASSES, error && INPUT_ERROR)}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    </FieldGroup>
  );
}
