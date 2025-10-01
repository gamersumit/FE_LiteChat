import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'light' | 'dark' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  isDarkMode: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const getSystemTheme = (): boolean => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
};

const getStoredTheme = (): Theme => {
  return 'dark'; // Always return dark
};

const calculateIsDarkMode = (theme: Theme): boolean => {
  if (theme === 'dark') return true;
  if (theme === 'light') return false;
  return getSystemTheme(); // system
};

// Force dark mode always
const applyThemeToDocument = (theme: Theme) => {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;
  // Always force dark mode
  root.classList.add('dark');
};

// Initialize theme on page load
if (typeof window !== 'undefined') {
  const initialTheme = getStoredTheme();
  applyThemeToDocument(initialTheme);
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);

  // Listen to system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      // Re-apply theme if using system theme
      if (theme === 'system') {
        applyThemeToDocument(theme);
      }
    };
    
    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  // Calculate if dark mode should be active
  const isDarkMode = calculateIsDarkMode(theme);

  // Only apply theme when theme state changes (not on initial load since HTML script handles it)
  useEffect(() => {
    applyThemeToDocument(theme);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem('chat-theme', newTheme);
    // Immediately apply the new theme
    applyThemeToDocument(newTheme);
  };

  const value: ThemeContextType = {
    theme,
    setTheme,
    isDarkMode,
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}