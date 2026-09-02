-- Add unlock_extension SECURITY DEFINER function
-- This lets a workspace owner unlock an extension without exposing entitlements writes broadly

CREATE OR REPLACE FUNCTION unlock_extension(p_workspace_id uuid, p_extension_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_owner_id uuid;
BEGIN
  v_user_id := auth.uid();
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  -- Verify the workspace belongs to the caller
  SELECT owner_id INTO v_owner_id FROM workspaces WHERE id = p_workspace_id;
  IF v_owner_id IS NULL OR v_owner_id != v_user_id THEN
    RAISE EXCEPTION 'Not authorized';
  END IF;

  -- Verify the extension exists and is active
  IF NOT EXISTS (SELECT 1 FROM extensions WHERE id = p_extension_id AND enabled = true AND status = 'active') THEN
    RAISE EXCEPTION 'Extension not found or inactive';
  END IF;

  -- Insert or update entitlement to active
  INSERT INTO entitlements (workspace_id, extension_id, user_id, status)
  VALUES (p_workspace_id, p_extension_id, v_user_id, 'active')
  ON CONFLICT (workspace_id, extension_id)
  DO UPDATE SET status = 'active';
END;
$$;

REVOKE EXECUTE ON FUNCTION unlock_extension FROM anon;
GRANT EXECUTE ON FUNCTION unlock_extension TO authenticated;
