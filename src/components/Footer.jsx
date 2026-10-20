import { Link } from 'react-router-dom';
import { WHATSAPP_INFO_MESSAGE, buildWhatsAppUrl, openWhatsApp } from '../lib/whatsapp';

const FOOTER =
  'footer footer-centered relative w-full border-t border-border bg-[linear-gradient(135deg,rgba(240,244,248,0.95)_0%,rgba(235,241,245,1)_50%,rgba(226,232,240,1)_100%)] pt-16 pb-8 text-ink before:absolute before:inset-x-0 before:top-0 before:h-[3px] before:bg-[linear-gradient(90deg,var(--color-primary),var(--color-secondary),var(--color-accent))] tablet:pt-12';
const COLUMNS =
  'footer-content mb-12 grid grid-cols-3 items-start gap-12 text-left tablet:grid-cols-1 tablet:items-center tablet:gap-10 tablet:text-center';
const SECTION =
  'footer-section flex flex-col items-start text-left tablet:mx-auto tablet:w-full tablet:max-w-[320px] tablet:items-center tablet:text-center';
const HEADING =
  'mb-6 bg-brand bg-clip-text text-[1.4rem] text-transparent tablet:mb-[1.2rem] tablet:text-[1.3rem]';
const LINKS = 'flex w-full flex-col items-start gap-4 tablet:items-center tablet:gap-[1.2rem]';
const LINK =
  'group relative flex items-center justify-start gap-4 overflow-hidden rounded-xl border border-border bg-white/70 px-[1.2rem] py-4 text-[1.05rem] text-muted before:absolute before:top-0 before:-left-full before:h-full before:w-full before:bg-[linear-gradient(90deg,transparent,rgba(43,108,176,0.1),transparent)] before:transition-all before:duration-300 hover:-translate-y-[3px] hover:scale-[1.02] hover:border-primary hover:bg-white/90 hover:text-primary hover:shadow-[0_8px_25px_rgba(43,108,176,0.15)] hover:before:left-full tablet:min-h-14 tablet:justify-center tablet:px-6 tablet:py-[1.2rem] tablet:text-[1.1rem]';
const ICON =
  'flex size-[1.4rem] items-center justify-center rounded-full bg-brand p-[0.3rem] text-[1.4rem] text-white transition-all duration-300 group-hover:rotate-[15deg] group-hover:scale-110 group-hover:shadow-[0_0_15px_rgba(43,108,176,0.5)] tablet:size-6 tablet:p-[0.4rem] tablet:text-[1.5rem]';

function Section({ title, children }) {
  return (
    <div className={SECTION}>
      <h4 className={HEADING}>{title}</h4>
      {children}
    </div>
  );
}

function Address() {
  return (
    <Section title="Hostal Mayelewoo">
      <p className="text-left text-[1.05rem] leading-[1.7] text-muted">
        Humberto Primo 3070
        <br />
        Córdoba, Argentina
      </p>
    </Section>
  );
}

/** Pill-shaped link with a round icon. Renders `as` (default `a`) with `hook` classes next to the utilities. */
function IconLink({ as: Tag = 'a', hook, icon, iconHook, children, ...props }) {
  return (
    <Tag className={`${hook} ${LINK}`} {...props}>
      <span className={`${iconHook} ${ICON}`}>{icon}</span>
      {children}
    </Tag>
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
    <footer className={FOOTER}>
      <div className="container">
        {variant === 'home' && (
          <div className={COLUMNS}>
            <Address />
            <Section title="Contacto">
              <div className={`contact-info ${LINKS}`}>
                <IconLink
                  hook="contact-link whatsapp"
                  iconHook="contact-icon"
                  icon="✉"
                  href="#"
                  id="whatsappLink"
                  onClick={handleWhatsApp}
                >
                  WhatsApp
                </IconLink>
              </div>
            </Section>
            <Section title="Síguenos">
              <div className={`social-links ${LINKS}`}>
                <IconLink
                  hook="social-link instagram"
                  iconHook="social-icon"
                  icon="◉"
                  href="https://www.instagram.com/hostalmayelewoo/?igsh=eTJpdWJoZnlrMW02&utm_source=qr"
                  target="_blank"
                >
                  Instagram
                </IconLink>
              </div>
            </Section>
          </div>
        )}
        {variant === 'vouchers' && (
          <div className={COLUMNS}>
            <Address />
            <Section title="Contacto">
              <div className={`contact-info ${LINKS}`}>
                <IconLink as={Link} hook="contact-link whatsapp" iconHook="contact-icon" to="/#contacto">
                  WhatsApp
                </IconLink>
              </div>
            </Section>
            <Section title="Volver">
              <div className={`social-links ${LINKS}`}>
                <IconLink as={Link} hook="social-link" iconHook="social-icon" to="/#inicio" target="_self">
                  Inicio
                </IconLink>
              </div>
            </Section>
          </div>
        )}
        <div className="footer-bottom w-full border-t border-border pt-12 text-center text-[1.05rem] text-muted tablet:pt-10 tablet:text-[1rem]">
          <p>&copy; 2024 Hostal Mayelewoo. Todos los derechos reservados.</p>
        </div>
      </div>
    </footer>
  );
}
