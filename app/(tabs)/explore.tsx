import { useState, useEffect, useCallback, useRef } from 'react';
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
import { ListFilter as Filter, Heart, X, MapPin, MessageCircle } from 'lucide-react-native';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getEffectiveSubscription } from '@/lib/subscription';
import FilterModal, { FilterOptions } from '@/components/FilterModal';
import ProfileModal from '@/components/ProfileModal';
import MatchCelebrationModal from '@/components/MatchCelebrationModal';
import SwipeableExploreCard from '@/components/SwipeableExploreCard';
import VerifiedBadge from '@/components/VerifiedBadge';
import { getProfessionLabel, getGenderLabel } from '@/lib/profileTranslations';
import HeartLoader from '@/components/HeartLoader';
import { isUserOnlineNow } from '@/lib/dateFormat';

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
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
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
    verifiedOnly: false,
    onlineOnly: false,
    countries: [],
    cities: [],
  });

  const fetchSeq = useRef(0);

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
    setUsers([]);
    setCurrentIndex(0);
    setPage(0);
    setHasMore(true);
    fetchUsers({ mode: 'reset', page: 0 });
  }, [user?.id, isPremium, filters]);

  useEffect(() => {
    if (!user) return;
    resetAndFetch();
  }, [user?.id, isPremium, filters]);

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
      else setLoading(true);
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
        const blockedIds = new Set((blocks || []).map((b: any) => b.blocked_user_id));
        const likedUserIds = new Set((likesSent || []).map((l: any) => l.liked_user_id));

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
            alert(language === 'tr' ? 'Beğeni gönderilemedi: ' + (likeError.message || '') : 'Could not send like: ' + (likeError.message || ''));
          } else {
            Alert.alert(
              language === 'tr' ? 'Beğeni hatası' : 'Like error',
              likeError.message || (language === 'tr' ? 'Beğeni kaydedilemedi.' : 'Like could not be saved.')
            );
          }
        }
        setCurrentIndex((i) => Math.min(i + 1, users.length - 1));
        return;
      }

      if (!insertedLike?.id) {
        if (Platform.OS === 'web') alert(language === 'tr' ? 'Beğeni kaydedilemedi.' : 'Like could not be saved.');
        else Alert.alert(language === 'tr' ? 'Hata' : 'Error', language === 'tr' ? 'Beğeni kaydedilemedi.' : 'Like could not be saved.');
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
        alert(language === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.');
      } else {
        Alert.alert(language === 'tr' ? 'Hata' : 'Error', language === 'tr' ? 'Bir hata oluştu.' : 'An error occurred.');
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
          alert(language === 'tr' ? 'Zaten arkadaşlık isteği gönderdiniz' : 'Friend request already sent');
        } else {
          throw error;
        }
      } else {
        alert(language === 'tr' ? 'Arkadaşlık isteği gönderildi' : 'Friend request sent');
      }
    } catch (error: any) {
      alert(error.message || 'Failed to send friend request');
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
        language === 'tr' ? 'Premium almalısınız' : 'Premium required',
        language === 'tr'
          ? 'Filtre kullanmak için Premium üye olmalısınız.'
          : 'You need Premium to use filters.',
        [
          { text: language === 'tr' ? 'Tamam' : 'OK', style: 'cancel' },
          { text: language === 'tr' ? 'Premium al' : 'Get Premium', onPress: () => router.push('/store/premium') },
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
      if (Platform.OS === 'web') alert(e?.message || 'Failed to open chat');
      else Alert.alert(language === 'tr' ? 'Hata' : 'Error', e?.message || (language === 'tr' ? 'Sohbet açılamadı.' : 'Could not open chat.'));
    }
  };

  const currentUser = users[currentIndex];

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { backgroundColor: theme.cardBackground }]}>
        <TouchableOpacity
          style={[styles.filterButton, { backgroundColor: theme.primary }]}
          onPress={openFilterModal}>
          <Filter size={24} color="#FFFFFF" />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {language === 'tr' ? 'Keşfet' : 'Explore'}
        </Text>
        <View style={{ width: 48 }} />
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <HeartLoader />
        </View>
      ) : currentUser ? (
        <View style={styles.cardContainer}>
          <SwipeableExploreCard
            onSwipeLeft={handlePass}
            onSwipeRight={() => handleLike()}>
            <TouchableOpacity
              style={[styles.card, { backgroundColor: theme.cardBackground }]}
              onPress={() => setProfileModalVisible(true)}
              activeOpacity={0.9}>
              {currentUser.profile_picture ? (
              <Image
                source={{ uri: currentUser.profile_picture }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImagePlaceholder, { backgroundColor: theme.primary }]}>
                <Text style={styles.profileImagePlaceholderText}>
                  {currentUser.full_name?.charAt(0) || '?'}
                </Text>
              </View>
            )}

            <View style={styles.cardInfo}>
              <View style={styles.userNameRow}>
                <Text style={[styles.userName, { color: theme.text }]}>
                  {currentUser.full_name}, {calculateAge(currentUser.birth_date)}
                </Text>
                {currentUser.verification_status === 'verified' && (
                  <VerifiedBadge size={18} verified />
                )}
                {isUserOnlineNow(currentUser.is_online, currentUser.last_seen) && <View style={styles.onlineIndicator} />}
              </View>
              <Text style={[styles.genderText, { color: theme.textSecondary }]}>
                {getGenderLabel(currentUser.gender, language)}
              </Text>
              {currentUser.city && (
                <View style={styles.locationRow}>
                  <MapPin size={16} color={theme.textSecondary} />
                  <Text style={[styles.location, { color: theme.textSecondary }]}>
                    {currentUser.city}, {currentUser.country ? currentUser.country.replace(/\b\w/g, (c) => c.toUpperCase()) : ''}
                  </Text>
                </View>
              )}
              {currentUser.bio && (
                <Text style={[styles.bio, { color: theme.textSecondary }]} numberOfLines={3}>
                  {currentUser.bio}
                </Text>
              )}
              <View style={styles.detailsContainer}>
                {currentUser.height && (
                  <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                    {language === 'tr' ? 'Boy' : 'Height'}: {currentUser.height} cm
                  </Text>
                )}
                {currentUser.profession && (
                  <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                    {language === 'tr' ? 'Meslek' : 'Profession'}: {getProfessionLabel(currentUser.profession, language)}
                  </Text>
                )}
                <Text style={[styles.detailText, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Cinsiyet' : 'Gender'}: {getGenderLabel(currentUser.gender, language)}
                </Text>
              </View>
            </View>
            </TouchableOpacity>
          </SwipeableExploreCard>

          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.passButton]}
              onPress={handlePass}>
              <X size={32} color="#FF6B6B" />
            </TouchableOpacity>
            {isPremium && (
              <TouchableOpacity
                style={[styles.actionButton, styles.messageButton]}
                onPress={handleMessageFromExplore}>
                <MessageCircle size={28} color="#FFFFFF" />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.actionButton, styles.likeButton]}
              onPress={handleLike}>
              <Heart size={32} color="#4CAF50" />
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            {language === 'tr'
              ? 'Filtrelerinize uygun kullanıcı bulunamadı.'
              : 'No users found matching your filters.'}
          </Text>
          <TouchableOpacity
            style={[styles.changeFiltersButton, { backgroundColor: theme.primary }]}
            onPress={openFilterModal}>
            <Text style={styles.changeFiltersButtonText}>
              {language === 'tr' ? 'Filtreleri Değiştir' : 'Change Filters'}
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
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  profileImage: {
    width: '100%',
    height: '60%',
    resizeMode: 'cover',
  },
  profileImagePlaceholder: {
    width: '100%',
    height: '60%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileImagePlaceholderText: {
    fontSize: 64,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  cardInfo: {
    padding: 20,
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ECB71',
  },
  genderText: {
    fontSize: 14,
    marginBottom: 8,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 8,
  },
  location: {
    fontSize: 14,
  },
  bio: {
    fontSize: 14,
    marginBottom: 12,
    lineHeight: 20,
  },
  detailsContainer: {
    gap: 4,
  },
  detailText: {
    fontSize: 14,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 40,
    paddingVertical: 20,
  },
  actionButton: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  passButton: {
    borderWidth: 2,
    borderColor: '#FF6B6B',
  },
  likeButton: {
    borderWidth: 2,
    borderColor: '#4CAF50',
  },
  messageButton: {
    backgroundColor: '#1D9BF0',
    borderWidth: 0,
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
