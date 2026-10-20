import { useEffect, useRef, useState } from 'react';
import Footer from '../components/Footer';
import PublicHeader from '../components/PublicHeader';
import { VOUCHERS_LINKS } from '../components/navLinks';
import { Banner, Button, Field, FormCard, FormRow, PageSection } from '../components/ui';
import { MAX_VOUCHERS_TOTAL_BYTES } from '../lib/constants';
import { getTotalSize } from '../lib/files';
import {
  buildVoucherFormData,
  sendVoucher,
  validateVoucherForm,
} from '../lib/vouchers';

const BANNER_SCROLL_DELAY_MS = 100;
const SEND_ERROR_MESSAGE = 'No se pudo enviar el comprobante. Revisá tu conexión e intentá nuevamente.';

const EMPTY_FORM = { nombre: '', apellido: '', dni: '', email: '', ref4: '', hab: '', monto: '' };

function trimFields(form) {
  return Object.fromEntries(Object.entries(form).map(([key, value]) => [key, value.trim()]));
}

export default function Vouchers() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [banner, setBanner] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef(null);
  const bannerRef = useRef(null);

  useEffect(() => {
    if (!banner) return undefined;
    const timer = setTimeout(() => {
      bannerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, BANNER_SCROLL_DELAY_MS);
    return () => clearTimeout(timer);
  }, [banner]);

  const showBanner = (type, text) => setBanner({ type, text });

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  };

  // Keep only what the field accepts while the user types.
  const handleRef4Change = (event) => {
    const digits = event.target.value.replace(/\D+/g, '').slice(0, 4);
    setForm((current) => ({ ...current, ref4: digits }));
  };

  const handleMontoChange = (event) => {
    const amount = event.target.value.replace(/[^\d.,]/g, '');
    setForm((current) => ({ ...current, monto: amount }));
  };

  const handleFilesChange = (event) => {
    const files = event.target.files || [];
    if (getTotalSize(files) > MAX_VOUCHERS_TOTAL_BYTES) {
      showBanner('error', 'Las imágenes superan 50 MB en total. Por favor, selecciona menos imágenes.');
      event.target.value = '';
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    const data = trimFields(form);
    const files = Array.from(fileInputRef.current?.files || []);
    const errors = validateVoucherForm(data, files);
    if (errors.length > 0) {
      showBanner('error', errors[0]);
      return;
    }

    setSubmitting(true);
    try {
      await sendVoucher(buildVoucherFormData(data, files));
      showBanner('success', '¡Voucher enviado correctamente!');
      setForm(EMPTY_FORM);
      fileInputRef.current.value = '';
    } catch {
      // Keep the form values and selected files so the user can retry.
      showBanner('error', SEND_ERROR_MESSAGE);
    } finally {
      setSubmitting(false);
    }
  };

  const field = (id, label, props) => (
    <Field id={id} label={label} type="text" required value={form[id]} onChange={handleChange} {...props} />
  );

  return (
    <>
      <PublicHeader links={VOUCHERS_LINKS} />

      <PageSection title="Carga de Comprobante" subtitle="Completa el formulario para validar tu pago">
        <FormCard as="form" id="voucherForm" encType="multipart/form-data" noValidate onSubmit={handleSubmit}>
          <FormRow>
            {field('nombre', 'Nombre*', { autoComplete: 'given-name', inputMode: 'text' })}
            {field('apellido', 'Apellido*', { autoComplete: 'family-name', inputMode: 'text' })}
          </FormRow>

          <FormRow>
            {field('dni', 'DNI*', { inputMode: 'numeric', autoComplete: 'off' })}
            {field('email', 'Correo Electrónico*', { type: 'email', autoComplete: 'email', inputMode: 'email' })}
          </FormRow>

          <FormRow>
            {field('ref4', 'Últimos 4 dígitos del comprobante*', {
              maxLength: 4,
              pattern: '\\d{4}',
              inputMode: 'numeric',
              onChange: handleRef4Change,
            })}
            {field('hab', 'Nro habitación o apartamento*', { inputMode: 'text', autoComplete: 'on' })}
          </FormRow>

          {field('monto', 'Monto depositado (ARS)*', {
            inputMode: 'decimal',
            placeholder: '10.000',
            pattern: '^\\d{1,3}(\\.\\d{3})*(,\\d{1,2})?$',
            title: 'Ingrese el monto con separador de miles. Ejemplo: 1.000, 10.000, 20.000',
            onChange: handleMontoChange,
            help: 'Ingrese el monto completo con separador de miles (punto). Ejemplo: 10.000, 15.000, 20.000',
          })}

          <Field
            id="fotos"
            label="Fotos del comprobante (galería)*"
            type="file"
            accept="image/*"
            multiple
            aria-describedby="fotosHelp"
            required
            ref={fileInputRef}
            onChange={handleFilesChange}
            helpId="fotosHelp"
            help="Selecciona una  imágen desde tu galería o cámara. ."
          />

          <Button variant="submit" type="submit" id="submitBtn" disabled={submitting}>
            {submitting ? 'Procesando...' : 'Enviar Voucher'}
          </Button>

          {banner && (
            <Banner tone={banner.type} className="voucher-banner mt-6 px-6 py-4 text-center font-semibold" ref={bannerRef}>
              {banner.text}
            </Banner>
          )}
        </FormCard>
      </PageSection>

      <Footer variant="vouchers" />
    </>
  );
}
