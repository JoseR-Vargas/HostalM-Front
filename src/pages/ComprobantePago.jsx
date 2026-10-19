import { useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import Footer from '../components/Footer';
import { ReceiptAmountField, ReceiptIdentityFields } from '../components/ReceiptFields';
import ReceiptTemplate from '../components/ReceiptTemplate';
import { ADMIN_NAV } from '../components/navLinks';
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

      <section className="contact page-top-offset">
        <div className="container vouchers-center">
          <h3 className="section-title">Comprobante de Pago</h3>
          <p className="contact-subtitle">Completá los datos y descargá el PDF del comprobante</p>

          <div className="contact-form">
            <h4 className="section-subtitle">Datos del comprobante</h4>

            <ReceiptIdentityFields values={values} errors={errors} onChange={handleChange} />

            <div className="form-row">
              <ReceiptAmountField
                name="monto"
                label="Monto ($)"
                placeholder="Ej: 200.000 o 200000,50"
                errorMessage="Ingresá un monto válido mayor a cero"
                hasError={errors.includes('monto')}
                value={values.monto}
                onChange={handleChange}
              />
              <div className="form-group" style={{ display: 'flex', alignItems: 'flex-end' }}>
                <button
                  type="button"
                  className={processing ? 'cta-button processing' : 'cta-button'}
                  id="btnGenerar"
                  onClick={handleGenerate}
                  style={{ width: '100%' }}
                >
                  {processing ? PROCESSING_LABEL : BUTTON_LABEL}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

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
