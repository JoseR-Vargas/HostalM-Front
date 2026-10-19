import { describe, expect, it } from 'vitest';
import { act, renderHook } from '@testing-library/react';
import { getCurrentMonthKey } from './dates';
import { useMonthPager } from './useMonthPager';

describe('useMonthPager', () => {
  it('starts on the current month and pages back and forward', () => {
    const { result } = renderHook(() => useMonthPager());
    const start = getCurrentMonthKey();
    expect(result.current.monthKey).toEqual(start);

    act(() => result.current.changeMonth(-1));
    const expectedPrev = start.month === 0 ? { month: 11, year: start.year - 1 } : { month: start.month - 1, year: start.year };
    expect(result.current.monthKey).toEqual(expectedPrev);

    act(() => result.current.changeMonth(1));
    expect(result.current.monthKey).toEqual(start);
  });

  it('capitalizes the label on request', () => {
    const { result } = renderHook(() => useMonthPager({ capitalize: true }));
    expect(result.current.monthLabel.charAt(0)).toBe(result.current.monthLabel.charAt(0).toUpperCase());
  });
});
