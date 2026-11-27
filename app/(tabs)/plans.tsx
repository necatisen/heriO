/**
 * "Plan ile tanış" tab: upcoming plans of verified people nearby, filters, join requests,
 * and the user's own plans with the requests they received.
 */
import { useCallback, useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Plus, User, MoreVertical, Clock, MapPin, CalendarHeart, Pencil } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useAuth } from '@/contexts/AuthContext';
import HeroFade from '@/components/HeroFade';
import HeartLoader from '@/components/HeartLoader';
import VerifiedBadge from '@/components/VerifiedBadge';
import ProfileModal from '@/components/ProfileModal';
import CreatePlanModal from '@/components/CreatePlanModal';
import ChoiceSheet from '@/components/ChoiceSheet';
import { supabase } from '@/lib/supabase';
import { compatibilityScore } from '@/lib/compatibility';
import { loadProfileExtras } from '@/components/ProfileExtras';
import { L } from '@/lib/l10n';
import {
  PLAN_CATEGORIES,
  categoryLabel,
  formatPlanTime,
  isToday,
  isWeekend,
  loadPlans,
  requestJoin,
  withdrawJoin,
  acceptJoin,
  declineJoin,
  cancelPlan,
  reportPlan,
  type Plan,
  type PlanJoin,
} from '@/lib/plans';

type Filter = 'near' | 'today' | 'weekend' | 'interests';

const ageOf = (d: string | null | undefined) => {
  if (!d) return '';
  const b = new Date(d);
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a--;
  return String(a);
};

export default function PlansScreen() {
  const { theme } = useTheme();
  const { user, profile } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<'feed' | 'mine'>('feed');
  const [filters, setFilters] = useState<Set<Filter>>(() => new Set());
  const [feed, setFeed] = useState<Plan[]>([]);
  const [mine, setMine] = useState<Plan[]>([]);
  const [myInterests, setMyInterests] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [opened, setOpened] = useState<any | null>(null);
  const [reporting, setReporting] = useState<Plan | null>(null);

  const load = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [res, extras] = await Promise.all([loadPlans(user.id), loadProfileExtras(user.id)]);
      setFeed(res.feed);
      setMine(res.mine);
      setMyInterests(extras.interests);
      setUnavailable(false);
    } catch (e) {
      console.warn('plans load failed', e);
      setUnavailable(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const toggle = (f: Filter) =>
    setFilters((prev) => {
      const next = new Set(prev);
      next.has(f) ? next.delete(f) : next.add(f);
      return next;
    });

  const shown = useMemo(() => {
    const myCity = (profile?.city ?? '').trim().toLocaleLowerCase('tr');
    let list = feed;
    if (filters.has('near')) list = list.filter((p) => myCity && (p.city ?? '').trim().toLocaleLowerCase('tr') === myCity);
    if (filters.has('today')) list = list.filter((p) => isToday(p.starts_at));
    if (filters.has('weekend')) list = list.filter((p) => isWeekend(p.starts_at));
    if (filters.has('interests')) {
      list = list.filter((p) => {
        const cat = PLAN_CATEGORIES.find((c) => c.value === p.category);
        return !!cat && cat.interests.some((i) => myInterests.includes(i));
      });
    }
    // Same city first, then by time.
    return [...list].sort((a, b) => {
      const sa = myCity && (a.city ?? '').trim().toLocaleLowerCase('tr') === myCity ? 0 : 1;
      const sb = myCity && (b.city ?? '').trim().toLocaleLowerCase('tr') === myCity ? 0 : 1;
      return sa - sb || new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime();
    });
  }, [feed, filters, profile?.city, myInterests]);

  const pendingCount = mine.reduce((n, p) => n + (p.joins?.filter((j) => j.status === 'pending').length ?? 0), 0);

  const onJoin = async (p: Plan) => {
    if (!user?.id) return;
    setBusyId(p.id);
    try {
      if (p.myJoin) await withdrawJoin(p.myJoin.id);
      else await requestJoin(p, user.id, profile?.full_name || '');
      await load();
    } catch (e: any) {
      Alert.alert(L('Hata', 'Error'), e?.message || L('İşlem yapılamadı.', 'Something went wrong.'));
    } finally {
      setBusyId(null);
    }
  };

  const onAccept = async (p: Plan, j: PlanJoin) => {
    if (!user?.id) return;
    setBusyId(j.id);
    try {
      const sessionId = await acceptJoin(p, j, user.id, profile?.full_name || '');
      await load();
      Alert.alert(
        L('Kabul edildi', 'Accepted'),
        L('{0} ile sohbet açıldı. Buluşmayı konuşabilirsiniz.', 'A chat with {0} is open. You can plan the meetup.', [j.user?.full_name || '']),
        [
          { text: L('Sonra', 'Later'), style: 'cancel' },
          ...(sessionId
            ? [{ text: L('Sohbete git', 'Open chat'), onPress: () => router.push(`/conversation/${sessionId}?friendId=${j.user_id}` as any) }]
            : []),
        ]
      );
    } catch (e: any) {
      Alert.alert(L('Hata', 'Error'), e?.message || L('İşlem yapılamadı.', 'Something went wrong.'));
    } finally {
      setBusyId(null);
    }
  };

  const onDecline = async (j: PlanJoin) => {
    setBusyId(j.id);
    try {
      await declineJoin(j.id);
      await load();
    } catch (e: any) {
      Alert.alert(L('Hata', 'Error'), e?.message || L('İşlem yapılamadı.', 'Something went wrong.'));
    } finally {
      setBusyId(null);
    }
  };

  const onCancelPlan = (p: Plan) =>
    Alert.alert(L('Planı iptal et', 'Cancel plan'), L('Bu plan artık kimseye gösterilmeyecek.', 'This plan will no longer be shown to anyone.'), [
      { text: L('Vazgeç', 'Cancel'), style: 'cancel' },
      {
        text: L('İptal et', 'Cancel plan'),
        style: 'destructive',
        onPress: async () => {
          try {
            await cancelPlan(p.id);
            await load();
          } catch (e: any) {
            Alert.alert(L('Hata', 'Error'), e?.message || '');
          }
        },
      },
    ]);

  const onMore = (p: Plan) => setReporting(p);

  const REPORT_REASONS: [string, string][] = [
    ['Uygunsuz içerik', 'Inappropriate content'],
    ['Spam / reklam', 'Spam / advertising'],
    ['Sahte profil', 'Fake profile'],
    ['Güvensiz buluşma', 'Unsafe meetup'],
  ];

  const submitReport = async (p: Plan, reasonEn: string) => {
    if (!user?.id) return;
    try {
      await reportPlan(p, user.id, reasonEn);
      setFeed((prev) => prev.filter((x) => x.id !== p.id));
      Alert.alert(L('Teşekkürler', 'Thank you'), L('Şikâyetiniz alındı. İncelenecektir.', 'Your report has been received and will be reviewed.'));
    } catch (e: any) {
      Alert.alert(L('Hata', 'Error'), e?.message || '');
    }
  };

  const openOwner = async (userId: string) => {
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).maybeSingle();
    if (data) setOpened(data);
  };

  const Avatar = ({ uri, size = 42 }: { uri?: string | null; size?: number }) =>
    uri ? (
      <Image source={{ uri }} style={{ width: size, height: size, borderRadius: size / 2 }} />
    ) : (
      <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: theme.primaryLight, alignItems: 'center', justifyContent: 'center' }}>
        <User size={size * 0.5} color={theme.primary} />
      </View>
    );

  const FeedCard = ({ p }: { p: Plan }) => {
    const o = p.owner!;
    const score = compatibilityScore(profile as any, o as any);
    const pending = p.myJoin?.status === 'pending';
    const accepted = p.myJoin?.status === 'accepted';
    const declined = p.myJoin?.status === 'declined';
    return (
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <View style={styles.ownerRow}>
          <TouchableOpacity onPress={() => openOwner(o.id)} style={styles.ownerTap} accessibilityLabel={o.full_name}>
            <Avatar uri={o.profile_picture} />
            <View style={{ flex: 1 }}>
              <View style={styles.nameRow}>
                <Text style={[styles.ownerName, { color: theme.text }]} numberOfLines={1}>
                  {o.full_name}, {ageOf(o.birth_date)}
                </Text>
                {o.verification_status === 'verified' && <VerifiedBadge size={16} verified />}
              </View>
              <Text style={[styles.meta, { color: theme.textSecondary }]} numberOfLines={1}>
                {[o.city, score != null ? L('%{0} uyum', '{0}% match', [score]) : null].filter(Boolean).join(' · ')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => onMore(p)} style={styles.more} accessibilityLabel={L('Planı şikâyet et', 'Report plan')}>
            <MoreVertical size={20} color={theme.textSecondary} />
          </TouchableOpacity>
        </View>

        <Text style={[styles.category, { color: theme.primary }]}>{categoryLabel(p.category)}</Text>
        <Text style={[styles.planTitle, { color: theme.text }]}>{p.title}</Text>
        <View style={styles.whenRow}>
          <Clock size={14} color={theme.textSecondary} />
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {formatPlanTime(p.starts_at)}
            {p.edited_at ? ` · ${L('düzenlendi', 'edited')}` : ''}
          </Text>
          {(p.place || p.city) && (
            <>
              <MapPin size={14} color={theme.textSecondary} style={{ marginLeft: 8 }} />
              <Text style={[styles.meta, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
                {[p.place, p.city].filter(Boolean).join(', ')}
              </Text>
            </>
          )}
        </View>

        <View style={styles.footer}>
          <View />{/* other people's requests are private, so no count is shown here */}
          {accepted ? (
            <View style={[styles.statusPill, { backgroundColor: theme.primaryLight }]}>
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>{L('Kabul edildin', 'You are in')}</Text>
            </View>
          ) : declined ? (
            <View style={[styles.statusPill, { backgroundColor: theme.inputBackground }]}>
              <Text style={{ color: theme.textSecondary, fontWeight: '600', fontSize: 13 }}>{L('Bu sefer olmadı', 'Not this time')}</Text>
            </View>
          ) : pending ? (
            <TouchableOpacity
              disabled={busyId === p.id}
              onPress={() => onJoin(p)}
              style={[styles.outlineBtn, { borderColor: theme.border }]}>
              <Text style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 13 }}>{L('İstek gönderildi · Geri al', 'Requested · Undo')}</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity disabled={busyId === p.id} onPress={() => onJoin(p)} style={{ opacity: busyId === p.id ? 0.6 : 1 }}>
              <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.joinBtn}>
                <Text style={[styles.joinText, { color: theme.onGradient }]}>{L('Katılırım', "I'm in")}</Text>
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const MyCard = ({ p }: { p: Plan }) => {
    const past = new Date(p.starts_at).getTime() < Date.now();
    const requests = (p.joins ?? []).filter((j) => j.status !== 'declined');
    return (
      <View style={[styles.card, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
        <Text style={[styles.category, { color: theme.primary }]}>{categoryLabel(p.category)}</Text>
        <Text style={[styles.planTitle, { color: theme.text }]}>{p.title}</Text>
        <View style={styles.whenRow}>
          <Clock size={14} color={theme.textSecondary} />
          <Text style={[styles.meta, { color: theme.textSecondary }]}>
            {formatPlanTime(p.starts_at)}
            {past ? ` · ${L('Geçti', 'Past')}` : ''}
            {p.edited_at ? ` · ${L('düzenlendi', 'edited')}` : ''}
          </Text>
        </View>
        {p.place ? (
          <View style={styles.whenRow}>
            <MapPin size={14} color={theme.textSecondary} />
            <Text style={[styles.meta, { color: theme.textSecondary, flexShrink: 1 }]} numberOfLines={1}>
              {p.place}
            </Text>
          </View>
        ) : null}

        {requests.length === 0 ? (
          <Text style={[styles.meta, { color: theme.textSecondary, marginTop: 10 }]}>{L('Henüz katılma isteği yok.', 'No join requests yet.')}</Text>
        ) : (
          <View style={{ marginTop: 10, gap: 10 }}>
            {requests.map((j) => (
              <View key={j.id} style={styles.reqRow}>
                <TouchableOpacity onPress={() => j.user && openOwner(j.user.id)} style={styles.ownerTap}>
                  <Avatar uri={j.user?.profile_picture} size={36} />
                  <View style={{ flex: 1 }}>
                    <View style={styles.nameRow}>
                      <Text style={[styles.reqName, { color: theme.text }]} numberOfLines={1}>
                        {j.user?.full_name}, {ageOf(j.user?.birth_date)}
                      </Text>
                      {j.user?.verification_status === 'verified' && <VerifiedBadge size={14} verified />}
                    </View>
                    <Text style={[styles.meta, { color: theme.textSecondary }]}>{j.user?.city || ''}</Text>
                  </View>
                </TouchableOpacity>
                {j.status === 'accepted' ? (
                  <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>{L('Kabul edildi', 'Accepted')}</Text>
                ) : (
                  <View style={{ flexDirection: 'row', gap: 6 }}>
                    <TouchableOpacity disabled={busyId === j.id} onPress={() => onDecline(j)} style={[styles.smallBtn, { borderColor: theme.border }]}>
                      <Text style={{ color: theme.textSecondary, fontWeight: '700', fontSize: 13 }}>{L('Hayır', 'No')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      disabled={busyId === j.id}
                      onPress={() => onAccept(p, j)}
                      style={[styles.smallBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}>
                      <Text style={{ color: '#FFFFFF', fontWeight: '700', fontSize: 13 }}>{L('Kabul et', 'Accept')}</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </View>
        )}

        {!past && (
          <View style={styles.ownerActions}>
            <TouchableOpacity onPress={() => setEditingPlan(p)} style={[styles.editBtn, { borderColor: theme.border }]}>
              <Pencil size={14} color={theme.primary} />
              <Text style={{ color: theme.primary, fontWeight: '700', fontSize: 13 }}>{L('Düzenle', 'Edit')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => onCancelPlan(p)} style={{ paddingVertical: 6 }}>
              <Text style={{ color: theme.error, fontWeight: '600', fontSize: 13 }}>{L('Planı iptal et', 'Cancel plan')}</Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  };

  const FILTERS: { key: Filter; tr: string; en: string }[] = [
    { key: 'near', tr: 'Şehrimde', en: 'My city' },
    { key: 'today', tr: 'Bugün', en: 'Today' },
    { key: 'weekend', tr: 'Hafta sonu', en: 'Weekend' },
    { key: 'interests', tr: 'Hobilerime uygun', en: 'Matches my hobbies' },
  ];

  const data = tab === 'feed' ? shown : mine;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <HeroFade height={260} fadeFrom={0.42} />
      <View style={styles.header}>
        <Text style={[styles.headerTitle, { color: theme.onGradient }]}>{L('Bu hafta ne yapıyorsun?', 'What are you up to this week?')}</Text>
      </View>

      <View style={styles.segment}>
        {(['feed', 'mine'] as const).map((t) => {
          const active = tab === t;
          return (
            <TouchableOpacity
              key={t}
              onPress={() => setTab(t)}
              style={[styles.segBtn, { backgroundColor: active ? theme.cardBackground : 'rgba(255,255,255,0.22)' }]}>
              <Text style={{ color: active ? theme.primary : theme.onGradient, fontWeight: '700', fontSize: 14 }}>
                {t === 'feed' ? L('Planlar', 'Plans') : L('Planlarım', 'My plans')}
                {t === 'mine' && pendingCount > 0 ? ` (${pendingCount})` : ''}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {tab === 'feed' && (
        <View style={styles.filters}>
          {FILTERS.map((f) => {
            const active = filters.has(f.key);
            return (
              <TouchableOpacity
                key={f.key}
                onPress={() => toggle(f.key)}
                style={[styles.filterChip, { backgroundColor: active ? theme.primary : theme.cardBackground, borderColor: active ? theme.primary : theme.border }]}>
                <Text style={{ color: active ? '#FFFFFF' : theme.text, fontWeight: active ? '700' : '600', fontSize: 13 }}>{L(f.tr, f.en)}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}

      {loading ? (
        <View style={styles.center}>
          <HeartLoader />
        </View>
      ) : unavailable ? (
        <View style={styles.center}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>{L('Planlar şu an yüklenemedi. Biraz sonra tekrar dene.', 'Plans could not be loaded. Try again shortly.')}</Text>
        </View>
      ) : (
        <FlatList
          data={data}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding: 16, paddingBottom: 110, gap: 12 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                load();
              }}
              tintColor={theme.primary}
            />
          }
          renderItem={({ item }) => (tab === 'feed' ? <FeedCard p={item} /> : <MyCard p={item} />)}
          ListEmptyComponent={
            <View style={styles.empty}>
              <CalendarHeart size={44} color={theme.primary} />
              <Text style={[styles.emptyTitle, { color: theme.text }]}>
                {tab === 'feed' ? L('Şu an uygun plan yok', 'No plans right now') : L('Henüz planın yok', "You haven't shared a plan yet")}
              </Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {L(
                  'Kahve, yürüyüş, konser… Bir plan paylaş, aynı şeyi yapmak isteyenler katılsın.',
                  'Coffee, a walk, a concert… Share a plan and let people who want the same join you.'
                )}
              </Text>
            </View>
          }
        />
      )}

      <TouchableOpacity style={styles.fabWrap} onPress={() => setCreateVisible(true)} accessibilityLabel={L('Plan paylaş', 'Share a plan')}>
        <View style={[styles.fab, { backgroundColor: theme.text }]}>
          <Plus size={20} color={theme.background} />
          <Text style={[styles.fabText, { color: theme.background }]}>{L('Plan paylaş', 'Share a plan')}</Text>
        </View>
      </TouchableOpacity>

      <CreatePlanModal
        visible={createVisible || !!editingPlan}
        editing={editingPlan}
        onClose={() => {
          setCreateVisible(false);
          setEditingPlan(null);
        }}
        onCreated={() => {
          setTab('mine');
          load();
        }}
      />
      <ProfileModal visible={!!opened} profile={opened} onClose={() => setOpened(null)} showActionButtons={false} />
      <ChoiceSheet
        visible={!!reporting}
        title={L('Planı şikâyet et', 'Report plan')}
        message={L('Neden şikâyet ediyorsun?', 'Why are you reporting it?')}
        onClose={() => setReporting(null)}
        choices={REPORT_REASONS.map(([tr, en]) => ({
          label: L(tr, en),
          onPress: () => {
            if (reporting) void submitReport(reporting, en);
          },
        }))}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  ownerActions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  editBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 16, paddingHorizontal: 12, paddingVertical: 7 },
  container: { flex: 1 },
  header: { paddingHorizontal: 20, paddingTop: 14, paddingBottom: 10 },
  headerTitle: { fontSize: 24, fontWeight: '800' },
  segment: { flexDirection: 'row', gap: 8, paddingHorizontal: 16, marginBottom: 10 },
  segBtn: { flex: 1, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  filters: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingHorizontal: 16 },
  filterChip: { paddingHorizontal: 12, height: 34, borderRadius: 17, borderWidth: 1, justifyContent: 'center' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  card: { borderWidth: 1, borderRadius: 20, padding: 16 },
  ownerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
  ownerTap: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  ownerName: { fontSize: 15, fontWeight: '700', flexShrink: 1 },
  more: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  category: { fontSize: 12, fontWeight: '800', marginBottom: 4 },
  planTitle: { fontSize: 17, fontWeight: '700', lineHeight: 23 },
  whenRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  meta: { fontSize: 12 },
  footer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 14, gap: 10 },
  joinBtn: { height: 42, paddingHorizontal: 20, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  joinText: { fontSize: 14, fontWeight: '800' },
  outlineBtn: { height: 42, paddingHorizontal: 14, borderRadius: 21, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  statusPill: { height: 36, paddingHorizontal: 14, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  reqRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  reqName: { fontSize: 14, fontWeight: '700', flexShrink: 1 },
  smallBtn: { height: 36, paddingHorizontal: 12, borderRadius: 18, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { alignItems: 'center', gap: 10, paddingVertical: 48, paddingHorizontal: 16 },
  emptyTitle: { fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyText: { fontSize: 14, lineHeight: 20, textAlign: 'center' },
  fabWrap: { position: 'absolute', left: 20, right: 20, bottom: 18 },
  fab: { height: 54, borderRadius: 27, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, elevation: 6 },
  fabText: { fontSize: 16, fontWeight: '700' },
});
