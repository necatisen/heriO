-- Account deletion also clears chat attachments, verification records, push tokens, blocks and reactions.
CREATE OR REPLACE FUNCTION public.delete_user_account()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid;
  v_new_username text;
begin
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated';
  end if;

  -- Anonymize profile (keep row until auth deletion cascades, but hide via deleted_at)
  v_new_username := 'deleted_' || replace(v_uid::text, '-', '');
  update public.profiles
  set
    full_name = 'Deleted User',
    username = left(v_new_username, 30),
    bio = '',
    photo_url = null,
    profile_picture = null,
    city = null,
    district = null,
    profession = null,
    education = null,
    religion = null,
    relationship_status = null,
    nationality = null,
    is_online = false,
    deleted_at = now()
  where id = v_uid;

  -- Remove private user-owned data
  delete from public.photos where user_id = v_uid;
  delete from public.likes where user_id = v_uid or liked_user_id = v_uid;
  delete from public.friends where user_id = v_uid or friend_id = v_uid;
  delete from public.notifications where user_id = v_uid or actor_user_id = v_uid;
  delete from public.profile_views where viewer_id = v_uid or viewed_user_id = v_uid;
  delete from public.subscriptions where user_id = v_uid;
  delete from public.credit_transactions where user_id = v_uid;
  delete from public.credits where user_id = v_uid;
  delete from public.verification_attempts where user_id = v_uid;
  delete from public.push_tokens where user_id = v_uid;
  delete from public.blocks where user_id = v_uid or blocked_user_id = v_uid;
  delete from public.message_reactions where user_id = v_uid;

  -- Anonymize chat artifacts (keep sessions/messages for the other participant)
  update public.messages
  set
    content = null,
    attachment_url = null,
    attachment_type = null,
    is_deleted = true,
    deleted_at = coalesce(deleted_at, now()),
    sender_id = null
  where sender_id = v_uid;

  update public.messages
  set receiver_id = null
  where receiver_id = v_uid;

  update public.chat_sessions
  set user1_id = null
  where user1_id = v_uid;

  update public.chat_sessions
  set user2_id = null
  where user2_id = v_uid;

  delete from public.chat_sessions where user1_id is null and user2_id is null;

  -- Finally delete auth user (requires elevated privileges; in migrations this is typically allowed)
  delete from auth.users where id = v_uid;
end;
$function$;
