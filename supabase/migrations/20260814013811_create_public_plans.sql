/* Public pricing content with administrator-only writes. */
CREATE TABLE IF NOT EXISTS public.site_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  tagline text NOT NULL DEFAULT '',
  price text NOT NULL DEFAULT 'Free',
  period text NOT NULL DEFAULT 'forever',
  features jsonb NOT NULL DEFAULT '[]'::jsonb,
  highlighted boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_plans ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_plans TO anon, authenticated;

CREATE POLICY "public_read_site_plans" ON public.site_plans
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_insert_site_plans" ON public.site_plans
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_site_plans" ON public.site_plans
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_site_plans" ON public.site_plans
  FOR DELETE TO authenticated USING (is_admin());

INSERT INTO public.site_plans (name, tagline, price, period, features, highlighted, sort_order)
SELECT * FROM (VALUES
  ('Free', 'A focused start for every writer.', '$0', 'forever', '["Unlimited drafts", "AI writing workspace", "Export to Markdown"]'::jsonb, false, 1),
  ('Creator', 'More power for consistent publishing.', '$12', 'per month', '["Everything in Free", "Advanced AI actions", "Custom writing styles", "Priority generation"]'::jsonb, true, 2),
  ('Studio', 'A calm home for serious writing teams.', '$29', 'per month', '["Everything in Creator", "Shared workspaces", "Team-ready workflows", "Premium support"]'::jsonb, false, 3)
) AS defaults(name, tagline, price, period, features, highlighted, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.site_plans);
