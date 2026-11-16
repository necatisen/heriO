/**
 * App-wide translations for UI text.
 *
 * Source strings are written in Turkish + English directly in the code:
 *   L('Mesajlar', 'Messages')
 *   L('{0} okunmamış mesaj', '{0} unread', [count])
 * Other languages are looked up by the Turkish text in lib/locales/<lang>.json,
 * falling back to English. The current language is set by LanguageProvider.
 *
 * Run `node scripts/i18n-check.cjs` to verify every L() string is translated.
 */
import type { Language } from '@/lib/i18n';
import ru from '@/lib/locales/ru.json';
import ar from '@/lib/locales/ar.json';
import de from '@/lib/locales/de.json';
import fr from '@/lib/locales/fr.json';
import es from '@/lib/locales/es.json';

const DICTS: Partial<Record<Language, Record<string, string>>> = { ru, ar, de, fr, es };

let current: Language = 'tr';

export function setL10nLanguage(lang: Language) {
  current = lang;
}

export function getL10nLanguage(): Language {
  return current;
}

function fill(s: string, vars?: readonly unknown[]): string {
  if (!vars || vars.length === 0) return s;
  return s.replace(/\{(\d+)\}/g, (m, i) => (vars[Number(i)] !== undefined ? String(vars[Number(i)]) : m));
}

/** Translate a UI string. `tr` doubles as the lookup key for the other languages. */
export function L(tr: string, en: string, vars?: readonly unknown[]): string {
  const lang = current;
  const s = lang === 'tr' ? tr : lang === 'en' ? en : DICTS[lang]?.[tr] ?? en;
  return fill(s, vars);
}

/** Same as L() but for an explicit language (e.g. text stored for another user). */
export function Lfor(lang: string | null | undefined, tr: string, en: string, vars?: readonly unknown[]): string {
  const l = (lang || 'en') as Language;
  const s = l === 'tr' ? tr : l === 'en' ? en : DICTS[l]?.[tr] ?? en;
  return fill(s, vars);
}

/** BCP-47 locale for Intl / date formatting. */
export function localeTag(lang: Language = current): string {
  return { tr: 'tr-TR', en: 'en-US', ru: 'ru-RU', ar: 'ar', de: 'de-DE', fr: 'fr-FR', es: 'es-ES' }[lang] ?? 'en-US';
}
