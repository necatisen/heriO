import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal, Image, Switch } from 'react-native';
import type { Language } from '@/lib/i18n';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings as SettingsIcon, LogOut, Globe, Palette, Trash2, Mail, Check, FileText, X, ShoppingBag, FileCheck, Shield, Cake, ShieldCheck } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme, THEMES, THEME_TYPES, type ThemeType , type Theme } from '@/contexts/ThemeContext';
import { useRouter, type Href } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useState, useMemo, useEffect } from 'react';
import { loadShareBirthday, saveShareBirthday } from '@/lib/birthdayGreetings';
import { loadBirthDateExact } from '@/lib/birthday';
import { getMyStaffRole, type StaffRole } from '@/lib/staff';
import { getErrorLogs, clearErrorLogs, ErrorLog } from '@/lib/errorLogger';
import { paymentsEnabledSync } from '@/lib/payments';

import { L } from '@/lib/l10n';
const THEME_LABELS: Record<ThemeType, { tr: string; en: string; subTr: string; subEn: string }> = {
  sunset: { tr: 'Gün Batımı', en: 'Sunset', subTr: 'Turuncu, pembe ve mor', subEn: 'Orange, pink and purple' },
  aurora: { tr: 'Aurora', en: 'Aurora', subTr: 'Mavi, mor ve pembe', subEn: 'Blue, purple and pink' },
  peach: { tr: 'Şeftali', en: 'Peach', subTr: 'Şeftali, mercan ve pembe', subEn: 'Peach, coral and pink' },
  night: { tr: 'Gece', en: 'Night', subTr: 'Yumuşak koyu tema', subEn: 'Soft dark theme' },
  mono: { tr: 'Koyu (renksiz)', en: 'Dark (monochrome)', subTr: 'Siyah, gri ve beyaz', subEn: 'Black, grey and white' },
};

const LANGUAGE_OPTIONS: { code: Language; native: string; flag: string }[] = [
  { code: 'tr', native: 'Türkçe', flag: '🇹🇷' },
  { code: 'en', native: 'English', flag: '🇬🇧' },
  { code: 'de', native: 'Deutsch', flag: '🇩🇪' },
  { code: 'fr', native: 'Français', flag: '🇫🇷' },
  { code: 'es', native: 'Español', flag: '🇪🇸' },
  { code: 'ru', native: 'Русский', flag: '🇷🇺' },
  { code: 'ar', native: 'العربية', flag: '🇸🇦' },
];

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, themeType, setTheme } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const router = useRouter();
  const [showErrorLogs, setShowErrorLogs] = useState(false);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);
  const [shareBday, setShareBday] = useState(false);
  const [staffRole, setStaffRoleState] = useState<StaffRole | null>(null);

  useEffect(() => {
    getMyStaffRole(user?.id, true).then(setStaffRoleState);
  }, [user?.id]);

  useEffect(() => {
    loadShareBirthday(user?.id).then(setShareBday);
  }, [user?.id]);

  const toggleShareBday = async (v: boolean) => {
    if (!user?.id) return;
    if (v && !(await loadBirthDateExact(user.id))) {
      Alert.alert(
        L('Önce doğum gününü ekle', 'Add your birthday first'),
        L('Profilim → Profili düzenle bölümünden doğum gününü (gün ve ay) seç.', 'Pick your birthday (day and month) in My profile → Edit profile.')
      );
      return;
    }
    setShareBday(v);
    try {
      await saveShareBirthday(user.id, v);
    } catch (e: any) {
      setShareBday(!v);
      Alert.alert(L('Hata', 'Error'), e?.message || '');
    }
  };

  const handleLogout = async () => {
    const confirmText = L('Çıkış yapmak istediğinize emin misiniz?', 'Are you sure you want to logout?');
    const cancelText = L('İptal', 'Cancel');

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(confirmText);
      if (confirmed) {
        try {
          await signOut();
          router.replace('/welcome');
        } catch (error: any) {
          alert(error.message || L('Çıkış yapılamadı', 'Failed to logout'));
        }
      }
    } else {
      Alert.alert(t.logout, confirmText, [
        { text: cancelText, style: 'cancel' },
        {
          text: t.logout,
          style: 'destructive',
          onPress: async () => {
            try {
              await signOut();
              router.replace('/welcome');
            } catch (error: any) {
              Alert.alert(L('Hata', 'Error'), error.message || L('Çıkış yapılamadı', 'Failed to logout'));
            }
          },
        },
      ]);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = L('Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.', 'Are you sure you want to permanently delete your account? This action cannot be undone.');
    const cancelText = L('İptal', 'Cancel');
    const deleteText = L('Evet, Sil', 'Yes, Delete');

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(confirmText);
      if (confirmed) {
        try {
          // Removes uploaded files (photos, verification images) and all account data.
          const { data: delRes, error } = await supabase.functions.invoke('delete-account', { body: {} });
          if (!error && delRes && delRes.success === false) throw new Error(delRes.message);
          if (error) throw error;

          await signOut();
          const successMessage = L('Hesabınız kalıcı olarak silindi.', 'Your account has been permanently deleted.');
          alert(successMessage);
          router.replace('/welcome');
        } catch (error: any) {
          const errorMessage = L('Hesap silinirken bir hata oluştu: ', 'Error deleting account: ');
          alert(errorMessage + (error.message || L('Bilinmeyen hata', 'Unknown error')));
        }
      }
    } else {
      Alert.alert(
        L('Hesabı Sil', 'Delete Account'),
        confirmText,
        [
          { text: cancelText, style: 'cancel' },
          {
            text: deleteText,
            style: 'destructive',
            onPress: async () => {
              try {
                // Removes uploaded files (photos, verification images) and all account data.
          const { data: delRes, error } = await supabase.functions.invoke('delete-account', { body: {} });
          if (!error && delRes && delRes.success === false) throw new Error(delRes.message);
                if (error) throw error;

                await signOut();
                const successMessage = L('Hesabınız kalıcı olarak silindi.', 'Your account has been permanently deleted.');
                Alert.alert(
                  L('Başarılı', 'Success'),
                  successMessage
                );
                router.replace('/welcome');
              } catch (error: any) {
                const errorMessage = L('Hesap silinirken bir hata oluştu: ', 'Error deleting account: ');
                Alert.alert(L('Hata', 'Error'), errorMessage + (error.message || L('Bilinmeyen hata', 'Unknown error')));
              }
            },
          },
        ]
      );
    }
  };

  const handleThemeChange = (type: ThemeType) => {
    setTheme(type);
  };

  const handleViewErrorLogs = async () => {
    const logs = await getErrorLogs();
    setErrorLogs(logs);
    setShowErrorLogs(true);
  };

  const handleClearErrorLogs = async () => {
    const confirmText = L('Tüm hata kayıtlarını silmek istediğinize emin misiniz?', 'Are you sure you want to clear all error logs?');

    if (Platform.OS === 'web') {
      if (window.confirm(confirmText)) {
        await clearErrorLogs();
        setErrorLogs([]);
        alert(L('Hata kayıtları temizlendi', 'Error logs cleared'));
      }
    } else {
      Alert.alert(
        L('Kayıtları Temizle', 'Clear Logs'),
        confirmText,
        [
          { text: L('İptal', 'Cancel'), style: 'cancel' },
          {
            text: L('Temizle', 'Clear'),
            style: 'destructive',
            onPress: async () => {
              await clearErrorLogs();
              setErrorLogs([]);
              Alert.alert(
                L('Başarılı', 'Success'),
                L('Hata kayıtları temizlendi', 'Error logs cleared')
              );
            },
          },
        ]
      );
    }
  };

  const handleViewBlockedUsers = async () => {
    if (!user?.id) return;
    try {
      const { data: blocks, error } = await supabase
        .from('blocks')
        .select('blocked_user_id')
        .eq('user_id', user.id);
      if (error) throw error;

      const ids = (blocks || []).map((b: any) => b.blocked_user_id);
      if (!ids.length) {
        setBlockedUsers([]);
        setShowBlockedUsers(true);
        return;
      }

      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('id, full_name, username, profile_picture')
        .in('id', ids);
      if (profilesError) throw profilesError;

      setBlockedUsers(profiles || []);
      setShowBlockedUsers(true);
    } catch (e: any) {
      Alert.alert(
        L('Hata', 'Error'),
        e?.message ||
          (L('Engellenen kullanıcılar yüklenemedi.', 'Failed to load blocked users.'))
      );
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <LinearGradient colors={theme.headerGradient} style={styles.headerGradient}>
        <View style={styles.header}>
          <SettingsIcon size={32} color="#FFFFFF" />
          <Text style={styles.headerTitle}>{t.settings}</Text>
        </View>
      </LinearGradient>

      <ScrollView contentContainerStyle={styles.content}>
        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.sectionHeader}>
            <Palette size={24} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {L('Tema', 'Theme')}
            </Text>
          </View>

          <View style={styles.themeOptions}>
            {THEME_TYPES.map((type) => {
              const t = THEMES[type];
              const active = themeType === type;
              const label = THEME_LABELS[type];
              return (
                <TouchableOpacity
                  key={type}
                  style={[
                    styles.themeOption,
                    { borderColor: theme.border },
                    active && [styles.themeOptionActive, { borderColor: theme.primary }],
                  ]}
                  onPress={() => handleThemeChange(type)}>
                  <View style={[styles.themePreview, { backgroundColor: t.background }]}>
                    <LinearGradient colors={t.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.themePreviewBar} />
                    <View style={[styles.themePreviewContent, { backgroundColor: t.cardBackground }]} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.themeOptionText, { color: theme.text }]}>{L(label.tr, label.en)}</Text>
                    <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>{L(label.subTr, label.subEn)}</Text>
                  </View>
                  {active && <Check size={20} color={theme.primary} style={styles.checkIcon} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.sectionHeader}>
            <Globe size={24} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {L('Dil', 'Language')}
            </Text>
          </View>

          <View style={styles.languageGrid}>
            {LANGUAGE_OPTIONS.map((opt) => {
              const active = language === opt.code;
              return (
                <TouchableOpacity
                  key={opt.code}
                  style={[
                    styles.languageChip,
                    { borderColor: active ? theme.primary : theme.border },
                    active && { backgroundColor: theme.primary },
                  ]}
                  onPress={() => setLanguage(opt.code)}>
                  <Text style={styles.languageFlag}>{opt.flag}</Text>
                  <Text style={[styles.languageButtonText, { color: active ? '#FFFFFF' : theme.text }]}>{opt.native}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {paymentsEnabledSync() && (
        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {L('Mağaza', 'Store')}
          </Text>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={() => router.push('/store')}>
            <View style={styles.settingLeft}>
              <ShoppingBag size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>
                {L('Premium & Kredi', 'Premium & Credits')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>
        )}

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {L('Yasal', 'Legal')}
          </Text>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={() => router.push('/legal/terms')}>
            <View style={styles.settingLeft}>
              <FileCheck size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>
                {L('Kullanım Şartları', 'Terms of Use')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={() => router.push('/legal/privacy')}>
            <View style={styles.settingLeft}>
              <Shield size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>
                {L('Gizlilik Politikası', 'Privacy Policy')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={() => router.push('/legal/kvkk' as Href)}>
            <View style={styles.settingLeft}>
              <FileCheck size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>
                {L('KVKK Aydınlatma Metni', 'Personal Data Notice')}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={() => router.push('/legal/consent' as Href)}>
            <View style={styles.settingLeft}>
              <Shield size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>
                {L('Açık Rıza Metni', 'Explicit Consent')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {L('Gizlilik & Güvenlik', 'Privacy & Safety')}
          </Text>
          {staffRole ? (
            <TouchableOpacity
              style={[styles.settingItem, { borderBottomColor: theme.border }]}
              onPress={() => router.push('/admin' as Href)}>
              <View style={styles.settingLeft}>
                <ShieldCheck size={24} color={theme.primary} />
                <Text style={[styles.settingText, { color: theme.text }]}>
                  {L('Yönetim', 'Moderation')} ({staffRole === 'admin' ? 'Admin' : L('Moderatör', 'Moderator')})
                </Text>
              </View>
            </TouchableOpacity>
          ) : null}
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={handleViewBlockedUsers}>
            <View style={styles.settingLeft}>
              <Shield size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>
                {L('Engellenen kullanıcılar', 'Blocked users')}
              </Text>
            </View>
          </TouchableOpacity>
          <View style={[styles.settingItem, { borderBottomColor: theme.border }]}>
            <View style={[styles.settingLeft, { flex: 1 }]}>
              <Cake size={24} color={theme.primary} />
              <View style={{ flex: 1 }}>
                <Text style={[styles.settingText, { color: theme.text }]}>{L('Doğum günümü paylaş', 'Share my birthday')}</Text>
                <Text style={{ color: theme.textSecondary, fontSize: 12, marginTop: 2 }}>
                  {L('Doğum günü ikizlerinde görün ve doğum günü haftanda öne çık.', 'Appear to your birthday twins and get boosted in your birthday week.')}
                </Text>
              </View>
            </View>
            <Switch value={shareBday} onValueChange={toggleShareBday} trackColor={{ true: theme.primary, false: theme.border }} thumbColor="#FFFFFF" />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {L('Geliştirici', 'Developer')}
          </Text>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={handleViewErrorLogs}>
            <View style={styles.settingLeft}>
              <FileText size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>
                {L('Hata Kayıtları', 'Error Logs')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {L('Yardım & Destek', 'Help & Support')}
          </Text>

          <View style={styles.helpContainer}>
            <Mail size={32} color={theme.primary} />
            <Text style={[styles.helpTitle, { color: theme.text }]}>
              {L('İletişim', 'Contact')}
            </Text>
            <View style={styles.emailContainer}>
              <Mail size={20} color={theme.textSecondary} />
              <Text style={[styles.emailText, { color: theme.textSecondary }]}>birthchathelp@gmail.com</Text>
            </View>
            <Text style={[styles.contactNote, { color: theme.textSecondary }]}>
              {L('İletişim için bu e-posta adresini kullanabilirsiniz.', 'You can use this email address to contact us.')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[styles.settingButton, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}
          onPress={handleLogout}>
          <LogOut size={20} color={theme.error} />
          <Text style={[styles.settingButtonText, { color: theme.error }]}>{t.logout}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.settingButton, { backgroundColor: theme.cardBackground, borderColor: theme.error }]}
          onPress={handleDeleteAccount}>
          <Trash2 size={20} color={theme.error} />
          <Text style={[styles.settingButtonText, { color: theme.error }]}>
            {L('Hesabı Sil', 'Delete Account')}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      <Modal
        visible={showErrorLogs}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowErrorLogs(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {L('Hata Kayıtları', 'Error Logs')}
            </Text>
            <TouchableOpacity onPress={() => setShowErrorLogs(false)}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.logsContainer}>
            {errorLogs.length === 0 ? (
              <View style={styles.emptyLogsContainer}>
                <FileText size={60} color="#CCCCCC" />
                <Text style={[styles.emptyLogsText, { color: theme.textSecondary }]}>
                  {L('Hata kaydı bulunamadı', 'No error logs found')}
                </Text>
              </View>
            ) : (
              errorLogs.map((log) => (
                <View key={log.id} style={[styles.logItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <Text style={[styles.logTimestamp, { color: theme.textSecondary }]}>
                    {new Date(log.timestamp).toLocaleString()}
                  </Text>
                  <Text style={[styles.logMessage, { color: theme.error }]}>
                    {log.message}
                  </Text>
                  {log.context && (
                    <Text style={[styles.logContext, { color: theme.textSecondary }]}>
                      {L('Bağlam', 'Context')}: {log.context}
                    </Text>
                  )}
                  {log.stack && (
                    <Text style={[styles.logStack, { color: theme.textSecondary }]} numberOfLines={3}>
                      {log.stack}
                    </Text>
                  )}
                </View>
              ))
            )}
          </ScrollView>

          <View style={[styles.modalFooter, { borderTopColor: theme.border }]}>
            <TouchableOpacity
              style={[styles.clearLogsButton, { backgroundColor: theme.error }]}
              onPress={handleClearErrorLogs}
              disabled={errorLogs.length === 0}>
              <Trash2 size={20} color="#FFFFFF" />
              <Text style={styles.clearLogsButtonText}>
                {L('Kayıtları Temizle', 'Clear Logs')}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      <Modal
        visible={showBlockedUsers}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowBlockedUsers(false)}>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: theme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: theme.border }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              {L('Engellenen kullanıcılar', 'Blocked users')}
            </Text>
            <TouchableOpacity onPress={() => setShowBlockedUsers(false)}>
              <X size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.logsContainer}>
            {blockedUsers.length === 0 ? (
              <View style={styles.emptyLogsContainer}>
                <Shield size={60} color="#CCCCCC" />
                <Text style={[styles.emptyLogsText, { color: theme.textSecondary }]}>
                  {L('Engellenen kullanıcı yok', 'No blocked users')}
                </Text>
              </View>
            ) : (
              blockedUsers.map((u: any) => (
                <View
                  key={u.id}
                  style={[styles.logItem, { backgroundColor: theme.cardBackground, borderColor: theme.border }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      {u.profile_picture ? (
                        <Image
                          source={{ uri: u.profile_picture }}
                          style={styles.blockedAvatar}
                        />
                      ) : (
                        <View style={styles.blockedAvatarPlaceholder}>
                          <Text style={{ fontSize: 10, color: theme.textSecondary }}>
                            {u.full_name?.[0]?.toUpperCase() || '?'}
                          </Text>
                        </View>
                      )}
                      <Text style={[styles.logMessage, { color: theme.text }]}>
                        {u.full_name} {u.username ? `(@${u.username})` : ''}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.unblockButton}
                      onPress={async () => {
                        if (!user?.id) return;
                        try {
                          const { error } = await supabase
                            .from('blocks')
                            .delete()
                            .eq('user_id', user.id)
                            .eq('blocked_user_id', u.id);
                          if (error) throw error;
                          setBlockedUsers((prev) => prev.filter((b) => b.id !== u.id));
                        } catch (e: any) {
                          Alert.alert(
                            L('Hata', 'Error'),
                            e?.message ||
                              (L('Engel kaldırılamadı.', 'Failed to unblock user.'))
                          );
                        }
                      }}>
                      <Text style={styles.unblockButtonText}>
                        {L('Engeli kaldır', 'Unblock')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const createStyles = (t: Theme) =>
  StyleSheet.create({
  container: {
    flex: 1,
  },
  headerGradient: {
    paddingTop: 10,
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
  content: {
    padding: 20,
  },
  section: {
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  themeOptions: {
    gap: 12,
  },
  themeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 2,
    gap: 12,
  },
  themeOptionActive: {
    borderWidth: 3,
  },
  themePreview: {
    width: 60,
    height: 60,
    borderRadius: 8,
    overflow: 'hidden',
  },
  themePreviewBar: {
    height: 20,
    backgroundColor: t.primary,
  },
  themePreviewContent: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  themeOptionText: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  checkIcon: {
    marginLeft: 'auto',
  },
  languageGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  languageChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1.5,
  },
  languageFlag: {
    fontSize: 18,
  },
  languageButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  languageButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    borderWidth: 2,
    alignItems: 'center',
  },
  languageButtonActive: {
    borderWidth: 0,
  },
  languageButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  settingItem: {
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  settingText: {
    fontSize: 16,
    fontWeight: '600',
  },
  helpTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 8,
  },
  emailContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
  },
  emailText: {
    fontSize: 16,
  },
  contactNote: {
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  settingButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  settingButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
  },
  logsContainer: {
    flex: 1,
    padding: 16,
  },
  emptyLogsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyLogsText: {
    fontSize: 16,
    marginTop: 16,
  },
  logItem: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  logTimestamp: {
    fontSize: 12,
    marginBottom: 8,
  },
  logMessage: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
  },
  logContext: {
    fontSize: 12,
    marginTop: 4,
  },
  logStack: {
    fontSize: 11,
    marginTop: 8,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
  },
  clearLogsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    padding: 16,
    borderRadius: 12,
  },
  clearLogsButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  unblockButton: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF5555',
  },
  unblockButtonText: {
    fontSize: 12,
    color: '#FF5555',
    fontWeight: '500',
  },
  blockedAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  blockedAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#EEE',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
