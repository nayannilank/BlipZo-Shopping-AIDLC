import { Link } from 'react-router-dom';

/**
 * Application header with BlipZo logo and navigation.
 * The logo maintains its original aspect ratio via object-contain
 * and scales responsively across all breakpoints (320px–1920px).
 */
export function Header(): React.ReactElement {
  return (
    <header className="nav-bar">
      <Link to="/" aria-label="BlipZo Home">
        <img src="/logo.png" alt="BlipZo" className="h-8 w-auto object-contain sm:h-10 lg:h-12" />
      </Link>
    </header>
  );
}
