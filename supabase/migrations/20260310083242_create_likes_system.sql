/*
  # Beğeni Sistemi

  1. Yeni Tablolar
    - `likes` - Kullanıcı beğenilerini saklar
    - `profile_views` - Profil ziyaretlerini takip eder
  
  2. Güvenlik
    - Her tablo için RLS etkinleştirildi
    - Kullanıcılar kendi beğenilerini görebilir
    - Kullanıcılar kendilerini beğenenleri görebilir
    - Kullanıcılar profil ziyaretçilerini görebilir
*/

CREATE TABLE IF NOT EXISTS likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  liked_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, liked_user_id)
);

CREATE TABLE IF NOT EXISTS profile_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  viewer_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  viewed_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own likes"
  ON likes FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create likes"
  ON likes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own likes"
  ON likes FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view who liked them"
  ON likes FOR SELECT
  TO authenticated
  USING (auth.uid() = liked_user_id);

CREATE POLICY "Users can view their profile views"
  ON profile_views FOR SELECT
  TO authenticated
  USING (auth.uid() = viewed_user_id);

CREATE POLICY "Users can create profile views"
  ON profile_views FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

CREATE INDEX IF NOT EXISTS idx_likes_user_id ON likes(user_id);
CREATE INDEX IF NOT EXISTS idx_likes_liked_user_id ON likes(liked_user_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewer_id ON profile_views(viewer_id);
CREATE INDEX IF NOT EXISTS idx_profile_views_viewed_user_id ON profile_views(viewed_user_id);