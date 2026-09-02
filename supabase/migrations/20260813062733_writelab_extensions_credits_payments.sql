-- ============================================================
-- Writelab Extension System: Extensions, Credits, Subscriptions, Payments
-- ============================================================

-- Fix: expand ai_credentials provider constraint to include all providers
ALTER TABLE ai_credentials DROP CONSTRAINT IF EXISTS ai_credentials_provider_check;
ALTER TABLE ai_credentials ADD CONSTRAINT ai_credentials_provider_check
  CHECK (provider IN ('openai', 'anthropic', 'google', 'openrouter', 'deepseek', 'groq', 'mistral', 'custom'));

-- ========================
-- EXTENSIONS
-- ========================
CREATE TABLE IF NOT EXISTS extensions (
  id varchar(50) PRIMARY KEY,
  slug varchar(50) UNIQUE NOT NULL,
  name varchar(100) NOT NULL,
  description text,
  version varchar(20) NOT NULL DEFAULT '1.0.0',
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'deprecated')),
  is_premium boolean NOT NULL DEFAULT false,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE extensions ENABLE ROW LEVEL SECURITY;

-- Everyone can read extension catalog (so frontend can show what's available)
DROP POLICY IF EXISTS "public_read_extensions" ON extensions;
CREATE POLICY "public_read_extensions" ON extensions FOR SELECT
  TO anon, authenticated USING (true);

-- Admin-only write
DROP POLICY IF EXISTS "admin_write_extensions" ON extensions;
CREATE POLICY "admin_write_extensions" ON extensions FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- ========================
-- EXTENSION ACTIONS
-- ========================
CREATE TABLE IF NOT EXISTS extension_actions (
  id serial PRIMARY KEY,
  extension_id varchar(50) NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  slug varchar(50) NOT NULL,
  name varchar(100) NOT NULL,
  description text,
  credit_cost integer NOT NULL DEFAULT 0,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(extension_id, slug)
);

ALTER TABLE extension_actions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "public_read_extension_actions" ON extension_actions;
CREATE POLICY "public_read_extension_actions" ON extension_actions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "admin_write_extension_actions" ON extension_actions;
CREATE POLICY "admin_write_extension_actions" ON extension_actions FOR ALL
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- ========================
-- ENTITLEMENTS
-- ========================
CREATE TABLE IF NOT EXISTS entitlements (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  extension_id varchar(50) NOT NULL REFERENCES extensions(id) ON DELETE CASCADE,
  status varchar(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'expired')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id, extension_id)
);

ALTER TABLE entitlements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_entitlements" ON entitlements;
CREATE POLICY "select_own_entitlements" ON entitlements FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "insert_own_entitlements" ON entitlements;
CREATE POLICY "insert_own_entitlements" ON entitlements FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_entitlements" ON entitlements;
CREATE POLICY "update_own_entitlements" ON entitlements FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_update_entitlements" ON entitlements;
CREATE POLICY "admin_update_entitlements" ON entitlements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

-- ========================
-- SUBSCRIPTIONS
-- ========================
CREATE TABLE IF NOT EXISTS subscriptions (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider varchar(20) NOT NULL CHECK (provider IN ('paddle', 'telegram')),
  external_subscription_id varchar(100) NOT NULL,
  plan varchar(50) NOT NULL,
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'active', 'cancelled', 'expired', 'failed')),
  started_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id, created_at DESC);

ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_subscriptions" ON subscriptions;
CREATE POLICY "select_own_subscriptions" ON subscriptions FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "insert_own_subscriptions" ON subscriptions;
CREATE POLICY "insert_own_subscriptions" ON subscriptions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ========================
-- PAYMENTS
-- ========================
CREATE TABLE IF NOT EXISTS payments (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  provider varchar(20) NOT NULL CHECK (provider IN ('paddle', 'telegram')),
  external_id varchar(100),
  type varchar(20) NOT NULL DEFAULT 'subscription' CHECK (type IN ('subscription', 'one_time')),
  amount decimal(10,2) NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'USD',
  status varchar(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  reference varchar(100),
  metadata jsonb,
  verified_at timestamptz,
  verified_by uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments(status, created_at DESC);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payments" ON payments;
CREATE POLICY "select_own_payments" ON payments FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "insert_own_payments" ON payments;
CREATE POLICY "insert_own_payments" ON payments FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ========================
-- CREDIT BALANCES
-- ========================
CREATE TABLE IF NOT EXISTS credit_balances (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  balance integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, workspace_id)
);

ALTER TABLE credit_balances ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_credits" ON credit_balances;
CREATE POLICY "select_own_credits" ON credit_balances FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "insert_own_credits" ON credit_balances;
CREATE POLICY "insert_own_credits" ON credit_balances FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "update_own_credits" ON credit_balances;
CREATE POLICY "update_own_credits" ON credit_balances FOR UPDATE
  TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- ========================
-- CREDIT TRANSACTIONS (LEDGER)
-- ========================
CREATE TABLE IF NOT EXISTS credit_transactions (
  id serial PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  type varchar(20) NOT NULL CHECK (type IN ('purchase', 'subscription_grant', 'consume', 'refund', 'admin_adjustment')),
  amount integer NOT NULL,
  balance_after integer NOT NULL,
  reference_type varchar(50),
  reference_id varchar(100),
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id, workspace_id, created_at DESC);

ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_credit_tx" ON credit_transactions;
CREATE POLICY "select_own_credit_tx" ON credit_transactions FOR SELECT
  TO authenticated USING (
    user_id = auth.uid()
    OR EXISTS (SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.is_admin = true)
  );

DROP POLICY IF EXISTS "insert_own_credit_tx" ON credit_transactions;
CREATE POLICY "insert_own_credit_tx" ON credit_transactions FOR INSERT
  TO authenticated WITH CHECK (user_id = auth.uid());

-- ========================
-- TRIGGERS for updated_at
-- ========================
DROP TRIGGER IF EXISTS extensions_updated_at ON extensions;
CREATE TRIGGER extensions_updated_at BEFORE UPDATE ON extensions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_generic();

DROP TRIGGER IF EXISTS extension_actions_updated_at ON extension_actions;
CREATE TRIGGER extension_actions_updated_at BEFORE UPDATE ON extension_actions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_generic();

DROP TRIGGER IF EXISTS entitlements_updated_at ON entitlements;
CREATE TRIGGER entitlements_updated_at BEFORE UPDATE ON entitlements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_generic();

DROP TRIGGER IF EXISTS subscriptions_updated_at ON subscriptions;
CREATE TRIGGER subscriptions_updated_at BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_generic();

DROP TRIGGER IF EXISTS payments_updated_at ON payments;
CREATE TRIGGER payments_updated_at BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_generic();

DROP TRIGGER IF EXISTS credit_balances_updated_at ON credit_balances;
CREATE TRIGGER credit_balances_updated_at BEFORE UPDATE ON credit_balances
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_generic();

-- ========================
-- SECURITY DEFINER FUNCTIONS
-- ========================

-- get_credit_balance: safely read balance for a user+workspace
CREATE OR REPLACE FUNCTION get_credit_balance(p_workspace_id uuid)
RETURNS integer AS $$
DECLARE
  bal integer;
BEGIN
  SELECT balance INTO bal FROM credit_balances
  WHERE workspace_id = p_workspace_id AND user_id = auth.uid();
  RETURN COALESCE(bal, 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- consume_credits: atomic deduction with balance check
-- Returns the new balance on success, raises exception on insufficient balance
CREATE OR REPLACE FUNCTION consume_credits(
  p_workspace_id uuid,
  p_amount integer,
  p_reference_type varchar DEFAULT NULL,
  p_reference_id varchar DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS integer AS $$
DECLARE
  new_balance integer;
  current_balance integer;
  tx_id integer;
BEGIN
  -- Get current balance with row lock
  SELECT balance INTO current_balance
  FROM credit_balances
  WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  FOR UPDATE;

  current_balance := COALESCE(current_balance, 0);

  IF current_balance < p_amount THEN
    RAISE EXCEPTION 'INSUFFICIENT_CREDITS: have %, need %', current_balance, p_amount;
  END IF;

  new_balance := current_balance - p_amount;

  -- Upsert balance
  INSERT INTO credit_balances (user_id, workspace_id, balance)
  VALUES (auth.uid(), p_workspace_id, new_balance)
  ON CONFLICT (user_id, workspace_id)
  DO UPDATE SET balance = new_balance, updated_at = now();

  -- Insert ledger entry
  INSERT INTO credit_transactions (user_id, workspace_id, type, amount, balance_after, reference_type, reference_id, description)
  VALUES (auth.uid(), p_workspace_id, 'consume', -p_amount, new_balance, p_reference_type, p_reference_id, p_description)
  RETURNING id INTO tx_id;

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- refund_credits: add credits back (after AI failure)
CREATE OR REPLACE FUNCTION refund_credits(
  p_workspace_id uuid,
  p_amount integer,
  p_reference_type varchar DEFAULT NULL,
  p_reference_id varchar DEFAULT NULL,
  p_description text DEFAULT NULL
) RETURNS integer AS $$
DECLARE
  new_balance integer;
  current_balance integer;
BEGIN
  SELECT balance INTO current_balance
  FROM credit_balances
  WHERE workspace_id = p_workspace_id AND user_id = auth.uid()
  FOR UPDATE;

  current_balance := COALESCE(current_balance, 0);
  new_balance := current_balance + p_amount;

  INSERT INTO credit_balances (user_id, workspace_id, balance)
  VALUES (auth.uid(), p_workspace_id, new_balance)
  ON CONFLICT (user_id, workspace_id)
  DO UPDATE SET balance = new_balance, updated_at = now();

  INSERT INTO credit_transactions (user_id, workspace_id, type, amount, balance_after, reference_type, reference_id, description)
  VALUES (auth.uid(), p_workspace_id, 'refund', p_amount, new_balance, p_reference_type, p_reference_id, p_description);

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- grant_credits: admin or subscription grant
CREATE OR REPLACE FUNCTION grant_credits(
  p_workspace_id uuid,
  p_amount integer,
  p_type varchar DEFAULT 'subscription_grant',
  p_description text DEFAULT NULL
) RETURNS integer AS $$
DECLARE
  new_balance integer;
  current_balance integer;
  target_user uuid;
BEGIN
  SELECT user_id INTO target_user FROM workspaces WHERE id = p_workspace_id;
  IF target_user IS NULL THEN
    RAISE EXCEPTION 'Workspace not found';
  END IF;

  SELECT balance INTO current_balance
  FROM credit_balances
  WHERE workspace_id = p_workspace_id AND user_id = target_user
  FOR UPDATE;

  current_balance := COALESCE(current_balance, 0);
  new_balance := current_balance + p_amount;

  INSERT INTO credit_balances (user_id, workspace_id, balance)
  VALUES (target_user, p_workspace_id, new_balance)
  ON CONFLICT (user_id, workspace_id)
  DO UPDATE SET balance = new_balance, updated_at = now();

  INSERT INTO credit_transactions (user_id, workspace_id, type, amount, balance_after, description)
  VALUES (target_user, p_workspace_id, p_type, p_amount, new_balance, p_description);

  RETURN new_balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- admin_adjust_credits: admin-only adjustment
CREATE OR REPLACE FUNCTION admin_adjust_credits(
  p_workspace_id uuid,
  p_amount integer,
  p_description text DEFAULT NULL
) RETURNS integer AS $$
DECLARE
  is_admin boolean;
BEGIN
  SELECT p.is_admin INTO is_admin FROM profiles p WHERE p.id = auth.uid();
  IF NOT COALESCE(is_admin, false) THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;

  RETURN grant_credits(p_workspace_id, p_amount, 'admin_adjustment', p_description);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- check_entitlement: verify user has active entitlement for extension
CREATE OR REPLACE FUNCTION check_entitlement(
  p_workspace_id uuid,
  p_extension_id varchar
) RETURNS boolean AS $$
DECLARE
  ent_status varchar;
BEGIN
  SELECT status INTO ent_status FROM entitlements
  WHERE workspace_id = p_workspace_id AND extension_id = p_extension_id AND user_id = auth.uid()
  LIMIT 1;

  RETURN COALESCE(ent_status = 'active', false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ========================
-- SEED: Copywriting extension
-- ========================
INSERT INTO extensions (id, slug, name, description, version, status, is_premium, enabled)
VALUES ('copywriting', 'copywriting', 'Copywriting', 'Professional copywriting frameworks: AIDA, PAS, BAB, FAB, and 4P. Generate persuasive marketing copy with AI.', '1.0.0', 'active', true, true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO extension_actions (extension_id, slug, name, description, credit_cost, enabled) VALUES
  ('copywriting', 'aida', 'AIDA', 'Attention → Interest → Desire → Action. Classic direct-response framework.', 10, true),
  ('copywriting', 'pas', 'PAS', 'Problem → Agitate → Solution. Persuasive framework for pain-point marketing.', 10, true),
  ('copywriting', 'bab', 'BAB', 'Before → After → Bridge. Transformation-focused copy framework.', 10, true),
  ('copywriting', 'fab', 'FAB', 'Features → Advantages → Benefits. Product-focused persuasion framework.', 10, true),
  ('copywriting', '4p', '4P', 'Promise → Picture → Proof → Push. Structured offer framework.', 15, true)
ON CONFLICT (extension_id, slug) DO NOTHING;