import { expect } from '@playwright/test';

// Helpers for the period select and the receipt date picker of /comprobante-pago and /comprobante-servicios
// (Preline Advanced Select and Advanced Datepicker, see SelectField.jsx and DatePickerField.jsx).
// Both plugins are lazy-loaded: every helper waits for `data-ready="true"` first. The hidden native `<select
// id=periodo>` keeps the value of record; the plugin's button is `#periodoToggle` and the date input `#fechaRecibo`.

export const periodToggle = (page) => page.locator('#periodoToggle');
export const dateInput = (page) => page.locator('#fechaRecibo');
// Dropdown of the period select: appended to <body> (outside the form card), `opened` while it is shown.
export const periodDropdown = (page) => page.locator('[data-hs-select-dropdown].opened');
// The calendar popup, appended to <body>; the plugin hides it with `data-vc-calendar-hidden`.
export const calendar = (page) => page.locator('.vc:not([data-vc-calendar-hidden])');

/** Waits until both plugins have taken over their fields. */
export async function pickersReady(page) {
  await expect(page.locator('#periodo')).toHaveAttribute('data-ready', 'true');
  await expect(dateInput(page)).toHaveAttribute('data-ready', 'true');
}

export async function openPeriod(page) {
  await pickersReady(page);
  await periodToggle(page).scrollIntoViewIfNeeded();
  await periodToggle(page).click();
  await expect(periodDropdown(page)).toBeVisible();
}

/** Opens the select and clicks a month by name. */
export async function pickMonth(page, month) {
  await openPeriod(page);
  await periodDropdown(page).locator(`[data-value="${month}"]`).click();
  await expect(periodDropdown(page)).toHaveCount(0);
  await expect(periodToggle(page)).toHaveText(month);
  await expect(page.locator('#periodo')).toHaveValue(month);
}

export async function openCalendar(page) {
  await pickersReady(page);
  await dateInput(page).scrollIntoViewIfNeeded();
  await dateInput(page).click();
  await expect(calendar(page)).toBeVisible();
}

/**
 * Opens the calendar and picks a day, moving to its month and year with the calendar's own month and year selects
 * (`mode: "custom-select"`). `month` is 1-12.
 */
export async function pickDate(page, { year, month, day }) {
  await openCalendar(page);
  const popup = calendar(page);
  const [monthToggle, yearToggle] = [popup.locator('.hs-select button').nth(0), popup.locator('.hs-select button').nth(1)];

  await monthToggle.click();
  await popup.locator(`[data-hs-select-dropdown].opened [data-value="${month - 1}"]`).click();
  await expect(popup.locator('[data-vc="month"]')).toHaveAttribute('data-vc-month', String(month - 1));

  await yearToggle.click();
  await popup.locator(`[data-hs-select-dropdown].opened [data-value="${year}"]`).click();
  await expect(popup.locator('[data-vc="year"]')).toHaveAttribute('data-vc-year', String(year));

  const iso = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
  await popup.locator(`[data-vc-date="${iso}"] button`).click();
  await expect(calendar(page)).toHaveCount(0);
  return iso;
}

/** Empties the date the way a user can: opening the calendar and clicking the selected day again. */
export async function clearDate(page, selectedIso) {
  await openCalendar(page);
  await calendar(page).locator(`[data-vc-date="${selectedIso}"] button`).click();
  await expect(dateInput(page)).toHaveValue('');
  await expect(calendar(page)).toHaveCount(0);
}
