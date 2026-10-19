import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const calls = [];
const save = vi.fn(() => Promise.resolve());
const html2pdf = vi.fn(() => {
  const chain = {
    set: (options) => {
      calls.push(['set', options]);
      return chain;
    },
    from: (element) => {
      calls.push(['from', element]);
      return chain;
    },
    save,
  };
  return chain;
});

vi.mock('html2pdf.js', () => ({ default: html2pdf }));

const { downloadPdf, PDF_OPTIONS, TEMPLATE_CAPTURE_STYLE } = await import('./pdf');

const HIDDEN_STYLE = 'display: none; position: absolute; top: 0; left: -9999px;';

// The CSSOM normalizes values (e.g. `0` -> `0px`), so compare against the serialized form.
const serialized = (cssText) => {
  const probe = document.createElement('div');
  probe.style.cssText = cssText;
  return probe.style.cssText;
};

const buildTemplate = () => {
  const wrapper = document.createElement('div');
  wrapper.style.cssText = HIDDEN_STYLE;
  const sheet = document.createElement('div');
  wrapper.appendChild(sheet);
  document.body.appendChild(wrapper);
  return { wrapper, sheet };
};

beforeEach(() => {
  vi.useFakeTimers();
  calls.length = 0;
  save.mockClear();
  html2pdf.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = '';
});

describe('downloadPdf', () => {
  it('captures the first child of the template with the legacy options', async () => {
    const { wrapper, sheet } = buildTemplate();

    const promise = downloadPdf(wrapper, 'Comprobante_Ana_Mayo.pdf');
    await vi.advanceTimersByTimeAsync(150);
    await promise;

    expect(calls[0]).toEqual([
      'set',
      {
        margin: 0,
        filename: 'Comprobante_Ana_Mayo.pdf',
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false, scrollX: 0, scrollY: 0 },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: 'avoid-all' },
      },
    ]);
    expect(calls[1]).toEqual(['from', sheet]);
    expect(save).toHaveBeenCalledTimes(1);
  });

  it('exports the options without a filename', () => {
    expect(PDF_OPTIONS.filename).toBeUndefined();
    expect(PDF_OPTIONS.margin).toBe(0);
  });

  it('shows the template off-screen while it waits for layout and hides it again afterwards', async () => {
    const { wrapper } = buildTemplate();

    const promise = downloadPdf(wrapper, 'a.pdf');
    expect(wrapper.style.cssText).toBe(serialized(TEMPLATE_CAPTURE_STYLE));
    expect(wrapper.style.display).toBe('block');
    expect(wrapper.style.position).toBe('fixed');
    expect(wrapper.style.left).toBe('-9999px');

    await vi.advanceTimersByTimeAsync(149);
    expect(html2pdf).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1);
    await promise;
    expect(html2pdf).toHaveBeenCalledTimes(1);
    expect(wrapper.style.cssText).toBe(serialized(HIDDEN_STYLE));
  });

  it('hides the template again and rethrows when the PDF generation fails', async () => {
    const { wrapper } = buildTemplate();
    save.mockRejectedValueOnce(new Error('canvas failed'));

    const promise = downloadPdf(wrapper, 'a.pdf');
    const assertion = expect(promise).rejects.toThrow('canvas failed');
    await vi.advanceTimersByTimeAsync(150);
    await assertion;

    expect(wrapper.style.cssText).toBe(serialized(HIDDEN_STYLE));
  });
});
