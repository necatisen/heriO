/**
 * Blocks the app with an "update required" screen when this build is older than
 * app_config.android_min_version_code. Checked at launch and whenever the app returns to foreground.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { AppState, BackHandler, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { BRAND } from '@/lib/brand';
import { L } from '@/lib/l10n';
import { useLanguage } from '@/contexts/LanguageContext';
import { isUpdateRequired, openStoreListing } from '@/lib/appVersion';

export function ForceUpdateGate({ children }: { children: React.ReactNode }) {
  useLanguage(); // re-render when the language changes
  const [required, setRequired] = useState(false);

  const check = useCallback(async () => {
    setRequired(await isUpdateRequired());
  }, []);

  useEffect(() => {
    void check();
    const sub = AppState.addEventListener('change', (s) => {
      if (s === 'active') void check();
    });
    return () => sub.remove();
  }, [check]);

  // Android back button must not dismiss the blocking screen.
  useEffect(() => {
    if (!required) return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => true);
    return () => sub.remove();
  }, [required]);

  if (!required) return <>{children}</>;

  return (
    <LinearGradient colors={[...BRAND.night]} style={styles.root}>
      <View style={styles.card}>
        <Text style={styles.icon}>⬆️</Text>
        <Text style={styles.title}>{L('Güncelleme gerekli', 'Update required')}</Text>
        <Text style={styles.body}>
          {L(
            'Birthchat\'in yeni bir sürümü var. Devam etmek için lütfen uygulamayı Google Play\'den güncelleyin.',
            'A new version of Birthchat is available. Please update the app on Google Play to continue.'
          )}
        </Text>
        <TouchableOpacity activeOpacity={0.85} onPress={() => void openStoreListing()}>
          <LinearGradient colors={[...BRAND.gradient]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.button}>
            <Text style={styles.buttonText}>{L('Uygulamayı güncelle', 'Update app')}</Text>
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { width: '100%', maxWidth: 420, alignItems: 'center' },
  icon: { fontSize: 56, marginBottom: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', textAlign: 'center', marginBottom: 12 },
  body: { color: 'rgba(255,255,255,0.8)', fontSize: 16, lineHeight: 23, textAlign: 'center', marginBottom: 28 },
  button: { paddingVertical: 15, paddingHorizontal: 36, borderRadius: 28 },
  buttonText: { color: '#fff', fontSize: 17, fontWeight: '700' },
});
