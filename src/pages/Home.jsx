import { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import Footer from '../components/Footer';
import PublicHeader from '../components/PublicHeader';
import Reveal from '../components/Reveal';
import { HOME_LINKS } from '../components/navLinks';
import {
  CONTACT_MESSAGE_MAX_LENGTH,
  buildContactMessage,
  getCounterState,
  validateContactForm,
} from '../lib/contactForm';
import { isValidEmail } from '../lib/validators';
import { buildWhatsAppUrl, isMobileDevice, openWhatsApp } from '../lib/whatsapp';
import '../styles/home.css';

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

const ERROR_BOX_STYLE = {
  display: 'block',
  backgroundColor: '#fed7d7',
  color: '#c53030',
  padding: '1rem',
  borderRadius: '8px',
  marginBottom: '1rem',
  borderLeft: '4px solid #e53e3e',
};

const SUCCESS_BOX_STYLE = {
  backgroundColor: '#c6f6d5',
  color: '#22543d',
  padding: '1rem',
  borderRadius: '8px',
  marginBottom: '1rem',
  borderLeft: '4px solid #38a169',
  textAlign: 'center',
};

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
    <div className="form-group">
      <label htmlFor={name}>{label}</label>
      <input
        type={type}
        id={name}
        name={name}
        required
        className={invalidFields[name] ? 'error-field' : undefined}
        value={form[name]}
        onChange={handleChange}
        onBlur={handleBlur}
      />
    </div>
  );

  const counterState = getCounterState(form.mensaje.length);

  return (
    <form id="contactForm" className="contact-form" onSubmit={handleSubmit}>
      {showSuccess && (
        <div className="success-message" style={SUCCESS_BOX_STYLE}>
          <strong>¡Perfecto!</strong> Te estamos redirigiendo a WhatsApp...
        </div>
      )}
      {errors.length > 0 && (
        <div className="error-message" style={ERROR_BOX_STYLE} ref={errorBoxRef}>
          <strong>Por favor corrige los siguientes errores:</strong>
          <ul style={{ marginTop: '0.5rem', marginBottom: 0 }}>
            {errors.map((error) => (
              <li key={error}>{error}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="form-row">
        {requiredInput('nombre', 'Nombre*')}
        {requiredInput('apellido', 'Apellido*')}
      </div>

      <div className="form-row">
        {requiredInput('dni', 'DNI*')}
        {requiredInput('email', 'Correo Electrónico*', 'email')}
      </div>

      <div className="form-group">
        <label htmlFor="huespedes">Cantidad de huéspedes</label>
        <select id="huespedes" name="huespedes" value={form.huespedes} onChange={handleChange}>
          <option value="1">1 huésped</option>
          <option value="2">2 huéspedes</option>
          <option value="3">3 huéspedes</option>
          <option value="4">4 huéspedes</option>
          <option value="5+">5 o más huéspedes</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="tipo">Tipo de alojamiento</label>
        <select id="tipo" name="tipo" value={form.tipo} onChange={handleChange}>
          <option value="habitacion">Habitación</option>
          <option value="apartamento">Apartamento</option>
          <option value="consultar">Consultar opciones</option>
        </select>
      </div>

      <div className="form-group">
        <label htmlFor="mensaje">Escribe un mensaje</label>
        <textarea
          id="mensaje"
          name="mensaje"
          rows="4"
          maxLength={CONTACT_MESSAGE_MAX_LENGTH}
          placeholder="Cuéntanos sobre tus necesidades especiales o consultas"
          value={form.mensaje}
          onChange={handleChange}
        />
        <div className={`character-counter ${counterState}`.trim()}>
          <span id="charCount">{form.mensaje.length}</span>/{CONTACT_MESSAGE_MAX_LENGTH} caracteres
        </div>
      </div>

      <button type="submit" className="submit-button">
        Enviar Consulta por WhatsApp
      </button>
    </form>
  );
}

export default function Home() {
  useHashScroll();

  return (
    <>
      <PublicHeader links={HOME_LINKS} />

      <section id="inicio" className="hero">
        <div className="hero-content">
          <div className="hero-text">
            <h2 className="hero-title">Bienvenido a Hostal Mayelewoo</h2>
            <p className="hero-subtitle">Tu hogar en el corazón de Córdoba</p>
            <p className="hero-description">
              Habitaciones y apartamentos cómodos en una ubicación privilegiada
            </p>
            <Link to="/#contacto" className="cta-button">
              Reservar Ahora
            </Link>
          </div>
        </div>
        <div className="hero-images">
          <Reveal
            as="img"
            src="/img/mayelewo1.jpeg"
            alt="Hostal Mayelewoo exterior"
            className="hero-img hero-img-1"
          />
          <Reveal
            as="img"
            src="/img/mayelewo2.jpeg"
            alt="Hostal Mayelewoo interior"
            className="hero-img hero-img-2"
          />
        </div>
      </section>

      <section className="location">
        <div className="container">
          <div className="location-content">
            <h3 className="section-title">Nuestra Ubicación</h3>
            <p className="location-address">Humberto Primo 3070, Córdoba, Argentina</p>
            <p className="location-description">
              Estratégicamente ubicado para que disfrutes de todo lo que Córdoba tiene para ofrecer
            </p>
          </div>
        </div>
      </section>

      <section id="habitaciones" className="rooms">
        <div className="container">
          <h3 className="section-title">Habitaciones y Apartamentos</h3>
          <div className="rooms-grid">
            <Reveal className="room-card">
              <h4 className="room-title">Habitaciones</h4>
              <p className="room-description">
                Cómodas habitaciones individuales y dobles, perfectas para una estadía relajante
              </p>
              <ul className="room-features">
                <li>Baño común</li>
                <li>WiFi gratuito</li>
                <li>Aire acondicionado</li>
              </ul>
            </Reveal>
            <Reveal className="room-card">
              <h4 className="room-title">Apartamentos</h4>
              <p className="room-description">
                Apartamentos completamente equipados para estadías más largas
              </p>
              <ul className="room-features">
                <li>Cocina equipada</li>
                <li>Sala de estar</li>
                <li>Balcón privado</li>
              </ul>
            </Reveal>
          </div>
        </div>
      </section>

      <section id="contacto" className="contact">
        <div className="container">
          <h3 className="section-title">Reserva tu Estadía</h3>
          <p className="contact-subtitle">
            Completa el formulario y nos pondremos en contacto contigo vía WhatsApp
          </p>
          <ContactForm />
        </div>
      </section>

      <Footer variant="home" />
    </>
  );
}
