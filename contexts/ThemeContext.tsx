import React, { createContext, useContext, useState, useEffect } from 'react';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

export type ThemeType = 'light' | 'dark' | 'colored';

export interface Theme {
  primary: string;
  primaryLight: string;
  secondary: string;
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
  headerGradient: readonly [string, string, ...string[]];
  tabBarBackground: string;
  tabBarBorder: string;
}

const lightTheme: Theme = {
  primary: '#5B4BFF',
  primaryLight: '#EEEBFF',
  secondary: '#FF3D8B',
  background: '#F6F5FB',
  surface: '#FFFFFF',
  text: '#1A1A1A',
  textSecondary: '#666666',
  border: '#E0E0E0',
  error: '#FF6B6B',
  success: '#4CAF50',
  warning: '#FFA726',
  cardBackground: '#FFFFFF',
  inputBackground: '#F8F8F8',
  inputBorder: '#E0E0E0',
  headerGradient: ['#3D5AFE', '#8B3DFF', '#FF3D8B'],
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#ECEAF5',
};

const darkTheme: Theme = {
  primary: '#7C6CFF',
  primaryLight: '#1E2050',
  secondary: '#FF3D8B',
  background: '#0B0E24',
  surface: '#141838',
  text: '#FFFFFF',
  textSecondary: '#B0B0B0',
  border: '#232A5A',
  error: '#FF6B6B',
  success: '#4CAF50',
  warning: '#FFA726',
  cardBackground: '#161B3D',
  inputBackground: '#1B2047',
  inputBorder: '#2A3066',
  headerGradient: ['#141838', '#1E1A4D'],
  tabBarBackground: '#0F1330',
  tabBarBorder: '#1F2550',
};

const coloredTheme: Theme = {
  primary: '#FF6B9D',
  primaryLight: '#FFE5EC',
  secondary: '#C44569',
  background: '#FFF5F7',
  surface: '#FFFFFF',
  text: '#2C3E50',
  textSecondary: '#7F8C8D',
  border: '#FFE5EC',
  error: '#E74C3C',
  success: '#2ECC71',
  warning: '#F39C12',
  cardBackground: '#FFFFFF',
  inputBackground: '#FFF5F7',
  inputBorder: '#FFE5EC',
  headerGradient: ['#FF6B9D', '#C44569'],
  tabBarBackground: '#FFFFFF',
  tabBarBorder: '#FFE5EC',
};

interface ThemeContextType {
  theme: Theme;
  themeType: ThemeType;
  setTheme: (type: ThemeType) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeType, setThemeType] = useState<ThemeType>('light');
  const [theme, setThemeState] = useState<Theme>(lightTheme);

  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      if (Platform.OS === 'web') {
        const savedTheme = localStorage.getItem('app_theme');
        if (savedTheme) {
          const type = savedTheme as ThemeType;
          setThemeType(type);
          updateTheme(type);
        }
      } else {
        const savedTheme = await SecureStore.getItemAsync('app_theme');
        if (savedTheme) {
          const type = savedTheme as ThemeType;
          setThemeType(type);
          updateTheme(type);
        }
      }
    } catch (error) {
      console.error('Error loading theme:', error);
    }
  };

  const updateTheme = (type: ThemeType) => {
    switch (type) {
      case 'dark':
        setThemeState(darkTheme);
        break;
      case 'colored':
        setThemeState(coloredTheme);
        break;
      default:
        setThemeState(lightTheme);
    }
  };

  const setTheme = async (type: ThemeType) => {
    try {
      if (Platform.OS === 'web') {
        localStorage.setItem('app_theme', type);
      } else {
        await SecureStore.setItemAsync('app_theme', type);
      }
      setThemeType(type);
      updateTheme(type);
    } catch (error) {
      console.error('Error saving theme:', error);
    }
  };

  return (
    <ThemeContext.Provider value={{ theme, themeType, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};
