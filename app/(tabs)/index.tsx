import { useState, useEffect, useCallback } from 'react';
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
import { MessageCircle, User, Trash2 } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { useRouter, useFocusEffect } from 'expo-router';
import ProfileModal from '@/components/ProfileModal';
import { formatLastMessageTime } from '@/lib/dateFormat';
import HeartLoader from '@/components/HeartLoader';

type Match = {
  id: string;
  full_name: string;
  profile_picture: string | null;
};

type Conversation = {
  id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_picture: string | null;
  last_message: string;
  last_message_time: string;
  unread_count: number;
};

export default function ChatListScreen() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  const refreshAll = useCallback(async (opts?: { showSpinner?: boolean }) => {
    if (!user) return;
    if (opts?.showSpinner !== false) setLoading(true);
    try {
      await Promise.all([fetchMatches(), fetchConversations()]);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        refreshAll();
      }
    }, [user, refreshAll])
  );

  useEffect(() => {
    if (!user) return;

    const friendsSubscription = supabase
      .channel('friends_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'friends',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          refreshAll({ showSpinner: false });
        }
      )
      .subscribe();

    const messagesSubscription = supabase
      .channel('messages_changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        () => {
          refreshAll({ showSpinner: false });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(friendsSubscription);
      supabase.removeChannel(messagesSubscription);
    };
  }, [user]);

  const fetchMatches = async () => {
    try {
      const { data: friendsData, error } = await supabase
        .from('friends')
        .select('friend_id')
        .eq('user_id', user?.id)
        .eq('status', 'accepted');

      if (error || !friendsData) {
        setMatches([]);
        return;
      }

      const friendIds = friendsData.map(f => f.friend_id);

      const { data: sessionsData } = await supabase
        .from('chat_sessions')
        .select('user1_id, user2_id')
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .eq('status', 'active');

      const sessionUserIds = new Set(
        sessionsData?.map(s =>
          s.user1_id === user?.id ? s.user2_id : s.user1_id
        ) || []
      );

      const matchIdsWithoutChat = friendIds.filter(id => !sessionUserIds.has(id));

      if (matchIdsWithoutChat.length === 0) {
        setMatches([]);
        return;
      }

      const { data: profilesData } = await supabase
        .from('profiles')
        .select('id, full_name, profile_picture')
        .in('id', matchIdsWithoutChat);

      const formatted = profilesData?.map((profile: any) => ({
        id: profile.id,
        full_name: profile.full_name,
        profile_picture: profile.profile_picture,
      })) || [];

      setMatches(formatted);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const fetchConversations = async () => {
    try {
      // Fetch only the latest message per session for speed.
      const { data: sessions, error } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          user1_id,
          user2_id,
          started_at,
          messages(content, created_at, is_read, sender_id, receiver_id, attachment_url, attachment_type)
        `)
        .or(`user1_id.eq.${user?.id},user2_id.eq.${user?.id}`)
        .eq('status', 'active')
        .order('started_at', { ascending: false })
        .order('created_at', { referencedTable: 'messages', ascending: false })
        .limit(1, { referencedTable: 'messages' });

      if (!error && sessions) {
        // Unread counts in one lightweight query (only unread rows).
        const { data: unreadRows } = await supabase
          .from('messages')
          .select('session_id')
          .eq('receiver_id', user?.id)
          .eq('is_read', false);
        const unreadBySession: Record<string, number> = {};
        (unreadRows || []).forEach((r: any) => {
          if (!r?.session_id) return;
          unreadBySession[r.session_id] = (unreadBySession[r.session_id] || 0) + 1;
        });

        // 1) Tüm karşı taraf kullanıcı id'lerini topla
        const otherUserIds = Array.from(
          new Set(
            sessions
              .map((s: any) => (s.user1_id === user?.id ? s.user2_id : s.user1_id))
              .filter(Boolean)
          )
        );

        // 2) Tek sorguda tüm profilleri çek (IN)
        const { data: users } = await supabase
          .from('profiles')
          .select('id, full_name, profile_picture')
          .in('id', otherUserIds);

        const usersById: Record<string, { id: string; full_name: string; profile_picture: string | null }> =
          Object.fromEntries((users || []).map((u: any) => [u.id, u]));

        // 2b) Engellemeleri al: ben onu engelledim mi / o beni engelledi mi?
        const blockedIdsByMe = new Set<string>();
        const blockedMeIds = new Set<string>();
        if (user?.id) {
          const { data: blocks } = await supabase
            .from('blocks')
            .select('user_id, blocked_user_id')
            .or(
              `user_id.eq.${user.id},blocked_user_id.eq.${user.id}`
            );
          (blocks || []).forEach((b: any) => {
            if (b.user_id === user.id) {
              blockedIdsByMe.add(b.blocked_user_id);
            }
            if (b.blocked_user_id === user.id) {
              blockedMeIds.add(b.user_id);
            }
          });
        }

        // 3) Session listesi ile profilleri localde eşleştir
        const conversationsWithDetails = sessions
          .map((session: any) => {
          const otherUserId = session.user1_id === user?.id ? session.user2_id : session.user1_id;
          const otherUser = usersById[otherUserId];

          // Eğer iki taraflı bir engelleme varsa, bu sohbeti listeden çıkar
          if (
            (user?.id && blockedIdsByMe.has(otherUserId)) ||
            (user?.id && blockedMeIds.has(otherUserId))
          ) {
            return null;
          }

          const lastMessage = (session.messages || [])[0];
          const unreadCount = unreadBySession[session.id] || 0;

          let lastText = language === 'tr' ? 'Henüz mesaj yok' : 'No messages yet';
          if (lastMessage) {
            if (lastMessage.attachment_url && (lastMessage.attachment_type === 'image' || !lastMessage.attachment_type)) {
              lastText = language === 'tr' ? '📷 Fotoğraf' : '📷 Photo';
            } else if (lastMessage.content) {
              lastText = lastMessage.content;
            }
          }

          return {
            id: session.id,
            other_user_id: otherUserId,
            other_user_name: otherUser?.full_name || 'Unknown',
            other_user_picture: otherUser?.profile_picture || null,
            last_message: lastText,
            last_message_time: lastMessage?.created_at || session.started_at,
            unread_count: unreadCount,
          };
        })
          .filter(Boolean) as Conversation[];
        
        // Yeni mesaj gelen sohbet her zaman en üstte görünsün.
        const sortedConversations = conversationsWithDetails.sort((a, b) => {
          const ta = new Date(a.last_message_time).getTime();
          const tb = new Date(b.last_message_time).getTime();
          return (Number.isNaN(tb) ? 0 : tb) - (Number.isNaN(ta) ? 0 : ta);
        });

        setConversations(sortedConversations);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

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
      Alert.alert('Error', error.message || 'Failed to start chat');
    }
  };

  const handleConversationClick = (conversation: Conversation) => {
    router.push(`/conversation/${conversation.id}?friendId=${conversation.other_user_id}`);
  };

  const handleDeleteConversation = (conversation: Conversation) => {
    Alert.alert(
      language === 'tr' ? 'Sohbeti Sil' : 'Delete Conversation',
      language === 'tr'
        ? `"${conversation.other_user_name}" ile tüm sohbet geçmişi silinecek. Emin misiniz?`
        : `Delete entire chat history with ${conversation.other_user_name}? This cannot be undone.`,
      [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tr' ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('chat_sessions').delete().eq('id', conversation.id);
              if (error) throw error;
              setConversations((prev) => prev.filter((c) => c.id !== conversation.id));
            } catch (e: any) {
              Alert.alert('', e?.message || (language === 'tr' ? 'Sohbet silinemedi.' : 'Failed to delete conversation.'));
            }
          },
        },
      ]
    );
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refreshAll({ showSpinner: false });
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
      Alert.alert('Error', error.message || 'Failed to load profile');
    }
  };

  const renderMatch = ({ item }: { item: Match }) => (
    <TouchableOpacity style={styles.matchItem} onPress={() => handleMatchClick(item.id)}>
      {item.profile_picture ? (
        <Image source={{ uri: item.profile_picture }} style={styles.matchAvatar} />
      ) : (
        <View style={[styles.matchAvatarPlaceholder, { backgroundColor: theme.background, borderColor: theme.border }]}>
          <User size={24} color={theme.textSecondary} />
        </View>
      )}
      <Text style={[styles.matchName, { color: theme.text }]} numberOfLines={1}>
        {item.full_name}
      </Text>
    </TouchableOpacity>
  );

  const renderRightActions = (item: Conversation) => (
    <TouchableOpacity
      style={styles.conversationDeleteStrip}
      onPress={() => handleDeleteConversation(item)}
      activeOpacity={0.8}>
      <Trash2 size={24} color="#FFFFFF" />
      <Text style={styles.conversationDeleteText}>{language === 'tr' ? 'Sil' : 'Delete'}</Text>
    </TouchableOpacity>
  );

  const renderConversation = ({ item }: { item: Conversation }) => (
    <Swipeable renderRightActions={() => renderRightActions(item)} friction={2}>
      <TouchableOpacity
        style={[styles.conversationItem, { backgroundColor: theme.cardBackground }]}
        onPress={() => handleConversationClick(item)}>
        {item.other_user_picture ? (
          <Image source={{ uri: item.other_user_picture }} style={styles.conversationAvatar} />
        ) : (
          <View style={[styles.conversationAvatarPlaceholder, { backgroundColor: theme.background, borderColor: theme.border }]}>
            <User size={32} color={theme.textSecondary} />
          </View>
        )}
        <View style={styles.conversationInfo}>
          <Text style={[styles.conversationName, { color: theme.text }]} numberOfLines={1}>
            {item.other_user_name}
          </Text>
          <Text style={[styles.conversationLastMessage, { color: theme.textSecondary }]} numberOfLines={1}>
            {item.last_message}
          </Text>
        </View>
        <View style={styles.conversationMeta}>
          <Text style={[styles.conversationTime, { color: theme.textSecondary }]}>
            {formatLastMessageTime(item.last_message_time, language)}
          </Text>
          {item.unread_count > 0 && (
            <View style={[styles.unreadBadge, { backgroundColor: theme.primary }]}>
              <Text style={styles.unreadText}>{item.unread_count > 99 ? '99+' : item.unread_count}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    </Swipeable>
  );

  if (loading && conversations.length === 0) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.header, { borderBottomColor: theme.border }]}>
          <MessageCircle size={32} color={theme.primary} />
          <Text style={[styles.headerTitle, { color: theme.text }]}>
            {language === 'tr' ? 'Mesajlar' : 'Messages'}
          </Text>
        </View>
        <View style={styles.loadingContainer}>
          <HeartLoader />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <View style={[styles.header, { borderBottomWidth: 1, borderBottomColor: theme.border }]}>
        <MessageCircle size={32} color={theme.primary} />
        <Text style={[styles.headerTitle, { color: theme.text }]}>
          {language === 'tr' ? 'Mesajlar' : 'Messages'}
        </Text>
      </View>

      {matches.length > 0 && (
        <View style={[styles.matchesSection, { borderBottomColor: theme.border }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {language === 'tr' ? 'Eşleşmeler' : 'Matches'}
          </Text>
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
        <Text style={[styles.sectionTitle, { color: theme.text }]}>
          {language === 'tr' ? 'Sohbetler' : 'Conversations'}
        </Text>
        <FlatList
          data={conversations}
          renderItem={renderConversation}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.conversationsList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[theme.primary]} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MessageCircle size={64} color={theme.textSecondary} />
              <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
                {language === 'tr' ? 'Henüz mesajınız yok' : 'No messages yet'}
              </Text>
            </View>
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
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  matchesSection: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  matchesList: {
    paddingHorizontal: 16,
    gap: 12,
  },
  matchItem: {
    alignItems: 'center',
    width: 80,
  },
  matchAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginBottom: 8,
  },
  matchAvatarPlaceholder: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  matchName: {
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  conversationsSection: {
    flex: 1,
    paddingTop: 16,
  },
  conversationsList: {
    paddingHorizontal: 16,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    marginBottom: 8,
    gap: 12,
  },
  conversationDeleteStrip: {
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    marginBottom: 8,
    borderRadius: 12,
    backgroundColor: '#E53935',
  },
  conversationDeleteText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
  conversationAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  conversationAvatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  conversationInfo: {
    flex: 1,
    minWidth: 0,
  },
  conversationMeta: {
    alignItems: 'flex-end',
    gap: 4,
  },
  conversationTime: {
    fontSize: 12,
  },
  conversationName: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  conversationLastMessage: {
    fontSize: 14,
    color: '#666666',
  },
  unreadBadge: {
    backgroundColor: '#FF6B9D',
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  unreadText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
