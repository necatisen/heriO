import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';

const TERMS_TR = `
KULLANIM ŞARTLARI

Son güncelleme: Bu uygulama bir sosyal eşleşme ve iletişim platformudur.

1. Hizmetin kapsamı
Uygulamamız, kullanıcıların profil oluşturmasına, diğer kullanıcılarla eşleşmesine ve mesajlaşmasına olanak tanır. Hizmeti yalnızca 18 yaş ve üzeri kullanıcılar kullanabilir.

2. Hesap ve kayıt
Kayıt sırasında verdiğiniz bilgilerin doğru ve güncel olması sizin sorumluluğunuzdadır. Hesabınızı yetkisiz kullanıma karşı korumalısınız.

3. Kullanıcı davranışı
Başkalarının haklarına saygı göstermelisiniz. Taciz, nefret söylemi, spam veya yanıltıcı içerik yasaktır. İhlal durumunda hesabınız kısıtlanabilir veya sonlandırılabilir.

4. Fikri mülkiyet
Yüklediğiniz içeriklerin size ait olduğunu veya kullanım hakkına sahip olduğunuzu kabul edersiniz. Uygulama içi özgün içeriklerimiz koruma altındadır.

5. Ücretler ve iptal
Premium ve kredi satın alımları uygulama mağazası politikalarına tabidir. İptal ve iade koşulları mağaza kurallarına göre uygulanır.

6. Sorumluluk sınırı
Yasada öngörülen zorunluluklar saklı kalmak kaydıyla, hizmet "olduğu gibi" sunulmaktadır.

7. Değişiklikler
Bu şartlarda değişiklik yapma hakkımız saklıdır. Önemli değişiklikler uygulama veya e-posta ile duyurulabilir.

8. İletişim
Sorularınız için: destek@chatapp.com
`;

const TERMS_EN = `
TERMS OF USE

Last updated: This app is a social matching and communication platform.

1. Scope of service
Our app allows users to create profiles, match with other users, and message them. The service may only be used by users aged 18 and over.

2. Account and registration
You are responsible for the accuracy and currency of the information you provide when registering. You must protect your account from unauthorized use.

3. User conduct
You must respect the rights of others. Harassment, hate speech, spam, or misleading content are prohibited. Your account may be restricted or terminated in case of violation.

4. Intellectual property
You confirm that content you upload is yours or that you have the right to use it. Our in-app original content is protected.

5. Fees and cancellation
Premium and credit purchases are subject to app store policies. Cancellation and refund terms apply according to store rules.

6. Limitation of liability
Subject to mandatory provisions of law, the service is provided "as is".

7. Changes
We reserve the right to change these terms. Significant changes may be announced via the app or email.

8. Contact
For questions: support@chatapp.com
`;

export default function TermsScreen() {
  const router = useRouter();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const content = language === 'tr' ? TERMS_TR : TERMS_EN;
  const title = language === 'tr' ? 'Kullanım Şartları' : 'Terms of Use';

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
