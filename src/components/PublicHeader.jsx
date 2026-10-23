import Header from './Header';

/**
 * Public site header.
 * - default: logo + nav links (`links` = [{ to, label }])
 * - `logoOnly`: centered logo that links home (meter calculator page)
 */
export default function PublicHeader({ links = [], logoOnly = false }) {
  return <Header links={links} logoOnly={logoOnly} />;
}
