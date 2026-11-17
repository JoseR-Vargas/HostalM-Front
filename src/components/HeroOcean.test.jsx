import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render } from '@testing-library/react';
import HeroOcean from './HeroOcean';

// A 2D context where every method is a spy, so the drawing code can run in jsdom.
const makeContext = () => {
  const calls = {};
  return new Proxy(
    {},
    {
      get: (target, name) => {
        if (name === 'createLinearGradient') return () => ({ addColorStop: vi.fn() });
        if (!(name in calls)) calls[name] = vi.fn();
        return calls[name];
      },
      set: () => true,
    },
  );
};

let context;

beforeEach(() => {
  context = makeContext();
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(context);
  vi.spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect').mockReturnValue({
    width: 800,
    height: 600,
    left: 0,
    top: 0,
    right: 800,
    bottom: 600,
  });
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
  );
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('HeroOcean', () => {
  it('renders a decorative canvas that is hidden from assistive technology', () => {
    const { container } = render(<HeroOcean />);
    const canvas = container.querySelector('canvas.hero-ocean');
    expect(canvas).not.toBeNull();
    expect(canvas.getAttribute('aria-hidden')).toBe('true');
    expect(canvas.className).toContain('pointer-events-none');
  });

  it('paints a single still frame and never animates when the user prefers reduced motion', () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() })),
    );
    const raf = vi.spyOn(window, 'requestAnimationFrame');
    render(<HeroOcean />);
    expect(context.fill).toHaveBeenCalled();
    expect(raf).not.toHaveBeenCalled();
  });

  it('animates with requestAnimationFrame and cancels the loop on unmount', () => {
    const raf = vi.spyOn(window, 'requestAnimationFrame').mockReturnValue(42);
    const cancel = vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(() => {});
    const { unmount } = render(<HeroOcean />);
    expect(raf).toHaveBeenCalled();
    unmount();
    expect(cancel).toHaveBeenCalledWith(42);
  });

  it('does not crash when the browser gives no 2D context', () => {
    HTMLCanvasElement.prototype.getContext.mockReturnValue(null);
    expect(() => render(<HeroOcean />)).not.toThrow();
  });
});
