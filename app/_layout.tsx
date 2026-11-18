import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import { AuthProvider } from '@/contexts/AuthContext';
import { LanguageProvider } from '@/contexts/LanguageContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { ForceUpdateGate } from '@/components/ForceUpdateGate';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <LanguageProvider>
          <ForceUpdateGate>
          <AuthProvider>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'slide_from_right',
                animationDuration: 280,
                gestureEnabled: true,
              }}>
              <Stack.Screen name="index" options={{ animation: 'fade' }} />
              <Stack.Screen name="welcome" options={{ animation: 'fade' }} />
              <Stack.Screen name="auth/login" options={{ animation: 'fade_from_bottom' }} />
              <Stack.Screen name="auth/register" options={{ animation: 'fade_from_bottom' }} />
              <Stack.Screen name="auth/forgot-password" />
              <Stack.Screen name="auth/reset-password" options={{ animation: 'fade', gestureEnabled: false }} />
              <Stack.Screen name="onboarding" options={{ animation: 'fade' }} />
              <Stack.Screen name="(tabs)" options={{ animation: 'fade' }} />
              <Stack.Screen name="conversation/[id]" />
              <Stack.Screen name="verify-face" options={{ animation: 'slide_from_bottom', gestureEnabled: false }} />
              <Stack.Screen name="store" options={{ animation: 'slide_from_bottom' }} />
              <Stack.Screen name="legal" />
              <Stack.Screen name="+not-found" />
            </Stack>
            <StatusBar style="auto" />
          </AuthProvider>
          </ForceUpdateGate>
        </LanguageProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
