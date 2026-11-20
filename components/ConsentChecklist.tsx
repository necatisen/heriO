import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { Check } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { L } from '@/lib/l10n';
import type { ConsentType } from '@/lib/consents';

type Item = { type: ConsentType; text: string; links: { label: string; href: string }[] };

/** Required sign-up consents, each a separate unticked box (KVKK: consent must be specific and freely given). */
export function signupConsentItems(): Item[] {
  return [
    {
      type: 'terms_privacy',
      text: L(
        '18 yaşından büyük olduğumu beyan eder, Kullanım Koşulları’nı ve Gizlilik Politikası’nı kabul ederim.',
        'I confirm that I am 18 or older and I accept the Terms of Use and the Privacy Policy.'
      ),
      links: [
        { label: L('Kullanım Koşulları', 'Terms of Use'), href: '/legal/terms' },
        { label: L('Gizlilik Politikası', 'Privacy Policy'), href: '/legal/privacy' },
      ],
    },
    {
      type: 'kvkk_notice',
      text: L('KVKK Aydınlatma Metni’ni okudum.', 'I have read the Personal Data Notice (KVKK).'),
      links: [{ label: L('KVKK Aydınlatma Metni', 'Personal Data Notice'), href: '/legal/kvkk' }],
    },
    {
      type: 'transfer_abroad',
      text: L(
        'Hizmetin sunulması için verilerimin yurt dışındaki hizmet sağlayıcılara (Supabase – AB, Google, Expo) aktarılmasına açık rıza veriyorum.',
        'I give my explicit consent to my data being transferred to service providers abroad (Supabase – EU, Google, Expo) to provide the service.'
      ),
      links: [{ label: L('Açık Rıza Metni', 'Explicit Consent'), href: '/legal/consent' }],
    },
  ];
}

export function ConsentChecklist({
  items,
  checked,
  onToggle,
  textColor,
}: {
  items: Item[];
  checked: Partial<Record<ConsentType, boolean>>;
  onToggle: (type: ConsentType) => void;
  textColor?: string;
}) {
  const { theme } = useTheme();
  const router = useRouter();
  const color = textColor ?? theme.text;
  return (
    <View style={styles.wrap}>
      {items.map((it) => {
        const on = !!checked[it.type];
        return (
          <View key={it.type} style={styles.row}>
            <TouchableOpacity
              onPress={() => onToggle(it.type)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: on }}
              style={[styles.box, { borderColor: theme.primary }, on && { backgroundColor: theme.primary }]}>
              {on && <Check size={16} color="#FFFFFF" />}
            </TouchableOpacity>
            <View style={styles.textCol}>
              <Text style={[styles.text, { color }]} onPress={() => onToggle(it.type)}>
                {it.text}
              </Text>
              <View style={styles.links}>
                {it.links.map((l) => (
                  <Text key={l.href} style={[styles.link, { color: theme.primary }]} onPress={() => router.push(l.href as Href)}>
                    {l.label} ›
                  </Text>
                ))}
              </View>
            </View>
          </View>
        );
      })}
    </View>
  );
}

export function allChecked(items: Item[], checked: Partial<Record<ConsentType, boolean>>) {
  return items.every((i) => checked[i.type]);
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4, marginBottom: 14 },
  row: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 12 },
  box: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
    marginTop: 1,
  },
  textCol: { flex: 1 },
  text: { fontSize: 13.5, lineHeight: 19 },
  links: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginTop: 4 },
  link: { fontSize: 13, fontWeight: '600' },
});
