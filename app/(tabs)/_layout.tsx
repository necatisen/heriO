import { useEffect, useRef } from 'react';
import { Tabs } from 'expo-router';
import { Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import {
  Search,
  MessageCircle,
  Users,
  User,
  Heart,
  CalendarHeart,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/contexts/ThemeContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useAuth } from '@/contexts/AuthContext';
import { registerPushToken, setNotificationHandler } from '@/lib/pushNotifications';
import { needsProfileCompletion } from '@/lib/profileCompletion';
import { useRouter, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from 'react-native-reanimated';

/** Tab icon that pops up slightly when its tab becomes active. */
function TabIcon({
  Icon,
  size,
  color,
  focused,
}: {
  Icon: React.ComponentType<{ size?: number; color?: string; strokeWidth?: number }>;
  size: number;
  color: string;
  focused: boolean;
}) {
  const { theme } = useTheme();
  const p = useSharedValue(focused ? 1 : 0);
  useEffect(() => {
    p.value = withSpring(focused ? 1 : 0, { damping: 12, stiffness: 220 });
  }, [focused, p]);
  // Gradient pill grows in behind the active icon.
  const pillStyle = useAnimatedStyle(() => ({
    opacity: p.value,
    transform: [{ scaleX: 0.6 + p.value * 0.4 }, { scaleY: 0.8 + p.value * 0.2 }],
  }));
  const iconStyle = useAnimatedStyle(() => ({ transform: [{ scale: 1 + p.value * 0.08 }, { translateY: -p.value * 1 }] }));
  return (
    <View style={tabStyles.slot}>
      <Animated.View style={[tabStyles.pill, pillStyle]}>
        <LinearGradient colors={theme.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={StyleSheet.absoluteFill} />
      </Animated.View>
      <Animated.View style={iconStyle}>
        <Icon size={size - 2} color={focused ? '#FFFFFF' : color} strokeWidth={focused ? 2.4 : 2} />
      </Animated.View>
    </View>
  );
}

const tabStyles = StyleSheet.create({
  slot: { width: 58, height: 36, alignItems: 'center', justifyContent: 'center' },
  pill: { ...StyleSheet.absoluteFillObject, borderRadius: 18, overflow: 'hidden' },
});

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

  // Safety net: an incomplete Google account must not reach the app without the 18+ step.
  useEffect(() => {
    if (needsProfileCompletion(user)) router.replace('/complete-profile' as Href);
  }, [user]);

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
          } else if (data.type === 'like') {
            router.push('/(tabs)/likes' as Href);
          } else if (data.type === 'plan_join') {
            router.push('/(tabs)/plans' as Href);
          }
        }

        // Warm: app in background/foreground and user taps notification
        sub = Notifications.addNotificationResponseReceivedListener((response: any) => {
          const data = response?.notification?.request?.content?.data || {};
          const sessionId = (data.session_id || data.sessionId) as string | undefined;
          if (sessionId) {
            router.push(`/conversation/${sessionId}`);
          } else if (data.type === 'like') {
            router.push('/(tabs)/likes' as Href);
          } else if (data.type === 'plan_join') {
            router.push('/(tabs)/plans' as Href);
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
          borderTopWidth: 0,
          height: (Platform.OS === 'ios' ? 62 : 66) + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 10,
          shadowColor: '#1E1450',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.08,
          shadowRadius: 16,
          elevation: 16,
        },
        tabBarShowLabel: false,
        animation: 'shift',
      }}
      screenListeners={{
        tabPress: () => {
          Haptics.selectionAsync().catch(() => {});
        },
      }}>
      <Tabs.Screen
        name="explore"
        options={{
          tabBarIcon: ({ size, color, focused }) => <TabIcon Icon={Search} size={size} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="plans"
        options={{
          tabBarIcon: ({ size, color, focused }) => <TabIcon Icon={CalendarHeart} size={size} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ size, color, focused }) => <TabIcon Icon={MessageCircle} size={size} color={color} focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="likes"
        options={{
          tabBarIcon: ({ size, color, focused }) => <TabIcon Icon={Heart} size={size} color={color} focused={focused} />,
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
          tabBarIcon: ({ size, color, focused }) => <TabIcon Icon={User} size={size} color={color} focused={focused} />,
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
