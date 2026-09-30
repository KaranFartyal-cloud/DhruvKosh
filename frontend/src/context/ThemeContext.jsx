import React, { createContext, useContext, useEffect } from 'react';

const ThemeContext = createContext({
  theme: 'dark',
  isLight: false,
  toggleTheme: () => {},
});

export const ThemeProvider = ({ children }) => {
  const theme = 'dark';
  const isLight = false;

  useEffect(() => {
    localStorage.setItem('dhruvkosh_theme', 'dark');
    const root = document.documentElement;
    root.classList.add('dark');
    root.classList.remove('light');
    document.body.classList.add('dark');
    document.body.classList.remove('light');
  }, []);

  const toggleTheme = () => {};

  const contextValue = React.useMemo(() => ({ theme: 'dark', isLight: false, toggleTheme }), []);

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => useContext(ThemeContext);
export default ThemeContext;
