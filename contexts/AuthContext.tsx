import { createContext, useContext, useEffect, useRef, useState } from 'react';
import { AppState, Platform } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { readCache, writeCache, clearCache } from '@/lib/cache';
import { uploadPendingAvatar } from '@/lib/pendingAvatar';

const EMAIL_CONFIRMED_URL = 'https://necatisen.github.io/birthchat/email-confirmed';
import { useLanguage, isSupportedLanguage } from '@/contexts/LanguageContext';

WebBrowser.maybeCompleteAuthSession();

type Profile = {
  id: string;
  full_name: string;
  username: string;
  bio: string;
  photo_url: string | null;
  profile_picture: string | null;
  birth_date: string;
  gender: string;
  country: string;
  city: string | null;
  district: string | null;
  height: number | null;
  weight: number | null;
  religion: string | null;
  alcohol_consumption?: string | null;
  smoking_habit?: string | null;
  children_status?: string | null;
  body_type?: string | null;
  profession: string | null;
  relationship_status: string | null;
  relationship_goal?: string | null;
  education: string | null;
  nationality: string | null;
  languages?: string[];
  latitude?: number | null;
  longitude?: number | null;
  is_verified?: boolean;
  tc_verified: boolean;
  face_verified: boolean;
  last_seen?: string | null;
  /** Verification badge: only show when === 'verified'. Values: unverified | pending | verified | rejected */
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
  preferred_language: string;
  is_online?: boolean;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  profile: Profile | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (
    email: string,
    password: string,
    userData: Partial<Profile>
  ) => Promise<string | null>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  refreshProfile: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const lastPresenceUpdateAtRef = useRef<number>(0);
  const { language, applyAccountLanguage, userChoseLanguage } = useLanguage();
  const languageSyncedForRef = useRef<string | null>(null);

  // Language follows the account: on sign-in the saved language is applied, unless the
  // user just picked one on this device (welcome screen) – then that choice is saved.
  useEffect(() => {
    if (!user?.id || !profile || profile.id !== user.id) return;
    if (languageSyncedForRef.current === user.id) return;
    languageSyncedForRef.current = user.id;
    const saved = profile.preferred_language;
    if (userChoseLanguage() || !isSupportedLanguage(saved)) {
      if (saved !== language) {
        supabase.from('profiles').update({ preferred_language: language }).eq('id', user.id).then(() => {});
        setProfile((p) => (p ? { ...p, preferred_language: language } : p));
      }
    } else if (saved !== language) {
      applyAccountLanguage(saved);
    }
  }, [user?.id, profile, language, applyAccountLanguage, userChoseLanguage]);

  // Later changes (settings) are saved to the account so every device uses them.
  useEffect(() => {
    if (!user?.id || languageSyncedForRef.current !== user.id) return;
    if (profile?.preferred_language === language) return;
    supabase.from('profiles').update({ preferred_language: language }).eq('id', user.id).then(() => {});
    setProfile((p) => (p ? { ...p, preferred_language: language } : p));
  }, [language, user?.id]);

  useEffect(() => {
    if (!user) languageSyncedForRef.current = null;
  }, [user]);

  // Startup must not wait for the network: the session comes from local storage, the
  // profile is shown from cache immediately and refreshed in the background.
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        const uid = session.user.id;
        readCache<Profile>(`profile:${uid}`).then((cached) => {
          if (cached) setProfile((p) => p ?? cached);
          setLoading(false);
        });
        // TOKEN_REFRESHED fires often and never changes the profile.
        if (event !== 'TOKEN_REFRESHED') fetchProfile(uid);
      } else {
        setProfile(null);
        setLoading(false);
        if (event === 'SIGNED_OUT') clearCache();
      }
    });

    // onAuthStateChange always emits INITIAL_SESSION; this only guards a broken stored token.
    supabase.auth.getSession().catch(async (err) => {
      console.warn('Initial session check failed:', (err as any)?.message || err);
      try {
        await supabase.auth.signOut();
      } catch {}
      setSession(null);
      setUser(null);
      setProfile(null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  // App açıkken online, arka plana gidince/kapandığında offline + last_seen güncelle.
  // Böylece sohbet ekranında "Çevrimiçi / Son görülme" doğru davranır.
  useEffect(() => {
    if (!user?.id) return;

    const userId = user.id;
    const setPresence = async (isOnline: boolean) => {
      const now = Date.now();
      // Çok sık state dalgalanmasında gereksiz write'ı azalt.
      if (now - lastPresenceUpdateAtRef.current < 3000) return;
      lastPresenceUpdateAtRef.current = now;

      try {
        await supabase
          .from('profiles')
          .update({ is_online: isOnline, last_seen: new Date().toISOString() })
          .eq('id', userId);
      } catch (e) {
        console.warn('Presence update failed:', e);
      }
    };

    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') setPresence(true);
      else setPresence(false);
    };

    // İlk yüklemede mevcut AppState'e göre ayarla.
    handleAppStateChange(AppState.currentState);

    const sub = AppState.addEventListener('change', handleAppStateChange);
    return () => {
      sub.remove();
      // Provider kapanırken/oturum değişiminde offline yap.
      setPresence(false);
    };
  }, [user?.id]);

  const profileRequestRef = useRef<{ userId: string; promise: Promise<void> } | null>(null);

  // Concurrent calls for the same user share one request.
  const fetchProfile = (userId: string): Promise<void> => {
    if (profileRequestRef.current?.userId === userId) return profileRequestRef.current.promise;
    const promise = (async () => {
      try {
        const { data, error } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
        if (error) throw error;
        setProfile(data);
        if (data) writeCache(`profile:${userId}`, data);
        // Photo picked at sign-up while the email was still unconfirmed → upload it now.
        if (data && !data.profile_picture) {
          uploadPendingAvatar(userId)
            .then((done) => {
              if (!done) return;
              profileRequestRef.current = null;
              return fetchProfile(userId);
            })
            .catch((e) => console.warn('Pending avatar upload failed:', e));
        }
      } catch (error) {
        // Keep the cached profile on network errors instead of blanking the UI.
        console.error('Error fetching profile:', error);
      } finally {
        profileRequestRef.current = null;
        setLoading(false);
      }
    })();
    profileRequestRef.current = { userId, promise };
    return promise;
  };

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (error) throw error;
  };

  const signUp = async (
    email: string,
    password: string,
    userData: Partial<Profile>
  ) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        // Where the email confirmation link lands (must be listed in Supabase → Auth → URL Configuration).
        emailRedirectTo: EMAIL_CONFIRMED_URL,
        data: {
          full_name: userData.full_name || '',
          username: userData.username || '',
          bio: userData.bio || '',
          birth_date: userData.birth_date || '',
          gender: userData.gender || 'other',
          country: userData.country || 'Turkey',
          city: userData.city ?? '',
          district: userData.district ?? '',
          height: userData.height ?? null,
          weight: userData.weight ?? null,
          education: userData.education ?? '',
          profession: userData.profession ?? '',
          body_type: userData.body_type ?? '',
          children_status: userData.children_status ?? '',
          smoking_habit: userData.smoking_habit ?? '',
          alcohol_consumption: userData.alcohol_consumption ?? '',
          preferred_language: userData.preferred_language || 'tr',
          religion: userData.religion ?? '',
          relationship_status: userData.relationship_status ?? '',
          relationship_goal: userData.relationship_goal ?? '',
        },
      },
    });

    if (error) throw error;
    if (!data.user) throw new Error('User creation failed');

    // Profile, credits and subscription are created by DB triggers (handle_new_user, add_initial_credits)
    // so we don't need client-side insert — avoids RLS errors when email confirmation is on.
    return data.user.id;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  };

  const signInWithGoogle = async () => {
    // Web: Supabase handles redirect automatically.
    if (Platform.OS === 'web') {
      const { error } = await supabase.auth.signInWithOAuth({ provider: 'google' });
      if (error) throw error;
      return;
    }

    // Native: open auth session and exchange code for session
    const redirectTo = Linking.createURL('auth/callback');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        skipBrowserRedirect: true,
      },
    });
    if (error) throw error;
    if (!data?.url) throw new Error('OAuth URL missing');

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== 'success' || !result.url) {
      throw new Error('Google sign-in cancelled');
    }

    // PKCE returns ?code=…; older/implicit flows return #access_token=…&refresh_token=…
    const url = new URL(result.url);
    const hash = new URLSearchParams(url.hash.replace(/^#/, ''));
    const param = (k: string) => url.searchParams.get(k) || hash.get(k);
    const err = param('error_description') || param('error');
    if (err) throw new Error(err);

    const code = param('code');
    if (code) {
      const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
      if (exchangeError) throw exchangeError;
      return;
    }
    const access_token = param('access_token');
    const refresh_token = param('refresh_token');
    if (!access_token || !refresh_token) throw new Error('OAuth code missing');
    const { error: setErr } = await supabase.auth.setSession({ access_token, refresh_token });
    if (setErr) throw setErr;
  };

  const resetPassword = async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    if (error) throw error;
  };

  const updatePassword = async (newPassword: string) => {
    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });
    if (error) throw error;
  };

  const refreshProfile = async () => {
    if (user) {
      // Explicit refresh (e.g. after an update) must not reuse an older in-flight request.
      profileRequestRef.current = null;
      await fetchProfile(user.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        profile,
        loading,
        signIn,
        signUp,
        signOut,
        signInWithGoogle,
        resetPassword,
        updatePassword,
        refreshProfile,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
