import type { FunctionComponent, ReactNode } from 'react';
import React, { createContext, useCallback, useState } from 'react';
import { ThemeProvider } from 'styled-components';

import { light } from './config/theme';
import { MetaMaskProvider } from './hooks';
import { getThemePreference, setLocalStorage } from './utils';

export type RootProps = {
  children: ReactNode;
};

type ToggleTheme = () => void;

export const ToggleThemeContext = createContext<ToggleTheme>(
  (): void => undefined,
);

export const Root: FunctionComponent<RootProps> = ({ children }) => {
  const [darkTheme, setDarkTheme] = useState(getThemePreference());

  const toggleTheme: ToggleTheme = useCallback(() => {
    setLocalStorage('theme', darkTheme ? 'light' : 'dark');
    setDarkTheme(!darkTheme);
  }, [darkTheme]);

  return (
    <ToggleThemeContext.Provider value={toggleTheme}>
      <ThemeProvider theme={light}>
        <MetaMaskProvider>{children}</MetaMaskProvider>
      </ThemeProvider>
    </ToggleThemeContext.Provider>
  );
};
