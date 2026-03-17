import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Users, UserPlus, UserMinus, Ban, MessageCircle } from 'lucide-react-native';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'expo-router';
import ProfileModal from '@/components/ProfileModal';

type Friend = {
  id: string;
  friend_id: string;
  status: string;
  full_name: string;
  username: string;
  bio: string;
  is_verified?: boolean;
  face_verified?: boolean;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
};

export default function FriendsScreen() {
  const { user } = useAuth();
  const { t, language } = useLanguage();
  const router = useRouter();
  const [friends, setFriends] = useState<Friend[]>([]);
  const [pendingRequests, setPendingRequests] = useState<Friend[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFriend, setSelectedFriend] = useState<Friend | null>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);

  useEffect(() => {
    if (user) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [user]);

  const fetchFriends = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          friend_id,
          status,
          profiles!friends_friend_id_fkey(full_name, username, bio, is_verified, face_verified, verification_status)
        `)
        .eq('user_id', user?.id)
        .eq('status', 'accepted');

      if (error) throw error;

      const formattedFriends = data?.map((item: any) => ({
        id: item.id,
        friend_id: item.friend_id,
        status: item.status,
        full_name: item.profiles?.full_name ?? '',
        username: item.profiles?.username ?? '',
        bio: item.profiles?.bio ?? '',
        is_verified: item.profiles?.is_verified ?? false,
        face_verified: item.profiles?.face_verified ?? false,
        verification_status: item.profiles?.verification_status ?? 'unverified',
      })) || [];

      setFriends(formattedFriends);
    } catch (error) {
      console.error('Error fetching friends:', error);
    }
  };

  const fetchPendingRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('friends')
        .select(`
          id,
          user_id,
          status,
          profiles!friends_user_id_fkey(full_name, username, bio, is_verified, face_verified, verification_status)
        `)
        .eq('friend_id', user?.id)
        .eq('status', 'pending');

      if (error) throw error;

      const formattedRequests = data?.map((item: any) => ({
        id: item.id,
        friend_id: item.user_id,
        status: item.status,
        full_name: item.profiles?.full_name ?? '',
        username: item.profiles?.username ?? '',
        bio: item.profiles?.bio ?? '',
        is_verified: item.profiles?.is_verified ?? false,
        face_verified: item.profiles?.face_verified ?? false,
        verification_status: item.profiles?.verification_status ?? 'unverified',
      })) || [];

      setPendingRequests(formattedRequests);
    } catch (error) {
      console.error('Error fetching pending requests:', error);
    }
  };

  const acceptFriendRequest = async (requestId: string, requesterId: string) => {
    try {
      const { error: updateError } = await supabase
        .from('friends')
        .update({ status: 'accepted' })
        .eq('id', requestId);

      if (updateError) throw updateError;

      const { error: insertError } = await supabase
        .from('friends')
        .insert({
          user_id: user?.id,
          friend_id: requesterId,
          status: 'accepted',
        });

      if (insertError) throw insertError;

      fetchFriends();
      fetchPendingRequests();
      Alert.alert(
        language === 'tr' ? 'Başarılı' : 'Success',
        language === 'tr' ? 'Arkadaşlık isteği kabul edildi' : 'Friend request accepted'
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept request');
    }
  };

  const removeFriend = async (friendshipId: string) => {
    Alert.alert(
      language === 'tr' ? 'Arkadaşlıktan Çıkart' : 'Remove Friend',
      language === 'tr' ? 'Bu kişiyi arkadaşlarınızdan çıkartmak istediğinize emin misiniz?' : 'Are you sure you want to remove this friend?',
      [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tr' ? 'Çıkart' : 'Remove',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase
                .from('friends')
                .delete()
                .eq('id', friendshipId);

              if (error) throw error;
              fetchFriends();
              setSelectedFriend(null);
              Alert.alert(
                language === 'tr' ? 'Başarılı' : 'Success',
                language === 'tr' ? 'Arkadaş çıkartıldı' : 'Friend removed'
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to remove friend');
            }
          },
        },
      ]
    );
  };

  const blockUser = async (userId: string, friendshipId: string) => {
    Alert.alert(
      language === 'tr' ? 'Kullanıcıyı Engelle' : 'Block User',
      language === 'tr' ? 'Bu kullanıcıyı engellemek istediğinize emin misiniz?' : 'Are you sure you want to block this user?',
      [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tr' ? 'Engelle' : 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              await supabase.from('blocks').insert({
                user_id: user?.id,
                blocked_user_id: userId,
              });

              await supabase.from('friends').delete().eq('id', friendshipId);

              fetchFriends();
              setSelectedFriend(null);
              Alert.alert(
                language === 'tr' ? 'Başarılı' : 'Success',
                language === 'tr' ? 'Kullanıcı engellendi' : 'User blocked'
              );
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to block user');
            }
          },
        },
      ]
    );
  };

  const showProfile = async (friendId: string) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', friendId)
        .single();

      if (error) throw error;
      setSelectedProfile(data);
      setProfileModalVisible(true);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to load profile');
    }
  };

  const openChat = async (friendId: string) => {
    try {
      const { data: existingSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id')
        .or(`and(user1_id.eq.${user?.id},user2_id.eq.${friendId}),and(user1_id.eq.${friendId},user2_id.eq.${user?.id})`)
        .eq('status', 'active')
        .single();

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

      router.push(`/conversation/${sessionId}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to open chat');
    }
  };

  const renderFriend = ({ item }: { item: Friend }) => (
    <View style={styles.friendCard}>
      <TouchableOpacity
        style={styles.friendHeader}
        onPress={() => openChat(item.friend_id)}
        onLongPress={() => showProfile(item.friend_id)}>
        <View style={styles.friendInfo}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Text style={styles.friendName}>{item.full_name}</Text>
            {item.verification_status === 'verified' && (
              <VerifiedBadge size={16} verified />
            )}
          </View>
          <Text style={styles.friendUsername}>@{item.username}</Text>
          {item.bio && <Text style={styles.friendBio}>{item.bio}</Text>}
        </View>
        <MessageCircle size={20} color="#4A90E2" />
      </TouchableOpacity>

      {selectedFriend?.id === item.id && (
        <View style={styles.friendActions}>
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => {
              setSelectedFriend(null);
              removeFriend(item.id);
            }}>
            <UserMinus size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {language === 'tr' ? 'Arkadaşlıktan çıkar' : 'Remove friend'}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.actionButton, styles.blockButton]}
            onPress={() => {
              setSelectedFriend(null);
              blockUser(item.friend_id, item.id);
            }}>
            <Ban size={20} color="#FFFFFF" />
            <Text style={styles.actionButtonText}>
              {language === 'tr' ? 'Engelle' : 'Block'}
            </Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );

  const renderPendingRequest = ({ item }: { item: Friend }) => (
    <View style={styles.requestCard}>
      <View style={styles.friendInfo}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
          <Text style={styles.friendName}>{item.full_name}</Text>
          {item.verification_status === 'verified' && (
            <VerifiedBadge size={16} verified />
          )}
        </View>
        <Text style={styles.friendUsername}>@{item.username}</Text>
      </View>

      <TouchableOpacity
        style={styles.acceptButton}
        onPress={() => acceptFriendRequest(item.id, item.friend_id)}>
        <UserPlus size={20} color="#FFFFFF" />
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <LinearGradient
        colors={['#4A90E2', '#50C9E9']}
        style={styles.headerGradient}>
        <View style={styles.header}>
          <Users size={32} color="#FFFFFF" />
          <Text style={styles.headerTitle}>{t.friends}</Text>
        </View>
      </LinearGradient>

      <FlatList
        data={friends}
        ListHeaderComponent={
          <>
            {pendingRequests.length > 0 && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                  {language === 'tr' ? 'İstek Bekleyenler' : 'Pending Requests'}
                </Text>
                {pendingRequests.map((item) => (
                  <View key={item.id}>{renderPendingRequest({ item })}</View>
                ))}
              </View>
            )}

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {language === 'tr' ? 'Arkadaşlarım' : 'My Friends'} ({friends.length})
              </Text>
            </View>
          </>
        }
        renderItem={renderFriend}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Users size={80} color="#CCCCCC" />
            <Text style={styles.emptyText}>
              {language === 'tr' ? 'Henüz arkadaş yok' : 'No friends yet'}
            </Text>
            <Text style={styles.emptySubtext}>
              {language === 'tr' ? 'Sohbet ederek yeni arkadaşlar edin!' : 'Start chatting to make new friends!'}
            </Text>
          </View>
        }
      />

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
    backgroundColor: '#F5F5F5',
  },
  headerGradient: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  listContent: {
    padding: 20,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 12,
  },
  friendCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 15,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  friendHeader: {
    padding: 16,
  },
  requestCard: {
    backgroundColor: '#FFF9E6',
    borderRadius: 15,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFD700',
  },
  friendInfo: {
    flex: 1,
  },
  friendName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
  },
  friendUsername: {
    fontSize: 14,
    color: '#666666',
    marginTop: 2,
  },
  friendBio: {
    fontSize: 14,
    color: '#999999',
    marginTop: 4,
  },
  friendActions: {
    flexDirection: 'column',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    marginTop: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  chatButton: {
    backgroundColor: '#4A90E2',
  },
  removeButton: {
    backgroundColor: '#FF6B6B',
  },
  blockButton: {
    backgroundColor: '#666666',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  acceptButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#666666',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999999',
    marginTop: 8,
  },
});
