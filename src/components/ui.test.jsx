import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import { Button, Spinner } from './ui';

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
