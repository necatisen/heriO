import { useState, useEffect, useCallback, useRef } from 'react';
import { getCountryLabel } from '@/lib/constants';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useFocusEffect } from 'expo-router';
import * as Location from 'expo-location';
import { ListFilter as Filter, Heart, X, MapPin, MessageCircle, Sparkles } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getEffectiveSubscription } from '@/lib/subscription';
import FilterModal, { FilterOptions } from '@/components/FilterModal';
import ProfileModal from '@/components/ProfileModal';
import MatchCelebrationModal from '@/components/MatchCelebrationModal';
import SwipeDeck, { type SwipeDeckHandle } from '@/components/SwipeDeck';
import BouncyButton from '@/components/BouncyButton';
import { LinearGradient } from 'expo-linear-gradient';
import VerifiedBadge from '@/components/VerifiedBadge';
import { getProfessionLabel, getGenderLabel } from '@/lib/profileTranslations';
import HeartLoader from '@/components/HeartLoader';
import { peekCache, readCache, writeCache } from '@/lib/cache';
import { compatibilityScore } from '@/lib/compatibility';
import { BRAND } from '@/lib/brand';
import { isUserOnlineNow } from '@/lib/dateFormat';

import { L } from '@/lib/l10n';
type UserProfile = {
  id: string;
  full_name: string;
  username: string;
  bio: string | null;
  profile_picture: string | null;
  birth_date: string;
  gender: string;
  height: number | null;
  weight: number | null;
  city: string | null;
  country: string;
  latitude: number | null;
  longitude: number | null;
  body_type: string | null;
  languages: string[];
  religion: string | null;
  alcohol_consumption: string | null;
  smoking_habit: string | null;
  children_status: string | null;
  relationship_status: string | null;
  relationship_goal: string | null;
  is_verified: boolean;
  face_verified?: boolean;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
  is_online: boolean;
  last_seen?: string | null;
  profession: string | null;
  education: string | null;
};

const PAGE_SIZE = 48;

export default function ExploreScreen() {
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { user, profile, refreshProfile } = useAuth();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);
  const [filterVisible, setFilterVisible] = useState(false);
  const exploreCacheKey = user ? `explore:${user.id}` : '';
  const cachedUsers = exploreCacheKey ? peekCache<UserProfile[]>(exploreCacheKey) : undefined;
  const [users, setUsers] = useState<UserProfile[]>(cachedUsers ?? []);
  const [loading, setLoading] = useState(!cachedUsers);
  const usersCountRef = useRef(cachedUsers?.length ?? 0);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [matchCelebration, setMatchCelebration] = useState<{
    matchedUser: UserProfile;
    sessionId?: string;
  } | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    gender: [],
    ageRange: [18, 80],
    distanceKm: 500,
    heightRange: [140, 220],
    bodyTypes: [],
    languages: [],
    religions: [],
    alcoholConsumption: [],
    smokingHabit: [],
    childrenStatus: [],
    relationshipStatus: [],
    relationshipGoals: [],
    verifiedOnly: false,
    onlineOnly: false,
    countries: [],
    cities: [],
  });

  const fetchSeq = useRef(0);
  const deckRef = useRef<SwipeDeckHandle>(null);

  const fetchPremiumStatus = useCallback(async () => {
    const sub = await getEffectiveSubscription(user?.id);
    setIsPremium(sub.isPremium);
  }, [user?.id]);

  useEffect(() => {
    fetchPremiumStatus();
  }, [fetchPremiumStatus]);

  useFocusEffect(
    useCallback(() => {
      fetchPremiumStatus();
    }, [fetchPremiumStatus])
  );

  useEffect(() => {
    if (!user) return;
    updateOnlineStatus();
    updateProfileLocation();
  }, [user?.id]);

  const resetAndFetch = useCallback(() => {
    if (!user) return;
    setCurrentIndex(0);
    setPage(0);
    setHasMore(true);
    fetchUsers({ mode: 'reset', page: 0 });
  }, [user?.id, isPremium, filters]);

  useEffect(() => {
    if (!user) return;
    resetAndFetch();
  }, [user?.id, isPremium, filters]);

  useEffect(() => {
    if (!exploreCacheKey || usersCountRef.current > 0) return;
    readCache<UserProfile[]>(exploreCacheKey).then((c) => {
      if (!c?.length || usersCountRef.current > 0) return;
      usersCountRef.current = c.length;
      setUsers(c);
      setLoading(false);
    });
  }, [exploreCacheKey]);

  // Prefetch current + next few profile images for smoother first-time experience.
  useEffect(() => {
    const slice = users.slice(currentIndex, currentIndex + 6);
    const urls = Array.from(
      new Set(
        slice
          .map((u) => String(u?.profile_picture || '').trim())
          .filter((u) => !!u)
      )
    );
    urls.forEach((u) => {
      void Image.prefetch(u);
    });
  }, [users, currentIndex]);

  useEffect(() => {
    if (!user) return;
    if (!hasMore || loadingMore || loading) return;
    if (currentIndex >= Math.max(0, users.length - 6)) {
      fetchUsers({ mode: 'append', page: page + 1 });
    }
  }, [currentIndex, users.length, hasMore, loadingMore, loading, page, user?.id]);

  const updateProfileLocation = async () => {
    if (!user) return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const { latitude, longitude } = loc.coords;
      const { error } = await supabase
        .from('profiles')
        .update({ latitude, longitude })
        .eq('id', user.id);
      if (!error) await refreshProfile();
    } catch (e) {
      console.warn('Location update skipped:', e);
    }
  };

  const updateOnlineStatus = async () => {
    if (!user) return;
    try {
      await supabase
        .from('profiles')
        .update({ is_online: true, last_seen: new Date().toISOString() })
        .eq('id', user.id);
    } catch (error) {
      console.error('Error updating online status:', error);
    }
  };

  const calculateAge = (birthDate: string): number => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };


  const calculateDistance = (
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number => {
    const R = 6371;
    const dLat = ((lat2 - lat1) * Math.PI) / 180;
    const dLon = ((lon2 - lon1) * Math.PI) / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos((lat1 * Math.PI) / 180) *
        Math.cos((lat2 * Math.PI) / 180) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  };

  const fetchUsers = async (opts?: { mode: 'reset' | 'append'; page: number }) => {
    const mode = opts?.mode ?? 'reset';
    const nextPage = opts?.page ?? 0;
    const seq = ++fetchSeq.current;
    try {
      if (mode === 'append') setLoadingMore(true);
      // Keep showing cached/previous cards while refreshing; spinner only when empty.
      else if (usersCountRef.current === 0) setLoading(true);
      // Kick off independent queries in parallel for faster first paint.
      let baseQuery = supabase
        .from('profiles')
        .select(
          [
            'id',
            'full_name',
            'username',
            'bio',
            'profile_picture',
            'birth_date',
            'gender',
            'height',
            'weight',
            'city',
            'country',
            'latitude',
            'longitude',
            'body_type',
            'languages',
            'religion',
            'alcohol_consumption',
            'smoking_habit',
            'children_status',
            'relationship_status',
            'relationship_goal',
            'verification_status',
            'is_verified',
            'face_verified',
            'is_online',
            'last_seen',
            'profession',
            'education',
          ].join(', ')
        )
        .neq('id', user?.id)
        .range(nextPage * PAGE_SIZE, nextPage * PAGE_SIZE + PAGE_SIZE - 1);

      if (isPremium) {
        if (filters.gender.length > 0) baseQuery = baseQuery.in('gender', filters.gender);
        if (filters.verifiedOnly) baseQuery = baseQuery.eq('verification_status', 'verified');
        if (filters.onlineOnly) baseQuery = baseQuery.eq('is_online', true);
        if (filters.bodyTypes.length > 0) baseQuery = baseQuery.in('body_type', filters.bodyTypes);
        if (filters.religions.length > 0) baseQuery = baseQuery.in('religion', filters.religions);
        if (filters.alcoholConsumption.length > 0) baseQuery = baseQuery.in('alcohol_consumption', filters.alcoholConsumption);
        if (filters.smokingHabit.length > 0) baseQuery = baseQuery.in('smoking_habit', filters.smokingHabit);
        if (filters.childrenStatus.length > 0) baseQuery = baseQuery.in('children_status', filters.childrenStatus);
        if (filters.relationshipStatus.length > 0) baseQuery = baseQuery.in('relationship_status', filters.relationshipStatus);
        if (filters.relationshipGoals.length > 0) baseQuery = baseQuery.in('relationship_goal', filters.relationshipGoals);
      }

      const blocksPromise = user?.id
        ? supabase.from('blocks').select('blocked_user_id').eq('user_id', user.id)
        : Promise.resolve({ data: [] as any[] } as any);
      const likesPromise = user?.id
        ? supabase.from('likes').select('liked_user_id').eq('user_id', user.id)
        : Promise.resolve({ data: [] as any[] } as any);
      const friendsPromise = user?.id
        ? supabase
            .from('friends')
            .select('user_id, friend_id')
            .or(`user_id.eq.${user.id},friend_id.eq.${user.id}`)
            .eq('status', 'accepted')
        : Promise.resolve({ data: [] as any[] } as any);
      const sessionsPromise = user?.id
        ? supabase
            .from('chat_sessions')
            .select('user1_id, user2_id')
            .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
        : Promise.resolve({ data: [] as any[] } as any);

      const [{ data, error }, { data: blocks }, { data: likesSent }, { data: friendsRows }, { data: sessions }] =
        await Promise.all([baseQuery, blocksPromise, likesPromise, friendsPromise, sessionsPromise]);

      if (error) throw error;

      // If a newer fetch started, ignore this result.
      if (seq !== fetchSeq.current) return;

      const rawCount = (data || []).length;
      setHasMore(rawCount === PAGE_SIZE);
      setPage(nextPage);

      let filteredUsers = (data || []) as any[];

      if (user?.id) {
        const blockedIds = new Set<string>((blocks || []).map((b: any) => b.blocked_user_id));
        const likedUserIds = new Set<string>((likesSent || []).map((l: any) => l.liked_user_id));

        const friendIds = new Set<string>();
        (friendsRows || []).forEach((r: any) => {
          if (r.user_id !== user.id) friendIds.add(r.user_id);
          if (r.friend_id !== user.id) friendIds.add(r.friend_id);
        });
        const chatPartnerIds = new Set<string>();
        (sessions || []).forEach((s: any) => {
          if (s.user1_id !== user.id) chatPartnerIds.add(s.user1_id);
          if (s.user2_id !== user.id) chatPartnerIds.add(s.user2_id);
        });

        const excludeIds = new Set<string>([
          ...Array.from(friendIds),
          ...Array.from(chatPartnerIds),
          ...Array.from(blockedIds),
          ...Array.from(likedUserIds),
        ]);
        filteredUsers = filteredUsers.filter((u) => !excludeIds.has(u.id));
      }

      if (isPremium) {
        filteredUsers = filteredUsers.filter((u) => {
          const age = calculateAge(u.birth_date);
          if (age < filters.ageRange[0] || age > filters.ageRange[1]) return false;
          if (u.height && (u.height < filters.heightRange[0] || u.height > filters.heightRange[1])) return false;
          if (profile?.latitude && profile?.longitude && u.latitude && u.longitude) {
            const distance = calculateDistance(profile.latitude, profile.longitude, u.latitude, u.longitude);
            if (distance > filters.distanceKm) return false;
          }
          if (filters.languages.length > 0 && !filters.languages.some((lang) => u.languages?.includes(lang))) return false;
          if (filters.countries.length > 0 && !filters.countries.some((c) => u.country?.toLowerCase().includes(c.toLowerCase()))) return false;
          if (filters.cities.length > 0 && !filters.cities.some((c) => u.city?.toLowerCase().includes(c.toLowerCase()))) return false;
          return true;
        });
      }

      // Not: Ek premium sıralama sorgusu ilk açılışı geciktirdiği için kaldırıldı.
      // Ana hedef burada hızlı first-paint ve akıcı kart geçişi.

      setUsers((prev) => {
        const next = mode === 'append' ? [...prev, ...filteredUsers] : [...filteredUsers];
        const deduped: UserProfile[] = [];
        const seen = new Set<string>();
        for (const u of next) {
          if (!u?.id || seen.has(u.id)) continue;
          seen.add(u.id);
          deduped.push(u as UserProfile);
        }
        usersCountRef.current = deduped.length;
        if (mode === 'reset' && user?.id) writeCache(`explore:${user.id}`, deduped.slice(0, 20));
        return deduped;
      });
      if (mode === 'reset') setCurrentIndex(0);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      if (seq !== fetchSeq.current) return;
      setLoading(false);
      setLoadingMore(false);
    }
  };

  const handleLike = async () => {
    if (currentIndex >= users.length || !user?.id) return;
    const likedUser = users[currentIndex];
    if (!likedUser?.id) return;

    try {
      const { data: insertedLike, error: likeError } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          liked_user_id: likedUser.id,
        })
        .select('id')
        .single();

      if (likeError) {
        if (likeError.code === '23505') {
          setUsers((prev) => prev.filter((_, i) => i !== currentIndex));
          return;
        } else {
          console.error('Error saving like:', likeError);
          if (Platform.OS === 'web') {
            alert(L('Beğeni gönderilemedi: {0}', 'Could not send like: {0}', [likeError.message || '']));
          } else {
            Alert.alert(
              L('Beğeni hatası', 'Like error'),
              likeError.message || (L('Beğeni kaydedilemedi.', 'Like could not be saved.'))
            );
          }
        }
        setCurrentIndex((i) => Math.min(i + 1, users.length - 1));
        return;
      }

      if (!insertedLike?.id) {
        if (Platform.OS === 'web') alert(L('Beğeni kaydedilemedi.', 'Like could not be saved.'));
        else Alert.alert(L('Hata', 'Error'), L('Beğeni kaydedilemedi.', 'Like could not be saved.'));
        setCurrentIndex(currentIndex + 1);
        return;
      }

      const { data: mutualLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', likedUser.id)
        .eq('liked_user_id', user?.id)
        .maybeSingle();

      if (mutualLike) {
        const { error: friend1Error } = await supabase
          .from('friends')
          .insert({
            user_id: user?.id,
            friend_id: likedUser.id,
            status: 'accepted',
          })
          .select()
          .maybeSingle();

        if (friend1Error && friend1Error.code !== '23505') {
          console.error('Error creating friend relationship 1:', friend1Error);
        }

        const { error: friend2Error } = await supabase
          .from('friends')
          .insert({
            user_id: likedUser.id,
            friend_id: user?.id,
            status: 'accepted',
          })
          .select()
          .maybeSingle();

        if (friend2Error && friend2Error.code !== '23505') {
          console.error('Error creating friend relationship 2:', friend2Error);
        }

        const { data: existingSession } = await supabase
          .from('chat_sessions')
          .select('id')
          .or(`and(user1_id.eq.${user?.id},user2_id.eq.${likedUser.id}),and(user1_id.eq.${likedUser.id},user2_id.eq.${user?.id})`)
          .eq('status', 'active')
          .maybeSingle();

        let sessionId: string | undefined = existingSession?.id;
        if (!existingSession) {
          const { data: newSession } = await supabase
            .from('chat_sessions')
            .insert({
              user1_id: user?.id,
              user2_id: likedUser.id,
              status: 'active',
            })
            .select('id')
            .single();
          sessionId = newSession?.id;
          if (!sessionId) {
            const { data: refetched } = await supabase
              .from('chat_sessions')
              .select('id')
              .or(`and(user1_id.eq.${user?.id},user2_id.eq.${likedUser.id}),and(user1_id.eq.${likedUser.id},user2_id.eq.${user?.id})`)
              .eq('status', 'active')
              .maybeSingle();
            sessionId = refetched?.id;
          }
        }

        await supabase
          .from('notifications')
          .insert({
            user_id: likedUser.id,
            actor_user_id: user?.id,
            type: 'match',
            data: { matched_user_name: likedUser.full_name },
          });

        setMatchCelebration({ matchedUser: likedUser, sessionId });
      } else {
        if (isUserOnlineNow(likedUser.is_online, likedUser.last_seen)) {
          const { error: notifError } = await supabase
            .from('notifications')
            .insert({
              user_id: likedUser.id,
              actor_user_id: user?.id,
              type: 'like',
              data: { actor_name: profile?.full_name || '' },
            });
          if (notifError) {
            console.error('Error creating notification:', notifError);
          }
        }
      }
    } catch (error) {
      console.error('Error in handleLike:', error);
      if (Platform.OS === 'web') {
        alert(L('Bir hata oluştu.', 'An error occurred.'));
      } else {
        Alert.alert(L('Hata', 'Error'), L('Bir hata oluştu.', 'An error occurred.'));
      }
    }

    setCurrentIndex(currentIndex + 1);
  };

  const handleAddFriend = async () => {
    const currentUser = users[currentIndex];
    if (!currentUser) return;

    try {
      const { error } = await supabase
        .from('friends')
        .insert({
          user_id: user?.id,
          friend_id: currentUser.id,
          status: 'pending',
        });

      if (error) {
        if (error.code === '23505') {
          alert(L('Zaten arkadaşlık isteği gönderdiniz', 'Friend request already sent'));
        } else {
          throw error;
        }
      } else {
        alert(L('Arkadaşlık isteği gönderildi', 'Friend request sent'));
      }
    } catch (error: any) {
      alert(error.message || L('Arkadaşlık isteği gönderilemedi', 'Failed to send friend request'));
    }
  };

  const handlePass = () => {
    if (currentIndex < users.length) setCurrentIndex(currentIndex + 1);
  };

  const openFilterModal = async () => {
    const sub = await getEffectiveSubscription(user?.id);
    const hasPremium = sub.isPremium;
    setIsPremium(hasPremium);
    if (!hasPremium) {
      Alert.alert(
        L('Premium almalısınız', 'Premium required'),
        L('Filtre kullanmak için Premium üye olmalısınız.', 'You need Premium to use filters.'),
        [
          { text: L('Tamam', 'OK'), style: 'cancel' },
          { text: L('Premium al', 'Get Premium'), onPress: () => router.push('/store/premium') },
        ]
      );
      return;
    }
    setFilterVisible(true);
  };

  const handleMessageFromExplore = async () => {
    if (!currentUser || !user?.id) return;
    try {
      const { data: existing } = await supabase
        .from('chat_sessions')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${currentUser.id}),and(user1_id.eq.${currentUser.id},user2_id.eq.${user.id})`)
        .eq('status', 'active')
        .maybeSingle();
      const sessionId = existing?.id;
      if (sessionId) {
        router.push(`/conversation/${sessionId}?friendId=${currentUser.id}`);
        return;
      }
      const { data: newSession, error } = await supabase
        .from('chat_sessions')
        .insert({ user1_id: user.id, user2_id: currentUser.id, status: 'active' })
        .select('id')
        .single();
      if (error || !newSession?.id) throw error || new Error('Session not created');
      router.push(`/conversation/${newSession.id}?friendId=${currentUser.id}`);
    } catch (e: any) {
      if (Platform.OS === 'web') alert(e?.message || L('Sohbet açılamadı', 'Failed to open chat'));
      else Alert.alert(L('Hata', 'Error'), e?.message || (L('Sohbet açılamadı.', 'Could not open chat.')));
    }
  };

  const currentUser = users[currentIndex];
  const nextUser = users[currentIndex + 1];

  const renderCard = (u: UserProfile) => (
    <View style={styles.card}>
      {u.profile_picture ? (
        <Image source={{ uri: u.profile_picture }} style={styles.cardImage} />
      ) : (
        <View style={[styles.cardImage, styles.cardImagePlaceholder, { backgroundColor: theme.primary }]}>
          <Text style={styles.profileImagePlaceholderText}>{u.full_name?.charAt(0) || '?'}</Text>
        </View>
      )}
      <LinearGradient
        colors={['transparent', 'rgba(0,0,0,0.35)', 'rgba(0,0,0,0.88)']}
        locations={[0.45, 0.65, 1]}
        style={styles.cardGradient}
        pointerEvents="none"
      />
      {(() => {
        const score = compatibilityScore(profile as any, u);
        return score != null ? (
          <LinearGradient colors={BRAND.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.compatChip} pointerEvents="none">
            <Sparkles size={14} color="#FFFFFF" />
            <Text style={styles.compatText}>{L('%{0} uyum', '{0}% match', [score])}</Text>
          </LinearGradient>
        ) : null;
      })()}
      <View style={styles.cardInfo} pointerEvents="none">
        <View style={styles.userNameRow}>
          <Text style={styles.userName} numberOfLines={1}>
            {u.full_name}
            <Text style={styles.userAge}>  {calculateAge(u.birth_date)}</Text>
          </Text>
          {u.verification_status === 'verified' && <VerifiedBadge size={22} verified />}
        </View>
        {isUserOnlineNow(u.is_online, u.last_seen) && (
          <View style={styles.onlineRow}>
            <View style={styles.onlineIndicator} />
            <Text style={styles.onlineText}>{L('Şu an çevrimiçi', 'Online now')}</Text>
          </View>
        )}
        {u.city ? (
          <View style={styles.locationRow}>
            <MapPin size={15} color="rgba(255,255,255,0.85)" />
            <Text style={styles.location}>
              {u.city}
              {u.country ? `, ${getCountryLabel(u.country)}` : ''}
            </Text>
          </View>
        ) : null}
        <View style={styles.chipsRow}>
          {u.profession ? <Text style={styles.chip}>{getProfessionLabel(u.profession, language)}</Text> : null}
          {u.height ? <Text style={styles.chip}>{u.height} cm</Text> : null}
          <Text style={styles.chip}>{getGenderLabel(u.gender, language)}</Text>
        </View>
        {u.bio ? (
          <Text style={styles.bio} numberOfLines={2}>
            {u.bio}
          </Text>
        ) : null}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.primary }]}
          onPress={openFilterModal}>
          <Filter size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {L('Keşfet', 'Explore')}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <HeartLoader />
        </View>
      ) : currentUser ? (
        <View style={styles.cardContainer}>
          <SwipeDeck
            ref={deckRef}
            cardKey={currentUser.id}
            top={renderCard(currentUser)}
            next={nextUser ? renderCard(nextUser) : undefined}
            onSwiped={(dir) => (dir === 'right' ? handleLike() : handlePass())}
            onTap={() => setProfileModalVisible(true)}
            likeLabel={L('BEĞEN', 'LIKE')}
            nopeLabel={L('GEÇ', 'NOPE')}
          />

          <View style={styles.actions}>
            <BouncyButton
              style={[styles.actionButton, styles.passButton]}
              onPress={() => deckRef.current?.swipe('left')}>
              <X size={32} color="#EF4444" strokeWidth={3} />
            </BouncyButton>
            {isPremium && (
              <BouncyButton
                style={[styles.actionButton, styles.messageButton]}
                onPress={handleMessageFromExplore}>
                <MessageCircle size={26} color="#FFFFFF" />
              </BouncyButton>
            )}
            <BouncyButton
              style={[styles.actionButton, styles.likeButton]}
              onPress={() => deckRef.current?.swipe('right')}>
              <Heart size={32} color="#22C55E" fill="#22C55E" />
            </BouncyButton>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {L('Filtrelerinize uygun kullanıcı bulunamadı.', 'No users found matching your filters.')}
          </Text>
          <TouchableOpacity
            style={[styles.changeFiltersButton, { backgroundColor: theme.primary }]}
            onPress={openFilterModal}>
            <Text style={styles.changeFiltersButtonText}>
              {L('Filtreleri Değiştir', 'Change Filters')}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <FilterModal
        visible={filterVisible}
        onClose={() => setFilterVisible(false)}
        onApply={(newFilters) => setFilters(newFilters)}
        initialFilters={filters}
      />

      {currentUser && (
        <ProfileModal
          visible={profileModalVisible}
          profile={currentUser}
          onClose={() => setProfileModalVisible(false)}
          onBlocked={() => resetAndFetch()}
          showActionButtons={isPremium}
          language={language}
        />
      )}

      <MatchCelebrationModal
        visible={!!matchCelebration}
        matchedUser={matchCelebration?.matchedUser ?? null}
        sessionId={matchCelebration?.sessionId}
        onClose={() => setMatchCelebration(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  filterButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardContainer: {
    flex: 1,
    padding: 20,
  },
  card: {
    flex: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#1F2937',
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  cardImagePlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 96,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  compatChip: {
    position: 'absolute',
    top: 16,
    left: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 16,
  },
  compatText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  cardInfo: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    paddingBottom: 24,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 6,
  },
  userName: {
    fontSize: 30,
    fontWeight: '800',
    color: '#FFFFFF',
    flexShrink: 1,
    textShadowColor: 'rgba(0,0,0,0.4)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 6,
  },
  userAge: {
    fontSize: 26,
    fontWeight: '400',
    color: '#FFFFFF',
  },
  onlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#22C55E',
  },
  onlineText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 10,
  },
  location: {
    fontSize: 15,
    color: 'rgba(255,255,255,0.9)',
  },
  chipsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 8,
  },
  chip: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  bio: {
    fontSize: 14,
    lineHeight: 20,
    color: 'rgba(255,255,255,0.88)',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 28,
    paddingTop: 18,
    paddingBottom: 6,
  },
  actionButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  passButton: {},
  likeButton: {},
  messageButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#1D9BF0',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
  },
  changeFiltersButton: {
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  changeFiltersButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});
