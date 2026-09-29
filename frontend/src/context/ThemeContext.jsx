import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  isLight: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    const saved = localStorage.getItem('dhruvkosh_theme');
    if (saved) return saved;
    return 'dark';
  });

  const isLight = theme === 'light';

  useEffect(() => {
    localStorage.setItem('dhruvkosh_theme', theme);
    const root = document.documentElement;
    if (theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
      document.body.classList.add('light');
      document.body.classList.remove('dark');
    } else {
      root.classList.add('dark');
      root.classList.remove('light');
      document.body.classList.add('dark');
      document.body.classList.remove('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  const contextValue = React.useMemo(() => ({ theme, isLight, toggleTheme }), [theme, isLight]);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
