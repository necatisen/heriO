import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Platform,
  Animated,
  PanResponder,
  ActivityIndicator,
  ScrollView,
  Modal,
  Dimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { Send, User, ArrowLeft, CreditCard as Edit2, Reply, Check, CheckCheck, Image as ImageIcon, Copy, Trash2, Shield } from 'lucide-react-native';
import VerifiedBadge from '@/components/VerifiedBadge';
import * as Clipboard from 'expo-clipboard';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { getEffectiveSubscription } from '@/lib/subscription';
import { useRouter, useLocalSearchParams } from 'expo-router';
import ProfileModal from '@/components/ProfileModal';
import SwipeableMessage from '@/components/SwipeableMessage';
import { formatMessageTime, formatLastSeen, isUserOnlineNow } from '@/lib/dateFormat';
import { containsBadWord, isSpam } from '@/lib/moderation';
import { uploadChatImage } from '@/lib/uploadAvatar';
import HeartLoader from '@/components/HeartLoader';

type Message = {
  id: string;
  content: string;
  sender_id: string;
  receiver_id?: string;
  created_at: string;
  is_deleted?: boolean;
  edited_at?: string;
  reply_to_id?: string;
  reply_to?: {
    content: string;
    sender_id: string;
  } | null;
  is_read?: boolean;
  read_at?: string | null;
  attachment_url?: string | null;
  attachment_type?: string | null;
};

export default function ConversationScreen() {
  const { user } = useAuth();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const router = useRouter();
  const params = useLocalSearchParams();

  const [otherUser, setOtherUser] = useState<any>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [messageText, setMessageText] = useState('');
  const [credits, setCredits] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);
  const [editingMessage, setEditingMessage] = useState<Message | null>(null);
  const [sendingImage, setSendingImage] = useState(false);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);
  const [messageActionMessage, setMessageActionMessage] = useState<Message | null>(null);
  const [reactionsByMessageId, setReactionsByMessageId] = useState<Record<string, { emoji: string; user_id: string }[]>>({});
  const flatListRef = useRef<FlatList>(null);
  const messageIdsRef = useRef<string[]>([]);
  messageIdsRef.current = messages.map((m) => m.id);
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const sessionIdParam = params.id as string;
    if (!sessionIdParam) return;
    setSessionId(sessionIdParam);
    setLoadError(false);
    setOtherUser(null);

    (async () => {
      try {
        const friendIdParam = typeof params.friendId === 'string' ? params.friendId : undefined;

        let otherUserId = friendIdParam;
        if (!otherUserId) {
          const { data: session, error: sessionError } = await supabase
            .from('chat_sessions')
            .select('user1_id, user2_id')
            .eq('id', sessionIdParam)
            .single();
          if (sessionError || !session) {
            setLoadError(true);
            return;
          }
          otherUserId = session.user1_id === user?.id ? session.user2_id : session.user1_id;
        }

        // Mesajları ve yardımcı verileri profile sorgusunu beklemeden başlat.
        fetchMessages(sessionIdParam);
        fetchCredits();
        fetchSubscription();
        updateOnlineStatus();

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', otherUserId)
          .single();
        if (profileError || !profile) {
          setLoadError(true);
          return;
        }
        setOtherUser(profile);
      } catch {
        setLoadError(true);
      }
    })();
  }, [params.id, user?.id]);

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

  // Sohbet ekranında header'daki "Çevrimiçi / Son görülme" için karşı kullanıcının
  // profiles'is_online + last_seen değerlerini realtime takip ediyoruz.
  useEffect(() => {
    if (!otherUser?.id) return;
    const otherUserId = otherUser.id as string;

    const channel = supabase
      .channel(`profiles:${otherUserId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${otherUserId}`,
        },
        (payload) => {
          const updated = payload.new as Partial<any>;
          setOtherUser((prev: any) => (prev && prev.id === otherUserId ? { ...prev, ...updated } : prev));
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [otherUser?.id]);

  useEffect(() => {
    if (!sessionId) return;

    const subscription = supabase
      .channel(`messages:${sessionId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'messages',
          filter: `session_id=eq.${sessionId}`,
        },
        async (payload) => {
          if (payload.eventType === 'INSERT') {
            const newMsg = payload.new as Message;

            // Reply referansını karşı tarafta gösterebilmek için INSERT anında
            // reply_to_id üzerinden mesaj içeriğini çekiyoruz.
            let msgWithReply: Message = newMsg;
            if (newMsg.reply_to_id) {
              const { data: replyData } = await supabase
                .from('messages')
                .select('content, sender_id')
                .eq('id', newMsg.reply_to_id)
                .maybeSingle();

              msgWithReply = {
                ...newMsg,
                reply_to: replyData
                  ? { content: replyData.content, sender_id: replyData.sender_id }
                  : null,
              };
            }

            setMessages((prev) => {
              if (prev.some((m) => m.id === newMsg.id)) return prev;

              if (newMsg.sender_id === user?.id) {
                // Optimistic "temp-..." mesajlarını temizleyip gerçek mesajı ekliyoruz.
                const withoutTemp = prev.filter((m) => !String(m.id).startsWith('temp'));
                return [...withoutTemp, msgWithReply];
              }

              return [...prev, msgWithReply];
            });
          } else if (payload.eventType === 'UPDATE') {
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === payload.new.id
                  ? {
                      ...msg,
                      ...(payload.new as Message),
                      // UPDATE payload'ında reply_to gelmediğinde mevcut referansı koru.
                      reply_to:
                        (payload.new as Message).reply_to !== undefined
                          ? (payload.new as Message).reply_to
                          : msg.reply_to,
                    }
                  : msg
              )
            );
          }
        }
      )
      .subscribe();

    return () => {
      subscription.unsubscribe();
    };
  }, [sessionId]);

  useEffect(() => {
    const channel = supabase
      .channel('message_reactions_live')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'message_reactions' },
        async (payload) => {
          const messageId = (payload.new as { message_id?: string })?.message_id ?? (payload.old as { message_id?: string })?.message_id;
          if (!messageId || !messageIdsRef.current.includes(messageId)) return;
          const { data } = await supabase
            .from('message_reactions')
            .select('message_id, user_id, emoji')
            .eq('message_id', messageId);
          setReactionsByMessageId((prev) => ({
            ...prev,
            [messageId]: (data || []).map((r) => ({ emoji: r.emoji, user_id: r.user_id })),
          }));
        }
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchMessages = async (sessionId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });

      if (!error && data) {
        // İlk boyamayı hızlandır: mesajları önce ham haliyle hemen bas.
        setMessages(data as Message[]);
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: false }), 100);

        // Reply referanslarını N+1 yerine tek toplu sorguyla zenginleştir.
        const replyIds = Array.from(
          new Set(
            (data || [])
              .map((m: any) => m.reply_to_id)
              .filter((id: string | null | undefined): id is string => !!id)
          )
        );

        if (replyIds.length > 0) {
          const { data: replyRows } = await supabase
            .from('messages')
            .select('id, content, sender_id')
            .in('id', replyIds);

          const replyById = Object.fromEntries(
            (replyRows || []).map((r: any) => [r.id, { content: r.content, sender_id: r.sender_id }])
          );

          setMessages((prev) =>
            prev.map((m) =>
              m.reply_to_id ? { ...m, reply_to: replyById[m.reply_to_id] || null } : m
            )
          );
        }

        // Reaksiyon ve read update işlemlerini UI'dan bağımsız yürüt.
        const ids = (data || []).map((m: any) => m.id);
        Promise.all([
          ids.length > 0
            ? supabase
                .from('message_reactions')
                .select('message_id, user_id, emoji')
                .in('message_id', ids)
            : Promise.resolve({ data: [] as any[] } as any),
          markMessagesAsRead(sessionId),
        ]).then(([reactionsRes]) => {
          const reactions = reactionsRes?.data || [];
          const byMessage: Record<string, { emoji: string; user_id: string }[]> = {};
          reactions.forEach((r: any) => {
            if (!byMessage[r.message_id]) byMessage[r.message_id] = [];
            byMessage[r.message_id].push({ emoji: r.emoji, user_id: r.user_id });
          });
          setReactionsByMessageId(byMessage);
        });

      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user?.id) return;
    const prev = reactionsByMessageId[messageId] || [];
    const others = prev.filter((r) => r.user_id !== user.id);
    setReactionsByMessageId((s) => ({
      ...s,
      [messageId]: [...others, { emoji, user_id: user.id }],
    }));
    closeMessageActions();
    try {
      await supabase.from('message_reactions').upsert(
        { message_id: messageId, user_id: user.id, emoji },
        { onConflict: 'message_id,user_id' }
      );
    } catch (e) {
      console.warn('Reaction save failed:', e);
      setReactionsByMessageId((s) => ({ ...s, [messageId]: prev }));
    }
  };

  const markMessagesAsRead = async (sid: string) => {
    if (!user?.id) return;
    try {
      const { error } = await supabase
        .from('messages')
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq('session_id', sid)
        .eq('receiver_id', user.id)
        .eq('is_read', false);
      if (!error) {
        setMessages((prev) =>
          prev.map((m) =>
            m.receiver_id === user.id && !m.is_read
              ? { ...m, is_read: true, read_at: new Date().toISOString() }
              : m
          )
        );
      }
    } catch (e) {
      console.warn('Mark read failed:', e);
    }
  };

  const fetchCredits = async () => {
    try {
      const { data, error } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', user?.id)
        .single();

      if (!error && data) {
        setCredits(data.balance);
      }
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const sub = await getEffectiveSubscription(user?.id);
      setIsPremium(sub.isPremium);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const sendMessage = async () => {
    if (!messageText.trim() || !sessionId || !otherUser || loading) return;

    const messageContent = messageText.trim();

    // Basit küfür ve spam filtresi
    if (containsBadWord(messageContent)) {
      Alert.alert(
        language === 'tr' ? 'Uygunsuz İçerik' : 'Inappropriate Content',
        language === 'tr'
          ? 'Mesajınız uygunsuz kelimeler içeriyor. Lütfen daha uygun bir dil kullanın.'
          : 'Your message contains inappropriate language. Please use more appropriate wording.'
      );
      return;
    }

    const recentOwnMessages = messages
      .filter((m) => m.sender_id === user?.id)
      .slice(-5)
      .map((m) => m.content || '');
    if (isSpam(messageContent, recentOwnMessages)) {
      Alert.alert(
        language === 'tr' ? 'Spam Tespit Edildi' : 'Spam Detected',
        language === 'tr'
          ? 'Aynı mesajı çok sık gönderiyorsunuz. Lütfen bekleyin veya farklı bir mesaj yazın.'
          : 'You are sending the same message too frequently. Please wait or send a different message.'
      );
      return;
    }

    // Engelleme kontrolü: taraflardan biri diğerini engellediyse mesaj gönderme
    if (user?.id && otherUser?.id) {
      try {
        const { data: blockRows, error: blockError } = await supabase
          .from('blocks')
          .select('id, user_id, blocked_user_id')
          .or(
            `and(user_id.eq.${user.id},blocked_user_id.eq.${otherUser.id}),` +
            `and(user_id.eq.${otherUser.id},blocked_user_id.eq.${user.id})`
          );

        if (!blockError && (blockRows?.length || 0) > 0) {
          setMessageText('');
          setReplyToMessage(null);
          Alert.alert(
            language === 'tr' ? 'Mesaj gönderilemiyor' : 'Cannot send message',
            language === 'tr'
              ? 'Bu kullanıcıyla aranızda engelleme olduğu için mesaj gönderemezsiniz.'
              : 'You cannot send messages because there is a block between you and this user.'
          );
          return;
        }
      } catch {
        // blok kontrolü hata verirse, güvenlik için yine de mesajı engelle
        setMessageText('');
        setReplyToMessage(null);
        Alert.alert(
          language === 'tr' ? 'Mesaj gönderilemiyor' : 'Cannot send message',
          language === 'tr'
            ? 'Şu anda bu kullanıcıya mesaj gönderemezsiniz.'
            : 'You cannot send a message to this user right now.'
        );
        return;
      }
    }

    const costPerMessage = 50;
    // Premium değilse ve kredisi yoksa / yetersizse, daha mesajı eklemeden engelle
    if (!isPremium && credits < costPerMessage) {
      // Text input ve reply state'ini temizle
      setMessageText('');
      setReplyToMessage(null);

      Alert.alert(
        language === 'tr' ? 'Yetersiz Kredi' : 'Insufficient Credits',
        language === 'tr'
          ? 'Mesaj göndermek için krediniz yok'
          : 'You do not have enough credits to send a message',
        [
          {
            text: language === 'tr' ? 'Vazgeç' : 'Cancel',
            style: 'cancel',
          },
          {
            text: language === 'tr' ? 'Kontör Yükle' : 'Buy Credits',
            onPress: () => router.push('/store/credits'),
          },
        ]
      );
      return;
    }

    if (editingMessage) {
      await editMessage(editingMessage.id, messageContent);
      return;
    }

    const replyTo = replyToMessage;
    setReplyToMessage(null);
    setMessageText('');
    const tempId = `temp-${Date.now()}`;
    const optimisticMessage: Message = {
      id: tempId,
      content: messageContent,
      sender_id: user!.id,
      receiver_id: otherUser.id,
      created_at: new Date().toISOString(),
      is_read: false,
      reply_to_id: replyTo?.id,
      reply_to: replyTo ? { content: replyTo.content, sender_id: replyTo.sender_id } : null,
    };
    try {
      setLoading(true);
      setMessages((prev) => [...prev, optimisticMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
    } finally {
      setLoading(false);
    }

    (async () => {
      try {
        const { data: friendCheck } = await supabase
          .from('friends')
          .select('status')
          .or(`and(user_id.eq.${user?.id},friend_id.eq.${otherUser.id}),and(user_id.eq.${otherUser.id},friend_id.eq.${user?.id})`)
          .eq('status', 'accepted')
          .maybeSingle();

        // Tüm mesajlar için (premium hariç) kontör kullan
        if (!isPremium) {
          const { error: creditError } = await supabase.rpc('deduct_credits', {
            p_user_id: user?.id,
            p_amount: costPerMessage,
            p_type: 'chat_spent',
            p_description: 'Message sent',
          });
          if (creditError) throw creditError;
          setCredits((c) => c - costPerMessage);
        }

        const messageData: any = {
          session_id: sessionId,
          sender_id: user?.id,
          receiver_id: otherUser.id,
          content: messageContent,
        };
        if (replyTo) messageData.reply_to_id = replyTo.id;

        const { error } = await supabase.from('messages').insert(messageData);

        if (error) throw error;
        fetchCredits();
      } catch (error: any) {
        setMessages((prev) => prev.filter((m) => m.id !== tempId));
        setMessageText(messageContent);
        setReplyToMessage(replyTo || null);
        Alert.alert('Error', error.message || 'Failed to send message');
      }
    })();
  };

  const handleBlockUser = () => {
    if (!user?.id || !otherUser?.id) return;

    Alert.alert(
      language === 'tr' ? 'Kullanıcıyı Engelle' : 'Block User',
      language === 'tr'
        ? `${otherUser.full_name} kullanıcısını engellemek istiyor musunuz? Bir sebep seçin.`
        : `Do you want to block ${otherUser.full_name}? Choose a reason.`,
      [
        { text: language === 'tr' ? 'Vazgeç' : 'Cancel', style: 'cancel' },
        ...[
          {
            key: 'harassment',
            tr: 'Şikayet et',
            en: 'Harassment',
          },
          {
            key: 'spam',
            tr: 'Engelle',
            en: 'Spam / Ads',
          },
          {
            key: 'inappropriate',
            tr: 'Uygunsuz içerik',
            en: 'Inappropriate content',
          },
          {
            key: 'other',
            tr: 'Diğer',
            en: 'Other',
          },
        ].map((opt) => ({
          text: language === 'tr' ? opt.tr : opt.en,
          style: 'destructive' as const,
          onPress: async () => {
            try {
              const { data: existing } = await supabase
                .from('blocks')
                .select('id')
                .eq('user_id', user.id)
                .eq('blocked_user_id', otherUser.id)
                .maybeSingle();

              if (existing) {
                Alert.alert(
                  language === 'tr' ? 'Zaten Engellendi' : 'Already Blocked',
                  language === 'tr'
                    ? 'Bu kullanıcı zaten engellenmiş.'
                    : 'This user is already blocked.'
                );
                return;
              }

              const { error } = await supabase.from('blocks').insert({
                user_id: user.id,
                blocked_user_id: otherUser.id,
                reason: opt.key,
              });
              if (error) throw error;

              Alert.alert(
                language === 'tr' ? 'Engellendi' : 'Blocked',
                language === 'tr'
                  ? 'Kullanıcı engellendi. Artık sizden mesaj alamayacak.'
                  : 'User has been blocked and will no longer be able to contact you.'
              );
              // İki kullanıcı arasındaki aktif sohbeti de kaldır
              await supabase
                .from('chat_sessions')
                .delete()
                .or(
                  `and(user1_id.eq.${user.id},user2_id.eq.${otherUser.id}),` +
                  `and(user1_id.eq.${otherUser.id},user2_id.eq.${user.id})`
                )
                .eq('status', 'active');
              router.back();
            } catch (e: any) {
              Alert.alert(
                'Error',
                e?.message ||
                  (language === 'tr'
                    ? 'Kullanıcı engellenemedi.'
                    : 'Failed to block user.')
              );
            }
          },
        })),
      ]
    );
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({
          is_deleted: true,
          deleted_at: new Date().toISOString(),
          content: language === 'tr' ? 'Bu mesaj silindi' : 'This message was deleted',
        })
        .eq('id', messageId);

      if (error) throw error;
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete message');
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    if (!newContent.trim()) return;

    try {
      const { error } = await supabase
        .from('messages')
        .update({
          content: newContent.trim(),
          edited_at: new Date().toISOString(),
        })
        .eq('id', messageId);

      if (error) throw error;

      setEditingMessage(null);
      setMessageText('');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to edit message');
    }
  };

  const startEditingMessage = (message: Message) => {
    setEditingMessage(message);
    setMessageText(message.content);
  };

  const cancelEditing = () => {
    setEditingMessage(null);
    setMessageText('');
  };

  const sendImageMessage = async () => {
    if (!sessionId || !otherUser || sendingImage) return;
    try {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('', language === 'tr' ? 'Galeri izni gerekli' : 'Gallery permission required');
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.6,
        base64: true,
      });
      const asset = result.canceled ? null : result.assets?.[0];
      if (!asset?.uri) return;

      const replyTo = replyToMessage;
      setReplyToMessage(null);

      const tempId = `temp-img-${Date.now()}`;
      const optimisticMessage: Message = {
        id: tempId,
        content: '',
        sender_id: user!.id,
        receiver_id: otherUser.id,
        created_at: new Date().toISOString(),
        is_read: false,
        attachment_url: asset.uri,
        attachment_type: 'image',
        reply_to_id: replyTo?.id,
        reply_to: replyTo ? { content: replyTo.content, sender_id: replyTo.sender_id } : null,
      };
      setMessages((prev) => [...prev, optimisticMessage]);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 50);
      setSendingImage(false);

      (async () => {
        try {
          const { data: friendCheck } = await supabase
            .from('friends')
            .select('status')
            .or(`and(user_id.eq.${user?.id},friend_id.eq.${otherUser.id}),and(user_id.eq.${otherUser.id},friend_id.eq.${user?.id})`)
            .eq('status', 'accepted')
            .maybeSingle();
          const isFriend = !!friendCheck;
          if (!isPremium && !isFriend && credits < 1) {
            setMessages((prev) => prev.filter((m) => m.id !== tempId));
            setReplyToMessage(replyTo || null);
            Alert.alert(
              language === 'tr' ? 'Yetersiz Kredi' : 'Insufficient Credits',
              language === 'tr' ? 'Fotoğraf göndermek için 1 kredi gerekir' : '1 credit required to send a photo'
            );
            return;
          }
          if (!isPremium && !isFriend) {
            const { error: creditError } = await supabase.rpc('deduct_credits', {
              p_user_id: user?.id,
              p_amount: 1,
              p_type: 'chat_spent',
              p_description: 'Photo message',
            });
            if (creditError) throw creditError;
            setCredits((c) => c - 1);
          }
          const attachmentUrl = await uploadChatImage(
            sessionId,
            user!.id,
            asset.base64 ?? asset.uri,
            !!asset.base64
          );
          const messageData: any = {
            session_id: sessionId,
            sender_id: user?.id,
            receiver_id: otherUser.id,
            content: '',
            attachment_url: attachmentUrl,
            attachment_type: 'image',
          };
          if (replyTo) messageData.reply_to_id = replyTo.id;
          const { data: created, error } = await supabase
            .from('messages')
            .insert(messageData)
            .select('id, content, sender_id, receiver_id, created_at, is_read, attachment_url, attachment_type, reply_to_id')
            .single();
          if (error) throw error;
          setMessages((prev) =>
            prev.map((m) =>
              m.id === tempId
                ? {
                    ...m,
                    id: created.id,
                    created_at: created.created_at,
                    attachment_url: created.attachment_url,
                    is_read: created.is_read,
                    reply_to: m.reply_to,
                  }
                : m
            )
          );
          fetchCredits();
        } catch (error: any) {
          setMessages((prev) => prev.filter((m) => m.id !== tempId));
          setReplyToMessage(replyTo || null);
          Alert.alert('Error', error.message || (language === 'tr' ? 'Fotoğraf gönderilemedi' : 'Failed to send photo'));
        } finally {
          setSendingImage(false);
        }
      })();
    } catch (error: any) {
      Alert.alert('Error', error.message || (language === 'tr' ? 'Fotoğraf gönderilemedi' : 'Failed to send photo'));
    }
  };

  const handleMessageLongPress = (message: Message) => {
    if (message.is_deleted) return;
    setMessageActionMessage(message);
  };

  const closeMessageActions = () => setMessageActionMessage(null);

  const handleMessageActionReply = () => {
    if (messageActionMessage) setReplyToMessage(messageActionMessage);
    closeMessageActions();
  };

  const handleMessageActionCopy = async () => {
    if (messageActionMessage?.content) {
      try {
        await Clipboard.setStringAsync(messageActionMessage.content);
        Alert.alert('', language === 'tr' ? 'Kopyalandı' : 'Copied');
      } catch {
        Alert.alert('', language === 'tr' ? 'Kopyalama başarısız' : 'Copy failed');
      }
    }
    closeMessageActions();
  };

  const handleMessageActionEdit = () => {
    if (messageActionMessage) startEditingMessage(messageActionMessage);
    closeMessageActions();
  };

  const handleMessageActionDelete = () => {
    if (!messageActionMessage) return;
    const messageId = messageActionMessage.id;
    closeMessageActions();
    Alert.alert(
      language === 'tr' ? 'Mesajı Sil' : 'Delete Message',
      language === 'tr' ? 'Bu mesajı silmek istediğinize emin misiniz?' : 'Are you sure you want to delete this message?',
      [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        { text: language === 'tr' ? 'Sil' : 'Delete', style: 'destructive', onPress: () => deleteMessage(messageId) },
      ]
    );
  };

  if (loadError) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingScreen}>
          <Text style={[styles.errorTitle, { color: theme.text }]}>
            {language === 'tr' ? 'Sohbet yüklenemedi' : 'Could not load conversation'}
          </Text>
          <Text style={[styles.errorSubtitle, { color: theme.textSecondary }]}>
            {language === 'tr' ? 'Bağlantıyı kontrol edip tekrar deneyin.' : 'Check your connection and try again.'}
          </Text>
          <TouchableOpacity
            style={[styles.backErrorButton, { backgroundColor: theme.primary }]}
            onPress={() => router.back()}>
            <ArrowLeft size={20} color="#FFFFFF" />
            <Text style={styles.backErrorButtonText}>
              {language === 'tr' ? 'Geri' : 'Back'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!otherUser) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingScreen}>
          <HeartLoader />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={0}>
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
        <View style={[styles.header, { backgroundColor: theme.cardBackground, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <ArrowLeft size={24} color={theme.text} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.userInfo}
            onPress={() => setProfileModalVisible(true)}>
            {otherUser.profile_picture ? (
              <Image
                source={{ uri: otherUser.profile_picture }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPlaceholder}>
                <User size={24} color="#999999" />
              </View>
            )}
            <View>
              <View style={styles.userNameRow}>
                <Text style={[styles.userName, { color: theme.text }]}>
                  {otherUser.full_name}
                </Text>
                {otherUser.verification_status === 'verified' && (
                  <VerifiedBadge size={18} verified />
                )}
                {(isUserOnlineNow(otherUser.is_online, otherUser.last_seen)) && <View style={styles.onlineIndicator} />}
              </View>
              <Text style={styles.userDetails}>
                {isUserOnlineNow(otherUser.is_online, otherUser.last_seen)
                  ? language === 'tr'
                    ? 'Çevrimiçi'
                    : 'Online'
                  : (otherUser.last_seen
                    ? (language === 'tr'
                      ? `Son görülme: ${formatLastSeen(otherUser.last_seen, language)}`
                      : `Last seen: ${formatLastSeen(otherUser.last_seen, language)}`)
                    : (otherUser.city || otherUser.country))}
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity onPress={handleBlockUser} style={styles.blockButton}>
            <Shield size={22} color={theme.error} />
          </TouchableOpacity>
        </View>

        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          ListEmptyComponent={
            <View style={styles.emptyMessages}>
              <Text style={[styles.emptyMessagesText, { color: theme.textSecondary }]}>
                {language === 'tr' ? 'Henüz mesaj yok. İlk mesajı gönderin.' : 'No messages yet. Send the first message.'}
              </Text>
            </View>
          }
          onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: false })}
          renderItem={({ item, index }) => {
            const isMine = item.sender_id === user?.id;
            const prevSameSender = index > 0 && messages[index - 1].sender_id === item.sender_id;
            const nextSameSender = index < messages.length - 1 && messages[index + 1].sender_id === item.sender_id;
            const isLastInGroup = !nextSameSender;
            const isImageMessage = !!(item.attachment_url && (item.attachment_type === 'image' || !item.attachment_type) && !item.is_deleted);
            const hasText = !!(item.content && item.content !== '📷 Fotoğraf' && item.content !== '📷 Photo');

            return (
              <View
                style={[
                  styles.messageSpacer,
                  prevSameSender ? styles.messageSpacerSame : styles.messageSpacerDifferent,
                ]}>
                <SwipeableMessage
                  onSwipeLeft={() => setReplyToMessage(item)}
                  isMyMessage={isMine}
                  showReplyIcon={false}
                  style={[
                    styles.messageRow,
                    isMine ? styles.myMessageRow : styles.theirMessageRow,
                  ]}>
                  {!isMine && isLastInGroup ? (
                    <TouchableOpacity onPress={() => setProfileModalVisible(true)} style={styles.messageAvatarWrap}>
                      {otherUser.profile_picture ? (
                        <Image source={{ uri: otherUser.profile_picture }} style={styles.messageAvatar} />
                      ) : (
                        <View style={styles.messageAvatarPlaceholder}>
                          <User size={16} color="#999999" />
                        </View>
                      )}
                    </TouchableOpacity>
                  ) : !isMine ? (
                    <View style={styles.messageAvatarSpacer} />
                  ) : null}
                  <View style={[styles.bubbleAndReactionsWrap, isMine && styles.bubbleAndReactionsWrapMine]}>
                    {isImageMessage ? (
                      <TouchableOpacity
                        activeOpacity={1}
                        onPress={() => setPreviewImageUri(item.attachment_url!)}
                        onLongPress={() => handleMessageLongPress(item)}
                        style={[styles.imageBubbleWrap, styles.bubbleInWrap, isMine ? styles.myImageBubble : styles.theirImageBubble]}>
                        <Image
                          source={{ uri: item.attachment_url! }}
                          style={styles.imageBubbleImage}
                          resizeMode="cover"
                        />
                        {isLastInGroup && (
                          <View style={styles.imageBubbleFooter}>
                            <Text style={styles.imageBubbleTime} numberOfLines={1}>
                              {formatMessageTime(item.created_at)}
                            </Text>
                            {isMine && !item.is_deleted && (
                              <View style={styles.readIndicator}>
                                {item.is_read ? (
                                  <CheckCheck size={12} color="#1D9BF0" />
                                ) : (
                                  <Check size={12} color="rgba(255,255,255,0.7)" />
                                )}
                              </View>
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleMessageLongPress(item)}
                        onLongPress={() => handleMessageLongPress(item)}
                        style={[
                          styles.textBubble,
                          styles.bubbleInWrap,
                          isMine ? styles.myTextBubble : styles.theirTextBubble,
                          item.is_deleted && styles.deletedMessage,
                        ]}>
                        {item.reply_to && (
                          <View style={[styles.replyContainer, !isMine && styles.replyContainerTheirs]}>
                            <Text style={[styles.replyText, isMine && styles.replyTextMine]} numberOfLines={2}>
                              {item.reply_to.content}
                            </Text>
                          </View>
                        )}
                        {hasText ? (
                          <Text
                            style={[
                              styles.textBubbleText,
                              isMine ? styles.myMessageText : styles.theirMessageText,
                              item.is_deleted && styles.deletedMessageText,
                            ]}>
                            {item.content}
                            {isLastInGroup && (
                              <Text style={[styles.textBubbleTimeInline, { color: theme.textSecondary }]}>
                                {' '}{formatMessageTime(item.created_at)}
                              </Text>
                            )}
                          </Text>
                        ) : isLastInGroup ? (
                          <Text style={[styles.textBubbleTimeInline, { color: theme.textSecondary }]}>
                            {formatMessageTime(item.created_at)}
                          </Text>
                        ) : null}
                        {isLastInGroup && isMine && !item.is_deleted && (
                          <View style={styles.readIndicatorText}>
                            {item.is_read ? (
                              <CheckCheck size={12} color="#1D9BF0" />
                            ) : (
                              <Check size={12} color="rgba(255,255,255,0.7)" />
                            )}
                          </View>
                        )}
                      </TouchableOpacity>
                    )}
                    {(reactionsByMessageId[item.id]?.length ?? 0) > 0 && (
                      <View style={[styles.reactionsRow, isMine && styles.reactionsRowMine]}>
                        {Object.entries(
                          (reactionsByMessageId[item.id] || []).reduce(
                            (acc, r) => {
                              acc[r.emoji] = (acc[r.emoji] || 0) + 1;
                              return acc;
                            },
                            {} as Record<string, number>
                          )
                        ).map(([emoji, count]) => (
                          <View key={emoji} style={styles.reactionChip}>
                            <Text style={styles.reactionEmoji}>{emoji}</Text>
                            {count > 1 && (
                              <Text style={styles.reactionCount}>{count}</Text>
                            )}
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </SwipeableMessage>
              </View>
            );
          }}
        />

        {editingMessage && (
          <View style={styles.editBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.editBarTitle}>
                {language === 'tr' ? 'Düzenleniyor' : 'Editing'}
              </Text>
              <Text style={styles.editBarText} numberOfLines={1}>
                {editingMessage.content}
              </Text>
            </View>
            <TouchableOpacity onPress={cancelEditing}>
              <Text style={styles.replyBarClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        {replyToMessage && !editingMessage && (
          <View style={styles.replyBar}>
            <View style={{ flex: 1 }}>
              <Text style={styles.replyBarTitle}>
                {language === 'tr' ? 'Yanıtlanıyor' : 'Replying to'}
              </Text>
              <Text style={styles.replyBarText} numberOfLines={2}>
                {replyToMessage.content}
              </Text>
            </View>
            <TouchableOpacity onPress={() => setReplyToMessage(null)}>
              <Text style={styles.replyBarClose}>✕</Text>
            </TouchableOpacity>
          </View>
        )}

        <View
          style={[
            styles.inputContainer,
            {
              backgroundColor: theme.cardBackground,
              borderTopColor: theme.border,
              // Android alt gezinme çubuğuyla çakışmayı önleyip barı gereksiz yukarı itmeden hizala.
              paddingBottom: Platform.OS === 'android'
                ? (insets.bottom > 0 ? insets.bottom + 6 : 10)
                : Math.max(insets.bottom, 10),
            },
          ]}>
          <TouchableOpacity
            style={[styles.imageButton, { backgroundColor: theme.background }]}
            onPress={sendImageMessage}
            disabled={sendingImage}>
            {sendingImage ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <ImageIcon size={22} color={theme.primary} />
            )}
          </TouchableOpacity>
          <TextInput
            style={[styles.input, { backgroundColor: theme.background, color: theme.text }]}
            placeholder={language === 'tr' ? 'Mesaj yaz...' : 'Type a message...'}
            placeholderTextColor={theme.textSecondary}
            value={messageText}
            onChangeText={setMessageText}
          />
          <TouchableOpacity
            style={[styles.sendButton, { backgroundColor: theme.primary }, loading && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={loading}>
            {editingMessage ? (
              <Edit2 size={20} color="#FFFFFF" />
            ) : (
              <Send size={20} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>

        {otherUser && (
          <ProfileModal
            visible={profileModalVisible}
            profile={otherUser}
            onClose={() => setProfileModalVisible(false)}
            onBlocked={() => { setProfileModalVisible(false); router.back(); }}
            showActionButtons={false}
            language={language}
          />
        )}

        <Modal
          visible={!!messageActionMessage}
          transparent
          animationType="fade"
          onRequestClose={closeMessageActions}>
          <View style={styles.contextMenuOverlay}>
            <TouchableOpacity
              style={StyleSheet.absoluteFill}
              activeOpacity={1}
              onPress={closeMessageActions}
            />
            <View style={styles.contextMenuWrap} pointerEvents="box-none">
              <View style={styles.contextMenuEmojiBar}>
                {['👍', '❤️', '😂', '😮', '😢', '🙏'].map((emoji) => (
                  <TouchableOpacity
                    key={emoji}
                    style={styles.contextMenuEmojiBtn}
                    onPress={() => messageActionMessage && addReaction(messageActionMessage.id, emoji)}>
                    <Text style={styles.contextMenuEmoji}>{emoji}</Text>
                  </TouchableOpacity>
                ))}
                <TouchableOpacity
                  style={styles.contextMenuEmojiPlus}
                  onPress={() => messageActionMessage && addReaction(messageActionMessage.id, '⭐')}>
                  <Text style={styles.contextMenuEmojiPlusText}>+</Text>
                </TouchableOpacity>
              </View>
              <View style={styles.contextMenuPanel}>
                <TouchableOpacity style={styles.contextMenuRow} onPress={handleMessageActionReply}>
                  <Reply size={20} color="rgba(255,255,255,0.95)" strokeWidth={2} />
                  <Text style={styles.contextMenuRowText}>{language === 'tr' ? 'Yanıtla' : 'Reply'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.contextMenuRow} onPress={handleMessageActionCopy}>
                  <Copy size={20} color="rgba(255,255,255,0.95)" strokeWidth={2} />
                  <Text style={styles.contextMenuRowText}>{language === 'tr' ? 'Kopyala' : 'Copy'}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.contextMenuRow, styles.contextMenuRowLast]} onPress={handleMessageActionDelete}>
                  <Trash2 size={20} color="#FF6B6B" strokeWidth={2} />
                  <Text style={[styles.contextMenuRowText, styles.contextMenuRowTextDanger]}>
                    {language === 'tr' ? 'Sil' : 'Delete'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={!!previewImageUri}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImageUri(null)}>
          <TouchableOpacity
            activeOpacity={1}
            style={styles.imagePreviewOverlay}
            onPress={() => setPreviewImageUri(null)}>
            <View style={styles.imagePreviewContent}>
              {previewImageUri ? (
                <Image
                  source={{ uri: previewImageUri }}
                  style={styles.imagePreviewImage}
                  resizeMode="contain"
                />
              ) : null}
            </View>
            <Text style={styles.imagePreviewCloseHint}>
              {language === 'tr' ? 'Kapatmak için dokunun' : 'Tap to close'}
            </Text>
          </TouchableOpacity>
        </Modal>
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    gap: 12,
    justifyContent: 'space-between',
  },
  backButton: {
    padding: 4,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  blockButton: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarPlaceholder: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  userNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
  },
  onlineIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ECB71',
  },
  userDetails: {
    fontSize: 12,
    color: '#666666',
  },
  messagesList: {
    paddingHorizontal: 12,
    paddingTop: 16,
    paddingBottom: 8,
    flexGrow: 1,
  },
  messageSpacer: {
    width: '100%',
  },
  messageSpacerSame: {
    marginTop: 8,
  },
  messageSpacerDifferent: {
    marginTop: 16,
  },
  loadingScreen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingScreenText: {
    fontSize: 16,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorSubtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 24,
  },
  backErrorButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  backErrorButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyMessages: {
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyMessagesText: {
    fontSize: 16,
    textAlign: 'center',
  },
  messageRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    maxWidth: '100%',
  },
  myMessageRow: {
    justifyContent: 'flex-end',
  },
  theirMessageRow: {
    justifyContent: 'flex-start',
  },
  messageAvatarWrap: {
    flexShrink: 0,
  },
  messageAvatarSpacer: {
    width: 32,
    height: 32,
    flexShrink: 0,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageAvatarPlaceholder: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E8E8E8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bubbleAndReactionsWrap: {
    maxWidth: '70%',
    alignSelf: 'flex-start',
  },
  bubbleAndReactionsWrapMine: {
    alignSelf: 'flex-end',
  },
  bubbleInWrap: {
    maxWidth: '100%',
    alignSelf: 'stretch',
  },
  reactionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
    alignSelf: 'flex-start',
  },
  reactionsRowMine: {
    alignSelf: 'flex-end',
  },
  reactionChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.08)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 2,
  },
  reactionEmoji: {
    fontSize: 14,
  },
  reactionCount: {
    fontSize: 12,
    color: 'rgba(0,0,0,0.6)',
  },
  imageBubbleWrap: {
    maxWidth: '100%',
    overflow: 'hidden',
    alignSelf: 'flex-end',
  },
  myImageBubble: {
    alignSelf: 'flex-end',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomRightRadius: 5,
    borderBottomLeftRadius: 25,
  },
  theirImageBubble: {
    alignSelf: 'flex-start',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 5,
  },
  imageBubbleImage: {
    width: Math.min(260, Dimensions.get('window').width * 0.65),
    height: 220,
    backgroundColor: 'rgba(0,0,0,0.06)',
  },
  imageBubbleFooter: {
    position: 'absolute',
    bottom: 6,
    right: 8,
    left: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  imageBubbleTime: {
    fontSize: 10,
    opacity: 0.7,
    color: 'rgba(255,255,255,0.9)',
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  textBubble: {
    maxWidth: '100%',
    paddingVertical: 10,
    paddingHorizontal: 15,
    alignSelf: 'flex-start',
  },
  myTextBubble: {
    backgroundColor: '#4B4376',
    alignSelf: 'flex-end',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomRightRadius: 5,
    borderBottomLeftRadius: 25,
  },
  theirTextBubble: {
    backgroundColor: '#E8E8E8',
    alignSelf: 'flex-start',
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    borderBottomRightRadius: 25,
    borderBottomLeftRadius: 5,
  },
  deletedMessage: {
    opacity: 0.65,
  },
  replyContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.12)',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 6,
    borderLeftWidth: 3,
    borderLeftColor: 'rgba(255, 255, 255, 0.5)',
  },
  replyContainerTheirs: {
    borderLeftColor: 'rgba(0, 0, 0, 0.25)',
  },
  replyText: {
    fontSize: 13,
    opacity: 0.95,
    color: '#1a1a1a',
  },
  replyTextMine: {
    color: '#FFFFFF',
  },
  textBubbleText: {
    fontSize: 14,
    lineHeight: 20,
  },
  myMessageText: {
    color: '#FFFFFF',
  },
  theirMessageText: {
    color: '#1a1a1a',
  },
  deletedMessageText: {
    fontStyle: 'italic',
  },
  textBubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 6,
    marginTop: 2,
  },
  textBubbleTimeInline: {
    fontSize: 11,
    opacity: 0.7,
  },
  textBubbleTime: {
    fontSize: 10,
    opacity: 0.7,
  },
  editedText: {
    fontSize: 10,
    opacity: 0.7,
  },
  readIndicator: {
    marginLeft: 2,
  },
  readIndicatorText: {
    alignSelf: 'flex-end',
    marginLeft: 4,
    marginTop: 2,
  },
  replyBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#F0F0F0',
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 12,
  },
  replyBarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A90E2',
    marginBottom: 2,
  },
  replyBarText: {
    fontSize: 14,
    color: '#666666',
  },
  replyBarClose: {
    fontSize: 20,
    color: '#999999',
    paddingHorizontal: 8,
  },
  editBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF3E0',
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
    gap: 12,
  },
  editBarTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 2,
  },
  editBarText: {
    fontSize: 14,
    color: '#666666',
  },
  contextMenuOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.35)',
  },
  contextMenuWrap: {
    alignSelf: 'center',
    alignItems: 'center',
    gap: 10,
  },
  contextMenuEmojiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(45,45,50,0.95)',
    borderRadius: 999,
    paddingVertical: 10,
    paddingHorizontal: 6,
    gap: 4,
  },
  contextMenuEmojiBtn: {
    padding: 6,
  },
  contextMenuEmoji: {
    fontSize: 24,
  },
  contextMenuEmojiPlus: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 2,
  },
  contextMenuEmojiPlusText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  contextMenuPanel: {
    backgroundColor: 'rgba(45,45,50,0.95)',
    borderRadius: 14,
    overflow: 'hidden',
    minWidth: 200,
  },
  contextMenuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
    gap: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.12)',
  },
  contextMenuRowLast: {
    borderBottomWidth: 0,
  },
  contextMenuRowText: {
    color: 'rgba(255,255,255,0.95)',
    fontSize: 16,
  },
  contextMenuRowTextDanger: {
    color: '#FF6B6B',
  },
  imagePreviewOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewContent: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePreviewImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.8,
  },
  imagePreviewCloseHint: {
    position: 'absolute',
    bottom: 48,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingBottom: Platform.OS === 'android' ? 24 : 16,
    borderTopWidth: 1,
    gap: 12,
  },
  imageButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#F5F5F5',
    borderRadius: 25,
    paddingHorizontal: 20,
    paddingVertical: 12,
    fontSize: 16,
    color: '#333333',
  },
  sendButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});
