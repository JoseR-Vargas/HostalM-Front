import { StrictMode, createRef } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import FileUpload from './FileUpload';

const file = (name = 'a.png', { type = 'image/png', size = 10 } = {}) => {
  const value = new File(['x'], name, { type });
  Object.defineProperty(value, 'size', { value: size });
  return value;
};

const root = (container) => container.querySelector('[data-hs-file-upload]');
const hiddenInput = (container) => container.querySelector('.dz-hidden-input');
const previews = (container) => container.querySelectorAll('[data-hs-file-upload-previews] > *');
const select = (container, ...files) => fireEvent.change(hiddenInput(container), { target: { files } });

async function mount(props = {}, { strict = false } = {}) {
  const ref = createRef();
  const element = <FileUpload ref={ref} id="fotos" {...props} />;
  const view = render(strict ? <StrictMode>{element}</StrictMode> : element);
  await waitFor(() => expect(root(view.container).dataset.ready).toBe('true'));
  return { ...view, ref };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('FileUpload', () => {
  it('renders the Preline markup with a stable trigger id and its help text', async () => {
    const { container } = await mount();
    const trigger = container.querySelector('[data-hs-file-upload-trigger]');

    expect(trigger.id).toBe('fotos');
    expect(trigger.getAttribute('aria-describedby')).toBe('fotosHelp');
    expect(container.querySelector('#fotosHelp').textContent).toContain('Hasta 50 MB en total.');
    expect(container.textContent).toContain('Arrastrá tus fotos acá o');
    expect(container.textContent).not.toContain('2MB');
    expect(container.querySelector('[data-hs-file-upload-previews]').children).toHaveLength(0);
  });

  it('creates exactly one Dropzone under StrictMode, with a multiple image-only hidden input inside the root', async () => {
    const { container } = await mount({}, { strict: true });

    expect(window.$hsFileUploadCollection).toHaveLength(1);
    expect(container.querySelectorAll('.dz-hidden-input')).toHaveLength(1);
    const input = hiddenInput(container);
    expect(root(container).contains(input)).toBe(true);
    expect(input.getAttribute('accept')).toBe('image/*');
    expect(input.multiple).toBe(true);
  });

  it('renders a preview card with name, extension and size, and notifies the parent', async () => {
    const onFilesChange = vi.fn();
    const { container } = await mount({ onFilesChange });
    const png = file('comprobante.png', { size: 2048 });

    select(container, png);

    expect(previews(container)).toHaveLength(1);
    const card = previews(container)[0];
    expect(card.querySelector('[data-hs-file-upload-file-name]').textContent).toBe('comprobante');
    expect(card.querySelector('[data-hs-file-upload-file-ext]').textContent).toBe('png');
    expect(card.querySelector('[data-hs-file-upload-file-size]').textContent).toBe('2.00 KB');
    await waitFor(() => expect(onFilesChange).toHaveBeenCalledTimes(1));
    expect(onFilesChange.mock.calls[0][0]).toEqual([png]);
  });

  it('notifies once per selection, however many files it holds, and recreates the hidden input', async () => {
    const onFilesChange = vi.fn();
    const { container } = await mount({ onFilesChange });
    const first = hiddenInput(container);

    select(container, file('a.png'), file('b.png'), file('c.png'));

    await waitFor(() => expect(onFilesChange).toHaveBeenCalledTimes(1));
    expect(onFilesChange.mock.calls[0][0].map((f) => f.name)).toEqual(['a.png', 'b.png', 'c.png']);
    expect(container.querySelectorAll('.dz-hidden-input')).toHaveLength(1);
    expect(hiddenInput(container)).not.toBe(first);
  });

  it('getFiles() returns the current files in order and the remove button drops one', async () => {
    const onFilesChange = vi.fn();
    const { container, ref } = await mount({ onFilesChange });
    const [a, b] = [file('a.png'), file('b.png')];
    select(container, a, b);
    expect(ref.current.getFiles()).toEqual([a, b]);

    fireEvent.click(previews(container)[0].querySelector('[data-hs-file-upload-remove]'));

    expect(previews(container)).toHaveLength(1);
    expect(ref.current.getFiles()).toEqual([b]);
    await waitFor(() => expect(onFilesChange).toHaveBeenLastCalledWith([b]));
  });

  it('clear() removes every file and every preview', async () => {
    const onFilesChange = vi.fn();
    const { container, ref } = await mount({ onFilesChange });
    select(container, file('a.png'), file('b.png'));

    act(() => ref.current.clear());

    expect(ref.current.getFiles()).toEqual([]);
    expect(previews(container)).toHaveLength(0);
    await waitFor(() => expect(onFilesChange).toHaveBeenLastCalledWith([]));
  });

  it('keeps a non-image in the list, flags its card and reports it to the parent', async () => {
    const onFilesChange = vi.fn();
    const { container, ref } = await mount({ onFilesChange });
    const text = file('notas.txt', { type: 'text/plain' });

    select(container, file('a.png'), text);

    expect(ref.current.getFiles()).toHaveLength(2);
    expect(previews(container)).toHaveLength(2);
    expect(previews(container)[1].textContent).toContain('Solo se permiten imágenes');
    expect(previews(container)[0].textContent).not.toContain('Solo se permiten imágenes');
    await waitFor(() => expect(onFilesChange).toHaveBeenCalled());
    expect(onFilesChange.mock.calls.at(-1)[0]).toContain(text);
  });

  it('lets Enter and Space on the focused trigger open the file picker', async () => {
    const { container } = await mount();
    const click = vi.spyOn(hiddenInput(container), 'click');
    const trigger = container.querySelector('[data-hs-file-upload-trigger]');

    fireEvent.keyDown(trigger, { key: 'Enter' });
    fireEvent.keyDown(trigger, { key: ' ' });
    fireEvent.keyDown(trigger, { key: 'a' });

    expect(click).toHaveBeenCalledTimes(2);
  });

  it('destroys the Dropzone on unmount: no stale collection entry, hidden input or listeners', async () => {
    const onFilesChange = vi.fn();
    const { container, unmount } = await mount({ onFilesChange }, { strict: true });
    const input = hiddenInput(container);
    select(container, file('a.png'));
    await waitFor(() => expect(onFilesChange).toHaveBeenCalled());
    onFilesChange.mockClear();

    unmount();

    expect(window.$hsFileUploadCollection).toHaveLength(0);
    expect(document.contains(input)).toBe(false);
    await Promise.resolve();
    expect(onFilesChange).not.toHaveBeenCalled();
  });

  it('does not initialise when it unmounts before the plugin has loaded', async () => {
    const view = render(<FileUpload id="fotos" />);
    view.unmount();
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(window.$hsFileUploadCollection ?? []).toHaveLength(0);
  });
});
