import { Redirect, Stack } from 'expo-router';
import { paymentsEnabledSync } from '@/lib/payments';

/**
 * Store is reachable only when app_config.payments_enabled = true.
 * NOTE: fake-payment is a simulation and no longer works (clients cannot write subscriptions/credits);
 * replace it with Google Play Billing + server-side purchase verification before enabling payments.
 */
export default function StoreLayout() {
  if (!paymentsEnabledSync()) return <Redirect href="/(tabs)" />;
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="credits" />
      <Stack.Screen name="fake-payment" />
    </Stack>
  );
}
