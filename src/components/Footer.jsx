import { Link } from 'react-router-dom';
import { WHATSAPP_INFO_MESSAGE, buildWhatsAppUrl, openWhatsApp } from '../lib/whatsapp';

function Address() {
  return (
    <div className="footer-section">
      <h4>Hostal Mayelewoo</h4>
      <p>
        Humberto Primo 3070
        <br />
        Córdoba, Argentina
      </p>
    </div>
  );
}

function FooterBottom() {
  return (
    <div className="footer-bottom">
      <p>&copy; 2024 Hostal Mayelewoo. Todos los derechos reservados.</p>
    </div>
  );
}

/**
 * Site footer.
 * - `home`: address, WhatsApp and Instagram
 * - `vouchers`: address, link to the home contact section and a back link
 * - default: copyright only (admin pages)
 */
export default function Footer({ variant = 'minimal' }) {
  const handleWhatsApp = (event) => {
    event.preventDefault();
    openWhatsApp(buildWhatsAppUrl(WHATSAPP_INFO_MESSAGE));
  };

  return (
    <footer className="footer footer-centered">
      <div className="container">
        {variant === 'home' && (
          <div className="footer-content">
            <Address />
            <div className="footer-section">
              <h4>Contacto</h4>
              <div className="contact-info">
                <a href="#" id="whatsappLink" className="contact-link whatsapp" onClick={handleWhatsApp}>
                  <span className="contact-icon">✉</span>
                  WhatsApp
                </a>
              </div>
            </div>
            <div className="footer-section">
              <h4>Síguenos</h4>
              <div className="social-links">
                <a
                  href="https://www.instagram.com/hostalmayelewoo/?igsh=eTJpdWJoZnlrMW02&utm_source=qr"
                  className="social-link instagram"
                  target="_blank"
                >
                  <span className="social-icon">◉</span>
                  Instagram
                </a>
              </div>
            </div>
          </div>
        )}
        {variant === 'vouchers' && (
          <div className="footer-content">
            <Address />
            <div className="footer-section">
              <h4>Contacto</h4>
              <div className="contact-info">
                <Link to="/#contacto" className="contact-link whatsapp">
                  <span className="contact-icon"></span>
                  WhatsApp
                </Link>
              </div>
            </div>
            <div className="footer-section">
              <h4>Volver</h4>
              <div className="social-links">
                <Link to="/#inicio" className="social-link" target="_self">
                  <span className="social-icon"></span>
                  Inicio
                </Link>
              </div>
            </div>
          </div>
        )}
        <FooterBottom />
      </div>
    </footer>
  );
}
