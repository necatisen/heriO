import { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { X, MapPin, MessageCircle, Ban, Flag } from 'lucide-react-native';
import VerifiedBadge from '@/components/VerifiedBadge';
import { LinearGradient } from 'expo-linear-gradient';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { getEffectiveSubscription } from '@/lib/subscription';
import { useRouter } from 'expo-router';
import {
  getEducationLabel,
  getProfessionLabel,
  getChildrenStatusLabel,
  getSmokingLabel,
  getAlcoholLabel,
  getBodyTypeLabel,
  getRelationshipStatusLabel,
  getReligionLabel,
  getGenderLabel,
} from '@/lib/profileTranslations';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type ProfileData = {
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
  body_type: string | null;
  languages: string[];
  religion: string | null;
  alcohol_consumption: string | null;
  smoking_habit: string | null;
  children_status: string | null;
  relationship_status: string | null;
  profession: string | null;
  education: string | null;
  is_online?: boolean;
  is_verified?: boolean;
  face_verified?: boolean;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
};

const REPORT_REASONS = {
  tr: ['Spam', 'Taciz / Nefret', 'Uygunsuz içerik', 'Sahte profil', 'Diğer'],
  en: ['Spam', 'Harassment or hate', 'Inappropriate content', 'Fake profile', 'Other'],
} as const;

type ProfileModalProps = {
  visible: boolean;
  profile: ProfileData | null;
  onClose: () => void;
  onLike?: () => void;
  onAddFriend?: () => void;
  onBlocked?: () => void;
  showActionButtons?: boolean;
  /** Dil (tr/en): verilirse vücut tipi vb. bu dile göre gösterilir; yoksa uygulama dilinden alınır. */
  language?: string;
};

export default function ProfileModal({
  visible,
  profile,
  onClose,
  onLike,
  onAddFriend,
  onBlocked,
  showActionButtons = true,
  language: languageProp,
}: ProfileModalProps) {
  const { language: contextLanguage } = useLanguage();
  const language = languageProp ?? contextLanguage;
  const { user } = useAuth();
  const router = useRouter();
  const [isPremium, setIsPremium] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const isOwnProfile = !!user && !!profile && profile.id === user.id;

  useEffect(() => {
    const fetchSubscription = async () => {
      if (!user) return;

      try {
        const sub = await getEffectiveSubscription(user.id);
        setIsPremium(sub.isPremium);
      } catch (error) {
        console.error('Error fetching subscription:', error);
      }
    };

    fetchSubscription();
  }, [user]);

  const fetchPhotos = useCallback(async () => {
    if (!profile) return;

    try {
      const { data, error } = await supabase
        .from('photos')
        .select('photo_url')
        .eq('user_id', profile.id)
        .order('created_at', { ascending: true });

      if (!error && data) {
        const photoUrls = (data as { photo_url: string }[]).map(p => p.photo_url);
        const urls =
          profile.profile_picture && !photoUrls.includes(profile.profile_picture)
            ? [profile.profile_picture, ...photoUrls]
            : photoUrls.length > 0
              ? photoUrls
              : profile.profile_picture
                ? [profile.profile_picture]
                : [];
        setPhotos(urls);
      } else if (profile.profile_picture) {
        setPhotos([profile.profile_picture]);
      } else {
        setPhotos([]);
      }
    } catch (error) {
      console.error('Error fetching photos:', error);
      if (profile?.profile_picture) {
        setPhotos([profile.profile_picture]);
      }
    }
  }, [profile]);

  useEffect(() => {
    if (visible) {
      fetchPhotos();
    }
  }, [visible, fetchPhotos]);

    const handleBlock = async () => {
    if (!user || !profile || profile.id === user.id) return;
    const confirmTr = 'Bu kullanıcıyı engellemek istediğinize emin misiniz? Sohbet ve eşleşme görünmez olacak.';
    const confirmEn = 'Are you sure you want to block this user? Chat and match will be hidden.';
    Alert.alert(
      language === 'tr' ? 'Engelle' : 'Block',
      language === 'tr' ? confirmTr : confirmEn,
      [
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
        {
          text: language === 'tr' ? 'Engelle' : 'Block',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await supabase.from('blocks').insert({
                user_id: user.id,
                blocked_user_id: profile.id,
              });
              if (error) throw error;
              onClose();
              onBlocked?.();
            } catch (e: any) {
              Alert.alert('Error', e.message || (language === 'tr' ? 'Engelleme başarısız' : 'Block failed'));
            }
          },
        },
      ]
    );
  };

  const submitReport = async (reason: string) => {
    if (!user || !profile) return;
    try {
      const { error } = await supabase.from('user_reports').insert({
        reporter_id: user.id,
        reported_user_id: profile.id,
        reason,
      });
      if (error) throw error;
      Alert.alert(
        language === 'tr' ? 'Teşekkürler' : 'Thank you',
        language === 'tr' ? 'Şikâyetiniz alındı. İncelenecektir.' : 'Your report has been received and will be reviewed.'
      );
      onClose();
    } catch (e: any) {
      Alert.alert('Error', e.message || (language === 'tr' ? 'Şikâyet gönderilemedi' : 'Report failed'));
    }
  };

  const handleReport = () => {
    if (!user || !profile || profile.id === user.id) return;
    const reasons = language === 'tr' ? REPORT_REASONS.tr : REPORT_REASONS.en;
    Alert.alert(
      language === 'tr' ? 'Şikâyet et' : 'Report',
      language === 'tr' ? 'Sebep seçin' : 'Choose a reason',
      [
        { text: reasons[0], onPress: () => submitReport(reasons[0]) },
        { text: reasons[1], onPress: () => submitReport(reasons[1]) },
        { text: reasons[2], onPress: () => submitReport(reasons[2]) },
        { text: reasons[3], onPress: () => submitReport(reasons[3]) },
        { text: reasons[4], onPress: () => submitReport(reasons[4]) },
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleStartChat = async () => {
    if (!profile || !user) return;

    try {
      const { data: existingSession, error: sessionError } = await supabase
        .from('chat_sessions')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${profile.id}),and(user1_id.eq.${profile.id},user2_id.eq.${user.id})`)
        .eq('status', 'active')
        .maybeSingle();

      let sessionId: string;

      if (existingSession) {
        sessionId = existingSession.id;
      } else {
        const { data: newSession, error: createError } = await supabase
          .from('chat_sessions')
          .insert({
            user1_id: user.id,
            user2_id: profile.id,
            status: 'active',
          })
          .select('id')
          .single();

        if (createError) throw createError;
        sessionId = newSession.id;
      }

      onClose();
      router.push(`/conversation/${sessionId}`);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to start chat');
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

  useEffect(() => {
    const recordProfileView = async () => {
      if (!user || !profile || profile.id === user.id) return;

      try {
        const { error } = await supabase.from('profile_views').insert({
          viewer_id: user.id,
          viewed_user_id: profile.id,
        });
        if (error && error.code !== '23505') {
          console.error('Error recording profile view:', error);
        }
      } catch (error) {
        console.error('Error recording profile view:', error);
      }
    };

    if (visible) {
      recordProfileView();
    }
  }, [visible, profile, user]);

  if (!profile) return null;

  const age = calculateAge(profile.birth_date);

  const handleImagePress = (index: number) => {
    setSelectedImageIndex(index);
    setImageModalVisible(true);
    if (photos.length <= 1) {
      fetchPhotos();
    }
  };

  return (
    <>
      <Modal
        visible={visible}
        animationType="slide"
        transparent={true}
        onRequestClose={onClose}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <LinearGradient
              colors={['#FF6B9D', '#C44569']}
              style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft} />
              <View style={styles.modalHeaderRight}>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <X size={24} color="#FFFFFF" />
                </TouchableOpacity>
              </View>
            </LinearGradient>

            <ScrollView style={styles.scrollContent}>
              <View style={styles.profileSection}>
                <TouchableOpacity onPress={() => handleImagePress(0)}>
                  {profile.profile_picture ? (
                    <Image
                      source={{ uri: profile.profile_picture }}
                      style={styles.profileImage}
                    />
                  ) : (
                    <View style={styles.profileImagePlaceholder}>
                      <Text style={styles.placeholderText}>
                        {profile.full_name.charAt(0).toUpperCase()}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                <View style={styles.nameRow}>
                  <Text style={styles.profileName}>{profile.full_name}</Text>
                  {profile.verification_status === 'verified' && (
                    <VerifiedBadge size={20} verified />
                  )}
                  {profile.is_online && <View style={styles.onlineIndicator} />}
                </View>
              <Text style={styles.profileUsername}>@{profile.username}</Text>
              <Text style={styles.profileAge}>
                {age} {language === 'tr' ? 'yaşında' : 'years old'}
              </Text>

              {profile.city && (
                <View style={styles.locationContainer}>
                  <MapPin size={16} color="#666666" />
                  <Text style={styles.locationText}>
                    {profile.city}, {profile.country}
                  </Text>
                </View>
              )}

              {profile.bio && (
                <Text style={styles.bioText}>{profile.bio}</Text>
              )}
            </View>

            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>
                {language === 'tr' ? 'Profil Bilgileri' : 'Profile Details'}
              </Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>
                  {language === 'tr' ? 'Cinsiyet' : 'Gender'}:
                </Text>
                <Text style={styles.detailValue}>{getGenderLabel(profile.gender, language)}</Text>
              </View>

              {profile.height && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {language === 'tr' ? 'Boy' : 'Height'}:
                  </Text>
                  <Text style={styles.detailValue}>{profile.height} cm</Text>
                </View>
              )}

              {profile.weight && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {language === 'tr' ? 'Kilo' : 'Weight'}:
                  </Text>
                  <Text style={styles.detailValue}>{profile.weight} kg</Text>
                </View>
              )}

              {profile.body_type && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {language === 'tr' ? 'Vücut Tipi' : 'Body Type'}:
                  </Text>
                  <Text style={styles.detailValue}>{getBodyTypeLabel(profile.body_type, language)}</Text>
                </View>
              )}

              {profile.profession && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {language === 'tr' ? 'Meslek' : 'Profession'}:
                  </Text>
                  <Text style={styles.detailValue}>{getProfessionLabel(profile.profession, language)}</Text>
                </View>
              )}

              {profile.education && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {language === 'tr' ? 'Eğitim' : 'Education'}:
                  </Text>
                  <Text style={styles.detailValue}>{getEducationLabel(profile.education, language)}</Text>
                </View>
              )}

              {profile.religion && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {language === 'tr' ? 'Din' : 'Religion'}:
                  </Text>
                  <Text style={styles.detailValue}>{getReligionLabel(profile.religion, language)}</Text>
                </View>
              )}

              {profile.relationship_status && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {language === 'tr' ? 'İlişki Durumu' : 'Relationship Status'}:
                  </Text>
                  <Text style={styles.detailValue}>
                    {getRelationshipStatusLabel(profile.relationship_status, language)}
                  </Text>
                </View>
              )}

              {profile.children_status && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {language === 'tr' ? 'Çocuk Durumu' : 'Children'}:
                  </Text>
                  <Text style={styles.detailValue}>
                    {getChildrenStatusLabel(profile.children_status, language)}
                  </Text>
                </View>
              )}

              {profile.smoking_habit && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {language === 'tr' ? 'Sigara' : 'Smoking'}:
                  </Text>
                  <Text style={styles.detailValue}>{getSmokingLabel(profile.smoking_habit, language)}</Text>
                </View>
              )}

              {profile.alcohol_consumption && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {language === 'tr' ? 'Alkol' : 'Alcohol'}:
                  </Text>
                  <Text style={styles.detailValue}>
                    {getAlcoholLabel(profile.alcohol_consumption, language)}
                  </Text>
                </View>
              )}

              {profile.languages && profile.languages.length > 0 && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>
                    {language === 'tr' ? 'Diller' : 'Languages'}:
                  </Text>
                  <Text style={styles.detailValue}>
                    {profile.languages.join(', ')}
                  </Text>
                </View>
              )}
            </View>
          </ScrollView>

          {showActionButtons && (
            <View style={styles.actionButtons}>
              {onLike && (
                <TouchableOpacity
                  style={[styles.actionButton, styles.likeButton]}
                  onPress={onLike}>
                  <Text style={styles.buttonText}>
                    {language === 'tr' ? 'Beğen' : 'Like'}
                  </Text>
                </TouchableOpacity>
              )}
              {isPremium && (
                <TouchableOpacity
                  style={styles.chatButton}
                  onPress={handleStartChat}>
                  <MessageCircle size={24} color="#FFFFFF" />
                  <Text style={styles.buttonText}>
                    {language === 'tr' ? 'Sohbet Et' : 'Chat'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
      </Modal>

      <Modal
        visible={imageModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setImageModalVisible(false)}>
        <View style={styles.imageModalOverlay}>
          <TouchableOpacity
            style={styles.imageModalCloseButton}
            onPress={() => setImageModalVisible(false)}>
            <X size={32} color="#FFFFFF" />
          </TouchableOpacity>

          <FlatList
            key={`gallery-${photos.length}`}
            data={photos}
            horizontal
            pagingEnabled
            initialScrollIndex={Math.min(selectedImageIndex, Math.max(0, photos.length - 1))}
            showsHorizontalScrollIndicator={false}
            keyExtractor={(item, index) => index.toString()}
            getItemLayout={(data, index) => ({
              length: SCREEN_WIDTH,
              offset: SCREEN_WIDTH * index,
              index,
            })}
            onMomentumScrollEnd={(event) => {
              const newIndex = Math.round(
                event.nativeEvent.contentOffset.x / SCREEN_WIDTH
              );
              setSelectedImageIndex(newIndex);
            }}
            renderItem={({ item }) => (
              <View style={styles.imageSlideContainer}>
                <Image
                  source={{ uri: item }}
                  style={styles.fullScreenImage}
                  resizeMode="contain"
                />
              </View>
            )}
          />

          <View style={styles.imageCounter}>
            <Text style={styles.imageCounterText}>
              {selectedImageIndex + 1} / {photos.length}
            </Text>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  modalHeader: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalHeaderLeft: { width: 40 },
  modalHeaderRight: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerActionBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 6, paddingHorizontal: 10 },
  headerActionBlock: { backgroundColor: 'rgba(0,0,0,0.2)', borderRadius: 8 },
  headerActionText: { fontSize: 12, fontWeight: '600', color: '#FFFFFF' },
  closeButton: { padding: 4 },
  scrollContent: {
    paddingHorizontal: 20,
  },
  profileSection: {
    alignItems: 'center',
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ECB71',
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 12,
  },
  profileImagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#FF6B9D',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  placeholderText: {
    fontSize: 48,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  profileName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 4,
  },
  profileUsername: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 4,
  },
  profileAge: {
    fontSize: 16,
    color: '#999999',
    marginBottom: 8,
  },
  locationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 12,
  },
  locationText: {
    fontSize: 14,
    color: '#666666',
  },
  bioText: {
    fontSize: 14,
    color: '#333333',
    textAlign: 'center',
    lineHeight: 20,
  },
  detailsSection: {
    paddingVertical: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333333',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333333',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  likeButton: {
    flex: 1,
    backgroundColor: '#FF6B9D',
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#4A90E2',
    paddingVertical: 12,
    borderRadius: 12,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseButton: {
    position: 'absolute',
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 8,
  },
  imageSlideContainer: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fullScreenImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.8,
  },
  imageCounter: {
    position: 'absolute',
    bottom: 50,
    alignSelf: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imageCounterText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
