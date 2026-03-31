import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Platform } from 'react-native';
import {
  Search,
  MessageCircle,
  Users,
  User,
  Heart,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { registerPushToken, setNotificationHandler } from '@/lib/pushNotifications';
import { useRouter } from 'expo-router';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { theme } = useTheme();
  const { language } = useLanguage();
  const { user } = useAuth();
  const router = useRouter();
  const handledResponseRef = useRef(false);

  useEffect(() => {
    setNotificationHandler();
  }, []);

  // When user taps a notification, navigate to the relevant screen (e.g. conversation)
  useEffect(() => {
    let sub: any;
    (async () => {
      try {
        const Notifications = require('expo-notifications');

        // Cold-start: app opened from a killed state via notification tap
        const last = await Notifications.getLastNotificationResponseAsync();
        if (!handledResponseRef.current && last?.notification?.request?.content?.data) {
          handledResponseRef.current = true;
          const data = last.notification.request.content.data || {};
          const sessionId = (data.session_id || data.sessionId) as string | undefined;
          if (sessionId) {
            router.push(`/conversation/${sessionId}`);
          }
        }

        // Warm: app in background/foreground and user taps notification
        sub = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response?.notification?.request?.content?.data || {};
          const sessionId = (data.session_id || data.sessionId) as string | undefined;
          if (sessionId) {
            router.push(`/conversation/${sessionId}`);
          }
        });
      } catch {
        // expo-notifications not available (web) or not installed
      }
    })();

    return () => {
      try {
        if (sub?.remove) sub.remove();
      } catch {}
    };
  }, [router]);

  useEffect(() => {
    if (user?.id) {
      registerPushToken(user.id);
    }
  }, [user?.id]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textSecondary,
        tabBarStyle: {
          backgroundColor: theme.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: theme.tabBarBorder,
          height: (Platform.OS === 'ios' ? 60 : 65) + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarShowLabel: false,
      }}>
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ size, color }) => (
            <Search size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ size, color }) => (
            <MessageCircle size={size} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          tabBarIcon: ({ size, color }) => <Heart size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="friends"
        options={{
          href: null,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ size, color }) => <User size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          href: null,
        }}
      />
    </Tabs>
  );
}
