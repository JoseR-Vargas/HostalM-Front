import { useRef, useState } from 'react';
import { downloadPdf } from './pdf';

export const PDF_ERROR_MESSAGE = 'Error al generar el PDF. Intentá de nuevo.';

/**
 * Drives the "generate PDF" button of the receipt pages.
 * Attach `templateRef` to the `ReceiptTemplate` and call `generate(filename)`;
 * `processing` is true while the PDF is being built. Failures are logged and shown in an alert.
 */
export function useReceiptPdf() {
  const templateRef = useRef(null);
  const busyRef = useRef(false);
  const [processing, setProcessing] = useState(false);

  const generate = async (filename) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setProcessing(true);
    try {
      await downloadPdf(templateRef.current, filename);
    } catch (error) {
      console.error('Error generando PDF:', error);
      window.alert(PDF_ERROR_MESSAGE);
    } finally {
      busyRef.current = false;
      setProcessing(false);
    }
  };

  return { templateRef, processing, generate };
}
