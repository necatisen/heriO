import { Link, Stack } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { L } from '@/lib/l10n';

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: L('Sayfa bulunamadı', 'Page not found') }} />
      <View style={styles.container}>
        <Text style={styles.text}>{L('Bu sayfa mevcut değil.', "This screen doesn't exist.")}</Text>
        <Link href="/" style={styles.link}>
          <Text>{L('Ana sayfaya dön', 'Go to home screen')}</Text>
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  text: { fontSize: 20, fontWeight: '600' },
  link: { marginTop: 15, paddingVertical: 15 },
});
