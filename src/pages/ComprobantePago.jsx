import { useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import Footer from '../components/Footer';
import { ReceiptAmountField, ReceiptIdentityFields } from '../components/ReceiptFields';
import ReceiptTemplate from '../components/ReceiptTemplate';
import { ADMIN_NAV } from '../components/navLinks';
import { Button, FormCard, FormRow, PageSection, SectionSubtitle } from '../components/ui';
import {
  buildPaymentReceipt,
  getDefaultReceiptDate,
  getPaymentReceiptFilename,
  validatePaymentReceipt,
} from '../lib/receipts';
import { useReceiptPdf } from '../lib/useReceiptPdf';

const BUTTON_LABEL = '📄 Generar y Descargar PDF';
const PROCESSING_LABEL = 'Generando PDF...';

export default function ComprobantePago() {
  const [values, setValues] = useState(() => ({
    cliente: '',
    propiedad: '',
    periodo: '',
    fecha: getDefaultReceiptDate(),
    monto: '',
  }));
  const [errors, setErrors] = useState([]);
  const { templateRef, processing, generate } = useReceiptPdf();

  const handleChange = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  const handleGenerate = () => {
    const invalidFields = validatePaymentReceipt(values);
    setErrors(invalidFields);
    if (invalidFields.length > 0) return;

    generate(getPaymentReceiptFilename(values.cliente, values.periodo));
  };

  const receipt = buildPaymentReceipt(values);

  return (
    <>
      <AdminHeader links={ADMIN_NAV['comprobante-pago']} />

      <PageSection title="Comprobante de Pago" subtitle="Completá los datos y descargá el PDF del comprobante">
        <FormCard>
          <SectionSubtitle>Datos del comprobante</SectionSubtitle>

          <ReceiptIdentityFields values={values} errors={errors} onChange={handleChange} />

          <FormRow>
            <ReceiptAmountField
              name="monto"
              label="Monto ($)"
              placeholder="Ej: 200.000 o 200000,50"
              errorMessage="Ingresá un monto válido mayor a cero"
              hasError={errors.includes('monto')}
              value={values.monto}
              onChange={handleChange}
            />
            <div className="mb-8 flex items-end">
              <Button type="button" id="btnGenerar" className="w-full" processing={processing} onClick={handleGenerate}>
                {processing ? PROCESSING_LABEL : BUTTON_LABEL}
              </Button>
            </div>
          </FormRow>
        </FormCard>
      </PageSection>

      <ReceiptTemplate
        ref={templateRef}
        title="COMPROBANTE DE PAGO"
        content={receipt}
        rows={[
          {
            label: 'Alquiler:',
            periodo: receipt.periodo,
            periodoId: 'pdf-periodo',
            monto: receipt.monto,
            montoId: 'pdf-monto',
          },
        ]}
        total={receipt.total}
      />

      <Footer />
    </>
  );
}
