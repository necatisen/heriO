/*
  # Add Extended Profile Fields and Initial Credits

  1. Changes to profiles table
    - Add `religion` (text) - User's religion
    - Add `profession` (text) - User's profession/occupation
    - Add `relationship_status` (text) - Looking for friendship, relationship, etc.
    - Add `education` (text) - Education level
    - Add `weight` (integer) - Weight in kg
    - Add `nationality` (text) - User's nationality

  2. Changes to credits system
    - Add trigger to automatically give 1000 credits to new users

  3. Notes
    - All new fields are nullable (optional)
    - Credits are automatically added on user registration
*/

-- Add new profile fields
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'religion'
  ) THEN
    ALTER TABLE profiles ADD COLUMN religion text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'profession'
  ) THEN
    ALTER TABLE profiles ADD COLUMN profession text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'relationship_status'
  ) THEN
    ALTER TABLE profiles ADD COLUMN relationship_status text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'education'
  ) THEN
    ALTER TABLE profiles ADD COLUMN education text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'weight'
  ) THEN
    ALTER TABLE profiles ADD COLUMN weight integer;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'nationality'
  ) THEN
    ALTER TABLE profiles ADD COLUMN nationality text;
  END IF;
END $$;

-- Create function to add initial credits to new users
CREATE OR REPLACE FUNCTION add_initial_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO credits (user_id, balance)
  VALUES (NEW.id, 1000)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 1000, 'initial_bonus', 'Welcome bonus')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to automatically add credits on profile creation
DROP TRIGGER IF EXISTS on_profile_created_add_credits ON profiles;
CREATE TRIGGER on_profile_created_add_credits
  AFTER INSERT ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION add_initial_credits();