/*
  # Fix Friends Table RLS Policy for Match System

  1. Changes
    - Add new INSERT policy to allow creating friend relationships for both users when matching
    - Keep existing policies for normal friend operations

  2. Security
    - Allow users to insert friend records where they are either user_id OR friend_id
    - This enables the match system to create bidirectional friendships
*/

DROP POLICY IF EXISTS "Users can add friends" ON friends;

CREATE POLICY "Users can add friends"
  ON friends
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid() OR friend_id = auth.uid());
