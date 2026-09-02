/*
# Fix handle_new_user trigger function

## Problem
The `handle_new_user()` SECURITY DEFINER function was missing `SET search_path = public`,
which causes signup to fail with "Database error saving new user" on newer Supabase versions.
The unpinned search_path is a security requirement that must be set on all SECURITY DEFINER functions.

## Changes
- Recreate `handle_new_user()` with `SET search_path = public` added.
- The trigger itself remains attached to `auth.users`.
- No data is modified — only the function definition changes.
*/

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;
