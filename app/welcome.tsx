import { Redirect } from 'expo-router';

/** Kept for old links (sign-out navigates here); the welcome UI lives in app/index.tsx. */
export default function WelcomeRedirect() {
  return <Redirect href="/" />;
}
