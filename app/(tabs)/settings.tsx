import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, Platform, Modal, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Settings as SettingsIcon, LogOut, Globe, Palette, Trash2, Mail, Check, FileText, X, ShoppingBag, FileCheck, Shield } from 'lucide-react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme, ThemeType } from '@/contexts/ThemeContext';
import { useRouter } from 'expo-router';
import { supabase } from '@/lib/supabase';
import { useState } from 'react';
import { getErrorLogs, clearErrorLogs, ErrorLog } from '@/lib/errorLogger';

export default function SettingsScreen() {
  const { signOut, user } = useAuth();
  const { t, language, setLanguage } = useLanguage();
  const { theme, themeType, setTheme } = useTheme();
  const router = useRouter();
  const [showErrorLogs, setShowErrorLogs] = useState(false);
  const [errorLogs, setErrorLogs] = useState<ErrorLog[]>([]);
  const [showBlockedUsers, setShowBlockedUsers] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<any[]>([]);

  const handleLogout = async () => {
    const confirmText = language === 'tr' ? 'Çıkış yapmak istediğinize emin misiniz?' : 'Are you sure you want to logout?';
    const cancelText = language === 'tr' ? 'İptal' : 'Cancel';

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(confirmText);
      if (confirmed) {
        try {
          await signOut();
          router.replace('/welcome');
        } catch (error: any) {
          alert(error.message || 'Failed to logout');
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
              Alert.alert('Error', error.message || 'Failed to logout');
            }
          },
        },
      ]);
    }
  };

  const handleDeleteAccount = async () => {
    const confirmText = language === 'tr'
      ? 'Hesabınızı kalıcı olarak silmek istediğinize emin misiniz? Bu işlem geri alınamaz.'
      : 'Are you sure you want to permanently delete your account? This action cannot be undone.';
    const cancelText = language === 'tr' ? 'İptal' : 'Cancel';
    const deleteText = language === 'tr' ? 'Evet, Sil' : 'Yes, Delete';

    if (Platform.OS === 'web') {
      const confirmed = window.confirm(confirmText);
      if (confirmed) {
        try {
          const { error } = await supabase.rpc('delete_user_account');
          if (error) throw error;

          await signOut();
          const successMessage = language === 'tr'
            ? 'Hesabınız kalıcı olarak silindi.'
            : 'Your account has been permanently deleted.';
          alert(successMessage);
          router.replace('/welcome');
        } catch (error: any) {
          const errorMessage = language === 'tr'
            ? 'Hesap silinirken bir hata oluştu: '
            : 'Error deleting account: ';
          alert(errorMessage + (error.message || 'Unknown error'));
        }
      }
    } else {
      Alert.alert(
        language === 'tr' ? 'Hesabı Sil' : 'Delete Account',
        confirmText,
        [
          { text: cancelText, style: 'cancel' },
          {
            text: deleteText,
            style: 'destructive',
            onPress: async () => {
              try {
                const { error } = await supabase.rpc('delete_user_account');
                if (error) throw error;

                await signOut();
                const successMessage = language === 'tr'
                  ? 'Hesabınız kalıcı olarak silindi.'
                  : 'Your account has been permanently deleted.';
                Alert.alert(
                  language === 'tr' ? 'Başarılı' : 'Success',
                  successMessage
                );
                router.replace('/welcome');
              } catch (error: any) {
                const errorMessage = language === 'tr'
                  ? 'Hesap silinirken bir hata oluştu: '
                  : 'Error deleting account: ';
                Alert.alert('Error', errorMessage + (error.message || 'Unknown error'));
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
    const confirmText = language === 'tr'
      ? 'Tüm hata kayıtlarını silmek istediğinize emin misiniz?'
      : 'Are you sure you want to clear all error logs?';

    if (Platform.OS === 'web') {
      if (window.confirm(confirmText)) {
        await clearErrorLogs();
        setErrorLogs([]);
        alert(language === 'tr' ? 'Hata kayıtları temizlendi' : 'Error logs cleared');
      }
    } else {
      Alert.alert(
        language === 'tr' ? 'Kayıtları Temizle' : 'Clear Logs',
        confirmText,
        [
          { text: language === 'tr' ? 'İptal' : 'Cancel', style: 'cancel' },
          {
            text: language === 'tr' ? 'Temizle' : 'Clear',
            style: 'destructive',
            onPress: async () => {
              await clearErrorLogs();
              setErrorLogs([]);
              Alert.alert(
                language === 'tr' ? 'Başarılı' : 'Success',
                language === 'tr' ? 'Hata kayıtları temizlendi' : 'Error logs cleared'
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
        'Error',
        e?.message ||
          (language === 'tr'
            ? 'Engellenen kullanıcılar yüklenemedi.'
            : 'Failed to load blocked users.')
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
              {language === 'tr' ? 'Tema' : 'Theme'}
            </Text>
          </View>

          <View style={styles.themeOptions}>
            <TouchableOpacity
              style={[
                styles.themeOption,
                { borderColor: theme.border },
                themeType === 'light' && [styles.themeOptionActive, { borderColor: theme.primary }]
              ]}
              onPress={() => handleThemeChange('light')}>
              <View style={[styles.themePreview, { backgroundColor: '#FFFFFF' }]}>
                <View style={styles.themePreviewBar} />
                <View style={styles.themePreviewContent} />
              </View>
              <Text style={[styles.themeOptionText, { color: theme.text }]}>
                {language === 'tr' ? 'Beyaz Tema' : 'Light Theme'}
              </Text>
              {themeType === 'light' && <Check size={20} color={theme.primary} style={styles.checkIcon} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { borderColor: theme.border },
                themeType === 'dark' && [styles.themeOptionActive, { borderColor: theme.primary }]
              ]}
              onPress={() => handleThemeChange('dark')}>
              <View style={[styles.themePreview, { backgroundColor: '#121212' }]}>
                <View style={[styles.themePreviewBar, { backgroundColor: '#1E1E1E' }]} />
                <View style={[styles.themePreviewContent, { backgroundColor: '#2A2A2A' }]} />
              </View>
              <Text style={[styles.themeOptionText, { color: theme.text }]}>
                {language === 'tr' ? 'Siyah Tema' : 'Dark Theme'}
              </Text>
              {themeType === 'dark' && <Check size={20} color={theme.primary} style={styles.checkIcon} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeOption,
                { borderColor: theme.border },
                themeType === 'colored' && [styles.themeOptionActive, { borderColor: theme.primary }]
              ]}
              onPress={() => handleThemeChange('colored')}>
              <View style={[styles.themePreview, { backgroundColor: '#FFF5F7' }]}>
                <LinearGradient
                  colors={['#FF6B9D', '#C44569']}
                  style={styles.themePreviewBar}
                />
                <View style={[styles.themePreviewContent, { backgroundColor: '#FFFFFF' }]} />
              </View>
              <Text style={[styles.themeOptionText, { color: theme.text }]}>
                {language === 'tr' ? 'Renkli Tema' : 'Colored Theme'}
              </Text>
              {themeType === 'colored' && <Check size={20} color={theme.primary} style={styles.checkIcon} />}
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <View style={styles.sectionHeader}>
            <Globe size={24} color={theme.primary} />
            <Text style={[styles.sectionTitle, { color: theme.text }]}>
              {language === 'tr' ? 'Dil' : 'Language'}
            </Text>
          </View>

          <View style={styles.languageButtons}>
            <TouchableOpacity
              style={[
                styles.languageButton,
                { borderColor: theme.border },
                language === 'tr' && [styles.languageButtonActive, { backgroundColor: theme.primary }]
              ]}
              onPress={() => setLanguage('tr')}>
              <Text style={[
                styles.languageButtonText,
                { color: language === 'tr' ? '#FFFFFF' : theme.text }
              ]}>
                Türkçe
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.languageButton,
                { borderColor: theme.border },
                language === 'en' && [styles.languageButtonActive, { backgroundColor: theme.primary }]
              ]}
              onPress={() => setLanguage('en')}>
              <Text style={[
                styles.languageButtonText,
                { color: language === 'en' ? '#FFFFFF' : theme.text }
              ]}>
                English
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {language === 'tr' ? 'Mağaza' : 'Store'}
          </Text>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={() => router.push('/store')}>
            <View style={styles.settingLeft}>
              <ShoppingBag size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>
                {language === 'tr' ? 'Premium & Kredi' : 'Premium & Credits'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {language === 'tr' ? 'Yasal' : 'Legal'}
          </Text>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={() => router.push('/legal/terms')}>
            <View style={styles.settingLeft}>
              <FileCheck size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>
                {language === 'tr' ? 'Kullanım Şartları' : 'Terms of Use'}
              </Text>
            </View>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={() => router.push('/legal/privacy')}>
            <View style={styles.settingLeft}>
              <Shield size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>
                {language === 'tr' ? 'Gizlilik Politikası' : 'Privacy Policy'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {language === 'tr' ? 'Gizlilik & Güvenlik' : 'Privacy & Safety'}
          </Text>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={handleViewBlockedUsers}>
            <View style={styles.settingLeft}>
              <Shield size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>
                {language === 'tr' ? 'Engellenen kullanıcılar' : 'Blocked users'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {language === 'tr' ? 'Geliştirici' : 'Developer'}
          </Text>
          <TouchableOpacity
            style={[styles.settingItem, { borderBottomColor: theme.border }]}
            onPress={handleViewErrorLogs}>
            <View style={styles.settingLeft}>
              <FileText size={24} color={theme.primary} />
              <Text style={[styles.settingText, { color: theme.text }]}>
                {language === 'tr' ? 'Hata Kayıtları' : 'Error Logs'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={[styles.section, { backgroundColor: theme.cardBackground }]}>
          <Text style={[styles.sectionTitle, { color: theme.text }]}>
            {language === 'tr' ? 'Yardım & Destek' : 'Help & Support'}
          </Text>

          <View style={styles.helpContainer}>
            <Mail size={32} color={theme.primary} />
            <Text style={[styles.helpTitle, { color: theme.text }]}>
              {language === 'tr' ? 'İletişim' : 'Contact'}
            </Text>
            <View style={styles.emailContainer}>
              <Mail size={20} color={theme.textSecondary} />
              <Text style={[styles.emailText, { color: theme.textSecondary }]}>destek@chatapp.com</Text>
            </View>
            <Text style={[styles.contactNote, { color: theme.textSecondary }]}>
              {language === 'tr'
                ? 'İletişim için bu e-posta adresini kullanabilirsiniz.'
                : 'You can use this email address to contact us.'}
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
            {language === 'tr' ? 'Hesabı Sil' : 'Delete Account'}
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
              {language === 'tr' ? 'Hata Kayıtları' : 'Error Logs'}
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
                  {language === 'tr' ? 'Hata kaydı bulunamadı' : 'No error logs found'}
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
                      Context: {log.context}
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
                {language === 'tr' ? 'Kayıtları Temizle' : 'Clear Logs'}
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
              {language === 'tr' ? 'Engellenen kullanıcılar' : 'Blocked users'}
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
                  {language === 'tr' ? 'Engellenen kullanıcı yok' : 'No blocked users'}
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
                            'Error',
                            e?.message ||
                              (language === 'tr'
                                ? 'Engel kaldırılamadı.'
                                : 'Failed to unblock user.')
                          );
                        }
                      }}>
                      <Text style={styles.unblockButtonText}>
                        {language === 'tr' ? 'Engeli kaldır' : 'Unblock'}
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

const styles = StyleSheet.create({
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
    backgroundColor: '#4A90E2',
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
