import { StrictMode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import DatePickerField from './DatePickerField';

// The real plugin is exercised by the browser specs (`e2e/receipts.spec.js`). Here a fake stands in for it and these
// tests check what `DatePickerField` promises: lazy load, one instance, forwarding, syncing and clean-up.
const plugin = vi.hoisted(() => {
  const state = { instances: [], loads: 0 };

  class FakeDatepicker {
    constructor(el, options) {
      this.el = el;
      this.options = options;
      this.originalOnShow = vi.fn();
      this.originalOnCreateDateEls = vi.fn();
      this.vanillaCalendar = {
        set: vi.fn(),
        hide: vi.fn(),
        onShow: this.originalOnShow,
        onCreateDateEls: this.originalOnCreateDateEls,
      };
      this.destroy = vi.fn(() => {
        window.$hsDatepickerCollection = window.$hsDatepickerCollection.filter((entry) => entry.element !== this);
      });
      (window.$hsDatepickerCollection ||= []).push({ id: state.instances.length, element: this });
      state.instances.push(this);
    }

    /** A user pick: the plugin writes its own `YYYY/MM/DD` text, then reports through `change.hs.datepicker`. */
    pick(...dates) {
      this.el.value = dates.map((date) => date.replaceAll('-', '/')).join(', ');
      this.el.dispatchEvent(
        new CustomEvent('change.hs.datepicker', {
          detail: { payload: { selectedDates: dates, selectedTime: '12:00 PM' } },
          bubbles: true,
        }),
      );
    }
  }

  return { state, FakeDatepicker };
});

vi.mock('@preline/datepicker/non-auto.mjs', () => {
  plugin.state.loads += 1;
  // The very first load fails (the fallback test); the next ones, that is what `loadDatepickerPlugin` retries, succeed.
  if (plugin.state.loads === 1) throw new Error('chunk failed to load');
  return { default: plugin.FakeDatepicker };
});

const props = { id: 'fechaRecibo', name: 'fecha', label: 'Fecha del recibo' };
const input = (container) => container.querySelector('#fechaRecibo');

async function mount(extra = {}, { strict = false } = {}) {
  const element = <DatePickerField {...props} value="2026-10-19" onChange={() => {}} {...extra} />;
  const view = render(strict ? <StrictMode>{element}</StrictMode> : element);
  await waitFor(() => expect(input(view.container).dataset.ready).toBe('true'));
  return view;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  plugin.state.instances.length = 0;
  delete window.$hsDatepickerCollection;
});

describe('DatePickerField', () => {
  it('stays a working native date input when the plugin cannot be loaded', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const onChange = vi.fn();
    const { container, getByText } = render(<DatePickerField {...props} value="2026-10-19" onChange={onChange} />);

    await waitFor(() => expect(warn).toHaveBeenCalled());
    expect(input(container).type).toBe('date');
    expect(input(container).value).toBe('2026-10-19');
    expect(input(container).dataset.ready).toBe('false');
    expect(getByText('Fecha del recibo').getAttribute('for')).toBe('fechaRecibo');

    fireEvent.change(input(container), { target: { value: '2026-11-02' } });
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ target: { name: 'fecha', value: '2026-11-02' } });
    fireEvent.change(input(container), { target: { value: '' } });
    expect(onChange).toHaveBeenLastCalledWith({ target: { name: 'fecha', value: '' } });
    expect(plugin.state.instances).toHaveLength(0);
  });

  it('loads the plugin lazily and swaps the native input for its readonly text input', async () => {
    const { container } = render(<DatePickerField {...props} value="2026-10-19" onChange={() => {}} />);
    // Before the plugin arrives the native input is what the user sees.
    expect(input(container).type).toBe('date');
    expect(plugin.state.instances).toHaveLength(0);

    await waitFor(() => expect(input(container).dataset.ready).toBe('true'));
    expect(input(container).type).toBe('text');
    expect(input(container).readOnly).toBe(true);
    expect(input(container).classList.contains('hs-datepicker')).toBe(true);
    expect(container.querySelectorAll('#fechaRecibo')).toHaveLength(1);
    expect(plugin.state.instances).toHaveLength(1);
    expect(plugin.state.instances[0].el).toBe(input(container));
  });

  it('shows the date as DD/MM/YYYY while the value stays YYYY-MM-DD', async () => {
    const { container } = await mount({ value: '2026-03-05' });
    expect(input(container).value).toBe('05/03/2026');
    expect(plugin.state.instances[0].options.selectedDates).toEqual(['2026-03-05']);
  });

  it('shows an empty input when there is no date', async () => {
    const { container } = await mount({ value: '' });
    expect(input(container).value).toBe('');
    expect(plugin.state.instances[0].options.selectedDates).toEqual([]);
  });

  it('passes the Preline recipe and the Spanish calendar settings to the plugin', async () => {
    const { container } = await mount();
    const recipe = JSON.parse(input(container).getAttribute('data-hs-datepicker'));
    const { options } = plugin.state.instances[0];

    expect(recipe).toMatchObject({ type: 'default', applyUtilityClasses: true, dateMax: '2050-12-31', mode: 'custom-select' });
    expect(recipe.templates.arrowPrev).toContain('data-vc-arrow="prev"');
    expect(recipe.templates.arrowNext).toContain('data-vc-arrow="next"');
    // The plugin defaults `dateMin` to today, which would forbid past receipts.
    expect(recipe.dateMin).toBe('2020-01-01');
    expect(options).toMatchObject({ locale: 'es-AR', firstWeekday: 1 });
    expect(input(container).className).toContain('bg-layer border-layer-line rounded-lg');
  });

  it('creates exactly one instance under StrictMode', async () => {
    await mount({}, { strict: true });
    expect(plugin.state.instances).toHaveLength(1);
    expect(window.$hsDatepickerCollection).toHaveLength(1);
  });

  it('forwards a pick as { name, value } and shows it as DD/MM/YYYY (not the plugin format)', async () => {
    const onChange = vi.fn();
    const { container } = await mount({ onChange });

    plugin.state.instances[0].pick('2026-11-02');

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith({ target: { name: 'fecha', value: '2026-11-02' } });
    expect(input(container).value).toBe('02/11/2026');
  });

  it('closes the calendar after a pick (the plugin leaves it open)', async () => {
    await mount();
    const [instance] = plugin.state.instances;

    instance.pick('2026-11-02');
    expect(instance.vanillaCalendar.hide).toHaveBeenCalledTimes(1);

    instance.pick();
    expect(instance.vanillaCalendar.hide).toHaveBeenCalledTimes(2);
  });

  it('forwards an empty value when the selected day is clicked again', async () => {
    const onChange = vi.fn();
    const { container } = await mount({ onChange });

    plugin.state.instances[0].pick();

    expect(onChange).toHaveBeenCalledWith({ target: { name: 'fecha', value: '' } });
    expect(input(container).value).toBe('');
  });

  it('pushes an outside value change into the calendar (and its month) without reporting it', async () => {
    const onChange = vi.fn();
    const { container, rerender } = await mount({ onChange, value: '2026-10-19' });
    const { vanillaCalendar } = plugin.state.instances[0];

    rerender(<DatePickerField {...props} value="2027-01-31" onChange={onChange} />);

    await waitFor(() =>
      expect(vanillaCalendar.set).toHaveBeenCalledWith({ selectedDates: ['2027-01-31'], selectedMonth: 0, selectedYear: 2027 }),
    );
    expect(input(container).value).toBe('31/01/2027');
    expect(onChange).not.toHaveBeenCalled();

    rerender(<DatePickerField {...props} value="" onChange={onChange} />);
    await waitFor(() => expect(vanillaCalendar.set).toHaveBeenLastCalledWith({ selectedDates: [] }));
    expect(input(container).value).toBe('');
    expect(onChange).not.toHaveBeenCalled();
  });

  it('does not push back a value the calendar already shows', async () => {
    const onChange = vi.fn();
    const { rerender } = await mount({ onChange, value: '2026-10-19' });
    const { vanillaCalendar } = plugin.state.instances[0];

    plugin.state.instances[0].pick('2026-11-02');
    rerender(<DatePickerField {...props} value="2026-11-02" onChange={onChange} />);

    expect(vanillaCalendar.set).not.toHaveBeenCalled();
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it('translates the month names before the plugin builds its selects, then runs its own hooks', async () => {
    await mount();
    const instance = plugin.state.instances[0];
    const mainElement = document.createElement('div');
    mainElement.innerHTML = `<select data-hs-select class="--month">${['January', 'February', 'March']
      .map((name, index) => `<option value="${index}">${name}</option>`)
      .join('')}</select>`;

    for (const [hook, original] of [
      ['onShow', instance.originalOnShow],
      ['onCreateDateEls', instance.originalOnCreateDateEls],
    ]) {
      mainElement.querySelectorAll('option').forEach((option, index) => (option.textContent = ['January', 'February', 'March'][index]));
      const self = { context: { mainElement } };

      instance.vanillaCalendar[hook](self);

      expect([...mainElement.querySelectorAll('option')].map((option) => option.textContent)).toEqual(['Enero', 'Febrero', 'Marzo']);
      expect(original).toHaveBeenCalledWith(self);
    }
  });

  it('destroys the instance and removes its listener on unmount', async () => {
    const onChange = vi.fn();
    const view = await mount({ onChange });
    const [instance] = plugin.state.instances;
    const element = input(view.container);

    view.unmount();

    expect(instance.destroy).toHaveBeenCalledTimes(1);
    expect(window.$hsDatepickerCollection).toHaveLength(0);
    element.dispatchEvent(
      new CustomEvent('change.hs.datepicker', { detail: { payload: { selectedDates: ['2026-12-25'] } } }),
    );
    expect(onChange).not.toHaveBeenCalled();
  });

  it('shows the group error class and message only while there is an error', async () => {
    const { container, rerender } = await mount({ groupId: 'group-fecha', errorMessage: 'Seleccioná la fecha del recibo' });
    const group = container.querySelector('#group-fecha');
    const message = () => group.querySelector('.error-message');

    expect(group.classList.contains('error')).toBe(false);
    expect(message().classList.contains('hidden')).toBe(true);
    expect(input(container).className).not.toContain('border-red-500');

    rerender(
      <DatePickerField {...props} value="" onChange={() => {}} groupId="group-fecha" errorMessage="Seleccioná la fecha del recibo" error />,
    );

    expect(group.classList.contains('error')).toBe(true);
    expect(message().classList.contains('block')).toBe(true);
    expect(input(container).className).toContain('border-red-500!');
  });
});
