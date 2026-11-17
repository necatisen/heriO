import { useState, useEffect, useCallback, useRef } from 'react';
import HeroFade from '@/components/HeroFade';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Swipeable } from 'react-native-gesture-handler';
import { MessageCircle, Trash2, Sparkles } from 'lucide-react-native';
import Animated, { FadeInDown, FadeInRight, LinearTransition } from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import BouncyButton from '@/components/BouncyButton';
import GradientButton from '@/components/GradientButton';
import { BrandLogo } from '@/components/BrandLogo';
import { ChatListSkeleton } from '@/components/Skeleton';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import ProfileModal from '@/components/ProfileModal';
import { formatLastMessageTime } from '@/lib/dateFormat';

import { loadChatList, type Match, type Conversation } from '@/lib/chatList';
import { peekCache, readCache, writeCache } from '@/lib/cache';

import { L } from '@/lib/l10n';
export default function ChatListScreen() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const router = useRouter();
  const cacheKey = user ? `chatlist:${user.id}` : '';
  const cachedList = cacheKey ? peekCache<{ matches: Match[]; conversations: Conversation[] }>(cacheKey) : undefined;
  const [matches, setMatches] = useState<Match[]>(cachedList?.matches ?? []);
  const [conversations, setConversations] = useState<Conversation[]>(cachedList?.conversations ?? []);
  const [loading, setLoading] = useState(!cachedList);
  const [refreshing, setRefreshing] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const hasDataRef = useRef(!!cachedList);
  const refreshTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Show the last known list instantly (from disk on a cold start).
  useEffect(() => {
    if (!cacheKey || hasDataRef.current) return;
    readCache<{ matches: Match[]; conversations: Conversation[] }>(cacheKey).then((c) => {
      if (!c || hasDataRef.current) return;
      hasDataRef.current = true;
      setMatches(c.matches);
      setConversations(c.conversations);
      setLoading(false);
    });
  }, [cacheKey]);

  const refreshAll = useCallback(async () => {
    if (!user) return;
    // Full-screen loader only when there is nothing to show yet; otherwise refresh silently.
    if (!hasDataRef.current) setLoading(true);
    try {
      const data = await loadChatList(user.id, language);
      if (!data) return;
      hasDataRef.current = true;
      setMatches(data.matches);
      setConversations(data.conversations);
      writeCache(`chatlist:${user.id}`, data);
    } finally {
      setLoading(false);
    }
  }, [user, language]);

  // Realtime events can arrive in bursts; collapse them into one refresh.
  const scheduleRefresh = useCallback(() => {
    if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
    refreshTimerRef.current = setTimeout(() => refreshAll(), 400);
  }, [refreshAll]);

  useFocusEffect(
    useCallback(() => {
      if (user) refreshAll();
    }, [user, refreshAll])
  );

  useEffect(() => {
    if (!user) return;

    const friendsSubscription = supabase
      .channel('friends_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'friends', filter: `user_id=eq.${user.id}` }, scheduleRefresh)
      .subscribe();

    const messagesSubscription = supabase
      .channel('messages_changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `receiver_id=eq.${user.id}` }, scheduleRefresh)
      .subscribe();

    return () => {
      if (refreshTimerRef.current) clearTimeout(refreshTimerRef.current);
      supabase.removeChannel(friendsSubscription);
      supabase.removeChannel(messagesSubscription);
    };
  }, [user, scheduleRefresh]);

  const handleMatchClick = async (matchId: string) => {
    try {
      const { data: existingSession, error } = await supabase
        .from('chat_sessions')
        .select('id')
        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${matchId}),and(user1_id.eq.${matchId},user2_id.eq.${user?.id})`)
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
            user2_id: matchId,
            status: 'active',
          })
          .select('id')
          .single();

        if (createError) throw createError;
        sessionId = newSession.id;
      }

      router.push(`/conversation/${sessionId}?friendId=${matchId}`);
    } catch (error: any) {
      Alert.alert(L('Hata', 'Error'), error.message || L('Sohbet başlatılamadı', 'Failed to start chat'));
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    router.push(`/conversation/${conversation.id}?friendId=${conversation.other_user_id}`);
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    Alert.alert(
      L('Sohbeti Sil', 'Delete Conversation'),
      L('"{0}" ile tüm sohbet geçmişi silinecek. Emin misiniz?', 'Delete entire chat history with {0}? This cannot be undone.', [conversation.other_user_name]),
      [
        { text: L('İptal', 'Cancel'), style: 'cancel' },
        {
          text: L('Sil', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              // RLS doesn't allow deleting chat_sessions; instead, end the session (hides it from the list).
              const { error } = await supabase
                .from('chat_sessions')
                .update({ status: 'ended', ended_at: new Date().toISOString() })
                .eq('id', conversation.id);
              if (error) throw error;
              setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
            } catch (e: any) {
              Alert.alert('', e?.message || (L('Sohbet silinemedi.', 'Failed to delete conversation.')));
            }
          },
        },
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll();
    setRefreshing(false);
  }, [refreshAll]);

  const showProfile = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) throw error;
      setSelectedProfile(data);
      setProfileModalVisible(true);
    } catch (error: any) {
      Alert.alert(L('Hata', 'Error'), error.message || L('Profil yüklenemedi', 'Failed to load profile'));
    }
  };

  const isTr = language === 'tr';
  const unreadTotal = conversations.reduce((n, c) => n + c.unread_count, 0);

  const renderMatch = ({ item, index }: { item: Match; index: number }) => (
    <Animated.View entering={FadeInRight.delay(index * 60).springify().damping(16)}>
      <BouncyButton style={styles.matchItem} onPress={() => handleMatchClick(item.id)}>
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.matchRing}>
          <View style={[styles.matchRingInner, { backgroundColor: theme.background }]}>
            {item.profile_picture ? (
              <Image source={{ uri: item.profile_picture }} style={styles.matchAvatar} />
            ) : (
              <View style={[styles.matchAvatar, styles.center, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.initial, { color: theme.primary }]}>{item.full_name?.charAt(0) || '?'}</Text>
              </View>
            )}
          </View>
        </LinearGradient>
        <View style={styles.newDot} />
        <Text style={[styles.matchName, { color: theme.onGradient }, styles.onHeroShadow]} numberOfLines={1}>
          {item.full_name?.split(' ')[0]}
        </Text>
      </BouncyButton>
    </Animated.View>
  );

  const renderRightActions = (item: Conversation) => (
    <TouchableOpacity style={styles.conversationDeleteStrip} onPress={() => handleDeleteConversation(item)} activeOpacity={0.8}>
      <Trash2 size={22} color="#FFFFFF" />
      <Text style={styles.conversationDeleteText}>{L('Sil', 'Delete')}</Text>
    </TouchableOpacity>
  );

  const renderConversation = ({ item, index }: { item: Conversation; index: number }) => {
    const unread = item.unread_count > 0;
    return (
      <Animated.View entering={index < 12 ? FadeInDown.delay(index * 45).duration(380) : undefined} layout={LinearTransition}>
        <Swipeable renderRightActions={() => renderRightActions(item)} friction={2}>
          <TouchableOpacity
            activeOpacity={0.7}
            style={[
              styles.conversationItem,
              { backgroundColor: theme.cardBackground, borderColor: unread ? theme.primary + '40' : 'transparent' },
            ]}
            onPress={() => handleConversationClick(item)}>
            {item.other_user_picture ? (
              <Image source={{ uri: item.other_user_picture }} style={styles.conversationAvatar} />
            ) : (
              <View style={[styles.conversationAvatar, styles.center, { backgroundColor: theme.primaryLight }]}>
                <Text style={[styles.initial, { color: theme.primary }]}>{item.other_user_name?.charAt(0) || '?'}</Text>
              </View>
            )}
            <View style={styles.conversationInfo}>
              <Text style={[styles.conversationName, { color: theme.text }]} numberOfLines={1}>
                {item.other_user_name}
              </Text>
              <Text
                style={[
                  styles.conversationLastMessage,
                  { color: unread ? theme.text : theme.textSecondary, fontWeight: unread ? '600' : '400' },
                ]}
                numberOfLines={1}>
                {item.last_message}
              </Text>
            </View>
            <View style={styles.conversationMeta}>
              <Text style={[styles.conversationTime, { color: unread ? theme.primary : theme.textSecondary }]}>
                {formatLastMessageTime(item.last_message_time)}
              </Text>
              {unread && (
                <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
                </LinearGradient>
              )}
            </View>
          </TouchableOpacity>
        </Swipeable>
      </Animated.View>
    );
  };

  const header = (
    <View style={styles.header}>
      <View>
        <Text style={[styles.headerTitle, { color: theme.onGradient }]}>{L('Mesajlar', 'Messages')}</Text>
        <Text style={[styles.headerSub, { color: theme.onGradient, opacity: 0.9 }]}>
          {unreadTotal > 0
            ? L('{0} okunmamış mesaj', '{0} unread', [unreadTotal])
            : L('Hepsi okundu', 'All caught up')}
        </Text>
      </View>
      <BrandLogo size="sm" showWordmark={false} />
    </View>
  );

  if (loading && conversations.length === 0 && matches.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <HeroFade height={180} fadeFrom={0.5} />
        {header}
        <ChatListSkeleton />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <HeroFade height={matches.length > 0 ? 330 : 180} fadeFrom={matches.length > 0 ? 0.68 : 0.5} />
      {header}

      {matches.length > 0 && (
        <View style={styles.matchesSection}>
          <View style={styles.sectionRow}>
            <Sparkles size={16} color={theme.onGradient} />
            <Text style={[styles.sectionTitle, { color: theme.onGradient }]}>{L('Yeni eşleşmeler', 'New matches')}</Text>
            <View style={[styles.countPill, { backgroundColor: 'rgba(255,255,255,0.25)' }]}>
              <Text style={[styles.countPillText, { color: theme.onGradient }]}>{matches.length}</Text>
            </View>
          </View>
          <FlatList
            data={matches}
            renderItem={renderMatch}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.matchesList}
          />
        </View>
      )}

      <View style={styles.conversationsSection}>
        <Text style={[styles.sectionTitle, styles.sectionTitlePad, { color: theme.text }]}>{L('Sohbetler', 'Chats')}</Text>
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.conversationsList}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />}
          ListEmptyComponent={
            <Animated.View entering={FadeInDown.duration(500)} style={styles.emptyContainer}>
              <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.emptyIcon}>
                <MessageCircle size={36} color="#FFFFFF" />
              </LinearGradient>
              <Text style={[styles.emptyTitle, { color: theme.text }]}>{L('Henüz sohbet yok', 'No chats yet')}</Text>
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {L('Keşfet sekmesinde birini beğen; eşleşince sohbetin burada başlar.', 'Like someone in Explore; when you match, your chat starts here.')}
              </Text>
              <GradientButton
                title={L('Keşfetmeye başla', 'Start exploring')}
                onPress={() => router.push('/(tabs)/explore')}
                style={{ marginTop: 20, alignSelf: 'stretch' }}
              />
            </Animated.View>
          }
        />
      </View>

      {selectedProfile && (
        <ProfileModal
          visible={profileModalVisible}
          profile={selectedProfile}
          onClose={() => {
            setProfileModalVisible(false);
            setSelectedProfile(null);
          }}
          showActionButtons={false}
          language={language}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  center: { justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 8,
  },
  headerTitle: { fontSize: 30, fontWeight: '900', letterSpacing: -0.6 },
  headerSub: { fontSize: 13, marginTop: 2 },
  matchesSection: { paddingTop: 12, paddingBottom: 8 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 20, marginBottom: 12 },
  sectionTitle: { fontSize: 16, fontWeight: '800' },
  sectionTitlePad: { paddingHorizontal: 20, marginBottom: 10 },
  countPill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 },
  countPillText: { fontSize: 12, fontWeight: '800' },
  matchesList: { paddingHorizontal: 16, gap: 14 },
  matchItem: { alignItems: 'center', width: 76 },
  matchRing: { width: 72, height: 72, borderRadius: 36, padding: 3 },
  matchRingInner: { flex: 1, borderRadius: 33, padding: 2 },
  matchAvatar: { width: '100%', height: '100%', borderRadius: 31 },
  newDot: {
    position: 'absolute',
    top: 2,
    right: 6,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#22C55E',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  onHeroShadow: { textShadowColor: 'rgba(0,0,0,0.25)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 3 },
  matchName: { fontSize: 12, fontWeight: '700', textAlign: 'center', marginTop: 6 },
  initial: { fontSize: 22, fontWeight: '800' },
  conversationsSection: { flex: 1, paddingTop: 12 },
  conversationsList: { paddingHorizontal: 16, paddingBottom: 24 },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 18,
    marginBottom: 10,
    gap: 12,
    borderWidth: 1,
    shadowColor: '#1E1450',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 10,
    elevation: 2,
  },
  conversationDeleteStrip: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 10,
    borderRadius: 18,
    backgroundColor: '#EF4444',
  },
  conversationDeleteText: { color: '#FFFFFF', fontSize: 12, fontWeight: '700', marginTop: 4 },
  conversationAvatar: { width: 54, height: 54, borderRadius: 27 },
  conversationInfo: { flex: 1, minWidth: 0 },
  conversationMeta: { alignItems: 'flex-end', gap: 6 },
  conversationTime: { fontSize: 12, fontWeight: '600' },
  conversationName: { fontSize: 16, fontWeight: '800', marginBottom: 3 },
  conversationLastMessage: { fontSize: 14 },
  unreadBadge: { borderRadius: 11, minWidth: 22, height: 22, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 7 },
  unreadText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
  emptyContainer: { alignItems: 'center', paddingVertical: 48, paddingHorizontal: 24 },
  emptyIcon: { width: 84, height: 84, borderRadius: 28, alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  emptyTitle: { fontSize: 20, fontWeight: '800' },
  emptyText: { fontSize: 15, marginTop: 8, textAlign: 'center', lineHeight: 22 },
});
