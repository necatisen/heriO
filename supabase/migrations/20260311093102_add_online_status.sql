/*
  # Add online status tracking to profiles

  1. Changes
    - Add `is_online` boolean field to profiles table
    - Add `last_seen` timestamp field to track last activity
  
  2. Security
    - Existing RLS policies remain unchanged
    - All users can view is_online and last_seen fields
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'is_online'
  ) THEN
    ALTER TABLE profiles ADD COLUMN is_online boolean DEFAULT false;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'last_seen'
  ) THEN
    ALTER TABLE profiles ADD COLUMN last_seen timestamptz DEFAULT now();
  END IF;
END $$;