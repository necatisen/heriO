/*
  # Fix Initial Credits Trigger

  1. Changes
    - Update add_initial_credits function to use 'initial' type instead of 'initial_bonus'
    - This fixes the constraint violation error when creating new profiles

  2. Security
    - Maintains existing RLS policies
    - Function runs with SECURITY DEFINER to allow inserting credits
*/

-- Update function to use correct transaction type
CREATE OR REPLACE FUNCTION add_initial_credits()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO credits (user_id, balance)
  VALUES (NEW.id, 1000)
  ON CONFLICT (user_id) DO NOTHING;
  
  INSERT INTO credit_transactions (user_id, amount, type, description)
  VALUES (NEW.id, 1000, 'initial', 'Welcome bonus')
  ON CONFLICT DO NOTHING;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
