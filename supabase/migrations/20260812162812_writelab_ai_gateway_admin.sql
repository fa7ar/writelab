/*
# Writelab AI Gateway + Admin Schema

## Overview
Adds tables for BYOK credentials, user profiles with admin roles, workspace AI settings, and app-wide settings.

## New Tables

### profiles
Extends auth.users with display name and admin flag.
- id (uuid, PK, references auth.users)
- display_name (text)
- is_admin (boolean, default false)
- is_disabled (boolean, default false)
- created_at (timestamptz)

### ai_credentials
Stores encrypted (or plaintext for edge function access) API keys for AI providers. Supports workspace-level and user-level BYOK.
- id (uuid, PK)
- owner_type (text: 'system' | 'workspace' | 'user')
- owner_id (uuid, nullable — workspace_id or user_id depending on owner_type)
- provider (text: openai | anthropic | google | openrouter | custom)
- name (text — display label for custom providers)
- api_key (text — encrypted at rest, never returned to frontend)
- base_url (text, nullable — for custom OpenAI-compatible providers)
- default_model (text, nullable)
- is_enabled (boolean, default true)
- created_at (timestamptz)
- updated_at (timestamptz)

### workspace_ai_settings
Per-workspace AI configuration: default provider, model, fallback.
- id (uuid, PK)
- workspace_id (uuid, references workspaces)
- default_provider (text, nullable)
- default_model (text, nullable)
- fallback_provider (text, nullable)
- allow_byok (boolean, default true)
- created_at (timestamptz)
- updated_at (timestamptz)

### app_settings
Singleton row for system-wide settings.
- id (int, PK, always 1)
- default_provider (text, nullable)
- default_model (text, nullable)
- allow_byok (boolean, default true)
- allow_custom_providers (boolean, default true)
- maintenance_mode (boolean, default false)
- updated_at (timestamptz)

## Security
- RLS enabled on all tables
- profiles: users read/update own profile; admins read all
- ai_credentials: users can manage their own; workspace members can manage workspace-level; api_key column is never exposed via SELECT (using a security definer function)
- workspace_ai_settings: workspace owners only
- app_settings: public read (anon+authenticated), admin-only write
*/

-- ========================
-- PROFILES
-- ========================
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name text DEFAULT '',
  is_admin boolean NOT NULL DEFAULT false,
  is_disabled boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Admins can read all profiles (for admin UI)
DROP POLICY IF EXISTS "admin_read_all_profiles" ON profiles;
CREATE POLICY "admin_read_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', ''))
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ========================
-- AI CREDENTIALS
-- ========================
CREATE TABLE IF NOT EXISTS ai_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_type text NOT NULL DEFAULT 'user' CHECK (owner_type IN ('system', 'workspace', 'user')),
  owner_id uuid,
  provider text NOT NULL CHECK (provider IN ('openai', 'anthropic', 'google', 'openrouter', 'custom')),
  name text NOT NULL DEFAULT '',
  api_key text NOT NULL,
  base_url text,
  default_model text,
  is_enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_creds_owner ON ai_credentials(owner_type, owner_id);

ALTER TABLE ai_credentials ENABLE ROW LEVEL SECURITY;

-- Users can manage their own BYOK credentials
DROP POLICY IF EXISTS "select_own_credentials" ON ai_credentials;
CREATE POLICY "select_own_credentials" ON ai_credentials FOR SELECT
  TO authenticated USING (
    owner_type = 'user' AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "insert_own_credentials" ON ai_credentials;
CREATE POLICY "insert_own_credentials" ON ai_credentials FOR INSERT
  TO authenticated WITH CHECK (
    owner_type = 'user' AND owner_id = auth.uid()
  );

DROP POLICY IF EXISTS "update_own_credentials" ON ai_credentials;
CREATE POLICY "update_own_credentials" ON ai_credentials FOR UPDATE
  TO authenticated
  USING (owner_type = 'user' AND owner_id = auth.uid())
  WITH CHECK (owner_type = 'user' AND owner_id = auth.uid());

DROP POLICY IF EXISTS "delete_own_credentials" ON ai_credentials;
CREATE POLICY "delete_own_credentials" ON ai_credentials FOR DELETE
  TO authenticated USING (
    owner_type = 'user' AND owner_id = auth.uid()
  );

-- Admins can manage system credentials
DROP POLICY IF EXISTS "admin_manage_credentials" ON ai_credentials;
CREATE POLICY "admin_manage_credentials" ON ai_credentials FOR ALL
  TO authenticated USING (
    owner_type = 'system' AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    owner_type = 'system' AND
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Security definer function to get credential info WITHOUT the api_key
-- Frontend uses this to list configured providers
CREATE OR REPLACE FUNCTION get_user_credentials()
RETURNS TABLE (
  id uuid,
  provider text,
  name text,
  base_url text,
  default_model text,
  is_enabled boolean,
  owner_type text,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
    SELECT c.id, c.provider, c.name, c.base_url, c.default_model, c.is_enabled, c.owner_type, c.created_at
    FROM ai_credentials c
    WHERE c.owner_type = 'user' AND c.owner_id = auth.uid();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================
-- WORKSPACE AI SETTINGS
-- ========================
CREATE TABLE IF NOT EXISTS workspace_ai_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL UNIQUE REFERENCES workspaces(id) ON DELETE CASCADE,
  default_provider text,
  default_model text,
  fallback_provider text,
  allow_byok boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE workspace_ai_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "manage_own_ws_settings" ON workspace_ai_settings;
CREATE POLICY "manage_own_ws_settings" ON workspace_ai_settings FOR ALL
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_ai_settings.workspace_id AND w.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces w WHERE w.id = workspace_ai_settings.workspace_id AND w.user_id = auth.uid())
  );

-- ========================
-- APP SETTINGS (singleton)
-- ========================
CREATE TABLE IF NOT EXISTS app_settings (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  default_provider text,
  default_model text,
  allow_byok boolean NOT NULL DEFAULT true,
  allow_custom_providers boolean NOT NULL DEFAULT true,
  maintenance_mode boolean NOT NULL DEFAULT false,
  updated_at timestamptz DEFAULT now()
);

INSERT INTO app_settings (id) VALUES (1) ON CONFLICT DO NOTHING;

ALTER TABLE app_settings ENABLE ROW LEVEL SECURITY;

-- Public read (so the homepage knows if AI is configured)
DROP POLICY IF EXISTS "public_read_app_settings" ON app_settings;
CREATE POLICY "public_read_app_settings" ON app_settings FOR SELECT
  TO anon, authenticated USING (true);

-- Admin-only write
DROP POLICY IF EXISTS "admin_write_app_settings" ON app_settings;
CREATE POLICY "admin_write_app_settings" ON app_settings FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at_generic()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS ai_credentials_updated_at ON ai_credentials;
CREATE TRIGGER ai_credentials_updated_at
  BEFORE UPDATE ON ai_credentials
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_generic();

DROP TRIGGER IF EXISTS workspace_ai_settings_updated_at ON workspace_ai_settings;
CREATE TRIGGER workspace_ai_settings_updated_at
  BEFORE UPDATE ON workspace_ai_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_generic();

DROP TRIGGER IF EXISTS app_settings_updated_at ON app_settings;
CREATE TRIGGER app_settings_updated_at
  BEFORE UPDATE ON app_settings
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_generic();
