import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import SelectField from './SelectField';

// The real plugin is exercised by the browser specs (`e2e/receipts.spec.js`). Here a fake stands in for it and these
// tests check what `SelectField` promises: lazy load, one instance, forwarding, syncing and clean-up.
const plugin = vi.hoisted(() => {
  const state = { instances: [], loads: 0, failFirstLoad: true };

  class FakeSelect {
    constructor(el) {
      this.el = el;
      this.value = el.value || null;
      this.toggle = document.createElement('button');
      this.dropdown = document.body.appendChild(document.createElement('div')); // the real one lives in <body>
      this.dropdown.setAttribute('data-hs-select-dropdown', '');
      this.floatingUIInstance = { destroy: vi.fn() };
      this.setValue = vi.fn((value) => {
        this.value = value;
      });
      this.destroy = vi.fn(() => {
        window.$hsSelectCollection = window.$hsSelectCollection.filter((entry) => entry.element !== this);
      });
      (window.$hsSelectCollection ||= []).push({ id: state.instances.length, element: this });
      state.instances.push(this);
    }

    /** A user pick, in the order the real plugin reports it: native `change` first, then `change.hs.select`. */
    pick(value) {
      this.value = value;
      this.el.value = value;
      this.el.dispatchEvent(new Event('change', { bubbles: true }));
      this.el.dispatchEvent(new CustomEvent('change.hs.select', { detail: { payload: value }, bubbles: true }));
    }
  }

  return { state, FakeSelect };
});

vi.mock('@preline/select/non-auto.mjs', () => {
  plugin.state.loads += 1;
  // The very first load fails (the fallback tests); the next ones, that is what `loadSelectPlugin` retries, succeed.
  if (plugin.state.failFirstLoad && plugin.state.loads === 1) throw new Error('chunk failed to load');
  return { default: plugin.FakeSelect };
});
vi.mock('@floating-ui/dom', () => ({ computePosition: vi.fn() }));

const MONTHS = ['Enero', 'Febrero', 'Marzo'];
const props = { id: 'periodo', label: 'Período', options: MONTHS, placeholder: '— Seleccioná el mes —' };

const select = (container) => container.querySelector('#periodo');
const live = () => plugin.state.instances.filter((instance) => !instance.destroy.mock.calls.length);

async function mount(extra = {}, { strict = false } = {}) {
  const element = <SelectField {...props} value="" onChange={() => {}} {...extra} />;
  const view = render(strict ? <StrictMode>{element}</StrictMode> : element);
  await waitFor(() => expect(select(view.container).dataset.ready).toBe('true'));
  return view;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  plugin.state.instances.length = 0;
  document.querySelectorAll('[data-hs-select-dropdown]').forEach((node) => node.remove());
  delete window.$hsSelectCollection;
});

describe('SelectField', () => {
  it('stays a working native select when the plugin cannot be loaded', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onChange = vi.fn();
    const { container, getByText } = render(<SelectField {...props} value="" onChange={onChange} />);

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(select(container).dataset.ready).toBe('false');
    expect(select(container).className).not.toContain('hidden');
    expect([...select(container).options].map((option) => option.textContent)).toEqual(['— Seleccioná el mes —', ...MONTHS]);
    expect(getByText('Período').getAttribute('for')).toBe('periodo');

    fireEvent.change(select(container), { target: { value: 'Marzo' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ target: { name: 'periodo', value: 'Marzo' } });
    expect(plugin.state.instances).toHaveLength(0);
  });

  it('loads the plugin lazily and builds one instance on the native select', async () => {
    const { container } = render(<SelectField {...props} value="" onChange={() => {}} />);
    // Before the plugin arrives the native select is what the user sees.
    expect(select(container).dataset.ready).toBe('false');
    expect(plugin.state.instances).toHaveLength(0);

    await waitFor(() => expect(select(container).dataset.ready).toBe('true'));
    expect(plugin.state.instances).toHaveLength(1);
    expect(plugin.state.instances[0].el).toBe(select(container));
    expect(select(container).className).toBe('hidden');
    expect(window.FloatingUIDOM).toBeTruthy();
  });

  it('passes the Preline recipe to the plugin through data-hs-select', async () => {
    const { container } = await mount();
    const options = JSON.parse(select(container).getAttribute('data-hs-select'));

    expect(options.placeholder).toBe('— Seleccioná el mes —');
    expect(options.toggleTag).toBe('<button type="button" aria-expanded="false"></button>');
    expect(options.toggleClasses).toContain('bg-layer border border-layer-line');
    expect(options.dropdownClasses).toContain('bg-select border border-select-line');
    expect(options.optionClasses).toContain('hs-selected:bg-select-item-active');
    expect(options.optionTemplate).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(options.extraMarkup).toContain('m7 15 5 5 5-5');
    // Appended to <body>: the form card has `overflow-hidden`.
    expect(options.dropdownScope).toBe('window');
  });

  it('keeps the native placeholder option plus one option per month', async () => {
    const { container } = await mount();
    expect([...select(container).options].map((option) => option.value)).toEqual(['', ...MONTHS]);
  });

  it('creates exactly one instance under StrictMode', async () => {
    await mount({}, { strict: true });
    expect(plugin.state.instances).toHaveLength(1);
    expect(window.$hsSelectCollection).toHaveLength(1);
  });

  it('makes the toggle the labelled control once the plugin is ready', async () => {
    const { getByText } = await mount();
    const toggle = plugin.state.instances[0].toggle;

    expect(toggle.id).toBe('periodoToggle');
    expect(toggle.getAttribute('aria-labelledby')).toBe('periodoLabel periodoToggle');
    expect(getByText('Período').id).toBe('periodoLabel');
    expect(getByText('Período').getAttribute('for')).toBe('periodoToggle');
  });

  it('forwards a pick as { name, value } exactly once (native and plugin events together)', async () => {
    const onChange = vi.fn();
    await mount({ onChange });

    plugin.state.instances[0].pick('Febrero');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ target: { name: 'periodo', value: 'Febrero' } });
  });

  it('uses the name prop for the reported field', async () => {
    const onChange = vi.fn();
    await mount({ name: 'month', onChange });

    plugin.state.instances[0].pick('Enero');

    expect(onChange).toHaveBeenCalledWith({ target: { name: 'month', value: 'Enero' } });
  });

  it('mirrors an outside value change into the plugin without reporting it', async () => {
    const onChange = vi.fn();
    const { rerender, container } = await mount({ onChange, value: '' });
    const [instance] = plugin.state.instances;

    rerender(<SelectField {...props} value="Marzo" onChange={onChange} />);

    await waitFor(() => expect(instance.setValue).toHaveBeenCalledWith('Marzo'));
    expect(select(container).value).toBe('Marzo');
    expect(onChange).not.toHaveBeenCalled();

    rerender(<SelectField {...props} value="" onChange={onChange} />);
    await waitFor(() => expect(instance.setValue).toHaveBeenLastCalledWith(''));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not push back a value the plugin already holds', async () => {
    const onChange = vi.fn();
    const { rerender } = await mount({ onChange, value: '' });
    const [instance] = plugin.state.instances;

    instance.pick('Enero');
    rerender(<SelectField {...props} value="Enero" onChange={onChange} />);

    expect(instance.setValue).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('destroys the instance, its dropdown and its listeners on unmount', async () => {
    const onChange = vi.fn();
    const view = await mount({ onChange });
    const [instance] = plugin.state.instances;
    const element = select(view.container);

    view.unmount();

    expect(instance.destroy).toHaveBeenCalledTimes(1);
    expect(instance.floatingUIInstance.destroy).toHaveBeenCalledTimes(1);
    expect(document.querySelector('[data-hs-select-dropdown]')).toBeNull();
    expect(window.$hsSelectCollection).toHaveLength(0);
    // The event listener is gone too.
    element.dispatchEvent(new CustomEvent('change.hs.select', { detail: { payload: 'Marzo' } }));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the group error class and message only while there is an error', async () => {
    const { container, rerender } = await mount({ groupId: 'group-periodo', errorMessage: 'Seleccioná el período', error: false });
    const group = container.querySelector('#group-periodo');
    const message = () => group.querySelector('.error-message');

    expect(group.classList.contains('form-group')).toBe(true);
    expect(group.classList.contains('error')).toBe(false);
    expect(message().classList.contains('hidden')).toBe(true);

    rerender(<SelectField {...props} value="" onChange={() => {}} groupId="group-periodo" errorMessage="Seleccioná el período" error />);

    expect(group.classList.contains('error')).toBe(true);
    expect(message().classList.contains('block')).toBe(true);
    expect(message().textContent).toBe('Seleccioná el período');
  });
});
