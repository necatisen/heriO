import { createContext, useContext, useEffect, useState } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

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
  education: string | null;
  nationality: string | null;
  languages?: string[];
  latitude?: number | null;
  longitude?: number | null;
  is_verified?: boolean;
  tc_verified: boolean;
  face_verified: boolean;
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log('Initial session check:', session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setLoading(false);
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log('Auth state changed:', _event, session?.user?.email);
      setSession(session);
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchProfile = async (userId: string) => {
    try {
      console.log('Fetching profile for user:', userId);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Profile fetch error:', error);
        throw error;
      }

      console.log('Profile data:', data);
      setProfile(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
      setProfile(null);
    } finally {
      setLoading(false);
    }
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
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    if (error) throw error;
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
