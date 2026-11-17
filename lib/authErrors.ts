import { L } from '@/lib/l10n';

/** Turns raw Supabase Auth error messages into short, translated text for users. */
export function authErrorMessage(raw: string | null | undefined): string {
  const m = String(raw || '').toLowerCase();
  if (m.includes('error sending confirmation email') || m.includes('error sending') || m.includes('smtp')) {
    return L(
      'Onay e-postası şu anda gönderilemiyor. Lütfen biraz sonra tekrar deneyin.',
      'We could not send the confirmation email right now. Please try again a little later.'
    );
  }
  if (m.includes('rate limit')) {
    return L('Çok fazla deneme yapıldı. Lütfen birkaç dakika bekleyin.', 'Too many attempts. Please wait a few minutes.');
  }
  if (m.includes('provider is not enabled') || m.includes('unsupported provider')) {
    return L('Google ile giriş şu anda kullanılamıyor. E-posta ile devam edebilirsiniz.', 'Google sign-in is not available right now. You can continue with email.');
  }
  if (m.includes('invalid login credentials')) return L('E-posta veya şifre hatalı', 'Email or password is incorrect');
  if (m.includes('email not confirmed')) {
    return L(
      'E-posta adresiniz henüz onaylanmadı. Gelen kutunuzdaki bağlantıya dokunun.',
      'Your email is not confirmed yet. Tap the link in your inbox.'
    );
  }
  if (m.includes('already registered')) return L('Bu e-posta adresi zaten kayıtlı', 'This email is already registered');
  if (m.includes('invalid') && m.includes('email')) return L('Geçerli bir e-posta adresi girin.', 'Enter a valid email address.');
  if (m.includes('network request failed') || m.includes('failed to fetch')) return L('İnternet bağlantısı kurulamadı.', 'No internet connection.');
  if (m.includes('oauth code missing') || m.includes('oauth url missing')) return L('Google ile giriş tamamlanamadı.', 'Google sign-in could not be completed.');
  return raw ? String(raw) : L('Bir hata oluştu.', 'An error occurred.');
}
