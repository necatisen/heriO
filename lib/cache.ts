/**
 * Tiny stale-while-revalidate cache: screens render the last known data instantly
 * from memory/AsyncStorage, then refresh from Supabase in the background.
 */
const memory = new Map<string, unknown>();

function storage() {
  try {
    return require('@react-native-async-storage/async-storage').default as {
      getItem: (k: string) => Promise<string | null>;
      setItem: (k: string, v: string) => Promise<void>;
      multiRemove: (k: string[]) => Promise<void>;
      getAllKeys: () => Promise<readonly string[]>;
    };
  } catch {
    return null;
  }
}

const PREFIX = 'bc_cache:';

/** Synchronous read from the in-memory layer (available after the first read/write this session). */
export function peekCache<T>(key: string): T | undefined {
  return memory.get(key) as T | undefined;
}

export async function readCache<T>(key: string): Promise<T | undefined> {
  if (memory.has(key)) return memory.get(key) as T;
  try {
    const raw = await storage()?.getItem(PREFIX + key);
    if (raw == null) return undefined;
    const value = JSON.parse(raw) as T;
    memory.set(key, value);
    return value;
  } catch {
    return undefined;
  }
}

export function writeCache<T>(key: string, value: T): void {
  memory.set(key, value);
  try {
    storage()?.setItem(PREFIX + key, JSON.stringify(value)).catch(() => {});
  } catch {
    // Storage unavailable (web preview / Expo Go) – memory cache still works.
  }
}

/** Clears everything (call on sign-out so the next user never sees old data). */
export async function clearCache(): Promise<void> {
  memory.clear();
  try {
    const s = storage();
    if (!s) return;
    const keys = (await s.getAllKeys()).filter((k) => k.startsWith(PREFIX));
    if (keys.length) await s.multiRemove([...keys]);
  } catch {}
}
