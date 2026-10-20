// Shown while capturing: `position: fixed` anchors the template to the viewport, so the
// scroll position and body margins never shift the captured coordinates (with
// `position: absolute` the content landed at the wrong height in the PDF on some machines).
export const TEMPLATE_CAPTURE_STYLE = 'display: block; position: fixed; top: 0; left: -9999px; z-index: 9999;';

// html2canvas needs a full layout pass of the visible template before capturing.
const LAYOUT_WAIT_MS = 150;

// A4 portrait, no margins, one page.
export const PDF_OPTIONS = {
  margin: 0,
  image: { type: 'jpeg', quality: 0.98 },
  html2canvas: {
    scale: 2,
    useCORS: true,
    logging: false,
    scrollX: 0,
    scrollY: 0,
  },
  jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
  pagebreak: { mode: 'avoid-all' },
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Renders the first child of `template` (the hidden, inline-styled receipt sheet) to an
 * A4 PDF and downloads it as `filename`.
 *
 * The template wrapper is moved off-screen but made capturable while the PDF is built and
 * restored to its previous style afterwards, even when the generation fails.
 */
export async function downloadPdf(template, filename) {
  const hiddenStyle = template.style.cssText;
  template.style.cssText = TEMPLATE_CAPTURE_STYLE;

  try {
    await wait(LAYOUT_WAIT_MS);
    // html2pdf.js is heavy (html2canvas + jsPDF): load it only when a PDF is requested.
    const { default: html2pdf } = await import('html2pdf.js');
    await html2pdf()
      .set({ ...PDF_OPTIONS, filename })
      .from(template.firstElementChild)
      .save();
  } finally {
    template.style.cssText = hiddenStyle;
  }
}
