-- Fix infinite recursion in profiles RLS policies
-- The admin_read_all_profiles policy queries profiles within a profiles policy,
-- causing infinite recursion. Replace with a SECURITY DEFINER function.

-- Drop the recursive policy
DROP POLICY IF EXISTS admin_read_all_profiles ON profiles;

-- Create a SECURITY DEFINER function to check admin status without recursive RLS
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  );
$$;

-- Recreate the admin read policy using the non-recursive function
CREATE POLICY admin_read_all_profiles ON profiles FOR SELECT
  TO authenticated USING (is_admin());
