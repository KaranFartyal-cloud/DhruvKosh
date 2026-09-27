import { useLocation } from 'react-router-dom';

/**
 * Wraps page content with a subtle fade-up entrance on route change.
 * Uses CSS animation keyed to the pathname so it re-fires on navigation.
 */
const PageTransition = ({ children }) => {
  const { pathname } = useLocation();

  return (
    <div key={pathname} className="page-enter w-full h-full">
      {children}
    </div>
  );
};

export default PageTransition;
