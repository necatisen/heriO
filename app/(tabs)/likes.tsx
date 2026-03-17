import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Heart, Eye, ThumbsUp, UserPlus, MessageCircle, User, Crown } from 'lucide-react-native';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { getEffectiveSubscription } from '@/lib/subscription';
import ProfileModal from '@/components/ProfileModal';
import MatchCelebrationModal from '@/components/MatchCelebrationModal';
import { useRouter, useFocusEffect } from 'expo-router';
import { useMemo } from 'react';

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
  is_verified?: boolean;
  face_verified?: boolean;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
};

type Tab = 'received' | 'visitors' | 'sent';

export default function LikesScreen() {
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
        const t = setTimeout(() => fetchData(), 600);
        return () => clearTimeout(t);
      }
    }, [user, activeTab])
  );

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
    setLoading(true);
    try {
      await Promise.all([fetchLikesReceived(), fetchLikesSent(), fetchVisitors()]);
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
      .select('id, full_name, username, bio, profile_picture, is_online, is_verified, face_verified, verification_status')
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

    let formatted = profilesData.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      bio: p.bio ?? '',
      profile_picture: p.profile_picture ?? null,
      created_at: byCreated.get(p.id) ?? '',
      is_mutual: mutualLikeIds.has(p.id),
      is_friend: friendIds.has(p.id),
      is_online: p.is_online ?? false,
      is_verified: p.is_verified ?? false,
      face_verified: p.face_verified ?? false,
      verification_status: p.verification_status ?? 'unverified',
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

    setLikesReceived(formatted);
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
      .select('id, full_name, username, bio, profile_picture, is_online, is_verified, face_verified, verification_status')
      .in('id', uniqueIds);

    if (profilesError || !profilesData) {
      setLikesSent([]);
      return;
    }

    const byCreated = new Map<string, string>();
    likesData.forEach((l: any) => {
      if (!byCreated.has(l.liked_user_id)) byCreated.set(l.liked_user_id, l.created_at);
    });
    let formatted = profilesData.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      bio: p.bio ?? '',
      profile_picture: p.profile_picture ?? null,
      created_at: byCreated.get(p.id) ?? '',
      is_online: p.is_online ?? false,
      is_verified: p.is_verified ?? false,
      face_verified: p.face_verified ?? false,
      verification_status: p.verification_status ?? 'unverified',
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

    setLikesSent(formatted);
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
      .select('id, full_name, username, bio, profile_picture, is_online, is_verified, face_verified, verification_status')
      .in('id', uniqueIds);

    if (profilesError || !profilesData) {
      setVisitors([]);
      return;
    }

    const byCreated = new Map<string, string>();
    viewsData.forEach((v: any) => {
      if (!byCreated.has(v.viewer_id)) byCreated.set(v.viewer_id, v.created_at);
    });
    let formatted = profilesData.map((p: any) => ({
      id: p.id,
      full_name: p.full_name,
      username: p.username,
      bio: p.bio ?? '',
      profile_picture: p.profile_picture ?? null,
      created_at: byCreated.get(p.id) ?? '',
      is_online: p.is_online ?? false,
      is_verified: p.is_verified ?? false,
      face_verified: p.face_verified ?? false,
      verification_status: p.verification_status ?? 'unverified',
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

    setVisitors(formatted);
  };

  const handleUserClick = async (userId: string) => {
    if (!isPremium) {
      Alert.alert(
        language === 'tr' ? 'Premium gerekli' : 'Premium required',
        language === 'tr'
          ? 'Bilgileri görebilmeniz için Premium olmalısınız.'
          : 'You need to be Premium to view this profile.',
        [
          { text: language === 'tr' ? 'Tamam' : 'OK', style: 'cancel' },
          { text: language === 'tr' ? 'Premium al' : 'Get Premium', onPress: () => router.push('/store/premium') },
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
        language === 'tr' ? 'Başarılı' : 'Success',
        language === 'tr' ? 'Arkadaşlık isteği gönderildi' : 'Friend request sent'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to send friend request');
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
        language === 'tr' ? 'Hata' : 'Error',
        e?.message || (language === 'tr' ? 'Beğeni gönderilemedi.' : 'Could not send like.')
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
        from_user_id: user?.id,
        type: 'match',
      });

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
      Alert.alert('Error', error.message || 'Failed to create match');
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
      Alert.alert('Error', error.message || 'Failed to start chat');
    }
  };

  const getCurrentData = (): LikeUser[] => {
    if (activeTab === 'received') return likesReceived;
    if (activeTab === 'sent') return displayedSent;
    return visitors;
  };

  const { width } = useWindowDimensions();
  const padding = 14;
  const gap = 10;
  const stagger = 18;
  const contentWidth = width - padding * 2;
  const leftCardWidth = Math.floor(contentWidth * 0.42);
  const rightCardWidth = contentWidth - leftCardWidth - gap;
  const leftCardHeight = Math.floor(leftCardWidth * 1.72);
  const rightCardHeight = Math.floor(rightCardWidth * 0.88);

  const currentData = getCurrentData();
  const rowPairs: (LikeUser | null)[][] = [];
  for (let i = 0; i < currentData.length; i += 2) {
    rowPairs.push([currentData[i], currentData[i + 1] ?? null]);
  }

  const renderCard = (item: LikeUser, cardWidth: number, cardHeight: number) => {
    const showWatermark = !isPremium;
    return (
      <TouchableOpacity
        style={[styles.avatarCell, { width: cardWidth, height: cardHeight }]}
        onPress={() => handleUserClick(item.id)}
        activeOpacity={0.88}>
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
              <Text style={styles.avatarCardName} numberOfLines={1}>
                {item.full_name}
              </Text>
              {item.verification_status === 'verified' && (
                <VerifiedBadge size={14} verified />
              )}
              <View
                style={[
                  styles.cardOnlineIndicator,
                  item.is_online ? styles.cardOnlineIndicatorOn : styles.cardOnlineIndicatorOff,
                ]}
              />
            </>
          )}
        </View>
        {showWatermark && (
          <View style={styles.watermarkOverlay} pointerEvents="none">
            <View style={styles.watermarkPattern}>
              <Text style={styles.watermarkText}>PREMIUM</Text>
              <Text style={styles.watermarkText}>PREMIUM</Text>
              <Text style={styles.watermarkText}>PREMIUM</Text>
            </View>
            <View style={styles.watermarkCenter}>
              <Crown size={28} color="rgba(0,0,0,0.45)" />
              <Text style={styles.watermarkHint}>
                {language === 'tr' ? 'Bilgileri görmek için Premium' : 'Premium to view'}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const renderRow = ({ item: pair, index }: { item: (LikeUser | null)[]; index: number }) => (
    <View style={[styles.staggerRow, index > 0 && { marginTop: stagger }]}>
      {pair[0] && renderCard(pair[0], leftCardWidth, leftCardHeight)}
      <View style={{ width: gap }} />
      {pair[1] ? renderCard(pair[1], rightCardWidth, rightCardHeight) : <View style={{ width: rightCardWidth }} />}
    </View>
  );

  const getEmptyMessage = () => {
    if (activeTab === 'received') {
      return language === 'tr' ? 'Henüz beğeni almadınız' : 'No likes received yet';
    }
    if (activeTab === 'sent') {
      return language === 'tr' ? 'Henüz kimseyi beğenmediniz' : 'No likes sent yet';
    }
    return language === 'tr' ? 'Henüz ziyaretçi yok' : 'No visitors yet';
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === 'received' && styles.activeTab]}
          onPress={() => setActiveTab('received')}>
          <Heart
            size={20}
            color={activeTab === 'received' ? '#FF6B9D' : '#666666'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'received' && styles.activeTabText,
            ]}>
            {language === 'tr' ? 'Beğeniler' : 'Who liked me'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'sent' && styles.activeTab]}
          onPress={() => setActiveTab('sent')}>
          <ThumbsUp
            size={20}
            color={activeTab === 'sent' ? '#FF6B9D' : '#666666'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'sent' && styles.activeTabText,
            ]}>
            {language === 'tr' ? 'Beğendiklerim' : 'Who I liked'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === 'visitors' && styles.activeTab]}
          onPress={() => setActiveTab('visitors')}>
          <Eye
            size={20}
            color={activeTab === 'visitors' ? '#FF6B9D' : '#666666'}
          />
          <Text
            style={[
              styles.tabText,
              activeTab === 'visitors' && styles.activeTabText,
            ]}>
            {language === 'tr' ? 'Ziyaretçiler' : 'Visitors'}
          </Text>
        </TouchableOpacity>
      </View>

      {!isPremium && (getCurrentData().length > 0) && (
        <View style={styles.visitorsPremiumBanner}>
          <Text style={styles.visitorsPremiumBannerText}>
            {language === 'tr'
              ? 'Listedeki kişilerin bilgilerini görmek için Premium\'a geçin.'
              : 'Go Premium to view details of people in the list.'}
          </Text>
          <TouchableOpacity
            style={styles.visitorsPremiumCta}
            onPress={() => router.push('/store/premium')}>
            <Text style={styles.visitorsPremiumCtaText}>
              {language === 'tr' ? 'Premium ol' : 'Go Premium'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B9D" />
        </View>
      ) : (
        <FlatList
          data={rowPairs}
          renderItem={renderRow}
          keyExtractor={(_, index) => `row-${index}`}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              {activeTab === 'received' && <Heart size={80} color="#CCCCCC" />}
              {activeTab === 'visitors' && <Eye size={80} color="#CCCCCC" />}
              {activeTab === 'sent' && <ThumbsUp size={80} color="#CCCCCC" />}
              <Text style={styles.emptyText}>{getEmptyMessage()}</Text>
            </View>
          }
        />
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
    backgroundColor: '#F5F5F5',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 16,
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#FF6B9D',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  activeTabText: {
    color: '#FF6B9D',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  listContent: {
    padding: 14,
    paddingBottom: 24,
  },
  staggerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  avatarCell: {
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#E8E8E8',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  avatarImage: {
    borderRadius: 12,
  },
  avatarPlaceholder: {
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#E2E2E2',
  },
  avatarCardOverlay: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 6,
    paddingHorizontal: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
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
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666666',
    marginTop: 16,
  },
  visitorsPremiumBanner: {
    backgroundColor: '#FFF4E5',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
    alignItems: 'center',
  },
  visitorsPremiumBannerText: {
    fontSize: 13,
    color: '#E65100',
    textAlign: 'center',
    marginBottom: 10,
  },
  visitorsPremiumCta: {
    backgroundColor: '#FF6B9D',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  visitorsPremiumCtaText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
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
