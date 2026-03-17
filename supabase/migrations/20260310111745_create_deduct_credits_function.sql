/*
  # Create deduct_credits function

  1. New Functions
    - `deduct_credits(user_id, amount)`
      - Safely deducts credits from a user's balance
      - Uses atomic operations to prevent race conditions
      - Returns error if insufficient credits

  2. Security
    - Function runs with security definer to ensure atomic operations
    - Validates user has sufficient credits before deduction
*/

CREATE OR REPLACE FUNCTION deduct_credits(
  user_id uuid,
  amount integer
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_balance integer;
BEGIN
  -- Lock the row for update
  SELECT balance INTO current_balance
  FROM credits
  WHERE credits.user_id = deduct_credits.user_id
  FOR UPDATE;

  -- Check if user has enough credits
  IF current_balance IS NULL THEN
    RAISE EXCEPTION 'User credits not found';
  END IF;

  IF current_balance < amount THEN
    RAISE EXCEPTION 'Insufficient credits';
  END IF;

  -- Deduct credits
  UPDATE credits
  SET balance = balance - amount
  WHERE credits.user_id = deduct_credits.user_id;
END;
$$;
