import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Dimensions,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  X,
  MapPin,
  MessageCircle,
  Ban,
  Flag,
  User,
  Ruler,
  Weight,
  GraduationCap,
  Briefcase,
  Baby,
  Cigarette,
  Heart,
  Eye,
  Cake,
} from 'lucide-react-native';
import { zodiacLabel } from '@/lib/birthday';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme , type Theme } from '@/contexts/ThemeContext';
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
  getRelationshipGoalLabel,
  getReligionLabel,
  getGenderLabel,
} from '@/lib/profileTranslations';
import { countries } from '@/lib/constants';
import { FullScreenModal } from '@/components/FullScreenModal';
import { ProfileExtrasView, useProfileExtras } from '@/components/ProfileExtras';
import { formatLastSeen, isUserOnlineNow } from '@/lib/dateFormat';

import { L } from '@/lib/l10n';
import ChoiceSheet from '@/components/ChoiceSheet';
import { submitUserReport } from '@/lib/staff';
import { BLOCK_REASONS, USER_REPORT_REASONS, blockUser, type BlockReasonKey } from '@/lib/safety';
function getCountryLabel(value: string | null | undefined, language: string): string {
  const raw = String(value ?? '').trim();
  const norm = raw.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const isTr = language.toLowerCase().startsWith('tr');

  const match = countries.find((c) => c.value === norm);
  if (match) return L(match.label.tr, match.label.en);

  return raw;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const PHOTO_CAROUSEL_WIDTH = Math.max(240, SCREEN_WIDTH - 40);
// Fotoğraf alanını daha baskın yapıyoruz; "Bilgilerim" başlığına kadar uzasın.
const PHOTO_CAROUSEL_HEIGHT = Math.min(460, Math.max(330, Math.round(PHOTO_CAROUSEL_WIDTH * 1.22)));

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
  relationship_goal: string | null;
  profession: string | null;
  education: string | null;
  is_online?: boolean;
  is_verified?: boolean;
  face_verified?: boolean;
  last_seen?: string | null;
  verification_status?: 'unverified' | 'pending' | 'verified' | 'rejected';
};


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
  /** Own profile opened from "Profilim → 👁": shows a banner, no action buttons. */
  previewMode?: boolean;
  /** false hides "Sohbet et" (e.g. birthday twins: they greet first, the other side opens the chat). */
  allowDirectChat?: boolean;
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
  previewMode = false,
  allowDirectChat = true,
}: ProfileModalProps) {
  const [reportVisible, setReportVisible] = useState(false);
  const [blockVisible, setBlockVisible] = useState(false);
  const extras = useProfileExtras(visible ? profile?.id : null);
  const { language: contextLanguage } = useLanguage();
  const language = languageProp ?? contextLanguage;
  const { user } = useAuth();
  const router = useRouter();
  const { theme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const insets = useSafeAreaInsets();
  const [isPremium, setIsPremium] = useState(false);
  const [photos, setPhotos] = useState<string[]>([]);
  const [imageModalVisible, setImageModalVisible] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const isOwnProfile = !!user && !!profile && profile.id === user.id;
  const onlineNow = isUserOnlineNow(profile?.is_online, profile?.last_seen);

  const lastSeenChipText =
    onlineNow
      ? L('Çevrimiçi', 'Online')
      : profile?.last_seen
        ? L('Son görülme: {0}', 'Last seen: {0}', [formatLastSeen(profile.last_seen)])
        : L('Son görülme: —', 'Last seen: —');

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

  const handleBlock = () => {
    if (!user || !profile || profile.id === user.id) return;
    setBlockVisible(true);
  };

  const blockWithReason = async (reason: BlockReasonKey) => {
    if (!user || !profile) return;
    try {
      await blockUser(user.id, profile.id, reason);
      onClose();
      onBlocked?.();
    } catch (e: any) {
      Alert.alert(L('Hata', 'Error'), e.message || L('Engelleme başarısız', 'Block failed'));
    }
  };

  const submitReport = async (reason: string) => {
    if (!user || !profile) return;
    try {
      await submitUserReport(user.id, profile.id, reason, { source: 'profile' });
      Alert.alert(
        L('Teşekkürler', 'Thank you'),
        L('Şikâyetiniz alındı. İncelenecektir.', 'Your report has been received and will be reviewed.')
      );
      onClose();
    } catch (e: any) {
      Alert.alert(L('Bilgi', 'Info'), e.message || L('Şikâyet gönderilemedi', 'Report failed'));
    }
  };

  const handleReport = () => {
    if (!user || !profile || profile.id === user.id) return;
    setReportVisible(true);
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
      Alert.alert(L('Hata', 'Error'), error.message || L('Sohbet başlatılamadı', 'Failed to start chat'));
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
      <FullScreenModal
        visible={visible}
        onRequestClose={onClose}
        animationType="slide"
        overlayStyle={styles.modalOverlay}
        contentStyle={{ ...styles.modalContent, backgroundColor: theme.cardBackground }}
      >
        <View style={styles.modalRoot}>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeFloating, { top: Math.max(8, insets.top + 14) }]}
            accessibilityLabel="Close"
          >
            <X size={26} color="#FFFFFF" />
          </TouchableOpacity>

          <ScrollView
            style={styles.scrollContent}
            // Keep the last buttons above Android's gesture/3-button navigation bar.
            contentContainerStyle={{ paddingBottom: showActionButtons ? 16 : insets.bottom + 24 }}>
          {previewMode && (
            <View style={[styles.previewBanner, { marginTop: Math.max(8, insets.top + 10), backgroundColor: theme.primary }]}>
              <Eye size={18} color="#FFFFFF" />
              <Text style={styles.previewBannerText}>
                {L('Diğer kullanıcılar profilini böyle görüyor', 'This is how other users see your profile')}
              </Text>
            </View>
          )}
          <View style={styles.profileSection}>
            {photos.length > 0 ? (
              <>
                <View style={styles.photoCarouselWrap}>
                  <ScrollView
                    horizontal
                    pagingEnabled
                    showsHorizontalScrollIndicator={false}
                    style={styles.photoCarouselScroll}
                    onMomentumScrollEnd={(event) => {
                      const newIndex = Math.round(event.nativeEvent.contentOffset.x / PHOTO_CAROUSEL_WIDTH);
                      setSelectedImageIndex(Math.max(0, Math.min(newIndex, photos.length - 1)));
                    }}
                  >
                    {photos.map((uri, index) => (
                      <TouchableOpacity
                        // eslint-disable-next-line react/no-array-index-key
                        key={`${index}`}
                        style={styles.photoSlide}
                        activeOpacity={0.9}
                        onPress={() => handleImagePress(index)}
                      >
                        <Image source={{ uri }} style={styles.photoImage} resizeMode="cover" />
                      </TouchableOpacity>
                    ))}
                  </ScrollView>

                  {photos.length > 1 && (
                    <View style={styles.photoDotsRow}>
                      {photos.map((_, i) => (
                        <View
                          // eslint-disable-next-line react/no-array-index-key
                          key={`${i}`}
                          style={[
                            styles.photoDot,
                            i === selectedImageIndex && styles.photoDotActive,
                          ]}
                        />
                      ))}
                    </View>
                  )}

                  <View style={styles.photoInfoOverlay} pointerEvents="none">
                    <Text style={styles.photoNameText} numberOfLines={1}>
                      {profile.full_name}
                    </Text>
                    <Text style={styles.photoUsernameText}>@{profile.username}</Text>
                    <Text style={styles.photoMetaText}>
                      {age} {L('yaşında', 'years old')}
                    </Text>
                    <Text style={styles.photoMetaText} numberOfLines={1}>
                      {profile.city ? `${profile.city}, ${getCountryLabel(profile.country, language)}` : '—'}
                    </Text>
                    <View style={styles.photoOnlineRow}>
                      {onlineNow ? <View style={styles.photoOnlineDot} /> : null}
                      <Text style={styles.photoOnlineText} numberOfLines={1}>
                        {lastSeenChipText}
                      </Text>
                    </View>
                  </View>
                </View>
              </>
            ) : (
              <View style={styles.profileImagePlaceholder}>
                <Text style={styles.placeholderText}>{profile.full_name.charAt(0).toUpperCase()}</Text>
                <View style={styles.photoInfoOverlay} pointerEvents="none">
                  <Text style={styles.photoNameText} numberOfLines={1}>
                    {profile.full_name}
                  </Text>
                  <Text style={styles.photoUsernameText}>@{profile.username}</Text>
                  <Text style={styles.photoMetaText}>
                    {age} {L('yaşında', 'years old')}
                  </Text>
                  <Text style={styles.photoMetaText} numberOfLines={1}>
                    {profile.city ? `${profile.city}, ${getCountryLabel(profile.country, language)}` : '—'}
                  </Text>
                  <View style={styles.photoOnlineRow}>
                    {onlineNow ? <View style={styles.photoOnlineDot} /> : null}
                    <Text style={styles.photoOnlineText} numberOfLines={1}>
                      {lastSeenChipText}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </View>

          <View style={styles.detailsSection}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {L('Hakkımda', 'About')}
            </Text>

            <Text style={[styles.aboutText, { color: theme.textSecondary }]}>
              {profile.bio
                ? profile.bio
                : L('Hakkımda bilgisi yok.', 'No bio.')}
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.text, marginTop: 16 }]}>
              {L('Bilgilerim', 'Information')}
            </Text>

            <View style={styles.chipsGrid}>
              {profile.gender ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <User size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>{getGenderLabel(profile.gender, language)}</Text>
                </View>
              ) : null}

              {profile.height ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <Ruler size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>{`${profile.height} cm`}</Text>
                </View>
              ) : null}

              {profile.weight ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <Weight size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>{`${profile.weight} kg`}</Text>
                </View>
              ) : null}

              {profile.body_type ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <Heart size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>{getBodyTypeLabel(profile.body_type, language)}</Text>
                </View>
              ) : null}

              {profile.religion ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <Flag size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>{getReligionLabel(profile.religion, language)}</Text>
                </View>
              ) : null}

              {profile.profession ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <Briefcase size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>{getProfessionLabel(profile.profession, language)}</Text>
                </View>
              ) : null}

              {profile.education ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <GraduationCap size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>{getEducationLabel(profile.education, language)}</Text>
                </View>
              ) : null}

              {profile.children_status ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <Baby size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>{getChildrenStatusLabel(profile.children_status, language)}</Text>
                </View>
              ) : null}

              {profile.smoking_habit ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <Cigarette size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>{getSmokingLabel(profile.smoking_habit, language)}</Text>
                </View>
              ) : null}

              {profile.alcohol_consumption ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <MessageCircle size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>{getAlcoholLabel(profile.alcohol_consumption, language)}</Text>
                </View>
              ) : null}

              {profile.relationship_status ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <Ban size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>{getRelationshipStatusLabel(profile.relationship_status, language)}</Text>
                </View>
              ) : null}

              {profile.relationship_goal ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <Heart size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>
                    {getRelationshipGoalLabel(profile.relationship_goal, language)}
                  </Text>
                </View>
              ) : null}

              {profile.languages?.length ? (
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <MapPin size={16} color={theme.textSecondary} />
                  <Text
                    style={[styles.infoChipText, { color: theme.text }]}
                    numberOfLines={1}>
                    {profile.languages.join(', ')}
                  </Text>
                </View>
              ) : null}
            </View>

            {zodiacLabel(profile.birth_date, (profile as any).birth_date_exact) ? (
              <View style={[styles.chipsGrid, { marginTop: 10 }]}>
                <View style={[styles.infoChip, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}>
                  <Cake size={16} color={theme.textSecondary} />
                  <Text style={[styles.infoChipText, { color: theme.text }]}>
                    {zodiacLabel(profile.birth_date, (profile as any).birth_date_exact)}
                  </Text>
                </View>
              </View>
            ) : null}

            <ProfileExtrasView extras={extras} />

            {!isOwnProfile && (
              <View style={styles.reportBlockRow}>
                <TouchableOpacity
                  style={[styles.reportBtn, { backgroundColor: theme.inputBackground, borderColor: theme.border }]}
                  onPress={handleReport}>
                  <Text style={[styles.reportBtnText, { color: theme.text }]}>
                    {L('Şikayet et', 'Report')}
                  </Text>
                </TouchableOpacity>

                {isPremium && allowDirectChat && (
                  <TouchableOpacity
                    style={[styles.reportBtn, { backgroundColor: theme.primary, borderColor: theme.primary }]}
                    onPress={handleStartChat}>
                    <Text style={[styles.reportBtnText, { color: '#FFFFFF' }]}>
                      {L('Sohbet et', 'Chat')}
                    </Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={[styles.blockBtn, { backgroundColor: theme.error, borderColor: theme.error }]}
                  onPress={handleBlock}>
                  <Text style={[styles.reportBtnText, { color: '#FFFFFF' }]}>
                    {L('Engelle', 'Block')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </ScrollView>

        {showActionButtons && (
          <View style={[styles.actionButtons, { paddingBottom: Math.max(16, insets.bottom + 16) }]}>
            {onLike && (
              <TouchableOpacity style={[styles.actionButton, styles.likeButton]} onPress={onLike}>
                <Text style={styles.buttonText}>{L('Beğen', 'Like')}</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
        </View>
      </FullScreenModal>

      <FullScreenModal
        visible={imageModalVisible}
        onRequestClose={() => setImageModalVisible(false)}
        animationType="fade"
        overlayStyle={styles.imageModalOverlay}
        contentStyle={styles.imageModalContent}
      >
        <TouchableOpacity
          style={styles.imageModalCloseButton}
          onPress={() => setImageModalVisible(false)}
        >
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
            const newIndex = Math.round(event.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setSelectedImageIndex(newIndex);
          }}
          renderItem={({ item }) => (
            <View style={styles.imageSlideContainer}>
              <Image source={{ uri: item }} style={styles.fullScreenImage} resizeMode="contain" />
            </View>
          )}
        />

        <View style={styles.imageCounter}>
          <Text style={styles.imageCounterText}>
            {selectedImageIndex + 1} / {photos.length}
          </Text>
        </View>
      </FullScreenModal>

      <ChoiceSheet
        visible={reportVisible}
        title={L('Şikâyet et', 'Report')}
        message={L('Sebep seçin', 'Choose a reason')}
        onClose={() => setReportVisible(false)}
        choices={USER_REPORT_REASONS.map(([tr, en]) => {
          const label = L(tr, en);
          return { label, onPress: () => void submitReport(label) };
        })}
      />
      <ChoiceSheet
        visible={blockVisible}
        title={L('Engelle', 'Block')}
        message={L(
          'Bu kullanıcıyı engellemek istediğinize emin misiniz? Sohbet ve eşleşme görünmez olacak. Seçtiğin sebep moderatörlere de iletilir.',
          'Are you sure you want to block this user? Chat and match will be hidden. The reason you choose is also sent to the moderators.'
        )}
        onClose={() => setBlockVisible(false)}
        choices={BLOCK_REASONS.map((o) => ({ label: L(o.tr, o.en), destructive: true, onPress: () => void blockWithReason(o.key) }))}
      />
    </>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    width: '100%',
    height: '100%',
    borderRadius: 0,
    maxHeight: '100%',
  },
  modalRoot: {
    flex: 1,
    position: 'relative',
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
  previewBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 14,
    paddingVertical: 10,
    paddingLeft: 14,
    paddingRight: 48,
    marginBottom: 12,
  },
  previewBannerText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700', flexShrink: 1 },
  closeFloating: {
    position: 'absolute',
    right: 16,
    zIndex: 20,
    padding: 6,
  },
  scrollContent: {
    paddingHorizontal: 20,
    flex: 1,
  },
  profileSection: {
    alignItems: 'center',
    paddingTop: 0,
    paddingBottom: 0,
    borderBottomWidth: 0,
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
  profileImagePlaceholder: {
    width: PHOTO_CAROUSEL_WIDTH,
    height: PHOTO_CAROUSEL_HEIGHT,
    borderRadius: 18,
    backgroundColor: t.primary,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  placeholderText: {
    fontSize: 56,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  photoCarouselWrap: {
    width: PHOTO_CAROUSEL_WIDTH,
    height: PHOTO_CAROUSEL_HEIGHT,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#F3F3F3',
    position: 'relative',
  },
  photoCarouselScroll: {
    flex: 1,
  },
  photoSlide: {
    width: PHOTO_CAROUSEL_WIDTH,
    height: PHOTO_CAROUSEL_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  photoImage: {
    width: '100%',
    height: '100%',
    borderRadius: 18,
  },
  photoDotsRow: {
    position: 'absolute',
    bottom: 12,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  photoDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.45)',
  },
  photoDotActive: {
    backgroundColor: '#FFFFFF',
  },
  photoInfoOverlay: {
    position: 'absolute',
    left: 14,
    right: 14,
    top: 16,
    zIndex: 2,
  },
  photoNameText: {
    fontSize: 26,
    fontWeight: '800',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
  photoUsernameText: {
    marginTop: 4,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
  photoMetaText: {
    marginTop: 4,
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
  },
  photoOnlineRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  photoOnlineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4ECB71',
  },
  photoOnlineText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
    textShadowColor: 'rgba(0,0,0,0.45)',
    textShadowRadius: 6,
    textShadowOffset: { width: 0, height: 2 },
    maxWidth: 220,
  },
  lastSeenPill: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 14,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  lastSeenDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  lastSeenPillText: {
    fontSize: 13,
    fontWeight: '600',
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
  aboutText: {
    fontSize: 14,
    lineHeight: 20,
    padding: 14,
    borderRadius: 16,
    backgroundColor: 'rgba(0,0,0,0.03)',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  reportBlockRow: {
    marginTop: 16,
    flexDirection: 'row',
    gap: 12,
  },
  reportBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportBtnText: {
    fontSize: 15,
    fontWeight: '700',
  },
  chipsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  infoChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  infoChipText: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 210,
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
    backgroundColor: t.primary,
  },
  chatButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: t.primary,
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
  imageModalContent: {
    backgroundColor: 'transparent',
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
