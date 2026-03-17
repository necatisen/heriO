/*
  # Create photos table for user photo gallery

  1. New Tables
    - `photos`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key to auth.users)
      - `photo_url` (text, URL of the photo)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on `photos` table
    - Add policy for users to read their own photos
    - Add policy for users to insert their own photos
    - Add policy for users to delete their own photos
*/

CREATE TABLE IF NOT EXISTS photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own photos"
  ON photos FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own photos"
  ON photos FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own photos"
  ON photos FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS photos_user_id_idx ON photos(user_id);
