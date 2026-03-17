/*
  Verification pipeline: attempts table and private bucket for selfies.
  - Only backend/service_role sets verification_status to verified/rejected.
  - Client never sets verified via profiles update.
*/

-- Table: verification_attempts (audit + review)
create table if not exists public.verification_attempts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  selfie_storage_path text,
  profile_photo_url text,
  stage_1_passed boolean default false,
  stage_2_similarity numeric(5,4),
  stage_3_passed boolean default false,
  status text not null default 'pending_review'
    check (status in ('pending_review', 'approved', 'rejected')),
  rejection_reason text,
  created_at timestamptz default now(),
  reviewed_at timestamptz
);

create index if not exists idx_verification_attempts_user_id
  on public.verification_attempts(user_id);
create index if not exists idx_verification_attempts_created_at
  on public.verification_attempts(created_at desc);
create index if not exists idx_verification_attempts_status
  on public.verification_attempts(status) where status = 'pending_review';

alter table public.verification_attempts enable row level security;

-- Users can only read their own attempts
create policy "verification_attempts_select_own"
  on public.verification_attempts for select
  to authenticated
  using (auth.uid() = user_id);

-- Insert is done by Edge Function (service role) or allow user to create attempt row
create policy "verification_attempts_insert_own"
  on public.verification_attempts for insert
  to authenticated
  with check (auth.uid() = user_id);

-- Update (e.g. reviewed_at) only by service_role; no policy for authenticated update

comment on table public.verification_attempts is
  'Each verification pipeline run: selfie checks, face match, liveness. Admin approves/rejects.';

-- Storage: private bucket for verification selfies (only service_role reads)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'verification-selfies',
  'verification-selfies',
  false,
  5242880,
  array['image/jpeg', 'image/png']
)
on conflict (id) do update set
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Authenticated users can upload to their own folder only
drop policy if exists "verification_selfies_insert_own" on storage.objects;
create policy "verification_selfies_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'verification-selfies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Only service role can read (no public/authenticated select) – handle in Edge Function
-- Optionally allow user to read own folder for "my attempts" UI
drop policy if exists "verification_selfies_select_own" on storage.objects;
create policy "verification_selfies_select_own"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'verification-selfies'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
