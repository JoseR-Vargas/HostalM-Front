import { useCallback, useState } from 'react';
import { formatMonthLabel, getCurrentMonthKey, shiftMonthKey } from './dates';

/** Month pager state shared by the admin pages (starts on the current month). */
export function useMonthPager({ capitalize = false } = {}) {
  const [monthKey, setMonthKey] = useState(() => getCurrentMonthKey());

  const changeMonth = useCallback((delta) => {
    setMonthKey((current) => shiftMonthKey(current, delta));
  }, []);

  return {
    monthKey,
    monthLabel: formatMonthLabel(monthKey, { capitalize }),
    changeMonth,
  };
}
