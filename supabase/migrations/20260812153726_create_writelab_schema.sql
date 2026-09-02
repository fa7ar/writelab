/*
# Writelab Core Schema

## Overview
Creates the foundational tables for the Writelab AI writing workspace.

## New Tables

### workspaces
The top-level organizational unit. Each user owns one or more workspaces.
- id (uuid, primary key)
- name (text) - display name for the workspace
- user_id (uuid) - owner, defaults to the authenticated user
- created_at (timestamptz)

### projects
Groups related documents within a workspace.
- id (uuid, primary key)
- workspace_id (uuid) - parent workspace
- name (text)
- description (text, nullable)
- created_at (timestamptz)

### documents
The core entity. Stores rich text content as JSON (ProseMirror-compatible).
- id (uuid, primary key)
- workspace_id (uuid) - parent workspace
- project_id (uuid, nullable) - optional project grouping
- title (text)
- content (jsonb) - ProseMirror document JSON
- plain_text (text, nullable) - extracted plain text for search/context
- status (text) - draft | published | archived
- word_count (int)
- created_at (timestamptz)
- updated_at (timestamptz)

### writing_styles
Reusable writing style definitions that inform AI generation.
- id (uuid, primary key)
- workspace_id (uuid) - owning workspace
- name (text) - e.g. "Professional Blog", "Casual Email"
- tone (text, nullable) - e.g. "formal", "casual", "conversational"
- audience (text, nullable)
- instructions (text, nullable) - freeform style instructions for the AI
- created_at (timestamptz)

### ai_usage_logs
Tracks every AI request for analytics, billing, and debugging.
- id (uuid, primary key)
- user_id (uuid) - who made the request
- workspace_id (uuid, nullable)
- document_id (uuid, nullable)
- provider (text) - openai | anthropic | etc.
- model (text)
- action (text) - write | rewrite | improve | etc.
- input_tokens (int)
- output_tokens (int)
- latency_ms (int)
- estimated_cost_usd (numeric)
- status (text) - success | error
- error_message (text, nullable)
- created_at (timestamptz)

## Security
- RLS enabled on all tables
- Owner-scoped policies for authenticated users
- user_id columns default to auth.uid() so client inserts omit the field
*/

-- ========================
-- WORKSPACES
-- ========================
CREATE TABLE IF NOT EXISTS workspaces (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT 'My Workspace',
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_workspaces" ON workspaces;
CREATE POLICY "select_own_workspaces" ON workspaces FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_workspaces" ON workspaces;
CREATE POLICY "insert_own_workspaces" ON workspaces FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_workspaces" ON workspaces;
CREATE POLICY "update_own_workspaces" ON workspaces FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_workspaces" ON workspaces;
CREATE POLICY "delete_own_workspaces" ON workspaces FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ========================
-- PROJECTS
-- ========================
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_projects" ON projects;
CREATE POLICY "select_own_projects" ON projects FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = projects.workspace_id AND workspaces.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_projects" ON projects;
CREATE POLICY "insert_own_projects" ON projects FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = projects.workspace_id AND workspaces.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_projects" ON projects;
CREATE POLICY "update_own_projects" ON projects FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = projects.workspace_id AND workspaces.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = projects.workspace_id AND workspaces.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_projects" ON projects;
CREATE POLICY "delete_own_projects" ON projects FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = projects.workspace_id AND workspaces.user_id = auth.uid())
  );

-- ========================
-- DOCUMENTS
-- ========================
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  project_id uuid REFERENCES projects(id) ON DELETE SET NULL,
  title text NOT NULL DEFAULT 'Untitled',
  content jsonb DEFAULT '{"type":"doc","content":[{"type":"paragraph"}]}'::jsonb,
  plain_text text,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived')),
  word_count int NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_documents_workspace ON documents(workspace_id);
CREATE INDEX IF NOT EXISTS idx_documents_updated ON documents(updated_at DESC);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_documents" ON documents;
CREATE POLICY "select_own_documents" ON documents FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = documents.workspace_id AND workspaces.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_documents" ON documents;
CREATE POLICY "insert_own_documents" ON documents FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = documents.workspace_id AND workspaces.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_documents" ON documents;
CREATE POLICY "update_own_documents" ON documents FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = documents.workspace_id AND workspaces.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = documents.workspace_id AND workspaces.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_documents" ON documents;
CREATE POLICY "delete_own_documents" ON documents FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = documents.workspace_id AND workspaces.user_id = auth.uid())
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS documents_updated_at ON documents;
CREATE TRIGGER documents_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ========================
-- WRITING STYLES
-- ========================
CREATE TABLE IF NOT EXISTS writing_styles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  workspace_id uuid NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  name text NOT NULL,
  tone text,
  audience text,
  instructions text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE writing_styles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_styles" ON writing_styles;
CREATE POLICY "select_own_styles" ON writing_styles FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = writing_styles.workspace_id AND workspaces.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "insert_own_styles" ON writing_styles;
CREATE POLICY "insert_own_styles" ON writing_styles FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = writing_styles.workspace_id AND workspaces.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "update_own_styles" ON writing_styles;
CREATE POLICY "update_own_styles" ON writing_styles FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = writing_styles.workspace_id AND workspaces.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = writing_styles.workspace_id AND workspaces.user_id = auth.uid()));

DROP POLICY IF EXISTS "delete_own_styles" ON writing_styles;
CREATE POLICY "delete_own_styles" ON writing_styles FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM workspaces WHERE workspaces.id = writing_styles.workspace_id AND workspaces.user_id = auth.uid())
  );

-- ========================
-- AI USAGE LOGS
-- ========================
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  workspace_id uuid REFERENCES workspaces(id) ON DELETE SET NULL,
  document_id uuid REFERENCES documents(id) ON DELETE SET NULL,
  provider text NOT NULL DEFAULT 'openai',
  model text NOT NULL DEFAULT 'gpt-4o-mini',
  action text NOT NULL,
  input_tokens int NOT NULL DEFAULT 0,
  output_tokens int NOT NULL DEFAULT 0,
  latency_ms int NOT NULL DEFAULT 0,
  estimated_cost_usd numeric(10,6) NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'success' CHECK (status IN ('success', 'error')),
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ai_usage_user ON ai_usage_logs(user_id, created_at DESC);

ALTER TABLE ai_usage_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_usage" ON ai_usage_logs;
CREATE POLICY "select_own_usage" ON ai_usage_logs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_usage" ON ai_usage_logs;
CREATE POLICY "insert_own_usage" ON ai_usage_logs FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
