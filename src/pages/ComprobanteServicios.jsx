import { useState } from 'react';
import AdminHeader from '../components/AdminHeader';
import Footer from '../components/Footer';
import { ReceiptAmountField, ReceiptIdentityFields } from '../components/ReceiptFields';
import ReceiptTemplate from '../components/ReceiptTemplate';
import { ADMIN_NAV } from '../components/navLinks';
import { Button, FormCard, FormRow, PageSection, SectionSubtitle } from '../components/ui';
import {
  buildServicesReceipt,
  getDefaultReceiptDate,
  getServicesReceiptFilename,
  validateServicesReceipt,
} from '../lib/receipts';
import { useReceiptPdf } from '../lib/useReceiptPdf';

const BUTTON_LABEL = '📄 Generar Comprobante de Servicios';
const PROCESSING_LABEL = '📄 Generando PDF...';

export default function ComprobanteServicios() {
  const [values, setValues] = useState(() => ({
    cliente: '',
    propiedad: '',
    periodo: '',
    fecha: getDefaultReceiptDate(),
    montoAgua: '',
    montoLuz: '',
  }));
  const [errors, setErrors] = useState([]);
  const { templateRef, processing, generate } = useReceiptPdf();

  const handleChange = (name, value) => setValues((current) => ({ ...current, [name]: value }));

  const handleGenerate = () => {
    const invalidFields = validateServicesReceipt(values);
    setErrors(invalidFields);
    if (invalidFields.length > 0) return;

    generate(getServicesReceiptFilename(values.cliente, values.periodo));
  };

  const receipt = buildServicesReceipt(values);

  return (
    <>
      <AdminHeader links={ADMIN_NAV['comprobante-servicios']} />

      <PageSection title="Comprobante de Servicios" subtitle="Completá los datos y descargá el PDF del comprobante">
        <FormCard>
          <SectionSubtitle>Datos del comprobante</SectionSubtitle>

          <ReceiptIdentityFields values={values} errors={errors} onChange={handleChange} />

          <FormRow>
            <ReceiptAmountField
              name="montoAgua"
              label="Monto Agua ($)"
              placeholder="Ej: 5.000 o 5000,50"
              errorMessage="Ingresá un monto de agua válido mayor a cero"
              hasError={errors.includes('montoAgua')}
              value={values.montoAgua}
              onChange={handleChange}
            />
            <ReceiptAmountField
              name="montoLuz"
              label="Monto Luz ($)"
              placeholder="Ej: 8.000 o 8000,50"
              errorMessage="Ingresá un monto de luz válido mayor a cero"
              hasError={errors.includes('montoLuz')}
              value={values.montoLuz}
              onChange={handleChange}
            />
          </FormRow>

          <FormRow>
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
        title="COMPROBANTE DE SERVICIOS"
        content={receipt}
        rows={[
          {
            label: 'Agua:',
            periodo: receipt.periodo,
            periodoId: 'pdf-periodo',
            monto: receipt.montoAgua,
            montoId: 'pdf-monto-agua',
          },
          {
            label: 'Luz Eléctrica:',
            periodo: receipt.periodo,
            periodoId: 'pdf-periodo-luz',
            monto: receipt.montoLuz,
            montoId: 'pdf-monto-luz',
          },
        ]}
        total={receipt.total}
      />

      <Footer />
    </>
  );
}
