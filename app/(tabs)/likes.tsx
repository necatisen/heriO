import { useState, useEffect, useCallback } from 'react';
import HeroFade from '@/components/HeroFade';
import { useTheme , type Theme } from '@/contexts/ThemeContext';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  useWindowDimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Eye, ThumbsUp, UserPlus, MessageCircle, User, Crown } from 'lucide-react-native';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { sendLikePush } from '@/lib/pushNotifications';
import { getEffectiveSubscription } from '@/lib/subscription';
import ProfileModal from '@/components/ProfileModal';
import MatchCelebrationModal from '@/components/MatchCelebrationModal';
import { useRouter, useFocusEffect } from 'expo-router';
import { useMemo } from 'react';
import HeartLoader from '@/components/HeartLoader';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { isUserOnlineNow } from '@/lib/dateFormat';
import { BlurView } from 'expo-blur';
import * as Location from 'expo-location';

import { L } from '@/lib/l10n';
type LikeUser = {
  id: string;
  full_name: string;
  username: string;
  bio: string;
  profile_picture?: string | null;
  created_at: string;
  is_mutual?: boolean;
  is_friend?: boolean;
  is_online?: boolean;
  last_seen?: string | null;
  is_verified?: boolean;
  face_verified?: boolean;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
  latitude?: number | null;
  longitude?: number | null;
  distance_km?: number | null;
};

type Tab = 'received' | 'visitors' | 'sent';

export default function LikesScreen() {
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, profile } = useAuth();
  const { language } = useLanguage();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<Tab>('received');
  const [likesReceived, setLikesReceived] = useState<LikeUser[]>([]);
  const [likesSent, setLikesSent] = useState<LikeUser[]>([]);
  const [visitors, setVisitors] = useState<LikeUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [matchCelebration, setMatchCelebration] = useState<{
    matchedUser: { id: string; full_name: string; profile_picture?: string | null };
    sessionId: string;
  } | null>(null);
  const [hasChatWithSelectedUser, setHasChatWithSelectedUser] = useState(false);
  const [myCoords, setMyCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  const receivedIds = useMemo(() => new Set(likesReceived.map((u) => u.id)), [likesReceived]);
  const displayedSent = useMemo(
    () => likesSent.filter((u) => !receivedIds.has(u.id)),
    [likesSent, receivedIds]
  );
  const sentIds = useMemo(() => new Set(displayedSent.map((u) => u.id)), [displayedSent]);

  useEffect(() => {
    if (user) {
      fetchData();
      fetchSubscription();
    }
  }, [user, activeTab]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchSubscription();
        fetchData();
        void ensureLocation();
        const t = setTimeout(() => fetchData(), 600);
        return () => clearTimeout(t);
      }
    }, [user, activeTab])
  );

  const ensureLocation = async () => {
    if (!user?.id) return;
    if (Platform.OS === 'web') return;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return;
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const coords = { latitude: loc.coords.latitude, longitude: loc.coords.longitude };
      setMyCoords(coords);
      // Keep DB profile up-to-date for other screens too.
      await supabase
        .from('profiles')
        .update({ latitude: coords.latitude, longitude: coords.longitude })
        .eq('id', user.id);
    } catch {
      // ignore
    }
  };

  const haversineKm = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
    const R = 6371;
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const dLat = toRad(b.latitude - a.latitude);
    const dLon = toRad(b.longitude - a.longitude);
    const lat1 = toRad(a.latitude);
    const lat2 = toRad(b.latitude);
    const s =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
    return 2 * R * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
  };

  const withDistances = (rows: LikeUser[]) => {
    if (!myCoords) return rows;
    return rows.map((u) => {
      if (typeof u.latitude !== 'number' || typeof u.longitude !== 'number') return { ...u, distance_km: null };
      const km = haversineKm(myCoords, { latitude: u.latitude, longitude: u.longitude });
      return { ...u, distance_km: Number.isFinite(km) ? km : null };
    });
  };

  useEffect(() => {
    if (!user) return;

    const likesSubscription = supabase
      .channel('likes_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'likes',
        },
        () => {
          fetchData();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(likesSubscription);
    };
  }, [user, activeTab]);

  const fetchSubscription = async () => {
    try {
      const sub = await getEffectiveSubscription(user?.id);
      setIsPremium(sub.isPremium);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchData = async () => {
    const hasDataForActiveTab =
      activeTab === 'received'
        ? likesReceived.length > 0
        : activeTab === 'sent'
          ? displayedSent.length > 0
          : visitors.length > 0;

    if (!hasDataForActiveTab) setLoading(true);
    try {
      // İlk boyamayı hızlandır: önce sadece aktif sekmeyi çek.
      if (activeTab === 'received') {
        await fetchLikesReceived();
      } else if (activeTab === 'sent') {
        await fetchLikesSent();
      } else {
        await fetchVisitors();
      }

      // Diğer sekmeleri arka planda güncelle (UI bloklanmasın).
      if (activeTab === 'received') {
        void Promise.all([fetchLikesSent(), fetchVisitors()]);
      } else if (activeTab === 'sent') {
        void Promise.all([fetchLikesReceived(), fetchVisitors()]);
      } else {
        void Promise.all([fetchLikesReceived(), fetchLikesSent()]);
      }
    } finally {
      setLoading(false);
    }
  };

  const fetchLikesReceived = async () => {
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('user_id, created_at')
      .eq('liked_user_id', user?.id)
      .order('created_at', { ascending: false });

    if (likesError || !likesData?.length) {
      setLikesReceived([]);
      return;
    }

    const uniqueIds = [...new Set(likesData.map((l: any) => l.user_id))];
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username, bio, profile_picture, is_online, last_seen, is_verified, face_verified, verification_status, latitude, longitude')
      .in('id', uniqueIds);

    if (profilesError || !profilesData) {
      setLikesReceived([]);
      return;
    }

    const byCreated = new Map<string, string>();
    likesData.forEach((l: any) => {
      if (!byCreated.has(l.user_id)) byCreated.set(l.user_id, l.created_at);
    });

    const { data: mutualLikes } = await supabase
      .from('likes')
      .select('liked_user_id')
      .eq('user_id', user?.id)
      .in('liked_user_id', uniqueIds);
    const mutualLikeIds = new Set(mutualLikes?.map((l: any) => l.liked_user_id) || []);

    const { data: friendships1 } = await supabase
      .from('friends')
      .select('friend_id')
      .eq('user_id', user?.id)
      .in('friend_id', uniqueIds);
    const { data: friendships2 } = await supabase
      .from('friends')
      .select('user_id')
      .eq('friend_id', user?.id)
      .in('user_id', uniqueIds);
    const friendIds = new Set([
      ...(friendships1?.map((f: any) => f.friend_id) || []),
      ...(friendships2?.map((f: any) => f.user_id) || []),
    ]);

    let formatted: LikeUser[] = profilesData.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      bio: p.bio ?? '',
      profile_picture: p.profile_picture ?? null,
      created_at: byCreated.get(p.id) ?? '',
      is_mutual: mutualLikeIds.has(p.id),
      is_friend: friendIds.has(p.id),
      is_online: p.is_online ?? false,
      last_seen: p.last_seen ?? null,
      is_verified: p.is_verified ?? false,
      face_verified: p.face_verified ?? false,
      verification_status: p.verification_status ?? 'unverified',
      latitude: typeof p.latitude === 'number' ? p.latitude : null,
      longitude: typeof p.longitude === 'number' ? p.longitude : null,
    }));

    // Engellenen kullanıcıları listeden çıkar
    if (user?.id) {
      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_user_id')
        .eq('user_id', user.id);
      const blockedIds = new Set(
        (blocks || []).map((b: any) => b.blocked_user_id as string)
      );
      formatted = formatted.filter((u) => !blockedIds.has(u.id));
    }

    setLikesReceived(withDistances(formatted));
  };

  const fetchLikesSent = async () => {
    const { data: likesData, error: likesError } = await supabase
      .from('likes')
      .select('liked_user_id, created_at')
      .eq('user_id', user?.id)
      .order('created_at', { ascending: false });

    if (likesError || !likesData?.length) {
      setLikesSent([]);
      return;
    }

    const uniqueIds = [...new Set(likesData.map((l: any) => l.liked_user_id))];
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username, bio, profile_picture, is_online, last_seen, is_verified, face_verified, verification_status, latitude, longitude')
      .in('id', uniqueIds);

    if (profilesError || !profilesData) {
      setLikesSent([]);
      return;
    }

    const byCreated = new Map<string, string>();
    likesData.forEach((l: any) => {
      if (!byCreated.has(l.liked_user_id)) byCreated.set(l.liked_user_id, l.created_at);
    });
    let formatted: LikeUser[] = profilesData.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      bio: p.bio ?? '',
      profile_picture: p.profile_picture ?? null,
      created_at: byCreated.get(p.id) ?? '',
      is_online: p.is_online ?? false,
      last_seen: p.last_seen ?? null,
      is_verified: p.is_verified ?? false,
      face_verified: p.face_verified ?? false,
      verification_status: p.verification_status ?? 'unverified',
      latitude: typeof p.latitude === 'number' ? p.latitude : null,
      longitude: typeof p.longitude === 'number' ? p.longitude : null,
    }));

    // Engellenen kullanıcıları listeden çıkar
    if (user?.id) {
      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_user_id')
        .eq('user_id', user.id);
      const blockedIds = new Set(
        (blocks || []).map((b: any) => b.blocked_user_id as string)
      );
      formatted = formatted.filter((u) => !blockedIds.has(u.id));
    }

    setLikesSent(withDistances(formatted));
  };

  const fetchVisitors = async () => {
    const { data: viewsData, error: viewsError } = await supabase
      .from('profile_views')
      .select('viewer_id, created_at')
      .eq('viewed_user_id', user?.id)
      .order('created_at', { ascending: false })
      .limit(100);

    if (viewsError || !viewsData?.length) {
      setVisitors([]);
      return;
    }

    const uniqueIds = [...new Set(viewsData.map((v: any) => v.viewer_id))];
    const { data: profilesData, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username, bio, profile_picture, is_online, last_seen, is_verified, face_verified, verification_status, latitude, longitude')
      .in('id', uniqueIds);

    if (profilesError || !profilesData) {
      setVisitors([]);
      return;
    }

    const byCreated = new Map<string, string>();
    viewsData.forEach((v: any) => {
      if (!byCreated.has(v.viewer_id)) byCreated.set(v.viewer_id, v.created_at);
    });
    let formatted: LikeUser[] = profilesData.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      bio: p.bio ?? '',
      profile_picture: p.profile_picture ?? null,
      created_at: byCreated.get(p.id) ?? '',
      is_online: p.is_online ?? false,
      last_seen: p.last_seen ?? null,
      is_verified: p.is_verified ?? false,
      face_verified: p.face_verified ?? false,
      verification_status: p.verification_status ?? 'unverified',
      latitude: typeof p.latitude === 'number' ? p.latitude : null,
      longitude: typeof p.longitude === 'number' ? p.longitude : null,
    }));

    // Engellenen kullanıcıları listeden çıkar
    if (user?.id) {
      const { data: blocks } = await supabase
        .from('blocks')
        .select('blocked_user_id')
        .eq('user_id', user.id);
      const blockedIds = new Set(
        (blocks || []).map((b: any) => b.blocked_user_id as string)
      );
      formatted = formatted.filter((u) => !blockedIds.has(u.id));
    }

    setVisitors(withDistances(formatted));
  };

  const handleUserClick = async (userId: string) => {
    if (!isPremium) {
      Alert.alert(
        L('Premium gerekli', 'Premium required'),
        L('Bilgileri görebilmeniz için Premium olmalısınız.', 'You need to be Premium to view this profile.'),
        [
          { text: L('Tamam', 'OK'), style: 'cancel' },
          { text: L('Premium al', 'Get Premium'), onPress: () => router.push('/store/premium') },
        ]
      );
      return;
    }
    try {
      const [
        { data: profileData, error: profileError },
        { data: session1 },
        { data: session2 },
      ] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', userId).single(),
        supabase
          .from('chat_sessions')
          .select('id')
          .eq('user1_id', user?.id)
          .eq('user2_id', userId)
          .eq('status', 'active')
          .maybeSingle(),
        supabase
          .from('chat_sessions')
          .select('id')
          .eq('user1_id', userId)
          .eq('user2_id', user?.id)
          .eq('status', 'active')
          .maybeSingle(),
      ]);

      if (!profileError && profileData) {
        setSelectedProfile(profileData);
        setHasChatWithSelectedUser(!!(session1 || session2));
        setProfileModalVisible(true);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleAddFriend = async (friendId: string) => {
    try {
      const { error } = await supabase.from('friends').insert({
        user_id: user?.id,
        friend_id: friendId,
        status: 'pending',
      });

      if (error) throw error;

      Alert.alert(
        L('Başarılı', 'Success'),
        L('Arkadaşlık isteği gönderildi', 'Friend request sent')
      );
    } catch (error: any) {
      Alert.alert(L('Hata', 'Error'), error.message || L('Arkadaşlık isteği gönderilemedi', 'Failed to send friend request'));
    }
  };

  const handleLikeVisitor = async (
    visitorUserId: string,
    visitorName: string,
    profilePicture?: string | null
  ) => {
    if (!user?.id) return;
    try {
      const { error: likeError } = await supabase
        .from('likes')
        .insert({
          user_id: user.id,
          liked_user_id: visitorUserId,
        })
        .select('id')
        .single();

      if (likeError && likeError.code !== '23505') throw likeError;

      const { data: mutualLike } = await supabase
        .from('likes')
        .select('id')
        .eq('user_id', visitorUserId)
        .eq('liked_user_id', user.id)
        .maybeSingle();

      if (!mutualLike && !likeError) {
        await supabase.from('notifications').insert({
          user_id: visitorUserId,
          actor_user_id: user.id,
          type: 'like',
          data: { actor_name: profile?.full_name || '' },
        });
        sendLikePush(visitorUserId, 'like');
      }

      if (mutualLike) {
        const { error: friend1Error } = await supabase
          .from('friends')
          .insert({
            user_id: user.id,
            friend_id: visitorUserId,
            status: 'accepted',
          });
        if (friend1Error && friend1Error.code !== '23505') console.error(friend1Error);
        const { error: friend2Error } = await supabase
          .from('friends')
          .insert({
            user_id: visitorUserId,
            friend_id: user.id,
            status: 'accepted',
          });
        if (friend2Error && friend2Error.code !== '23505') console.error(friend2Error);

        let sessionId: string;
        const { data: existingSession } = await supabase
          .from('chat_sessions')
          .select('id')
          .or(`and(user1_id.eq.${user.id},user2_id.eq.${visitorUserId}),and(user1_id.eq.${visitorUserId},user2_id.eq.${user.id})`)
          .eq('status', 'active')
          .maybeSingle();
        if (existingSession) {
          sessionId = existingSession.id;
        } else {
          const { data: newSession, error: sessionError } = await supabase
            .from('chat_sessions')
            .insert({
              user1_id: user.id,
              user2_id: visitorUserId,
              status: 'active',
            })
            .select('id')
            .single();
          if (sessionError || !newSession) throw sessionError || new Error('Session not created');
          sessionId = newSession.id;
        }
        await supabase.from('notifications').insert({
          user_id: visitorUserId,
          actor_user_id: user.id,
          type: 'match',
          data: { matched_user_name: profile?.full_name || '' },
        });
        sendLikePush(visitorUserId, 'match', sessionId);
        setMatchCelebration({
          matchedUser: {
            id: visitorUserId,
            full_name: visitorName,
            profile_picture: profilePicture ?? null,
          },
          sessionId,
        });
      }
      await fetchData();
      setProfileModalVisible(false);
    } catch (e: any) {
      Alert.alert(
        L('Hata', 'Error'),
        e?.message || (L('Beğeni gönderilemedi.', 'Could not send like.'))
      );
    }
  };

  const handleLikeBack = async (
    likedUserId: string,
    likedUserName: string,
    profilePicture?: string | null
  ) => {
    try {
      const { error: likeError } = await supabase
        .from('likes')
        .insert({
          user_id: user?.id,
          liked_user_id: likedUserId,
        });

      if (likeError && likeError.code !== '23505') {
        throw likeError;
      }

      const { error: friend1Error } = await supabase
        .from('friends')
        .insert({
          user_id: user?.id,
          friend_id: likedUserId,
          status: 'accepted',
        });

      if (friend1Error && friend1Error.code !== '23505') {
        throw friend1Error;
      }

      const { error: friend2Error } = await supabase
        .from('friends')
        .insert({
          user_id: likedUserId,
          friend_id: user?.id,
          status: 'accepted',
        });

      if (friend2Error && friend2Error.code !== '23505') {
        throw friend2Error;
      }

      let sessionId: string;
      const { data: existingSession } = await supabase
        .from('chat_sessions')
        .select('id')
        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${likedUserId}),and(user1_id.eq.${likedUserId},user2_id.eq.${user?.id})`)
        .eq('status', 'active')
        .maybeSingle();

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        const { data: newSession, error: sessionError } = await supabase
          .from('chat_sessions')
          .insert({
            user1_id: user?.id,
            user2_id: likedUserId,
            status: 'active',
          })
          .select('id')
          .single();

        if (sessionError || !newSession) throw sessionError || new Error('Session not created');
        sessionId = newSession.id;
      }

      await supabase.from('notifications').insert({
        user_id: likedUserId,
        actor_user_id: user?.id,
        type: 'match',
        data: { matched_user_name: profile?.full_name || '' },
      });
      sendLikePush(likedUserId, 'match', sessionId);

      setMatchCelebration({
        matchedUser: {
          id: likedUserId,
          full_name: likedUserName,
          profile_picture: profilePicture ?? null,
        },
        sessionId,
      });
      await fetchLikesReceived();
    } catch (error: any) {
      Alert.alert(L('Hata', 'Error'), error.message || L('Eşleşme oluşturulamadı', 'Failed to create match'));
    }
  };

  const handleStartChat = async (friendId: string) => {
    try {
      const { data: existingSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id')
        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${user?.id})`)
        .eq('status', 'active')
        .maybeSingle();

      let sessionId: string;

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({
            user1_id: user?.id,
            user2_id: friendId,
            status: 'active',
          })
          .select('id')
          .single();

        if (createError) throw createError;
        sessionId = newSession.id;
      }

      router.push(`/conversation/${sessionId}?friendId=${friendId}`);
    } catch (error: any) {
      Alert.alert(L('Hata', 'Error'), error.message || L('Sohbet başlatılamadı', 'Failed to start chat'));
    }
  };

  const getCurrentData = (): LikeUser[] => {
    if (activeTab === 'received') return likesReceived;
    if (activeTab === 'sent') return displayedSent;
    return visitors;
  };

  const { width } = useWindowDimensions();
  const currentData = getCurrentData();
  const listPadding = 14;
  const columnGap = 10;
  const contentWidth = width - listPadding * 2;
  const columnWidth = Math.floor((contentWidth - columnGap) / 2);

  const getCardHeight = (item: LikeUser, index: number) => {
    if (!item.profile_picture) return Math.round(columnWidth * 1.02);
    const seed = (item.id?.charCodeAt(0) ?? 0) + index;
    const ratio = seed % 3 === 0 ? 1.34 : seed % 3 === 1 ? 1.18 : 1.27;
    return Math.round(columnWidth * ratio);
  };

  const { leftColumn, rightColumn } = useMemo(() => {
    const left: { item: LikeUser; height: number }[] = [];
    const right: { item: LikeUser; height: number }[] = [];
    let leftHeight = 0;
    let rightHeight = 0;

    currentData.forEach((item, index) => {
      const height = getCardHeight(item, index);
      if (leftHeight <= rightHeight) {
        left.push({ item, height });
        leftHeight += height + columnGap;
      } else {
        right.push({ item, height });
        rightHeight += height + columnGap;
      }
    });

    return { leftColumn: left, rightColumn: right };
  }, [currentData, columnWidth]);

  const renderCard = (item: LikeUser, cardWidth: number, cardHeight: number) => {
    const showWatermark = !isPremium;
    const showChatCta = isPremium && activeTab === 'sent';
    const kmText =
      isPremium && typeof item.distance_km === 'number'
        ? `${item.distance_km < 1 ? (item.distance_km * 1000).toFixed(0) + ' m' : item.distance_km.toFixed(1) + ' km'}`
        : null;
    return (
      <View style={[styles.avatarCell, { width: cardWidth, height: cardHeight }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          onPress={() => handleUserClick(item.id)}
          activeOpacity={0.88}
        >
          {item.profile_picture ? (
            <Image
              source={{ uri: item.profile_picture }}
              style={[styles.avatarImage, { width: cardWidth, height: cardHeight }]}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.avatarPlaceholder, { width: cardWidth, height: cardHeight }]}>
              <User size={cardWidth * 0.4} color="#AAAAAA" />
            </View>
          )}
          <View style={styles.avatarCardOverlay}>
            {!showWatermark && (
              <>
                <View style={styles.cardTitleRow}>
                  <Text style={styles.avatarCardName} numberOfLines={1}>
                    {item.full_name}
                  </Text>
                  {item.verification_status === 'verified' && <VerifiedBadge size={14} verified />}
                </View>
                {kmText ? (
                  <Text style={styles.cardKmText} numberOfLines={1}>
                    {kmText}
                  </Text>
                ) : null}
                <View
                  style={[
                    styles.cardOnlineIndicator,
                    isUserOnlineNow(item.is_online, item.last_seen)
                      ? styles.cardOnlineIndicatorOn
                      : styles.cardOnlineIndicatorOff,
                  ]}
                />
              </>
            )}
          </View>
          {showWatermark && (
            <>
              {/* Blur the photo so non-premium users can't see it */}
              <BlurView
                intensity={32}
                tint="light"
                style={StyleSheet.absoluteFill}
                pointerEvents="none"
              />
              <View style={styles.watermarkOverlay} pointerEvents="none">
              <View style={styles.watermarkPattern}>
                <Text style={styles.watermarkText}>PREMIUM</Text>
                <Text style={styles.watermarkText}>PREMIUM</Text>
                <Text style={styles.watermarkText}>PREMIUM</Text>
              </View>
              <View style={styles.watermarkCenter}>
                <Crown size={28} color="rgba(0,0,0,0.45)" />
                <Text style={styles.watermarkHint}>
                  {L('Bilgileri görmek için Premium', 'Premium to view')}
                </Text>
              </View>
              </View>
            </>
          )}
        </TouchableOpacity>

      </View>
    );
  };

  const getEmptyMessage = () => {
    if (activeTab === 'received') {
      return L('Henüz beğeni almadınız', 'No likes received yet');
    }
    if (activeTab === 'sent') {
      return L('Henüz kimseyi beğenmediniz', 'No likes sent yet');
    }
    return L('Henüz ziyaretçi yok', 'No visitors yet');
  };

  const getActiveTitle = () => {
    if (activeTab === 'received') return L('Seni Beğenenler', 'People Who Like You');
    if (activeTab === 'sent') return L('Beğendiğin Profiller', 'Profiles You Liked');
    return L('Profil Ziyaretçileri', 'Profile Visitors');
  };

  const getActiveSubtitle = () => {
    if (activeTab === 'received') return L('Yeni beğenileri keşfet ve eşleşmeye başla.', 'Discover new likes and start matching.');
    if (activeTab === 'sent') return L('İlgi gösterdiğin kişileri buradan takip et.', 'Track people you have shown interest in.');
    return L('Profilini görüntüleyen kişileri burada gör.', 'See who visited your profile here.');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <HeroFade height={260} fadeFrom={0.5} />
      <View style={styles.headerBlock}>
        <Text style={styles.headerTitle}>{getActiveTitle()}</Text>
        <Text style={styles.headerSubtitle}>{getActiveSubtitle()}</Text>
      </View>

      <View style={styles.tabContainer}>
        <View style={styles.tabSegment}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'received' && styles.activeTab]}
            onPress={() => setActiveTab('received')}>
            <Heart
              size={18}
              color={activeTab === 'received' ? '#FFFFFF' : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'received' && styles.activeTabText,
              ]}>
              {L('Beğeniler', 'Who liked me')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
            onPress={() => setActiveTab('sent')}>
            <ThumbsUp
              size={18}
              color={activeTab === 'sent' ? '#FFFFFF' : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'sent' && styles.activeTabText,
              ]}>
              {L('Beğendiklerim', 'Who I liked')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.tab, activeTab === 'visitors' && styles.activeTab]}
            onPress={() => setActiveTab('visitors')}>
            <Eye
              size={18}
              color={activeTab === 'visitors' ? '#FFFFFF' : theme.textSecondary}
            />
            <Text
              style={[
                styles.tabText,
                activeTab === 'visitors' && styles.activeTabText,
              ]}>
              {L('Ziyaretçiler', 'Visitors')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <HeartLoader />
        </View>
      ) : currentData.length === 0 ? (
        <Animated.View key={`empty-${activeTab}`} entering={FadeInDown.duration(450)} style={styles.emptyContainer}>
          <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyIconWrap}>
            {activeTab === 'received' && <Heart size={38} color="#FFFFFF" fill="#FFFFFF" />}
            {activeTab === 'visitors' && <Eye size={38} color="#FFFFFF" />}
            {activeTab === 'sent' && <ThumbsUp size={38} color="#FFFFFF" />}
          </LinearGradient>
          <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
        </Animated.View>
      ) : (
        <ScrollView contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
          <View style={styles.masonryWrap}>
            <View style={styles.masonryColumn}>
              {leftColumn.map(({ item, height }, index) => (
                <Animated.View
                  key={`l-${activeTab}-${item.id}-${index}`}
                  entering={FadeInDown.delay(Math.min(index, 8) * 90).springify().damping(16)}
                  style={styles.masonryItem}>
                  {renderCard(item, columnWidth, height)}
                </Animated.View>
              ))}
            </View>
            <View style={{ width: columnGap }} />
            <View style={styles.masonryColumn}>
              {rightColumn.map(({ item, height }, index) => (
                <Animated.View
                  key={`r-${activeTab}-${item.id}-${index}`}
                  entering={FadeInDown.delay(45 + Math.min(index, 8) * 90).springify().damping(16)}
                  style={styles.masonryItem}>
                  {renderCard(item, columnWidth, height)}
                </Animated.View>
              ))}
            </View>
          </View>
        </ScrollView>
      )}

      {selectedProfile && (
        <ProfileModal
          visible={profileModalVisible}
          profile={selectedProfile}
          onClose={() => setProfileModalVisible(false)}
          showActionButtons={activeTab === 'received' || activeTab === 'visitors'}
          language={language}
          onLike={
            activeTab === 'received' && !hasChatWithSelectedUser
              ? () =>
                  handleLikeBack(
                    selectedProfile.id,
                    selectedProfile.full_name,
                    selectedProfile.profile_picture
                  )
              : activeTab === 'visitors'
                ? () =>
                    handleLikeVisitor(
                      selectedProfile.id,
                      selectedProfile.full_name,
                      selectedProfile.profile_picture
                    )
                : undefined
          }
        />
      )}

      <MatchCelebrationModal
        visible={!!matchCelebration}
        matchedUser={
          matchCelebration
            ? {
                id: matchCelebration.matchedUser.id,
                full_name: matchCelebration.matchedUser.full_name,
                profile_picture: matchCelebration.matchedUser.profile_picture ?? null,
              }
            : null
        }
        sessionId={matchCelebration?.sessionId}
        onClose={() => setMatchCelebration(null)}
      />
    </SafeAreaView>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.background,
  },
  headerBlock: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#FFFFFF',
  },
  headerSubtitle: {
    marginTop: 4,
    fontSize: 13,
    color: 'rgba(255,255,255,0.9)',
  },
  tabContainer: {
    paddingHorizontal: 14,
    paddingBottom: 12,
  },
  tabSegment: {
    flexDirection: 'row',
    backgroundColor: t.cardBackground,
    borderRadius: 16,
    padding: 4,
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
  },
  activeTab: {
    backgroundColor: t.primary,
  },
  tabText: {
    fontSize: 12,
    fontWeight: '700',
    color: t.textSecondary,
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 14,
    paddingTop: 2,
    paddingBottom: 26,
  },
  masonryWrap: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  masonryColumn: {
    flex: 1,
  },
  masonryItem: {
    marginBottom: 10,
  },
  avatarCell: {
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: '#E6E9EF',
    borderWidth: 1,
    borderColor: '#FFFFFF',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.10,
    shadowRadius: 12,
    elevation: 5,
  },
  avatarImage: {
    borderRadius: 16,
  },
  avatarPlaceholder: {
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E3E7EE',
  },
  avatarCardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: 'rgba(0,0,0,0.28)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    flex: 1,
    minWidth: 0,
  },
  cardKmText: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.92)',
    fontSize: 11,
    fontWeight: '700',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  avatarCardName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textShadowColor: 'rgba(0,0,0,0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  cardOnlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  cardOnlineIndicatorOn: {
    backgroundColor: '#4ECB71',
  },
  cardOnlineIndicatorOff: {
    backgroundColor: '#9E9E9E',
  },
  chatFab: {
    position: 'absolute',
    right: 70,
    bottom: 3,
    width: 25,
    height: 25,
    borderRadius: 19,
    backgroundColor: t.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#101828',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 6,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 72,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: t.textSecondary,
    marginTop: 16,
  },
  watermarkOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(200,200,200,0.82)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  watermarkPattern: {
    position: 'absolute',
    transform: [{ rotate: '-22deg' }],
    opacity: 0.25,
  },
  watermarkText: {
    fontSize: 11,
    fontWeight: '800',
    color: 'rgba(0,0,0,0.35)',
    letterSpacing: 4,
  },
  watermarkCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  watermarkHint: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(0,0,0,0.5)',
  },
});
