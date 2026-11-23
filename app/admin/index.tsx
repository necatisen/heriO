/**
 * "Yönetim" (moderators and admins only): open reports, banned users, the action log and (admins) the team.
 */
import { useCallback, useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, TextInput, RefreshControl, ScrollView } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { ArrowLeft, User, ShieldCheck, Mail, X } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import HeartLoader from '@/components/HeartLoader';
import CaseModal from '@/components/admin/CaseModal';
import { L } from '@/lib/l10n';
import {
  evidenceUrls,
  getMyStaffRole,
  loadBans,
  loadCaseFor,
  loadModerationLog,
  loadReportCases,
  loadStaff,
  setStaffRole,
  type BanRow,
  type ModerationAction,
  type ReportCase,
  type StaffRole,
} from '@/lib/staff';
import { actionLabel, formatDateTime } from '@/components/admin/labels';
import { FullScreenModal } from '@/components/FullScreenModal';

type Tab = 'reports' | 'bans' | 'log' | 'team';

export default function AdminScreen() {
  const { theme } = useTheme();
  const { user } = useAuth();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [role, setRole] = useState<StaffRole | null | undefined>(undefined);
  const [tab, setTab] = useState<Tab>('reports');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cases, setCases] = useState<ReportCase[]>([]);
  const [bans, setBans] = useState<BanRow[]>([]);
  const [log, setLog] = useState<ModerationAction[]>([]);
  const [team, setTeam] = useState<Awaited<ReturnType<typeof loadStaff>>>([]);
  const [opened, setOpened] = useState<{ data: ReportCase; banned: boolean } | null>(null);
  const [viewing, setViewing] = useState<string[] | null>(null);
  const [email, setEmail] = useState('');
  const [newRole, setNewRole] = useState<StaffRole>('moderator');

  useEffect(() => {
    getMyStaffRole(user?.id, true).then(setRole);
  }, [user?.id]);

  const load = useCallback(async () => {
    try {
      if (tab === 'reports') setCases(await loadReportCases());
      else if (tab === 'bans') setBans(await loadBans());
      else if (tab === 'log') setLog(await loadModerationLog());
      else setTeam(await loadStaff());
    } catch (e: any) {
      Alert.alert(L('Hata', 'Error'), e?.message || '');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [tab]);

  useEffect(() => {
    if (role) {
      setLoading(true);
      load();
    }
  }, [role, load]);

  if (role === undefined) return <HeartLoader />;
  if (!role) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background, alignItems: 'center', justifyContent: 'center', padding: 24 }]}>
        <Text style={{ color: theme.text, fontSize: 16, textAlign: 'center' }}>{L('Bu bölüm sadece yönetim ekibine açıktır.', 'This area is only for the moderation team.')}</Text>
        <TouchableOpacity onPress={() => router.back()} style={{ marginTop: 16 }}>
          <Text style={{ color: theme.primary, fontWeight: '700' }}>{L('Geri', 'Back')}</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  const tabs: { value: Tab; label: string }[] = [
    { value: 'reports', label: L('Şikâyetler', 'Reports') },
    { value: 'bans', label: L('Banlananlar', 'Banned') },
    { value: 'log', label: L('Kayıt', 'Log') },
    ...(role === 'admin' ? [{ value: 'team' as Tab, label: L('Ekip', 'Team') }] : []),
  ];

  const Avatar = ({ uri }: { uri?: string | null }) =>
    uri ? (
      <Image source={{ uri }} style={styles.avatar} />
    ) : (
      <View style={[styles.avatar, { backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }]}>
        <User size={18} color={theme.primary} />
      </View>
    );

  const openBan = async (b: BanRow) => setOpened({ data: await loadCaseFor(b.user_id), banned: true });

  const addStaff = async () => {
    if (!email.trim()) return;
    try {
      await setStaffRole(email.trim(), newRole);
      setEmail('');
      setTeam(await loadStaff());
    } catch (e: any) {
      Alert.alert(L('Hata', 'Error'), e?.message === 'User not found' ? L('Bu e-postayla kayıtlı kullanıcı yok.', 'No user with this e-mail.') : e?.message || '');
    }
  };

  const removeStaff = (userId: string, name: string) =>
    Alert.alert(L('Yetkiyi kaldır', 'Remove role'), L('{0} yönetim ekibinden çıkarılsın mı?', 'Remove {0} from the team?', [name]), [
      { text: L('Vazgeç', 'Cancel'), style: 'cancel' },
      {
        text: L('Kaldır', 'Remove'),
        style: 'destructive',
        onPress: async () => {
          try {
            await setStaffRole('', null, userId);
            setTeam(await loadStaff());
          } catch (e: any) {
            Alert.alert(L('Hata', 'Error'), e?.message || '');
          }
        },
      },
    ]);

  const empty = (text: string) => (
    <Text style={{ color: theme.textSecondary, textAlign: 'center', marginTop: 40, paddingHorizontal: 24 }}>{text}</Text>
  );

  const refresh = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={() => {
        setRefreshing(true);
        load();
      }}
      tintColor={theme.primary}
    />
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomColor: theme.border }]}>
        <TouchableOpacity onPress={() => router.back()} style={styles.back} accessibilityLabel={L('Geri', 'Back')}>
          <ArrowLeft size={24} color={theme.text} />
        </TouchableOpacity>
        <ShieldCheck size={22} color={theme.primary} />
        <Text style={[styles.title, { color: theme.text }]}>{L('Yönetim', 'Moderation')}</Text>
        <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{role === 'admin' ? 'Admin' : L('Moderatör', 'Moderator')}</Text>
      </View>

      <View style={styles.tabs}>
        {tabs.map((t) => {
          const active = t.value === tab;
          return (
            <TouchableOpacity
              key={t.value}
              onPress={() => {
                setLoading(true);
                setTab(t.value);
              }}
              style={[styles.tab, { backgroundColor: active ? theme.primary : theme.cardBackground, borderColor: active ? theme.primary : theme.border }]}>
              <Text style={{ color: active ? '#FFFFFF' : theme.text, fontWeight: '700', fontSize: 13 }}>{t.label}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {loading ? (
        <HeartLoader />
      ) : tab === 'reports' ? (
        <FlatList
          data={cases}
          keyExtractor={(c) => c.userId}
          refreshControl={refresh}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={empty(L('Açık şikâyet yok. 🎉', 'No open reports. 🎉'))}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => setOpened({ data: item, banned: false })}
              style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Avatar uri={item.user?.profile_picture} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                  {item.user?.full_name || L('Silinmiş kullanıcı', 'Deleted user')}
                </Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }} numberOfLines={1}>
                  {item.reports[0]?.reason} · {formatDateTime(item.lastAt)}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={[styles.badge, { backgroundColor: item.reporters >= 3 ? theme.error : theme.primary }]}>{item.reports.length}</Text>
                {item.blockedBy > 0 ? (
                  <Text style={{ color: theme.textSecondary, fontSize: 11, marginTop: 4 }}>{L('{0} engelleme', '{0} blocks', [item.blockedBy])}</Text>
                ) : null}
              </View>
            </TouchableOpacity>
          )}
        />
      ) : tab === 'bans' ? (
        <FlatList
          data={bans}
          keyExtractor={(b) => b.user_id}
          refreshControl={refresh}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={empty(L('Banlanan kullanıcı yok.', 'No banned users.'))}
          renderItem={({ item }) => {
            const expired = !!item.until && new Date(item.until).getTime() <= Date.now();
            return (
              <TouchableOpacity onPress={() => openBan(item)} style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                <Avatar uri={item.user?.profile_picture} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.name, { color: theme.text }]} numberOfLines={1}>
                    {item.user?.full_name || item.log?.target_name || '?'}
                  </Text>
                  <Text style={{ color: expired ? theme.textSecondary : theme.error, fontSize: 12, fontWeight: '700' }}>
                    {item.until
                      ? expired
                        ? L('Askı bitti ({0})', 'Suspension ended ({0})', [formatDateTime(item.until)])
                        : L('Askıda: {0} tarihine kadar', 'Suspended until {0}', [formatDateTime(item.until)])
                      : L('Kalıcı ban', 'Permanent ban')}
                  </Text>
                  <Text style={{ color: theme.text, fontSize: 13, marginTop: 2 }} numberOfLines={2}>
                    {item.reason}
                  </Text>
                  <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                    {L('Banlayan', 'Banned by')}: {item.log?.actor_name || '?'} · {formatDateTime(item.created_at)}
                  </Text>
                  {item.log?.evidence?.length ? (
                    <TouchableOpacity onPress={async () => setViewing(await evidenceUrls(item.log!.evidence))}>
                      <Text style={{ color: theme.primary, fontSize: 13, fontWeight: '700', marginTop: 4 }}>
                        {L('{0} kanıtı gör', 'View {0} evidence', [item.log.evidence.length])}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </TouchableOpacity>
            );
          }}
        />
      ) : tab === 'log' ? (
        <FlatList
          data={log}
          keyExtractor={(a) => a.id}
          refreshControl={refresh}
          contentContainerStyle={{ padding: 12, gap: 8, paddingBottom: insets.bottom + 24 }}
          ListEmptyComponent={empty(L('Henüz işlem yok.', 'No actions yet.'))}
          renderItem={({ item }) => (
            <TouchableOpacity
              disabled={!item.evidence?.length}
              onPress={async () => setViewing(await evidenceUrls(item.evidence))}
              style={[styles.logRow, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: '800' }}>
                {actionLabel(item.action)} → {item.target_name || '?'}
              </Text>
              <Text style={{ color: theme.text, fontSize: 13, marginTop: 2 }}>{item.reason}</Text>
              {item.note ? <Text style={{ color: theme.textSecondary, fontSize: 13, marginTop: 2 }}>{item.note}</Text> : null}
              <View style={[styles.rowSm, { marginTop: 4 }]}>
                <Text style={{ color: theme.textSecondary, fontSize: 12, flex: 1 }}>
                  {item.actor_name || '?'} · {formatDateTime(item.created_at)}
                  {item.evidence?.length ? ` · ${L('{0} kanıt', '{0} evidence', [item.evidence.length])}` : ''}
                </Text>
                {item.email_sent ? <Mail size={14} color={theme.textSecondary} /> : null}
              </View>
            </TouchableOpacity>
          )}
        />
      ) : (
        <FlatList
          data={team}
          keyExtractor={(m) => m.user_id}
          refreshControl={refresh}
          contentContainerStyle={{ padding: 12, gap: 10, paddingBottom: insets.bottom + 24 }}
          ListHeaderComponent={
            <View style={[styles.addBox, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={{ color: theme.text, fontWeight: '800', fontSize: 15 }}>{L('Ekibe ekle', 'Add to team')}</Text>
              <TextInput
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                placeholder={L('Kullanıcının e-posta adresi', "The user's e-mail address")}
                placeholderTextColor={theme.textSecondary}
                style={[styles.input, { color: theme.text, backgroundColor: theme.inputBackground, borderColor: theme.inputBorder }]}
              />
              <View style={styles.rowSm}>
                {(['moderator', 'admin'] as StaffRole[]).map((r) => (
                  <TouchableOpacity
                    key={r}
                    onPress={() => setNewRole(r)}
                    style={[styles.tab, { backgroundColor: newRole === r ? theme.primary : theme.background, borderColor: newRole === r ? theme.primary : theme.border }]}>
                    <Text style={{ color: newRole === r ? '#FFFFFF' : theme.text, fontWeight: '700', fontSize: 13 }}>
                      {r === 'admin' ? 'Admin' : L('Moderatör', 'Moderator')}
                    </Text>
                  </TouchableOpacity>
                ))}
                <View style={{ flex: 1 }} />
                <TouchableOpacity onPress={addStaff} style={[styles.tab, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                  <Text style={{ color: '#FFFFFF', fontWeight: '800', fontSize: 13 }}>{L('Ekle', 'Add')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Avatar uri={item.user?.profile_picture} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.name, { color: theme.text }]}>{item.user?.full_name || '?'}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12 }}>{item.role === 'admin' ? 'Admin' : L('Moderatör', 'Moderator')}</Text>
              </View>
              {item.user_id !== user?.id ? (
                <TouchableOpacity onPress={() => removeStaff(item.user_id, item.user?.full_name || '?')}>
                  <Text style={{ color: theme.error, fontWeight: '700' }}>{L('Kaldır', 'Remove')}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
          )}
        />
      )}

      <CaseModal
        visible={!!opened}
        data={opened?.data ?? null}
        banned={opened?.banned}
        onClose={() => setOpened(null)}
        onDone={() => {
          setLoading(true);
          load();
        }}
      />
      <FullScreenModal visible={!!viewing} onRequestClose={() => setViewing(null)} animationType="fade" contentStyle={{ flex: 1, backgroundColor: '#000' }}>
        <TouchableOpacity onPress={() => setViewing(null)} style={[styles.back, { position: 'absolute', top: insets.top + 8, right: 8, zIndex: 2 }]}>
          <X size={28} color="#FFFFFF" />
        </TouchableOpacity>
        <ScrollView contentContainerStyle={{ paddingTop: insets.top + 56, gap: 12, padding: 12 }}>
          {(viewing || []).map((uri) => (
            <Image key={uri} source={{ uri }} style={{ width: '100%', aspectRatio: 0.6 }} resizeMode="contain" />
          ))}
        </ScrollView>
      </FullScreenModal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  back: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 20, fontWeight: '800' },
  tabs: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  tab: { paddingHorizontal: 14, paddingVertical: 9, borderRadius: 18, borderWidth: 1 },
  card: { flexDirection: 'row', alignItems: 'center', gap: 12, borderWidth: 1, borderRadius: 16, padding: 12 },
  logRow: { borderWidth: 1, borderRadius: 14, padding: 12 },
  rowSm: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  avatar: { width: 46, height: 46, borderRadius: 23 },
  name: { fontSize: 15, fontWeight: '800' },
  badge: { color: '#FFFFFF', fontWeight: '800', minWidth: 28, textAlign: 'center', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12, overflow: 'hidden' },
  addBox: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 10, marginBottom: 4 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15 },
});
