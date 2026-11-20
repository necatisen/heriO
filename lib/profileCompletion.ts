import type { User } from '@supabase/supabase-js';

/**
 * Accounts created through Google never went through the sign-up form, so the profile row was
 * filled with defaults (birth date 2000-01-01, gender "other"). Those users must complete the
 * required fields — and declare they are 18+ — before using the app.
 * Email sign-ups always carry birth_date in user_metadata, so they never need this.
 */
export function needsProfileCompletion(user: User | null | undefined): boolean {
  if (!user) return false;
  const meta = (user.user_metadata ?? {}) as Record<string, unknown>;
  if (meta.profile_completed === true) return false;
  if (typeof meta.birth_date === 'string' && meta.birth_date.length > 0) return false;
  return true;
}
