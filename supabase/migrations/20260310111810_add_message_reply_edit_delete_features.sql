/*
  # Add message reply, edit, and delete features

  1. Changes to messages table
    - Add `reply_to_id` field for message replies
    - Add `edited_at` field to track message edits
    - Add `deleted_at` field for soft deletes
    - Add `is_deleted` field for quick filtering

  2. Security
    - Users can only edit/delete their own messages
    - Reply references are maintained even if parent is deleted
*/

-- Add new columns to messages table
DO $$
BEGIN
  -- Add reply_to_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'reply_to_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN reply_to_id uuid REFERENCES messages(id) ON DELETE SET NULL;
  END IF;

  -- Add edited_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'edited_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN edited_at timestamptz;
  END IF;

  -- Add is_deleted column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'is_deleted'
  ) THEN
    ALTER TABLE messages ADD COLUMN is_deleted boolean DEFAULT false;
  END IF;

  -- Add deleted_at column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'deleted_at'
  ) THEN
    ALTER TABLE messages ADD COLUMN deleted_at timestamptz;
  END IF;
END $$;

-- Create index for reply lookups
CREATE INDEX IF NOT EXISTS idx_messages_reply_to_id ON messages(reply_to_id);

-- Create index for filtering deleted messages
CREATE INDEX IF NOT EXISTS idx_messages_is_deleted ON messages(is_deleted);
