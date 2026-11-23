/** Large, highlighted sign-up notice: breaking the community rules gets the account banned by the moderation team. */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { ShieldAlert } from 'lucide-react-native';
import { L } from '@/lib/l10n';

export default function RulesNotice() {
  const router = useRouter();
  return (
    <View style={styles.box} accessibilityRole="alert">
      <ShieldAlert size={30} color="#FF4D4F" />
      <Text style={styles.title}>
        {L(
          'Topluluk kurallarını ihlal eden hesaplar yönetim tarafından kalıcı olarak engellenir.',
          'Accounts that break the community rules are permanently banned by the moderation team.'
        )}
      </Text>
      <Text style={styles.text}>
        {L(
          'Taciz, nefret söylemi, cinsel içerik, sahte profil, dolandırıcılık ve 18 yaş altı kullanım yasaktır. Şikâyetler moderatörlerce incelenir.',
          'Harassment, hate speech, sexual content, fake profiles, scams and use by anyone under 18 are not allowed. Reports are reviewed by moderators.'
        )}
      </Text>
      <TouchableOpacity onPress={() => router.push('/legal/terms' as Href)}>
        <Text style={styles.link}>{L('Topluluk kurallarını oku', 'Read the community rules')}</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  box: {
    borderWidth: 2,
    borderColor: '#FF4D4F',
    backgroundColor: 'rgba(255,77,79,0.10)',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    gap: 8,
    marginBottom: 16,
  },
  title: { color: '#FF4D4F', fontSize: 18, fontWeight: '800', textAlign: 'center', lineHeight: 24 },
  text: { color: '#FF8A8C', fontSize: 13, lineHeight: 19, textAlign: 'center' },
  link: { color: '#FF4D4F', fontSize: 14, fontWeight: '800', textDecorationLine: 'underline', marginTop: 2 },
});
