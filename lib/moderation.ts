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

export function isSpam(text: string, recentMessages: string[]): boolean {
  const trimmed = text.trim().toLowerCase();
  if (!trimmed) return false;
  const sameCount = recentMessages.filter(
    (msg) => msg.trim().toLowerCase() === trimmed
  ).length;
  return sameCount >= 2;
}

