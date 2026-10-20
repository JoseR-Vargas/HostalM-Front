import { useEffect, useRef, useState } from 'react';
import Footer from '../components/Footer';
import PublicHeader from '../components/PublicHeader';
import { VOUCHERS_LINKS } from '../components/navLinks';
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

const BANNER_COLORS = {
  error: { borderLeft: '4px solid #e53e3e', backgroundColor: '#fed7d7', color: '#c53030' },
  success: { borderLeft: '4px solid #38a169', backgroundColor: '#c6f6d5', color: '#22543d' },
};

function bannerStyle(type) {
  return {
    marginTop: '1.5rem',
    padding: '1rem 1.5rem',
    borderRadius: '8px',
    ...BANNER_COLORS[type],
    textAlign: 'center',
    fontWeight: 600,
    animation: 'slideIn 0.3s ease-out',
  };
}

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

  return (
    <>
      <PublicHeader links={VOUCHERS_LINKS} />

      <section className="contact page-top-offset">
        <div className="container vouchers-center">
          <h3 className="section-title">Carga de Comprobante</h3>
          <p className="contact-subtitle">Completa el formulario para validar tu pago</p>

          <form
            id="voucherForm"
            className="contact-form"
            encType="multipart/form-data"
            noValidate
            onSubmit={handleSubmit}
          >
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="nombre">Nombre*</label>
                <input
                  type="text"
                  id="nombre"
                  name="nombre"
                  autoComplete="given-name"
                  required
                  inputMode="text"
                  value={form.nombre}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="apellido">Apellido*</label>
                <input
                  type="text"
                  id="apellido"
                  name="apellido"
                  autoComplete="family-name"
                  required
                  inputMode="text"
                  value={form.apellido}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="dni">DNI*</label>
                <input
                  type="text"
                  id="dni"
                  name="dni"
                  required
                  inputMode="numeric"
                  autoComplete="off"
                  value={form.dni}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Correo Electrónico*</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  required
                  autoComplete="email"
                  inputMode="email"
                  value={form.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="ref4">Últimos 4 dígitos del comprobante*</label>
                <input
                  type="text"
                  id="ref4"
                  name="ref4"
                  required
                  maxLength={4}
                  pattern="\d{4}"
                  inputMode="numeric"
                  value={form.ref4}
                  onChange={handleRef4Change}
                />
              </div>
              <div className="form-group">
                <label htmlFor="hab">Nro habitación o apartamento*</label>
                <input
                  type="text"
                  id="hab"
                  name="hab"
                  required
                  inputMode="text"
                  autoComplete="on"
                  value={form.hab}
                  onChange={handleChange}
                />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="monto">Monto depositado (ARS)*</label>
              <input
                type="text"
                id="monto"
                name="monto"
                required
                inputMode="decimal"
                placeholder="10.000"
                pattern="^\d{1,3}(\.\d{3})*(,\d{1,2})?$"
                title="Ingrese el monto con separador de miles. Ejemplo: 1.000, 10.000, 20.000"
                value={form.monto}
                onChange={handleMontoChange}
              />
              <small className="form-help">
                Ingrese el monto completo con separador de miles (punto). Ejemplo: 10.000, 15.000, 20.000
              </small>
            </div>

            <div className="form-group">
              <label htmlFor="fotos">Fotos del comprobante (galería)*</label>
              <input
                type="file"
                id="fotos"
                name="fotos"
                accept="image/*"
                multiple
                aria-describedby="fotosHelp"
                required
                ref={fileInputRef}
                onChange={handleFilesChange}
              />
              <small id="fotosHelp" className="form-help">
                Selecciona una  imágen desde tu galería o cámara. .
              </small>
            </div>

            <button type="submit" className="submit-button" id="submitBtn" disabled={submitting}>
              {submitting ? 'Procesando...' : 'Enviar Voucher'}
            </button>

            {banner && (
              <div className="voucher-banner" style={bannerStyle(banner.type)} ref={bannerRef}>
                {banner.text}
              </div>
            )}
          </form>
        </div>
      </section>

      <Footer variant="vouchers" />
    </>
  );
}
