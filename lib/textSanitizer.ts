const SOCIAL_KEYWORDS = [
  'instagram',
  'insta',
  'ig',
  'whatsapp',
  'wa',
  'telegram',
  'tg',
  'snapchat',
  'snap',
  'tiktok',
  'facebook',
  'fb',
  'twitter',
  'x',
  'discord',
  'youtube',
  'onlyfans',
] as const;

const URL_RE = /\b((https?:\/\/|www\.)[^\s]+)\b/gi;
const EMAIL_RE = /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi;
const PHONE_RE = /(?<!\w)(\+?\d[\d\s().-]{7,}\d)(?!\w)/g;
const HANDLE_RE = /(^|\s)([@＠][a-zA-Z0-9_.]{3,})(?=\s|$|[.,!?:;])/g;

function keywordMentionRegex(): RegExp {
  // matches: "instagram: necati", "ig necati", "telegram @name", "whatsapp +90..."
  return new RegExp(
    String.raw`\b(${SOCIAL_KEYWORDS.join('|')})\b\s*[:\-]?\s*([^\s]{2,})`,
    'gi'
  );
}

export function sanitizeSocialAndContacts(input: string): { text: string; changed: boolean } {
  const raw = String(input ?? '');
  let out = raw;

  const before = out;
  out = out.replace(URL_RE, '***');
  out = out.replace(EMAIL_RE, '***');
  out = out.replace(PHONE_RE, '***');
  out = out.replace(HANDLE_RE, (m, lead) => `${lead}***`);
  out = out.replace(keywordMentionRegex(), '***');

  // also hide standalone keywords (to reduce "come to IG" nudges)
  SOCIAL_KEYWORDS.forEach((k) => {
    const r = new RegExp(String.raw`(\b${k}\b)`, 'gi');
    out = out.replace(r, '***');
  });

  return { text: out, changed: out !== before };
}

export function limitWords(input: string, maxWords: number): { text: string; truncated: boolean; count: number } {
  const raw = String(input ?? '').trim();
  if (!raw) return { text: '', truncated: false, count: 0 };
  const words = raw.split(/\s+/).filter(Boolean);
  if (words.length <= maxWords) return { text: raw, truncated: false, count: words.length };
  return { text: words.slice(0, maxWords).join(' '), truncated: true, count: words.length };
}

