import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/**
 * Four app themes (Settings → Theme). Every screen reads its colors from here so a
 * theme switch changes the whole app at once.
 *   sunset – D · warm orange → pink → purple (default)
 *   aurora – E · soft blue → purple → pink
 *   peach  – F · peach → coral → pink
 *   night  – G · soft dark grey with a pink → purple glow
 */
export type ThemeType = 'sunset' | 'aurora' | 'peach' | 'night';
export const THEME_TYPES: ThemeType[] = ['sunset', 'aurora', 'peach', 'night'];

export interface Theme {
  isDark: boolean;
  /** Main accent (buttons, links, active icons). */
  primary: string;
  /** Very light tint of primary (chips, avatar placeholders). */
  primaryLight: string;
  /** Second accent (stars, small highlights). */
  secondary: string;
  /** Accent gradient: primary buttons, badges, active tab, hero headers. */
  gradient: readonly [string, string, ...string[]];
  /** Text/icon color on top of the gradient. */
  onGradient: string;
  background: string;
  surface: string;
  text: string;
  textSecondary: string;
  border: string;
  error: string;
  success: string;
  warning: string;
  cardBackground: string;
  inputBackground: string;
  inputBorder: string;
  /** Kept for older screens; same as `gradient`. */
  headerGradient: readonly [string, string, ...string[]];
  tabBarBackground: string;
  tabBarBorder: string;
}

const base = { error: '#EF4444', success: '#22C55E', warning: '#F59E0B', onGradient: '#FFFFFF' };

const sunset: Theme = {
  ...base,
  isDark: false,
  primary: '#FF4F8B',
  primaryLight: '#FFE7EF',
  secondary: '#FF7A59',
  gradient: ['#FF7A59', '#FF4F8B', '#B455F5'],
  headerGradient: ['#FF7A59', '#FF4F8B', '#B455F5'],
  background: '#FFF6F4',
  surface: '#FFFFFF',
  text: '#22202A',
  textSecondary: '#77727F',
  border: '#F1E7E6',
  cardBackground: '#FFFFFF',
  inputBackground: '#FFF1EE',
  inputBorder: '#F4DCD8',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#F1E7E6',
};

const aurora: Theme = {
  ...base,
  isDark: false,
  primary: '#8A6CFF',
  primaryLight: '#EFEAFF',
  secondary: '#FF6FA8',
  gradient: ['#6C7BFF', '#9B6BFF', '#FF6FA8'],
  headerGradient: ['#6C7BFF', '#9B6BFF', '#FF6FA8'],
  background: '#F7F5FF',
  surface: '#FFFFFF',
  text: '#1F2133',
  textSecondary: '#71748A',
  border: '#ECE9F7',
  cardBackground: '#FFFFFF',
  inputBackground: '#F1EEFD',
  inputBorder: '#E2DCF7',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#ECE9F7',
};

const peach: Theme = {
  ...base,
  isDark: false,
  primary: '#FF6E70',
  primaryLight: '#FFEAE4',
  secondary: '#FFB36B',
  gradient: ['#FFB36B', '#FF8A6B', '#FF5E8E'],
  headerGradient: ['#FFB36B', '#FF8A6B', '#FF5E8E'],
  background: '#FFF8F1',
  surface: '#FFFFFF',
  text: '#2A211D',
  textSecondary: '#7D7069',
  border: '#F4E8DE',
  cardBackground: '#FFFFFF',
  inputBackground: '#FFF2E8',
  inputBorder: '#F4E1D2',
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#F4E8DE',
};

const night: Theme = {
  ...base,
  isDark: true,
  primary: '#FF6F9C',
  primaryLight: '#3A2632',
  secondary: '#FFB36B',
  gradient: ['#FF6F9C', '#C46BF0', '#8F7CFF'],
  headerGradient: ['#FF6F9C', '#C46BF0', '#8F7CFF'],
  background: '#16171D',
  surface: '#20222B',
  text: '#ECEDF2',
  textSecondary: '#9A9DAA',
  border: '#2C2F3A',
  cardBackground: '#20222B',
  inputBackground: '#2A2C36',
  inputBorder: '#353845',
  tabBarBackground: '#1B1D24',
  tabBarBorder: '#2C2F3A',
};

export const THEMES: Record<ThemeType, Theme> = { sunset, aurora, peach, night };

/** Values saved by older app versions. */
const LEGACY: Record<string, ThemeType> = { light: 'sunset', dark: 'night', colored: 'peach' };
const normalize = (v: string | null): ThemeType | null => {
  if (!v) return null;
  if ((THEME_TYPES as string[]).includes(v)) return v as ThemeType;
  return LEGACY[v] ?? null;
};

interface ThemeContextType {
  theme: Theme;
  themeType: ThemeType;
  setTheme: (type: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);
const KEY = 'app_theme';

async function readSaved(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') return typeof localStorage === 'undefined' ? null : localStorage.getItem(KEY);
    return await SecureStore.getItemAsync(KEY);
  } catch {
    return null;
  }
}

async function writeSaved(v: ThemeType): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, v);
    } else {
      await SecureStore.setItemAsync(KEY, v);
    }
  } catch {}
}

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [themeType, setThemeType] = useState<ThemeType>('sunset');

  useEffect(() => {
    readSaved().then((saved) => {
      const t = normalize(saved);
      if (t) setThemeType(t);
    });
  }, []);

  const setTheme = (type: ThemeType) => {
    setThemeType(type);
    writeSaved(type);
  };

  return (
    <ThemeContext.Provider value={{ theme: THEMES[themeType], themeType, setTheme }}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
