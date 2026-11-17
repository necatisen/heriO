import { useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import HeartLoader from '@/components/HeartLoader';

/**
 * Target of the Google sign-in deep link (birthchat://auth/callback).
 * The session is set by AuthContext.signInWithGoogle; this screen only avoids
 * a "page not found" flash and returns to the start screen.
 */
export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    const t = setTimeout(() => router.replace('/'), 400);
    return () => clearTimeout(t);
  }, [router]);
  return (
    <View style={styles.c}>
      <HeartLoader />
    </View>
  );
}

const styles = StyleSheet.create({ c: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' } });
