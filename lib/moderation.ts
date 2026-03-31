const badWords = [
  'amk',
  'aq',
  'siktir',
  'orospu',
  'piç',
  'salak',
  'aptal',
  'fuck',
  'shit',
  'bitch',
  'asshole',
];

export function containsBadWord(text: string): boolean {
  const lower = text.toLowerCase();
  return badWords.some((w) => lower.includes(w));
}

export function maskBadWords(text: string): { text: string; changed: boolean } {
  let out = String(text ?? '');
  const before = out;

  // Replace each bad word, preferring boundary-like matches to avoid false positives.
  for (const w of badWords) {
    const escaped = w.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(String.raw`(^|[^a-zA-Z0-9_])(${escaped})(?=[^a-zA-Z0-9_]|$)`, 'gi');
    out = out.replace(re, (_m, lead) => `${lead}***`);
  }

  return { text: out, changed: out !== before };
}

export function isSpam(text: string, recentMessages: string[]): boolean {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return false;
  const sameCount = recentMessages.filter(
    (msg) => msg.trim().toLowerCase() === trimmed
  ).length;
  return sameCount >= 2;
}

