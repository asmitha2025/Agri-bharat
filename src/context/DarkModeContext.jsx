import { createContext, useContext, useEffect, useState } from 'react';

const DarkModeContext = createContext();

export function DarkModeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    return localStorage.getItem('agribot-theme') === 'dark';
  });

  useEffect(() => {
    if (dark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('agribot-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('agribot-theme', 'light');
    }
  }, [dark]);

  return (
    <DarkModeContext.Provider value={{ dark, setDark }}>
      {children}
    </DarkModeContext.Provider>
  );
}

export function useDarkMode() {
  return useContext(DarkModeContext);
}
