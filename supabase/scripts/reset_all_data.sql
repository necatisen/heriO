-- DANGER: deletes ALL app data and ALL user accounts (cannot be undone).
-- Tables, functions, RLS policies, triggers and storage buckets are kept.
-- Uploaded files must be removed separately (Storage → bucket → Empty bucket,
-- or: npx supabase storage rm -r ss:///avatars --linked --experimental).
begin;

truncate table
  public.message_reactions,
  public.messages,
  public.chat_history,
  public.chat_sessions,
  public.likes,
  public.friends,
  public.notifications,
  public.profile_views,
  public.blocks,
  public.user_reports,
  public.push_tokens,
  public.photos,
  public.credit_transactions,
  public.credits,
  public.subscriptions,
  public.verification_attempts,
  public.profiles
restart identity cascade;

delete from auth.users;

commit;
