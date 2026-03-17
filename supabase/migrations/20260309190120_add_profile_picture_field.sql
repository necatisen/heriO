/*
  # Add Profile Picture Support

  1. Changes
    - Add `profile_picture` column to `profiles` table
      - Stores URL to user's profile picture
      - Nullable (optional field)
      - Text type for storing image URLs

  2. Notes
    - Profile pictures can be uploaded and stored in Supabase Storage
    - URLs will reference the storage bucket
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profile_picture'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profile_picture text;
  END IF;
END $$;