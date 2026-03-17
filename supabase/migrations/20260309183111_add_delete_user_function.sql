/*
  # Add User Account Deletion Function

  1. New Functions
    - `delete_user_account()` - Allows authenticated users to delete their own account
      - Deletes user's profile data
      - Deletes authentication record
      - Uses security definer to allow auth schema access

  2. Security
    - Function can only be called by authenticated users
    - Users can only delete their own account
    - Transaction ensures atomic deletion
*/

CREATE OR REPLACE FUNCTION delete_user_account()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_user_id uuid;
BEGIN
  current_user_id := auth.uid();
  
  IF current_user_id IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  DELETE FROM profiles WHERE id = current_user_id;
  
  DELETE FROM auth.users WHERE id = current_user_id;
END;
$$;