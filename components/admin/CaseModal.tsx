/**
 * One person's moderation case: reports, blocks, past actions, and the action form
 * (warn / suspend / ban / unban / dismiss) with reason, note and evidence screenshots.
 */
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Image, TextInput, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { X, User, Plus, Trash2, ShieldAlert } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { FullScreenModal } from '@/components/FullScreenModal';
import ProfileModal from '@/components/ProfileModal';
import VerifiedBadge from '@/components/VerifiedBadge';
import { supabase } from '@/lib/supabase';
import { L } from '@/lib/l10n';
import { actOnUser, evidenceUrls, uploadEvidence, type ModerationAction, type ReportCase } from '@/lib/staff';
import { actionLabel, blockReasonLabel, formatDateTime, MOD_REASONS } from '@/components/admin/labels';

type Kind = 'warn' | 'suspend' | 'ban' | 'unban' | 'dismiss';

export default function CaseModal({
  visible,
  data,
  banned,
  onClose,
  onDone,
}: {
  visible: boolean;
  data: ReportCase | null;
  /** The person currently has an active ban/suspension. */
  banned?: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const [kind, setKind] = useState<Kind>('warn');
  const [days, setDays] = useState(7);
  const [reason, setReason] = useState('');
  const [note, setNote] = useState('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<any | null>(null);
  const [viewing, setViewing] = useState<string[] | null>(null);

  useEffect(() => {
    if (!visible) return;
    setKind(banned ? 'unban' : 'warn');
    setDays(7);
    setReason('');
    setNote('');
    setPhotos([]);
  }, [visible, banned, data?.userId]);

  if (!data) return null;
  const u = data.user;
  const needsEvidence = kind === 'suspend' || kind === 'ban';

  const kinds: { value: Kind; label: string; danger?: boolean }[] = banned
    ? [{ value: 'unban', label: L('Banı kaldır', 'Lift ban') }]
    : [
        { value: 'warn', label: L('Uyarı', 'Warning') },
        { value: 'suspend', label: L('Askıya al', 'Suspend'), danger: true },
        { value: 'ban', label: L('Kalıcı ban', 'Permanent ban'), danger: true },
        { value: 'dismiss', label: L('Şikâyeti kapat', 'Dismiss reports') },
      ];

  const addPhoto = async () => {
    const res = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.9, allowsMultipleSelection: true, selectionLimit: 5 });
    if (res.canceled) return;
    setPhotos((prev) => [...prev, ...res.assets.map((a) => a.uri)].slice(0, 10));
  };

  const openProfile = async () => {
    const { data: p } = await supabase.from('profiles').select('*').eq('id', data.userId).maybeSingle();
    if (p) setProfile(p);
  };

  const submit = async () => {
    if (!reason.trim()) {
      Alert.alert(L('Eksik bilgi', 'Missing information'), L('Bir neden seç veya yaz.', 'Pick or write a reason.'));
      return;
    }
    if (needsEvidence && photos.length === 0) {
      Alert.alert(L('Kanıt gerekli', 'Evidence required'), L('Askı ve ban için en az bir ekran görüntüsü ekle.', 'Add at least one screenshot to suspend or ban.'));
      return;
    }
    const label = kinds.find((k) => k.value === kind)?.label ?? kind;
    Alert.alert(label, L('{0} için bu işlem uygulansın mı?', 'Apply this to {0}?', [u?.full_name || '?']), [
      { text: L('Vazgeç', 'Cancel'), style: 'cancel' },
      {
        text: L('Uygula', 'Apply'),
        style: needsEvidence ? 'destructive' : 'default',
        onPress: async () => {
          setSaving(true);
          try {
            const evidence: string[] = [];
            for (const uri of photos) evidence.push(await uploadEvidence(data.userId, uri));
            const res = await actOnUser({ targetId: data.userId, kind, reason: reason.trim(), note: note.trim(), evidence, days });
            const mail =
              kind === 'warn' || kind === 'suspend' || kind === 'ban'
                ? res.email_sent
                  ? L('Kişiye e-posta gönderildi.', 'An e-mail was sent to the person.')
                  : L('E-posta gönderilemedi (SMTP ayarı eksik olabilir).', 'The e-mail could not be sent (SMTP may not be set up).')
                : '';
            Alert.alert(L('Tamamlandı', 'Done'), [L('İşlem kaydedildi.', 'The action was logged.'), mail].filter(Boolean).join('\n'));
            onDone();
            onClose();
          } catch (e: any) {
            Alert.alert(L('Hata', 'Error'), e?.message || L('İşlem yapılamadı.', 'Something went wrong.'));
          } finally {
            setSaving(false);
          }
        },
      },
    ]);
  };

  const showEvidence = async (a: ModerationAction) => setViewing(await evidenceUrls(a.evidence));

  return (
    <FullScreenModal visible={visible} onRequestClose={onClose} animationType="slide" contentStyle={{ flex: 1, backgroundColor: theme.background }}>
      <View style={[styles.header, { paddingTop: insets.top + 10, borderBottomColor: theme.border, backgroundColor: theme.cardBackground }]}>
        <ShieldAlert size={22} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]} numberOfLines={1}>
          {L('Vaka', 'Case')}: {u?.full_name || L('Silinmiş kullanıcı', 'Deleted user')}
        </Text>
        <TouchableOpacity onPress={onClose} style={styles.close} accessibilityLabel={L('Kapat', 'Close')}>
          <X size={24} color={theme.text} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: insets.bottom + 40 }} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={openProfile} style={[styles.card, styles.row, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
          {u?.profile_picture ? (
            <Image source={{ uri: u.profile_picture }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, { backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
              <User size={24} color={theme.primary} />
            </View>
          )}
          <View style={{ flex: 1 }}>
            <View style={styles.row}>
              <Text style={[styles.name, { color: theme.text }]}>{u?.full_name || '?'}</Text>
              {u?.verification_status === 'verified' && <VerifiedBadge size={14} verified />}
            </View>
            <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{u?.city || ''}</Text>
            <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700', marginTop: 4 }}>{L('Profili aç', 'Open profile')}</Text>
          </View>
        </TouchableOpacity>

        <View style={styles.stats}>
          <Stat n={data.reports.length} label={L('şikâyet', 'reports')} />
          <Stat n={data.reporters} label={L('şikâyet eden', 'reporters')} />
          <Stat n={data.blockedBy} label={L('engelleyen', 'blocked by')} />
        </View>

        {data.blockedBy > 0 ? (
          <Text style={{ color: theme.textSecondary, fontSize: 13 }}>
            {L('Engelleme nedenleri', 'Block reasons')}:{' '}
            {Object.entries(data.blockReasons)
              .map(([k, n]) => `${blockReasonLabel(k)} (${n})`)
              .join(', ')}
          </Text>
        ) : null}

        <Text style={[styles.section, { color: theme.text }]}>{L('Şikâyetler', 'Reports')}</Text>
        {data.reports.length === 0 ? <Text style={{ color: theme.textSecondary }}>{L('Şikâyet yok.', 'No reports.')}</Text> : null}
        {data.reports.map((r) => (
          <View key={r.id} style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
            <Text style={{ color: theme.text, fontWeight: '700' }}>{r.reason}</Text>
            <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
              {r.reporter?.full_name || '?'} · {formatDateTime(r.created_at)}
              {r.status === 'resolved' ? ` · ${L('kapandı', 'closed')}` : ''}
            </Text>
            {r.context?.source === 'block' ? (
              <Text style={{ color: theme.error, fontSize: 12, fontWeight: '700', marginTop: 4 }}>
                🚫 {L('Bu kişi şikâyet ederken aynı zamanda engelledi', 'The reporter also blocked this person')}
              </Text>
            ) : null}
            {r.context?.excerpt ? (
              <View style={[styles.quote, { borderLeftColor: theme.primary, backgroundColor: theme.inputBackground }]}>
                <Text style={{ color: theme.text, fontSize: 14 }}>"{r.context.excerpt}"</Text>
                <Text style={{ color: r.context.message_verified === false ? theme.error : theme.textSecondary, fontSize: 11, marginTop: 4 }}>
                  {r.context.message_verified === false
                    ? L('Uyarı: bu mesaj bu kişiden gelmiş görünmüyor.', 'Warning: this message does not seem to come from this person.')
                    : L('Şikâyet edilen mesaj', 'Reported message')}
                </Text>
              </View>
            ) : null}
            {r.context?.plan_title ? (
              <View style={[styles.quote, { borderLeftColor: theme.primary, backgroundColor: theme.inputBackground }]}>
                <Text style={{ color: theme.text, fontSize: 14 }}>📅 {r.context.plan_title}</Text>
              </View>
            ) : null}
          </View>
        ))}

        {data.previous.length > 0 ? (
          <>
            <Text style={[styles.section, { color: theme.text }]}>{L('Geçmiş işlemler', 'Past actions')}</Text>
            {data.previous.map((a) => (
              <TouchableOpacity
                key={a.id}
                disabled={!a.evidence?.length}
                onPress={() => showEvidence(a)}
                style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Text style={{ color: theme.text, fontWeight: '700' }}>
                  {actionLabel(a.action)} · {a.reason}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {a.actor_name || '?'} · {formatDateTime(a.created_at)}
                  {a.evidence?.length ? ` · ${L('{0} kanıt', '{0} evidence', [a.evidence.length])}` : ''}
                </Text>
                {a.note ? <Text style={{ color: theme.text, fontSize: 13, marginTop: 4 }}>{a.note}</Text> : null}
              </TouchableOpacity>
            ))}
          </>
        ) : null}

        <Text style={[styles.section, { color: theme.text }]}>{L('İşlem', 'Action')}</Text>
        <View style={styles.wrap}>
          {kinds.map((k) => {
            const active = k.value === kind;
            const color = k.danger ? theme.error : theme.primary;
            return (
              <TouchableOpacity
                key={k.value}
                onPress={() => setKind(k.value)}
                style={[styles.chip, { borderColor: active ? color : theme.border, backgroundColor: active ? color + '22' : theme.cardBackground }]}>
                <Text style={{ color: active ? color : theme.text, fontWeight: active ? '800' : '500' }}>{k.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {kind === 'suspend' ? (
          <View style={styles.wrap}>
            {[1, 7, 30].map((d) => (
              <TouchableOpacity
                key={d}
                onPress={() => setDays(d)}
                style={[styles.chip, { borderColor: d === days ? theme.primary : theme.border, backgroundColor: d === days ? theme.primaryLight : theme.cardBackground }]}>
                <Text style={{ color: d === days ? theme.primary : theme.text, fontWeight: d === days ? '800' : '500' }}>{L('{0} gün', '{0} days', [d])}</Text>
              </TouchableOpacity>
            ))}
          </View>
        ) : null}

        <Text style={[styles.label, { color: theme.text }]}>{L('Neden', 'Reason')}</Text>
        <View style={styles.wrap}>
          {MOD_REASONS.map(([tr, en]) => {
            const v = L(tr, en);
            const active = reason === v;
            return (
              <TouchableOpacity
                key={tr}
                onPress={() => setReason(v)}
                style={[styles.chipSm, { borderColor: active ? theme.primary : theme.border, backgroundColor: active ? theme.primaryLight : theme.cardBackground }]}>
                <Text style={{ color: active ? theme.primary : theme.text, fontSize: 13, fontWeight: active ? '700' : '500' }}>{v}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
        <TextInput
          value={reason}
          onChangeText={setReason}
          maxLength={200}
          placeholder={L('Neden (kişiye e-postada gösterilir)', 'Reason (shown to the person in the e-mail)')}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
        />
        <TextInput
          value={note}
          onChangeText={setNote}
          maxLength={1000}
          multiline
          placeholder={L('İç not (sadece yönetim görür)', 'Internal note (staff only)')}
          placeholderTextColor={theme.textSecondary}
          style={[styles.input, { minHeight: 70, textAlignVertical: 'top', color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
        />

        <Text style={[styles.label, { color: theme.text }]}>
          {L('Kanıtlar', 'Evidence')} {needsEvidence ? L('(zorunlu)', '(required)') : L('(isteğe bağlı)', '(optional)')}
        </Text>
        <View style={styles.wrap}>
          {photos.map((p, i) => (
            <View key={p + i}>
              <Image source={{ uri: p }} style={styles.thumb} />
              <TouchableOpacity onPress={() => setPhotos((prev) => prev.filter((_, j) => j !== i))} style={[styles.thumbX, { backgroundColor: theme.error }]}>
                <Trash2 size={12} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
          ))}
          {photos.length < 10 ? (
            <TouchableOpacity onPress={addPhoto} style={[styles.thumb, styles.addThumb, { borderColor: theme.border }]}>
              <Plus size={22} color={theme.textSecondary} />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          disabled={saving}
          onPress={submit}
          style={[styles.submit, { backgroundColor: needsEvidence ? theme.error : theme.primary, opacity: saving ? 0.6 : 1 }]}>
          {saving ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.submitText}>{L('Uygula', 'Apply')}</Text>}
        </TouchableOpacity>
      </ScrollView>

      <ProfileModal visible={!!profile} profile={profile} onClose={() => setProfile(null)} showActionButtons={false} allowDirectChat={false} />
      <FullScreenModal visible={!!viewing} onRequestClose={() => setViewing(null)} animationType="fade" contentStyle={{ flex: 1, backgroundColor: '#000' }}>
        <TouchableOpacity onPress={() => setViewing(null)} style={[styles.close, { position: 'absolute', top: insets.top + 8, right: 8, zIndex: 2 }]}>
          <X size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, gap: 12, padding: 12 }}>
          {(viewing || []).map((uri) => (
            <Image key={uri} source={{ uri }} style={{ width: '100%', aspectRatio: 0.6 }} resizeMode="contain" />
          ))}
        </ScrollView>
      </FullScreenModal>
    </FullScreenModal>
  );

  function Stat({ n, label }: { n: number; label: string }) {
    return (
      <View style={[styles.stat, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Text style={{ color: theme.text, fontSize: 22, fontWeight: '800' }}>{n}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{label}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  title: { flex: 1, fontSize: 18, fontWeight: '800' },
  close: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  card: { borderWidth: 1, borderRadius: 14, padding: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: { width: 56, height: 56, borderRadius: 28 },
  name: { fontSize: 17, fontWeight: '800' },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderWidth: 1, borderRadius: 14, padding: 10, alignItems: 'center' },
  section: { fontSize: 16, fontWeight: '800', marginTop: 8 },
  label: { fontSize: 14, fontWeight: '700', marginTop: 4 },
  quote: { borderLeftWidth: 3, padding: 10, borderRadius: 8, marginTop: 8 },
  wrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: 18, borderWidth: 1.5 },
  chipSm: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 16, borderWidth: 1 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
  thumb: { width: 76, height: 76, borderRadius: 10 },
  addThumb: { borderWidth: 1.5, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center' },
  thumbX: { position: 'absolute', top: 4, right: 4, width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  submit: { height: 54, borderRadius: 27, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  submitText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
