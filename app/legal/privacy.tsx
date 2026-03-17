import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const PRIVACY_TR = `
GİZLİLİK POLİTİKASI

Son güncelleme: Kişisel verilerinizi nasıl topladığımız, kullandığımız ve koruduğumuzu açıklar.

1. Toplanan veriler
Hesap oluştururken e-posta, kullanıcı adı, doğum tarihi, cinsiyet ve profil bilgilerinizi topluyoruz. Konum verisi (ör. keşfet özelliği) yalnızca izin verirseniz ve uygulama içinde kullanılır. Mesajlar ve eşleşme verileri hizmetin sunulması için işlenir.

2. Verilerin kullanımı
Verileriniz hesabınızı yönetmek, eşleşme ve mesajlaşma hizmetini sunmak, güvenlik ve dolandırıcılık önleme ile yasal yükümlülüklerimizi yerine getirmek için kullanılır.

3. Veri paylaşımı
Kişisel verilerinizi üçüncü taraflara satmıyoruz. Hizmet sağlayıcılarımız (sunucu, analitik vb.) veri işleme sözleşmeleri ile bağlıdır. Yasal zorunluluk durumunda yetkili makamlara bilgi verilebilir.

4. Saklama süresi
Hesabınız aktif olduğu sürece verileriniz saklanır. Hesap silme talebinizde, yasal saklama zorunlulukları hariç veriler silinir veya anonimleştirilir.

5. Haklarınız
Verilerinize erişim, düzeltme, silme ve işlemenin kısıtlanması talebinde bulunabilirsiniz. Şikayetlerinizi veri koruma otoritesine iletebilirsiniz.

6. Güvenlik
Verilerinizi teknik ve idari önlemlerle koruyoruz. İletişim altyapımız şifreli kanallar kullanır.

7. Çocuklar
Hizmetimiz 18 yaş altına yönelik değildir. 18 yaşından küçük kişilere ait bilerek veri toplamıyoruz.

8. İletişim
Gizlilik ile ilgili: destek@chatapp.com
`;

const PRIVACY_EN = `
PRIVACY POLICY

Last updated: This document explains how we collect, use, and protect your personal data.

1. Data we collect
When you create an account we collect email, username, date of birth, gender, and profile information. Location data (e.g. for explore) is used only with your permission and within the app. Messages and matching data are processed to provide the service.

2. How we use data
Your data is used to manage your account, provide matching and messaging, for security and fraud prevention, and to meet our legal obligations.

3. Sharing data
We do not sell your personal data to third parties. Our service providers (hosting, analytics, etc.) are bound by data processing agreements. Information may be disclosed to authorities where required by law.

4. Retention
Your data is retained while your account is active. When you request account deletion, data is deleted or anonymized except where we must retain it by law.

5. Your rights
You may request access, correction, deletion, or restriction of processing of your data. You may lodge a complaint with a data protection authority.

6. Security
We protect your data with technical and organizational measures. Our communications infrastructure uses encrypted channels.

7. Children
Our service is not directed at anyone under 18. We do not knowingly collect data from anyone under 18.

8. Contact
Privacy-related: support@chatapp.com
`;

export default function PrivacyScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const content = language === 'tr' ? PRIVACY_TR : PRIVACY_EN;
  const title = language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy';

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backBtn}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <Text style={[styles.title, { color: theme.text }]}>{title}</Text>
        <View style={styles.backBtn} />
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <Text style={[styles.body, { color: theme.text }]}>{content.trim()}</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  title: { fontSize: 18, fontWeight: '700' },
  scroll: { flex: 1 },
  content: { padding: 20, paddingBottom: 40 },
  body: { fontSize: 14, lineHeight: 24 },
});
