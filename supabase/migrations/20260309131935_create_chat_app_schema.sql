/*
  # Chat App Database Schema

  ## Overview
  Complete database schema for a mobile chat application with random matching,
  premium subscriptions, credits system, and social features.

  ## New Tables
  
  ### 1. profiles
  User profile information and preferences
  - id (uuid, references auth.users)
  - full_name (text)
  - username (text, unique)
  - bio (text)
  - photo_url (text)
  - birth_date (date) - for age verification
  - gender (text)
  - country (text)
  - city (text)
  - district (text)
  - height (integer) - in cm
  - tc_verified (boolean) - TC kimlik doğrulaması
  - face_verified (boolean) - Yüz doğrulaması
  - preferred_language (text) - tr, en, ru, etc.
  - created_at (timestamptz)
  - updated_at (timestamptz)

  ### 2. credits
  User credit/kontör balance and transactions
  - id (uuid)
  - user_id (uuid, references profiles)
  - balance (integer, default 500)
  - last_updated (timestamptz)

  ### 3. credit_transactions
  History of credit transactions
  - id (uuid)
  - user_id (uuid, references profiles)
  - amount (integer) - positive for credits added, negative for spent
  - type (text) - 'initial', 'purchase', 'ad_watch', 'chat_spent'
  - description (text)
  - created_at (timestamptz)

  ### 4. subscriptions
  Premium subscription status
  - id (uuid)
  - user_id (uuid, references profiles)
  - is_premium (boolean, default false)
  - subscription_start (timestamptz)
  - subscription_end (timestamptz)
  - platform (text) - 'google', 'apple'
  - created_at (timestamptz)

  ### 5. chat_sessions
  Active and past chat sessions
  - id (uuid)
  - user1_id (uuid, references profiles)
  - user2_id (uuid, references profiles)
  - status (text) - 'active', 'ended'
  - started_at (timestamptz)
  - ended_at (timestamptz)

  ### 6. messages
  Chat messages
  - id (uuid)
  - session_id (uuid, references chat_sessions)
  - sender_id (uuid, references profiles)
  - receiver_id (uuid, references profiles)
  - content (text)
  - is_read (boolean, default false)
  - created_at (timestamptz)

  ### 7. friends
  Friend connections
  - id (uuid)
  - user_id (uuid, references profiles)
  - friend_id (uuid, references profiles)
  - status (text) - 'pending', 'accepted'
  - created_at (timestamptz)

  ### 8. blocks
  Blocked users
  - id (uuid)
  - user_id (uuid, references profiles)
  - blocked_user_id (uuid, references profiles)
  - created_at (timestamptz)

  ### 9. chat_history
  Track who has chatted with whom to prevent immediate rematches
  - id (uuid)
  - user_id (uuid, references profiles)
  - matched_user_id (uuid, references profiles)
  - last_matched_at (timestamptz)

  ## Security
  - Enable RLS on all tables
  - Users can only access their own data
  - Appropriate policies for messaging, friends, and blocking
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  username text UNIQUE NOT NULL,
  bio text DEFAULT '',
  photo_url text,
  birth_date date NOT NULL,
  gender text CHECK (gender IN ('male', 'female', 'other')),
  country text DEFAULT 'Turkey',
  city text,
  district text,
  height integer,
  tc_verified boolean DEFAULT false,
  face_verified boolean DEFAULT false,
  preferred_language text DEFAULT 'tr',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Create credits table
CREATE TABLE IF NOT EXISTS credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  balance integer DEFAULT 500,
  last_updated timestamptz DEFAULT now()
);

-- Create credit_transactions table
CREATE TABLE IF NOT EXISTS credit_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  amount integer NOT NULL,
  type text CHECK (type IN ('initial', 'purchase', 'ad_watch', 'chat_spent')) NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

-- Create subscriptions table
CREATE TABLE IF NOT EXISTS subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE UNIQUE NOT NULL,
  is_premium boolean DEFAULT false,
  subscription_start timestamptz,
  subscription_end timestamptz,
  platform text CHECK (platform IN ('google', 'apple')),
  created_at timestamptz DEFAULT now()
);

-- Create chat_sessions table
CREATE TABLE IF NOT EXISTS chat_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  user2_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('active', 'ended')) DEFAULT 'active',
  started_at timestamptz DEFAULT now(),
  ended_at timestamptz
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  sender_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  receiver_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Create friends table
CREATE TABLE IF NOT EXISTS friends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  friend_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  status text CHECK (status IN ('pending', 'accepted')) DEFAULT 'pending',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, friend_id)
);

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  blocked_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, blocked_user_id)
);

-- Create chat_history table
CREATE TABLE IF NOT EXISTS chat_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  matched_user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  last_matched_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY "Users can view all profiles"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can delete own profile"
  ON profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- Credits policies
CREATE POLICY "Users can view own credits"
  ON credits FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own credits"
  ON credits FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own credits"
  ON credits FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Credit transactions policies
CREATE POLICY "Users can view own transactions"
  ON credit_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own transactions"
  ON credit_transactions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Subscriptions policies
CREATE POLICY "Users can view own subscription"
  ON subscriptions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own subscription"
  ON subscriptions FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own subscription"
  ON subscriptions FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Chat sessions policies
CREATE POLICY "Users can view own chat sessions"
  ON chat_sessions FOR SELECT
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can insert chat sessions"
  ON chat_sessions FOR INSERT
  TO authenticated
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

CREATE POLICY "Users can update own chat sessions"
  ON chat_sessions FOR UPDATE
  TO authenticated
  USING (user1_id = auth.uid() OR user2_id = auth.uid())
  WITH CHECK (user1_id = auth.uid() OR user2_id = auth.uid());

-- Messages policies
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  TO authenticated
  USING (sender_id = auth.uid() OR receiver_id = auth.uid());

CREATE POLICY "Users can send messages"
  ON messages FOR INSERT
  TO authenticated
  WITH CHECK (sender_id = auth.uid());

CREATE POLICY "Users can update own received messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (receiver_id = auth.uid())
  WITH CHECK (receiver_id = auth.uid());

-- Friends policies
CREATE POLICY "Users can view own friends"
  ON friends FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR friend_id = auth.uid());

CREATE POLICY "Users can add friends"
  ON friends FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own friend requests"
  ON friends FOR UPDATE
  TO authenticated
  USING (friend_id = auth.uid())
  WITH CHECK (friend_id = auth.uid());

CREATE POLICY "Users can delete own friends"
  ON friends FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Blocks policies
DROP POLICY IF EXISTS "Users can view own blocks" ON blocks;
DROP POLICY IF EXISTS "Users can block users" ON blocks;
DROP POLICY IF EXISTS "Users can unblock users" ON blocks;
CREATE POLICY "Users can view own blocks"
  ON blocks FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can block users"
  ON blocks FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can unblock users"
  ON blocks FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Chat history policies
DROP POLICY IF EXISTS "Users can view own chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can insert chat history" ON chat_history;
DROP POLICY IF EXISTS "Users can update own chat history" ON chat_history;
CREATE POLICY "Users can view own chat history"
  ON chat_history FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert chat history"
  ON chat_history FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own chat history"
  ON chat_history FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Indexes for better performance
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_country_city ON profiles(country, city);
CREATE INDEX IF NOT EXISTS idx_credits_user_id ON credits(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_users ON chat_sessions(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_session ON messages(session_id);
CREATE INDEX IF NOT EXISTS idx_friends_user ON friends(user_id);
CREATE INDEX IF NOT EXISTS idx_blocks_user ON blocks(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_user ON chat_history(user_id);