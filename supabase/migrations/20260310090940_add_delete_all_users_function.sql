/*
  # Add Admin Function to Delete All Users

  1. New Function
    - `delete_all_users()` - Admin function to delete all user accounts
      - Deletes all profiles
      - Deletes all auth users
      - Uses security definer for auth access
*/

CREATE OR REPLACE FUNCTION delete_all_users()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM auth.users;
END;
$$;