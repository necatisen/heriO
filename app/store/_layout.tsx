import { Stack } from 'expo-router';

export default function StoreLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="premium" />
      <Stack.Screen name="credits" />
      <Stack.Screen name="fake-payment" />
    </Stack>
  );
}
