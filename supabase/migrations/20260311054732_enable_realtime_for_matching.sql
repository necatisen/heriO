/*
  # Enable Realtime for Matching System

  1. Changes
    - Enable realtime for friends table to notify when new matches are created
    - Enable realtime for likes table to notify when new likes are received
    - Enable realtime for messages table to update conversation list in real-time
    - Enable realtime for chat_sessions table to track new conversations

  2. Purpose
    - Allow real-time updates in the Messages tab when a new match is created
    - Update likes list immediately when someone likes the user
    - Update conversations when new messages arrive
    - Provide seamless user experience without manual refresh
*/

-- Enable realtime for friends table
ALTER PUBLICATION supabase_realtime ADD TABLE friends;

-- Enable realtime for likes table
ALTER PUBLICATION supabase_realtime ADD TABLE likes;

-- Enable realtime for messages table
ALTER PUBLICATION supabase_realtime ADD TABLE messages;

-- Enable realtime for chat_sessions table
ALTER PUBLICATION supabase_realtime ADD TABLE chat_sessions;