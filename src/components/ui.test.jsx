import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Button, Field, Spinner } from './ui';

afterEach(cleanup);

const PRIMARY =
  'py-3 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-full bg-primary border border-primary-line text-primary-foreground hover:bg-primary-hover focus:outline-hidden focus:bg-primary-hover disabled:opacity-50 disabled:pointer-events-none';
const SECONDARY =
  'py-3 px-4 inline-flex items-center gap-x-2 text-sm font-medium rounded-full bg-layer border border-layer-line text-layer-foreground shadow-2xs hover:bg-layer-hover focus:outline-hidden focus:bg-layer-hover disabled:opacity-50 disabled:pointer-events-none';

describe('Spinner', () => {
  it('renders the Preline ring with an accessible status and label', () => {
    const { container } = render(<Spinner />);
    const spinner = container.firstChild;

    expect(spinner.getAttribute('class')).toBe(
      'animate-spin inline-block size-6 border-3 border-current border-t-transparent rounded-[999px] text-muted-foreground-2',
    );
    expect(spinner.getAttribute('role')).toBe('status');
    expect(spinner.getAttribute('aria-label')).toBe('loading');
    expect(spinner.querySelector('span.sr-only').textContent).toBe('Loading...');
  });

  it('replaces the default size and colour and can drop the screen reader text', () => {
    const { container } = render(<Spinner size="size-4" tone="text-primary-foreground" label={null} className="extra" />);
    const spinner = container.firstChild;

    expect(spinner.classList.contains('size-4')).toBe(true);
    expect(spinner.classList.contains('size-6')).toBe(false);
    expect(spinner.classList.contains('text-primary-foreground')).toBe(true);
    expect(spinner.classList.contains('text-muted-foreground-2')).toBe(false);
    expect(spinner.classList.contains('extra')).toBe(true);
    expect(spinner.querySelector('.sr-only')).toBeNull();
  });
});

describe('Button', () => {
  it('uses the primary Preline recipe by default and keeps the legacy hook classes', () => {
    const { container } = render(<Button>Go</Button>);
    const button = container.firstChild;

    expect(button.getAttribute('class')).toContain(PRIMARY);
    expect(button.classList.contains('cta-button')).toBe(true);
    expect(button.classList.contains('processing')).toBe(false);
  });

  it('renders the secondary recipe and the full-width submit variant', () => {
    const { container } = render(
      <>
        <Button variant="secondary">A</Button>
        <Button variant="submit">B</Button>
      </>,
    );
    const [secondary, submit] = container.querySelectorAll('button');

    expect(secondary.getAttribute('class')).toContain(SECONDARY);
    expect(submit.getAttribute('class')).toContain(PRIMARY);
    expect(submit.classList.contains('submit-button')).toBe(true);
    expect(submit.classList.contains('w-full')).toBe(true);
  });

  it('shows a spinner without changing the text while processing', () => {
    const { container, rerender } = render(<Button processing>Generando...</Button>);
    const button = container.firstChild;

    expect(button.classList.contains('processing')).toBe(true);
    expect(button.classList.contains('pointer-events-none')).toBe(true);
    expect(button.querySelector('[role="status"]')).not.toBeNull();
    expect(button.textContent).toBe('Generando...');

    rerender(<Button>Generar</Button>);
    expect(container.firstChild.classList.contains('processing')).toBe(false);
    expect(container.querySelector('[role="status"]')).toBeNull();
  });

  it('renders as another element (a link) with the same recipe', () => {
    const { container } = render(
      <Button as="a" href="#x">
        Link
      </Button>,
    );

    expect(container.firstChild.tagName).toBe('A');
    expect(container.firstChild.getAttribute('class')).toContain(PRIMARY);
  });
});

const INPUT =
  'py-2.5 sm:py-3 px-4 rounded-full block w-full bg-layer border-layer-line sm:text-sm text-foreground placeholder:text-muted-foreground-1 focus:border-primary-focus focus:ring-primary-focus disabled:opacity-50 disabled:pointer-events-none';

describe('Button sizes', () => {
  it('uses the small recipes of the modal footers and the table link recipe', () => {
    const { container } = render(
      <>
        <Button variant="primary" size="sm">A</Button>
        <Button variant="secondary" size="sm">B</Button>
        <Button variant="link">C</Button>
      </>,
    );
    const [primary, secondary, link] = container.querySelectorAll('button');

    expect(primary.getAttribute('class')).toContain('py-2 px-3 inline-flex items-center gap-x-2 text-sm font-medium rounded-lg bg-primary');
    expect(primary.getAttribute('class')).toContain('focus:bg-primary-focus');
    expect(secondary.getAttribute('class')).toContain('rounded-lg bg-layer border border-layer-line text-layer-foreground shadow-2xs');
    expect(secondary.getAttribute('class')).toContain('focus:bg-layer-focus');
    expect(link.getAttribute('class')).toContain('text-primary hover:text-primary-hover focus:outline-hidden focus:text-primary-focus');
    expect(link.getAttribute('class')).not.toContain('bg-primary');
  });
});

describe('Field', () => {
  it('renders the Preline input recipe and keeps the error hook only while the field is invalid', () => {
    const { container, rerender } = render(<Field id="nombre" label="Nombre" type="text" />);
    const input = container.querySelector('input#nombre');

    expect(input.getAttribute('class')).toContain(INPUT);
    // The recipe only sets the border colour: `border` gives it the solid style (no Preflight).
    expect(input.classList.contains('border')).toBe(true);
    expect(input.getAttribute('name')).toBe('nombre');
    expect(container.querySelector('.form-group').classList.contains('error')).toBe(false);
    expect(input.getAttribute('class')).not.toContain('border-red-500');

    rerender(<Field id="nombre" label="Nombre" type="text" error errorMessage="Falta" />);
    expect(container.querySelector('.form-group').classList.contains('error')).toBe(true);
    expect(container.querySelector('input#nombre').getAttribute('class')).toContain('border-red-500!');
  });

  it('gives textareas a softer radius and selects room for their arrow', () => {
    const { container } = render(
      <>
        <Field id="mensaje" label="Mensaje" as="textarea" />
        <Field id="tipo" label="Tipo" as="select"><option>a</option></Field>
      </>,
    );

    expect(container.querySelector('textarea').getAttribute('class')).toContain('rounded-2xl');
    expect(container.querySelector('textarea').getAttribute('class')).not.toContain('rounded-full');
    expect(container.querySelector('select').getAttribute('class')).toContain(INPUT);
    expect(container.querySelector('select').getAttribute('class')).toContain('pe-9');
  });

  it('keeps the custom look of file inputs instead of the pill recipe', () => {
    const { container } = render(<Field id="fotos" label="Fotos" type="file" />);

    expect(container.querySelector('input#fotos').getAttribute('class')).not.toContain('rounded-full');
    expect(container.querySelector('input#fotos').getAttribute('class')).toContain('border-2');
  });
});
