/* Public FAQ content with administrator-only writes. */
CREATE TABLE IF NOT EXISTS public.site_faqs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  answer text NOT NULL,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.site_faqs ENABLE ROW LEVEL SECURITY;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_faqs TO anon, authenticated;

CREATE POLICY "public_read_site_faqs" ON public.site_faqs
  FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "admin_insert_site_faqs" ON public.site_faqs
  FOR INSERT TO authenticated WITH CHECK (is_admin());
CREATE POLICY "admin_update_site_faqs" ON public.site_faqs
  FOR UPDATE TO authenticated USING (is_admin()) WITH CHECK (is_admin());
CREATE POLICY "admin_delete_site_faqs" ON public.site_faqs
  FOR DELETE TO authenticated USING (is_admin());

INSERT INTO public.site_faqs (question, answer, sort_order)
SELECT * FROM (VALUES
  ('Is there a free plan?', 'Yes. The Free plan includes unlimited drafts, the AI writing workspace, and Markdown export — no credit card required.', 1),
  ('Can I use my own AI API key?', 'Absolutely. Writelab supports bring-your-own-key for OpenAI, Anthropic, Google, DeepSeek, Groq, Mistral, and OpenRouter-compatible providers.', 2),
  ('Can I cancel anytime?', 'Yes, you can upgrade, downgrade, or cancel your plan at any time from your account settings.', 3),
  ('Do you offer refunds?', 'If something is not right, contact support within the first 14 days and we will make it right.', 4)
) AS defaults(question, answer, sort_order)
WHERE NOT EXISTS (SELECT 1 FROM public.site_faqs);
