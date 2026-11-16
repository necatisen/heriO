import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, I18nManager } from 'react-native';
import { Language, useTranslation } from '@/lib/i18n';
import { L, setL10nLanguage } from '@/lib/l10n';

const LANGUAGE_STORAGE_KEY = 'app_language';

type LanguageContextType = {
  language: Language;
  /** User picked a language (welcome screen / settings). Saved to the device and the account. */
  setLanguage: (lang: Language) => void;
  changeLanguage: (lang: Language) => void;
  /** Apply the language stored on the account after sign-in (not treated as a new user choice). */
  applyAccountLanguage: (lang: Language) => void;
  /** True if the user picked a language on this device since the app started. */
  userChoseLanguage: () => boolean;
  t: ReturnType<typeof useTranslation>;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const SUPPORTED_LANGUAGES: Language[] = ['tr', 'en', 'ru', 'ar', 'de', 'fr', 'es'];
export const isSupportedLanguage = (v: unknown): v is Language =>
  typeof v === 'string' && (SUPPORTED_LANGUAGES as string[]).includes(v);

async function getStoredLanguage(): Promise<Language | null> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    const saved = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (isSupportedLanguage(saved)) return saved;
  } catch {
    // Native storage unavailable (web preview) – memory only.
  }
  return null;
}

async function setStoredLanguage(lang: Language): Promise<void> {
  try {
    const AsyncStorage = require('@react-native-async-storage/async-storage').default;
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  } catch {}
}

/** First launch: follow the phone's language when we support it. */
function deviceLanguage(): Language {
  try {
    const code = Intl.DateTimeFormat().resolvedOptions().locale.slice(0, 2).toLowerCase();
    if (isSupportedLanguage(code)) return code;
  } catch {}
  return 'en';
}

/** Arabic is right-to-left; React Native applies the direction after a restart. */
function applyDirection(lang: Language, announce: boolean) {
  const rtl = lang === 'ar';
  if (I18nManager.isRTL === rtl) return;
  I18nManager.allowRTL(rtl);
  I18nManager.forceRTL(rtl);
  if (announce) {
    Alert.alert(
      L('Dil değiştirildi', 'Language changed'),
      L(
        'Ekran yönünün güncellenmesi için uygulamayı kapatıp yeniden açın.',
        'Close and reopen the app to update the layout direction.'
      )
    );
  }
}

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<Language>(deviceLanguage);
  const userChoseRef = useRef(false);

  // Keep the L() helper in sync before children render.
  setL10nLanguage(language);

  useEffect(() => {
    getStoredLanguage().then((saved) => {
      if (saved && !userChoseRef.current) {
        setLanguageState(saved);
        applyDirection(saved, false);
      }
    });
  }, []);

  const setLanguage = useCallback((lang: Language) => {
    userChoseRef.current = true;
    setL10nLanguage(lang);
    setLanguageState(lang);
    setStoredLanguage(lang);
    applyDirection(lang, true);
  }, []);

  const applyAccountLanguage = useCallback((lang: Language) => {
    setL10nLanguage(lang);
    setLanguageState(lang);
    setStoredLanguage(lang);
    applyDirection(lang, true);
  }, []);

  const userChoseLanguage = useCallback(() => userChoseRef.current, []);

  const t = useTranslation(language);

  return (
    <LanguageContext.Provider
      value={{ language, setLanguage, changeLanguage: setLanguage, applyAccountLanguage, userChoseLanguage, t }}>
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
