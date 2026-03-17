import { createContext, useContext, useState, useEffect } from 'react';
import { Language, useTranslation } from '@/lib/i18n';

const LANGUAGE_STORAGE_KEY = 'app_language';

type LanguageContextType = {
  language: Language;
  setLanguage: (lang: Language) => void;
  changeLanguage: (lang: Language) => void;
  t: ReturnType<typeof useTranslation>;
};

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
);

const validLanguages: Language[] = ['tr', 'en', 'ru', 'ar', 'de', 'fr', 'es'];

async function getStoredLanguage(): Promise<Language | null> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (saved && validLanguages.includes(saved as Language)) return saved as Language;
  } catch (_) {
    // Native module null (Expo Go / web) veya başka hata – sadece bellek kullan
  }
  return null;
}

async function setStoredLanguage(lang: Language): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch (_) {
    // Native module null – dil sadece oturum boyunca kalır
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>('tr');

  useEffect(() => {
    getStoredLanguage().then((saved) => {
      if (saved) setLanguageState(saved);
    });
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    setStoredLanguage(lang);
  };

  const t = useTranslation(language);

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        changeLanguage: setLanguage,
        t,
      }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
