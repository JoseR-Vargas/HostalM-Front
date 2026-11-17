import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import HeroOcean from '../components/HeroOcean';
import PublicHeader from '../components/PublicHeader';
import Reveal from '../components/Reveal';
import { HOME_LINKS } from '../components/navLinks';
import { Banner, Button, Field, FormCard, FormRow, PageHeading, SectionTitle, cls } from '../components/ui';
import {
  CONTACT_MESSAGE_MAX_LENGTH,
  buildContactMessage,
  getCounterState,
  validateContactForm,
} from '../lib/contactForm';
import { isValidEmail } from '../lib/validators';
import { buildWhatsAppUrl, isMobileDevice, openWhatsApp } from '../lib/whatsapp';

const DESKTOP_REDIRECT_DELAY_MS = 1000;
const SUCCESS_BANNER_MS = 3000;

const EMPTY_FORM = {
  nombre: '',
  apellido: '',
  dni: '',
  email: '',
  huespedes: '1',
  tipo: 'habitacion',
  mensaje: '',
};

const COUNTER_TONES = { warning: 'text-warning', 'near-limit': 'text-secondary' };
// `error-field` is the hook for tests; the red look is the same as the `Field` `error` prop (Preline input recipe).
const INVALID_FIELD = 'error-field border-red-500! focus:border-red-500! focus:ring-red-500!';

function isFieldInvalid(name, value) {
  if (!value.trim()) return true;
  return name === 'email' && !isValidEmail(value);
}

/** Smooth-scrolls to the section named by the URL hash (`/#contacto`). */
function useHashScroll() {
  const { hash, key } = useLocation();

  useEffect(() => {
    if (!hash) return;
    const target = document.getElementById(decodeURIComponent(hash.slice(1)));
    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [hash, key]);
}

function ContactForm() {
  const [form, setForm] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [invalidFields, setInvalidFields] = useState({});
  const errorBoxRef = useRef(null);
  const timers = useRef([]);

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (errors.length > 0) {
      errorBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [errors]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
    // Stop highlighting a field as soon as it has content again.
    if (invalidFields[name] && value.trim()) {
      setInvalidFields((current) => ({ ...current, [name]: false }));
    }
  };

  const handleBlur = (event) => {
    const { name, value } = event.target;
    setInvalidFields((current) => ({ ...current, [name]: isFieldInvalid(name, value) }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    const validationErrors = validateContactForm(form);
    setErrors(validationErrors);
    if (validationErrors.length > 0) return;

    const url = buildWhatsAppUrl(buildContactMessage(form));
    setShowSuccess(true);
    timers.current.push(setTimeout(() => setShowSuccess(false), SUCCESS_BANNER_MS));

    if (isMobileDevice()) {
      openWhatsApp(url);
    } else {
      timers.current.push(setTimeout(() => openWhatsApp(url), DESKTOP_REDIRECT_DELAY_MS));
    }
  };

  const requiredInput = (name, label, type = 'text') => (
    <Field
      id={name}
      label={label}
      type={type}
      required
      controlClass={invalidFields[name] ? INVALID_FIELD : undefined}
      value={form[name]}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );

  const counterState = getCounterState(form.mensaje.length);

  return (
    <FormCard as="form" id="contactForm" onSubmit={handleSubmit}>
      {showSuccess && (
        <Banner tone="success" className="success-message mb-4 p-4 text-center">
          <strong>¡Perfecto!</strong> Te estamos redirigiendo a WhatsApp...
        </Banner>
      )}
      {errors.length > 0 && (
        <Banner tone="error" className="error-message mt-2 mb-4 p-4 text-[0.85rem] leading-[1.3]" ref={errorBoxRef}>
          <strong>Por favor corrige los siguientes errores:</strong>
          <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </Banner>
      )}

      <FormRow>
        {requiredInput('nombre', 'Nombre*')}
        {requiredInput('apellido', 'Apellido*')}
      </FormRow>

      <FormRow>
        {requiredInput('dni', 'DNI*')}
        {requiredInput('email', 'Correo Electrónico*', 'email')}
      </FormRow>

      <Field id="huespedes" label="Cantidad de huéspedes" as="select" value={form.huespedes} onChange={handleChange}>
        <option value="1">1 huésped</option>
        <option value="2">2 huéspedes</option>
        <option value="3">3 huéspedes</option>
        <option value="4">4 huéspedes</option>
        <option value="5+">5 o más huéspedes</option>
      </Field>

      <Field id="tipo" label="Tipo de alojamiento" as="select" value={form.tipo} onChange={handleChange}>
        <option value="habitacion">Habitación</option>
        <option value="apartamento">Apartamento</option>
        <option value="consultar">Consultar opciones</option>
      </Field>

      <Field
        id="mensaje"
        label="Escribe un mensaje"
        as="textarea"
        rows="4"
        maxLength={CONTACT_MESSAGE_MAX_LENGTH}
        placeholder="Cuéntanos sobre tus necesidades especiales o consultas"
        value={form.mensaje}
        onChange={handleChange}
        after={
          <div className={cls('character-counter mt-2 text-right text-[0.9rem]', counterState, COUNTER_TONES[counterState] ?? 'text-muted')}>
            <span id="charCount">{form.mensaje.length}</span>/{CONTACT_MESSAGE_MAX_LENGTH} caracteres
          </div>
        }
      />

      <Button variant="submit" type="submit">
        Enviar Consulta por WhatsApp
      </Button>
    </FormCard>
  );
}

const SECTION_Y = 'py-[100px] phone:py-10';
const ROOMS = [
  {
    title: 'Habitaciones',
    description: 'Cómodas habitaciones individuales y dobles, perfectas para una estadía relajante',
    features: ['Baño común', 'WiFi gratuito', 'Aire acondicionado'],
  },
  {
    title: 'Apartamentos',
    description: 'Apartamentos completamente equipados para estadías más largas',
    features: ['Cocina equipada', 'Sala de estar', 'Balcón privado'],
  },
];
export default function Home() {
  useHashScroll();

  return (
    <>
      <PublicHeader links={HOME_LINKS} />

      <section
        id="inicio"
        className="hero relative flex min-h-screen w-full items-center overflow-hidden bg-[linear-gradient(180deg,#f9f9f8_0%,#eaf4fc_55%,#d3e7f7_100%)] tablet:min-h-[70vh]"
      >
        <HeroOcean />
        <div className="relative z-10 mx-auto w-full max-w-[900px] px-5 pt-[150px] pb-[210px] text-center tablet:max-w-full tablet:px-[15px] tablet:pt-[160px] tablet:pb-[150px] phone:px-2.5 phone:pt-[140px] phone:pb-[150px]">
          <h2 className="hero-title mb-6 font-[family-name:Open_Sans,-apple-system,BlinkMacSystemFont,system-ui,sans-serif] text-[4.5rem] leading-[1.1] font-black tracking-[-0.04em] text-primary uppercase tablet:text-[3.2rem] tablet:tracking-[-0.03em] phone:text-[2.5rem] phone:tracking-[-0.02em]">
            Bienvenido a Hostal Mayelewoo
          </h2>
          <p className="hero-subtitle mb-6 text-[1.8rem] font-bold tracking-[0.01em] text-primary tablet:mb-4 tablet:text-[1.3rem] phone:text-[1.1rem]">
            Tu hogar en el corazón de Córdoba
          </p>
          <p className="mx-auto mb-12 max-w-[90%] text-[1.2rem] leading-[1.6] text-muted tablet:mx-auto tablet:mb-8 tablet:text-[1rem]">
            Habitaciones y apartamentos cómodos en una ubicación privilegiada
          </p>
          <Button as={Link} to="/#contacto">
            Reservar Ahora
          </Button>
        </div>
      </section>

      <section
        className={`border-y border-border bg-page ${SECTION_Y}`}
      >
        <div className="container">
          <div className="mx-auto max-w-[700px] text-center tablet:px-[15px]">
            <SectionTitle className="mb-8 phone:mb-6">Nuestra Ubicación</SectionTitle>
            <p className="location-address mb-6 text-[1.5rem] font-semibold text-primary [text-shadow:0_0_10px_rgba(21,39,81,0.3)]">
              Humberto Primo 3070, Córdoba, Argentina
            </p>
            <p className="text-[1.2rem] leading-[1.7] text-muted">
              Estratégicamente ubicado para que disfrutes de todo lo que Córdoba tiene para ofrecer
            </p>
          </div>
        </div>
      </section>

      <section id="habitaciones" className={`bg-page ${SECTION_Y}`}>
        <div className="container">
          <SectionTitle className="mb-16 text-center">Habitaciones y Apartamentos</SectionTitle>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(450px,1fr))] gap-12 tablet:grid-cols-[1fr] tablet:gap-8">
            {ROOMS.map(({ title, description, features }) => (
              <Reveal
                key={title}
                className="room-card relative overflow-hidden rounded-xl border border-border bg-card p-12 shadow-card before:absolute before:inset-x-0 before:top-0 before:h-1 before:bg-bar hover:border-primary hover:shadow-hover tablet:mx-auto tablet:max-w-[400px] tablet:text-center phone:max-w-full phone:p-6"
              >
                <h4 className="room-title mb-6 text-[1.8rem] text-primary">{title}</h4>
                <p className="mb-8 text-[1.1rem] leading-[1.6] text-muted">{description}</p>
                <ul className="list-none">
                  {features.map((feature) => (
                    <li key={feature} className="mb-[0.8rem] text-[1.05rem]">
                      {feature}
                    </li>
                  ))}
                </ul>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" className={`border-t border-border bg-band ${SECTION_Y}`}>
        <div className="container">
          <PageHeading title="Reserva tu Estadía" subtitle="Completa el formulario y nos pondremos en contacto contigo vía WhatsApp" />
          <ContactForm />
        </div>
      </section>

      <Footer variant="home" />
    </>
  );
}
