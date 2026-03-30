import { useState, useEffect, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Alert,
  Platform,
  TextInput,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { User, Coins, Crown, Settings, Camera, X, Plus, CreditCard as Edit2, CreditCard as Edit } from 'lucide-react-native';
import VerifiedBadge from '@/components/VerifiedBadge';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { supabase } from '@/lib/supabase';
import { getEffectiveSubscription } from '@/lib/subscription';
import { useRouter } from 'expo-router';
import { PREMIUM_PLANS } from '@/lib/storeProducts';
import * as ImagePicker from 'expo-image-picker';
import EditProfileModal from '@/components/EditProfileModal';
import { uploadGalleryPhoto, deletePhotoFromStorage } from '@/lib/uploadAvatar';
import {
  getEducationLabel,
  getProfessionLabel,
  getGenderLabel,
  getBodyTypeLabel,
  getReligionLabel,
  getAlcoholLabel,
  getRelationshipStatusLabel,
} from '@/lib/profileTranslations';
import { countries } from '@/lib/constants';
import HeartLoader from '@/components/HeartLoader';
import { isUserOnlineNow } from '@/lib/dateFormat';

type Photo = {
  id: string;
  photo_url: string;
  created_at: string;
};

function getCountryLabel(value: string | null | undefined, language: string): string {
  const raw = String(value ?? '').trim();
  const norm = raw.toLowerCase().replace(/\s+/g, '_').replace(/-/g, '_');
  const isTr = language.toLowerCase().startsWith('tr');

  const match = countries.find((c) => c.value === norm);
  if (match) return isTr ? match.label.tr : match.label.en;

  return raw;
}

export default function ProfileScreen() {
  const { user, profile, refreshProfile, loading: authLoading } = useAuth();
  const { language } = useLanguage();
  const { theme } = useTheme();
  const router = useRouter();
  const [credits, setCredits] = useState(0);
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionEnd, setSubscriptionEnd] = useState<string | null>(null);
  const [planType, setPlanType] = useState<'monthly' | '3month' | 'yearly' | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingBio, setEditingBio] = useState(false);
  const [bioText, setBioText] = useState('');
  const [showEditModal, setShowEditModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchCredits();
      fetchSubscription();
      fetchPhotos();
    }
  }, [user]);

  useFocusEffect(
    useCallback(() => {
      if (user) {
        fetchCredits();
        fetchSubscription();
      }
    }, [user])
  );

  useEffect(() => {
    if (profile) {
      setBioText(profile.bio ?? '');
      updateOnlineStatus();
    }
  }, [profile]);

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

  const fetchCredits = async () => {
    try {
      const { data, error } = await supabase
        .from('credits')
        .select('balance')
        .eq('user_id', user?.id)
        .maybeSingle();

      if (error) throw error;
      setCredits(data?.balance || 0);
    } catch (error) {
      console.error('Error fetching credits:', error);
    }
  };

  const fetchSubscription = async () => {
    try {
      const sub = await getEffectiveSubscription(user?.id);
      setIsPremium(sub.isPremium);
      setSubscriptionEnd(sub.subscriptionEnd);
      setPlanType(sub.planType);
    } catch (error) {
      console.error('Error fetching subscription:', error);
    }
  };

  const fetchPhotos = async () => {
    try {
      const { data, error } = await supabase
        .from('photos')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPhotos(data || []);
    } catch (error) {
      console.error('Error fetching photos:', error);
    }
  };

  const handlePickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (permissionResult.granted === false) {
        const message = language === 'tr'
          ? 'Galeriye erişim izni gerekiyor!'
          : 'Permission to access gallery is required!';

        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert(language === 'tr' ? 'İzin Gerekli' : 'Permission Required', message);
        }
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        base64: true,
      });

      const asset = result.canceled ? null : result.assets?.[0];
      if (!asset?.uri) return;
      const base64 = typeof asset.base64 === 'string' && asset.base64.length > 0 ? asset.base64 : undefined;
      await uploadPhoto(base64 ? undefined : asset.uri, base64);
    } catch (error: any) {
      const message = language === 'tr'
        ? 'Resim seçilirken hata oluştu'
        : 'Error picking image';

      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const uploadPhoto = async (uri?: string, base64?: string) => {
    if (!user?.id) return;
    const source = base64 ?? uri;
    if (!source) return;
    try {
      setUploading(true);

      const publicUrl = await uploadGalleryPhoto(user.id, source, photos.length, !!base64);

      const { error } = await supabase
        .from('photos')
        .insert({
          user_id: user.id,
          photo_url: publicUrl,
        });

      if (error) throw error;

      // Set profile picture only; never set verification_status here (verification is 4-stage pipeline only).
      if (photos.length === 0 && !profile?.profile_picture) {
        if (!profile) {
          await supabase.from('profiles').upsert(
            {
              id: user.id,
              full_name: user.email?.split('@')[0] ?? 'User',
              username: 'user_' + user.id.slice(0, 8),
              profile_picture: publicUrl,
            },
            { onConflict: 'id' }
          );
        } else {
          await supabase
            .from('profiles')
            .update({ profile_picture: publicUrl })
            .eq('id', user.id);
        }
        await refreshProfile();
      }

      await fetchPhotos();

      const message = language === 'tr'
        ? 'Fotoğraf başarıyla yüklendi!'
        : 'Photo uploaded successfully!';

      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(language === 'tr' ? 'Başarılı' : 'Success', message);
      }
    } catch (error: any) {
      console.error('Upload photo error:', error);
      const message = language === 'tr'
        ? 'Fotoğraf yüklenirken hata oluştu'
        : 'Error uploading photo';
      const detail = error?.message ?? error?.error_description ?? '';

      if (Platform.OS === 'web') {
        alert(detail ? `${message}: ${detail}` : message);
      } else {
        Alert.alert(language === 'tr' ? 'Yükleme hatası' : 'Upload Error', detail || message);
      }
    } finally {
      setUploading(false);
    }
  };

  const handleUpdateBio = async () => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ bio: bioText })
        .eq('id', user?.id);

      if (error) throw error;

      await refreshProfile();
      setEditingBio(false);

      const message = language === 'tr'
        ? 'Biyografi güncellendi'
        : 'Bio updated';

      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert(language === 'tr' ? 'Başarılı' : 'Success', message);
      }
    } catch (error: any) {
      const message = language === 'tr'
        ? 'Biyografi güncellenirken hata oluştu'
        : 'Error updating bio';

      if (Platform.OS === 'web') {
        alert(message);
      } else {
        Alert.alert('Error', message);
      }
    }
  };

  const handleSetAsProfilePhoto = async (photoUrl: string) => {
    if (!user?.id) return;
    const url = (photoUrl || '').trim();
    if (!url) {
      if (Platform.OS === 'web') alert(language === 'tr' ? 'Fotoğraf adresi alınamadı.' : 'Could not get photo URL.');
      else Alert.alert(language === 'tr' ? 'Hata' : 'Error', language === 'tr' ? 'Fotoğraf adresi alınamadı.' : 'Could not get photo URL.');
      return;
    }
    try {
      const { data, error } = await supabase
        .from('profiles')
        .update({ profile_picture: url })
        .eq('id', user.id)
        .select('profile_picture')
        .single();
      if (error) throw error;
      if (!data?.profile_picture) {
        throw new Error(language === 'tr' ? 'Profil güncellenemedi (yetki veya satır bulunamadı).' : 'Profile update failed (permission or row not found).');
      }
      await refreshProfile();
      await fetchPhotos();
      const msg = language === 'tr' ? 'Profil fotoğrafı güncellendi' : 'Profile photo updated';
      if (Platform.OS === 'web') alert(msg);
      else Alert.alert(language === 'tr' ? 'Başarılı' : 'Success', msg);
    } catch (e: any) {
      const errMsg = e?.message || e?.error_description || (language === 'tr' ? 'Profil fotoğrafı güncellenemedi' : 'Failed to update profile photo');
      if (Platform.OS === 'web') alert(errMsg);
      else Alert.alert(language === 'tr' ? 'Hata' : 'Error', errMsg);
    }
  };

  const handlePhotoActions = (photo: Photo) => {
    Alert.alert(
      language === 'tr' ? 'Fotoğraf' : 'Photo',
      language === 'tr' ? 'Ne yapmak istersiniz?' : 'What would you like to do?',
      [
        {
          text: language === 'tr' ? 'Profil fotoğrafı yap' : 'Set as profile photo',
          onPress: () => handleSetAsProfilePhoto(photo.photo_url),
        },
        {
          text: language === 'tr' ? 'Sil' : 'Delete',
          style: 'destructive',
          onPress: () => handleDeletePhoto(photo.id, photo.photo_url),
        },
        { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
      ]
    );
  };

  const handleDeletePhoto = async (photoId: string, photoUrl: string) => {
    const confirmMessage = language === 'tr'
      ? 'Bu fotoğrafı silmek istediğinize emin misiniz?'
      : 'Are you sure you want to delete this photo?';

    const deleteAction = async () => {
      try {
        await deletePhotoFromStorage(photoUrl);

        const { error } = await supabase
          .from('photos')
          .delete()
          .eq('id', photoId);

        if (error) throw error;

        if (profile?.profile_picture === photoUrl) {
          const remainingPhotos = photos.filter(p => p.id !== photoId);
          const newProfilePicture = remainingPhotos.length > 0 ? remainingPhotos[0].photo_url : null;

          await supabase
            .from('profiles')
            .update({ profile_picture: newProfilePicture })
            .eq('id', user?.id);

          await refreshProfile();
        }

        await fetchPhotos();

        const message = language === 'tr'
          ? 'Fotoğraf silindi'
          : 'Photo deleted';

        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert(language === 'tr' ? 'Başarılı' : 'Success', message);
        }
      } catch (error: any) {
        const message = language === 'tr'
          ? 'Fotoğraf silinirken hata oluştu'
          : 'Error deleting photo';

        if (Platform.OS === 'web') {
          alert(message);
        } else {
          Alert.alert('Error', message);
        }
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(confirmMessage)) {
        await deleteAction();
      }
    } else {
      Alert.alert(
        language === 'tr' ? 'Fotoğrafı Sil' : 'Delete Photo',
        confirmMessage,
        [
          { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
          { text: language === 'tr' ? 'Sil' : 'Delete', style: 'destructive', onPress: deleteAction },
        ]
      );
    }
  };

  if (authLoading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]}>
        <View style={styles.loadingContainer}>
          <HeartLoader />
        </View>
      </SafeAreaView>
    );
  }

  if (!user) return null;

  const displayProfile = profile ?? {
    id: user.id,
    full_name: user.email?.split('@')[0] ?? (language === 'tr' ? 'Kullanıcı' : 'User'),
    username: '',
    profile_picture: null,
    bio: '',
    birth_date: '2000-01-01',
    verification_status: 'unverified' as const,
    is_online: false,
    height: null as number | null,
    weight: null as number | null,
    education: null as string | null,
    profession: null as string | null,
    country: '',
    city: null as string | null,
    body_type: null as string | null,
    smoking_habit: null as string | null,
    nationality: null as string | null,
    religion: null as string | null,
    alcohol_consumption: null as string | null,
    relationship_status: null as string | null,
    gender: null as string | null,
    children_status: null as string | null,
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const age = displayProfile.birth_date ? calculateAge(displayProfile.birth_date) : null;

  const completionFields = [
    displayProfile.profile_picture,
    displayProfile.bio,
    displayProfile.birth_date,
    displayProfile.gender,
    displayProfile.city,
    displayProfile.education,
    displayProfile.profession,
    displayProfile.children_status,
    displayProfile.religion,
    displayProfile.alcohol_consumption,
    displayProfile.body_type,
  ];
  const completedCount = completionFields.filter((v) => !!v).length;
  const completionPercent = Math.round(
    (completedCount / completionFields.length) * 100
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        <LinearGradient
          colors={theme.headerGradient}
          style={styles.headerGradient}>
          <TouchableOpacity
            style={styles.settingsButton}
            onPress={() => router.push('/(tabs)/settings' as any)}>
            <Settings size={24} color="#FFFFFF" />
          </TouchableOpacity>

          <View style={styles.header}>
            <View style={styles.profileHeader}>
              <TouchableOpacity
                style={styles.avatarContainer}
                onPress={handlePickImage}
                disabled={uploading}>
                {displayProfile.profile_picture ? (
                  <Image
                    source={{
                      uri: displayProfile.profile_picture,
                      cache: 'reload'
                    }}
                    style={styles.avatar}
                    key={displayProfile.profile_picture}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Camera size={40} color="#FFFFFF" />
                  </View>
                )}
                <View style={styles.cameraOverlay}>
                  <Camera size={20} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.nameContainer}>
                <View style={styles.nameRow}>
                  <Text style={styles.userName}>{displayProfile.full_name}</Text>
                  {displayProfile.verification_status === 'verified' ? (
                    <VerifiedBadge size={20} verified />
                  ) : (
                    <VerifiedBadge
                      size={20}
                      verified={false}
                      onPress={() => router.push('/verify-face')}
                    />
                  )}
                  {age && <Text style={styles.userAge}>, {age}</Text>}
                  {isUserOnlineNow(displayProfile.is_online, displayProfile.last_seen) && <View style={styles.onlineIndicator} />}
                </View>
                <Text style={styles.userHandle}>@{displayProfile.username || (language === 'tr' ? 'kullanıcı' : 'user')}</Text>
              </View>
            </View>

            <View style={styles.statsContainer}>
              <TouchableOpacity style={styles.statItem} onPress={() => router.push('/store/credits')}>
                <Coins size={24} color="#FFD700" />
                <Text style={styles.statValue}>{credits}</Text>
                <Text style={styles.statLabel}>Kontör</Text>
              </TouchableOpacity>
              {isPremium ? (
                <View style={styles.statItem}>
                  <Crown size={24} color="#FFD700" />
                  <View style={styles.statItemTextWrap}>
                    <Text style={styles.statValue}>Premium</Text>
                    <Text style={styles.statLabel}>Üye</Text>
                    <Text style={styles.statEndDate} numberOfLines={1}>
                      {subscriptionEnd
                        ? (language === 'tr' ? 'Bitiş: ' : 'Ends: ') +
                          new Date(subscriptionEnd).toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : language === 'tr'
                          ? 'Aktif'
                          : 'Active'}
                    </Text>
                  </View>
                </View>
              ) : (
                <TouchableOpacity style={styles.statItem} onPress={() => router.push('/store/premium')}>
                  <Crown size={24} color={theme.textSecondary} />
                  <Text style={[styles.statValue, { color: theme.textSecondary }]}>
                    {language === 'tr' ? 'Premium ol' : 'Go Premium'}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
            <Text style={[styles.creditInfoText, { color: theme.textSecondary }]}>
              {language === 'tr'
                ? 'Her mesaj 50 kredi, Premium üyeler için mesajlar ücretsiz.'
                : 'Each message costs 50 credits; messages are free for Premium members.'}
            </Text>
            <View style={styles.profileCompletionCard}>
              <Text style={[styles.profileCompletionText, { color: theme.textSecondary }]}>
                {language === 'tr'
                  ? `Profil tamamlanma oranı: %${completionPercent}`
                  : `Profile completeness: ${completionPercent}%`}
              </Text>
              <View style={[styles.profileCompletionBar, { backgroundColor: 'rgba(255,255,255,0.15)' }]}>
                <View
                  style={[
                    styles.profileCompletionFill,
                    { width: `${completionPercent}%`, backgroundColor: '#FFD700' },
                  ]}
                />
              </View>
            </View>
          </View>
        </LinearGradient>

        <View style={[styles.content, { backgroundColor: theme.background }]}>
            {isPremium && subscriptionEnd && planType && (() => {
              const planDef = PREMIUM_PLANS.find((p) => p.id === planType);
              const planLabel = planDef ? (language === 'tr' ? planDef.labelTr : planDef.labelEn) : planType;
              const endDate = new Date(subscriptionEnd);
              const dateStr = endDate.toLocaleDateString(language === 'tr' ? 'tr-TR' : 'en-US', {
                day: 'numeric',
                month: 'long',
                year: 'numeric',
              });
              return (
                <View style={[styles.subscriptionEndCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Crown size={18} color={theme.primary} />
                  <Text style={[styles.subscriptionEndText, { color: theme.textSecondary }]}>
                    {language === 'tr'
                      ? `${planLabel} üyeliğiniz ${dateStr} tarihinde sona erecek.`
                      : `Your ${planLabel.toLowerCase()} subscription will end on ${dateStr}.`}
                  </Text>
                </View>
              );
            })()}
            <View style={[styles.storeCard, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {language === 'tr' ? 'Mağaza' : 'Store'}
              </Text>
              <View style={styles.storeButtons}>
                {!isPremium && (
                  <TouchableOpacity
                    style={[styles.storeBtn, { backgroundColor: theme.primary + '22' }]}
                    onPress={() => router.push('/store/premium')}>
                    <Crown size={20} color={theme.primary} />
                    <Text style={[styles.storeBtnText, { color: theme.primary }]}>
                      {language === 'tr' ? 'Premium ol' : 'Go Premium'}
                    </Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.storeBtn, { backgroundColor: '#FFD70022' }]}
                  onPress={() => router.push('/store/credits')}>
                  <Coins size={20} color="#D4A017" />
                  <Text style={[styles.storeBtnText, { color: '#B8860B' }]}>
                    {language === 'tr' ? 'Kredi al' : 'Buy credits'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            <View style={[styles.infoCard, { backgroundColor: theme.cardBackground }]}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {language === 'tr' ? 'Fotoğraflarım' : 'My Photos'}
            </Text>

            <View style={styles.photosGrid}>
              <TouchableOpacity
                style={[styles.addPhotoButton, { borderColor: theme.border }]}
                onPress={handlePickImage}
                disabled={uploading}>
                <Plus size={32} color={theme.textSecondary} />
                <Text style={[styles.addPhotoText, { color: theme.textSecondary }]}>
                  {uploading
                    ? (language === 'tr' ? 'Yükleniyor...' : 'Uploading...')
                    : (language === 'tr' ? 'Fotoğraf Ekle' : 'Add Photo')}
                </Text>
              </TouchableOpacity>

              {photos.map((photo) => (
                <TouchableOpacity
                  key={photo.id}
                  style={styles.photoContainer}
                  onLongPress={() => handlePhotoActions(photo)}
                  activeOpacity={1}>
                  <Image source={{ uri: photo.photo_url }} style={styles.photo} />
                  {profile?.profile_picture === photo.photo_url && (
                    <View style={styles.profilePhotoBadge}>
                      <User size={12} color="#FFFFFF" />
                    </View>
                  )}
                  <TouchableOpacity
                    style={styles.deletePhotoButton}
                    onPress={() => handleDeletePhoto(photo.id, photo.photo_url)}>
                    <X size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {language === 'tr' ? 'Hakkımda' : 'About'}
              </Text>
              <TouchableOpacity
                onPress={() => {
                  if (editingBio) {
                    handleUpdateBio();
                  } else {
                    setEditingBio(true);
                  }
                }}
                style={[styles.editButton, { backgroundColor: theme.primary }]}>
                <Edit2 size={16} color="#FFFFFF" />
                <Text style={styles.editButtonText}>
                  {editingBio
                    ? (language === 'tr' ? 'Kaydet' : 'Save')
                    : (language === 'tr' ? 'Düzenle' : 'Edit')}
                </Text>
              </TouchableOpacity>
            </View>

            {editingBio ? (
              <TextInput
                style={[styles.bioInput, {
                  color: theme.text,
                  borderColor: theme.border,
                  backgroundColor: theme.background
                }]}
                value={bioText}
                onChangeText={setBioText}
                placeholder={language === 'tr' ? 'Kendinizden bahsedin...' : 'Tell about yourself...'}
                placeholderTextColor={theme.textSecondary}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            ) : (
              <>
                {displayProfile.bio ? (
                  <Text style={[styles.bioText, { color: theme.textSecondary }]}>
                    {displayProfile.bio}
                  </Text>
                ) : (
                  <Text style={[styles.noBioText, { color: theme.textSecondary }]}>
                    {language === 'tr'
                      ? 'Henüz bir biyografi eklenmemiş'
                      : 'No bio added yet'}
                  </Text>
                )}
              </>
            )}

            {editingBio && (
              <TouchableOpacity
                onPress={() => {
                  setBioText(profile?.bio || '');
                  setEditingBio(false);
                }}
                style={[styles.cancelButton, { borderColor: theme.border }]}>
                <Text style={[styles.cancelButtonText, { color: theme.text }]}>
                  {language === 'tr' ? 'İptal' : 'Cancel'}
                </Text>
              </TouchableOpacity>
            )}
          </View>

          <View style={[styles.infoCard, { backgroundColor: theme.cardBackground }]}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.text }]}>
                {language === 'tr' ? 'Profil Bilgileri' : 'Profile Information'}
              </Text>
              <TouchableOpacity
                onPress={() => setShowEditModal(true)}
                style={[styles.editButton, { backgroundColor: theme.primary }]}>
                <Edit size={16} color="#FFFFFF" />
                <Text style={styles.editButtonText}>
                  {language === 'tr' ? 'Düzenle' : 'Edit'}
                </Text>
              </TouchableOpacity>
            </View>

            {displayProfile.gender && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Cinsiyet:' : 'Gender:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {getGenderLabel(displayProfile.gender, language)}
                </Text>
              </View>
            )}

            {displayProfile.height && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Boy:' : 'Height:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{displayProfile.height} cm</Text>
              </View>
            )}

            {displayProfile.weight && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Kilo:' : 'Weight:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{displayProfile.weight} kg</Text>
              </View>
            )}

            {displayProfile.education && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Eğitim:' : 'Education:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {getEducationLabel(displayProfile.education, language)}
                </Text>
              </View>
            )}

            {displayProfile.profession && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Meslek:' : 'Profession:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {getProfessionLabel(displayProfile.profession, language)}
                </Text>
              </View>
            )}

            {age && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Yaş:' : 'Age:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{age}</Text>
              </View>
            )}

            {displayProfile.country && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Ülke:' : 'Country:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {getCountryLabel(displayProfile.country, language)}
                </Text>
              </View>
            )}

            {displayProfile.city && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Şehir:' : 'City:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{displayProfile.city}</Text>
              </View>
            )}

            {displayProfile.body_type && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Vücut Tipi:' : 'Body Type:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {getBodyTypeLabel(displayProfile.body_type, language)}
                </Text>
              </View>
            )}

            {displayProfile.nationality && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Uyruk:' : 'Nationality:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>{displayProfile.nationality}</Text>
              </View>
            )}

            {displayProfile.religion && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Din:' : 'Religion:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {getReligionLabel(displayProfile.religion, language)}
                </Text>
              </View>
            )}

            {displayProfile.alcohol_consumption && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'Alkol:' : 'Alcohol:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {getAlcoholLabel(displayProfile.alcohol_consumption, language)}
                </Text>
              </View>
            )}

            {displayProfile.relationship_status && (
              <View style={styles.infoRow}>
                <Text style={[styles.infoLabel, { color: theme.textSecondary }]}>
                  {language === 'tr' ? 'İlişki Durumu:' : 'Relationship Status:'}
                </Text>
                <Text style={[styles.infoValue, { color: theme.text }]}>
                  {getRelationshipStatusLabel(displayProfile.relationship_status, language)}
                </Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <EditProfileModal
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        profile={{
          full_name: displayProfile.full_name ?? null,
          username: displayProfile.username ?? null,
          birth_date: displayProfile.birth_date ?? null,
          gender: displayProfile.gender ?? null,
          height: displayProfile.height ?? null,
          weight: displayProfile.weight ?? null,
          education: displayProfile.education ?? null,
          profession: displayProfile.profession ?? null,
          smoking_habit: displayProfile.smoking_habit ?? null,
          body_type: displayProfile.body_type ?? null,
          country: displayProfile.country ?? null,
          city: displayProfile.city ?? null,
          children_status: displayProfile.children_status ?? null,
          alcohol_consumption: displayProfile.alcohol_consumption ?? null,
          religion: displayProfile.religion ?? null,
          relationship_status: displayProfile.relationship_status ?? null,
        }}
        userId={user?.id || ''}
        onUpdate={refreshProfile}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  loadingSubtext: {
    fontSize: 14,
    marginTop: 8,
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  headerGradient: {
    paddingTop: 10,
    paddingBottom: 30,
  },
  header: {
    alignItems: 'center',
    position: 'relative',
  },
  settingsButton: {
    position: 'absolute',
    top: 10,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginTop: 40,
    marginBottom: 16,
    gap: 16,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: '#FFFFFF',
  },
  cameraOverlay: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  nameContainer: {
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  userName: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userAge: {
    fontSize: 24,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  userHandle: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.8)',
    marginTop: 4,
  },
  onlineIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#4ECB71',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 32,
    marginTop: 24,
  },
  statItem: {
    alignItems: 'center',
    gap: 4,
  },
  statItemTextWrap: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFFFFF',
    marginTop: 4,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.8)',
  },
  statEndDate: {
    fontSize: 12,
    marginTop: 2,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: '600',
  },
  creditInfoText: {
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  profileCompletionCard: {
    marginTop: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  profileCompletionText: {
    fontSize: 13,
    fontWeight: '500',
  },
  profileCompletionBar: {
    height: 6,
    borderRadius: 999,
    overflow: 'hidden',
  },
  profileCompletionFill: {
    height: '100%',
    borderRadius: 999,
  },
  content: {
    padding: 20,
  },
  infoCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  subscriptionEndCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 14,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  subscriptionEndText: { fontSize: 13, flex: 1 },
  storeCard: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
  },
  storeButtons: { flexDirection: 'row', gap: 12, marginTop: 8 },
  storeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
  },
  storeBtnText: { fontSize: 14, fontWeight: '700' },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
  },
  photosGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  addPhotoButton: {
    width: 100,
    height: 100,
    borderRadius: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 4,
  },
  addPhotoText: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  photoContainer: {
    position: 'relative',
    width: 100,
    height: 100,
  },
  photo: {
    width: 100,
    height: 100,
    borderRadius: 12,
  },
  profilePhotoBadge: {
    position: 'absolute',
    bottom: 4,
    left: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(74, 144, 226, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deletePhotoButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  bioText: {
    fontSize: 14,
    lineHeight: 20,
  },
  noBioText: {
    fontSize: 14,
    fontStyle: 'italic',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  infoValue: {
    fontSize: 14,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  editButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  bioInput: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    fontSize: 14,
    minHeight: 100,
    marginBottom: 12,
  },
  cancelButton: {
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
