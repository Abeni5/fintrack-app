import React, { createContext, useContext, useState } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors } from './colors';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const systemScheme = useColorScheme();
  const [mode, setMode] = useState('system');

  const resolved = mode === 'system' ? (systemScheme ?? 'light') : mode;
  const colors = resolved === 'dark' ? darkColors : lightColors;

  return (
    <ThemeContext.Provider value={{ colors, mode, setMode, isDark: resolved === 'dark' }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
