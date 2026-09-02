import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, ChevronDown, FileText, Layers3, PenLine, Sparkles, Users } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import type { SiteFaq, SitePlan } from '@/lib/types';

type Page = 'features' | 'usecases' | 'plans';

interface Props {
  page: Page;
  onBack: () => void;
  onSignUp: () => void;
  onSignIn: () => void;
}

const fallbackPlans: SitePlan[] = [
  { id: 'free', name: 'Free', tagline: 'A focused start for every writer.', price: '$0', period: 'forever', features: ['Unlimited drafts', 'AI writing workspace', 'Export to Markdown'], highlighted: false, sort_order: 1, created_at: '', updated_at: '' },
  { id: 'creator', name: 'Creator', tagline: 'More power for consistent publishing.', price: '$12', period: 'per month', features: ['Everything in Free', 'Advanced AI actions', 'Custom writing styles', 'Priority generation'], highlighted: true, sort_order: 2, created_at: '', updated_at: '' },
  { id: 'studio', name: 'Studio', tagline: 'A calm home for serious writing teams.', price: '$29', period: 'per month', features: ['Everything in Creator', 'Shared workspaces', 'Team-ready workflows', 'Premium support'], highlighted: false, sort_order: 3, created_at: '', updated_at: '' },
];

const fallbackFaqs: SiteFaq[] = [
  { id: '1', question: 'Is there a free plan?', answer: 'Yes. The Free plan includes unlimited drafts, the AI writing workspace, and Markdown export — no credit card required.', sort_order: 1, created_at: '', updated_at: '' },
  { id: '2', question: 'Can I use my own AI API key?', answer: 'Absolutely. Writelab supports bring-your-own-key for OpenAI, Anthropic, Google, DeepSeek, Groq, Mistral, and OpenRouter-compatible providers.', sort_order: 2, created_at: '', updated_at: '' },
  { id: '3', question: 'Can I cancel anytime?', answer: 'Yes, you can upgrade, downgrade, or cancel your plan at any time from your account settings.', sort_order: 3, created_at: '', updated_at: '' },
];

export default function Marketing({ page, onBack, onSignUp, onSignIn }: Props) {
  const [plans, setPlans] = useState<SitePlan[]>(fallbackPlans);
  const [faqs, setFaqs] = useState<SiteFaq[]>(fallbackFaqs);
  const [openFaq, setOpenFaq] = useState<string | null>(null);

  useEffect(() => {
    if (page !== 'plans') return;
    Promise.all([
      supabase.from('site_plans').select('*').order('sort_order'),
      supabase.from('site_faqs').select('*').order('sort_order'),
    ]).then(([plansResult, faqsResult]) => {
      if (plansResult.data?.length) setPlans(plansResult.data as SitePlan[]);
      if (faqsResult.data?.length) setFaqs(faqsResult.data as SiteFaq[]);
    });
  }, [page]);

  return (
    <div className="min-h-screen bg-[#fcfbff] text-slate-950">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-slate-900">
          <img src="/wlogo.webp" alt="Writelab" className="h-9 w-9 object-contain" />
          Writelab
        </button>
        <div className="flex items-center gap-2">
          <button onClick={onSignIn} className="hidden rounded-lg px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 sm:block">Sign in</button>
          <button onClick={onSignUp} className="rounded-lg bg-[#34216f] px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#34216f]/20 transition hover:bg-[#4e348d]">Get started</button>
        </div>
      </nav>

      {page === 'features' && <Features onSignUp={onSignUp} />}
      {page === 'usecases' && <UseCases onSignUp={onSignUp} />}
      {page === 'plans' && <Plans plans={plans} faqs={faqs} openFaq={openFaq} setOpenFaq={setOpenFaq} onSignUp={onSignUp} />}
    </div>
  );
}

function PageIntro({ eyebrow, title, text }: { eyebrow: string; title: string; text: string }) {
  return <section className="mx-auto max-w-3xl px-5 pb-14 pt-20 text-center sm:pt-28"><p className="mb-4 text-xs font-bold uppercase tracking-[0.24em] text-[#8a5b9f]">{eyebrow}</p><h1 className="font-serif text-5xl leading-[1.05] tracking-[-0.04em] sm:text-7xl">{title}</h1><p className="mx-auto mt-6 max-w-xl text-base leading-7 text-slate-500">{text}</p></section>;
}

function Features({ onSignUp }: { onSignUp: () => void }) {
  const features = [
    [Sparkles, 'AI that follows your thinking', 'Generate, rewrite, expand, shorten, and brainstorm without leaving the page.'],
    [FileText, 'A beautiful place to write', 'A calm, document-first editor keeps your attention on the words, not the controls.'],
    [Layers3, 'Your tools, your way', 'Bring your own provider key, choose your model, and create writing styles that sound like you.'],
    [Check, 'From rough idea to ready', 'Move from a blank page to a polished draft with simple, focused actions at every stage.'],
  ] as const;
  return <><PageIntro eyebrow="The Writelab way" title="A writing workspace that gets out of the way." text="Everything you need to think clearly, write beautifully, and finish more of what matters." /><section className="mx-auto grid max-w-5xl gap-4 px-5 pb-20 sm:grid-cols-2">{features.map(([Icon, title, text], i) => <article key={title} className="group rounded-3xl border border-[#e8e2f1] bg-white p-7 shadow-[0_12px_40px_rgba(61,35,105,0.05)] transition hover:-translate-y-1 hover:shadow-xl"><div className="mb-12 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f0eafa] text-[#5b3d8d] transition group-hover:bg-[#34216f] group-hover:text-white"><Icon size={21} /></div><span className="text-xs font-bold text-[#b07aa2]">0{i + 1}</span><h2 className="mt-2 text-xl font-semibold">{title}</h2><p className="mt-3 text-sm leading-6 text-slate-500">{text}</p></article>)}</section><CallToAction onSignUp={onSignUp} /></>;
}

function UseCases({ onSignUp }: { onSignUp: () => void }) {
  const cases = [['For storytellers', 'Build scenes, characters, and chapters with an AI partner that understands the context around your words.'], ['For creators', 'Turn a spark into a blog post, newsletter, social caption, or polished portfolio piece in one focused session.'], ['For teams', 'Keep briefs, drafts, and feedback in one calm workspace so every voice stays clear and consistent.']];
  return <><PageIntro eyebrow="Made for the work" title="Whatever you write, write it with intention." text="Writelab adapts to the way you already think, from the first messy idea to the final line." /><section className="mx-auto max-w-5xl space-y-4 px-5 pb-20">{cases.map(([title, text], i) => <article key={title} className="grid gap-6 rounded-3xl border border-[#e8e2f1] bg-white p-7 sm:grid-cols-[180px_1fr] sm:items-center sm:p-10"><div className="flex items-center gap-3 text-[#5b3d8d]"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f0eafa] font-serif text-lg">{i + 1}</span><Users size={18} /></div><div><h2 className="text-2xl font-semibold">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">{text}</p></div></article>)}</section><CallToAction onSignUp={onSignUp} /></>;
}

function Plans({ plans, faqs, openFaq, setOpenFaq, onSignUp }: { plans: SitePlan[]; faqs: SiteFaq[]; openFaq: string | null; setOpenFaq: (id: string | null) => void; onSignUp: () => void }) {
  return <><PageIntro eyebrow="Simple plans" title="Choose the room your writing needs." text="Start free, grow into a plan that fits your rhythm, and keep your work in one place." /><section className="mx-auto grid max-w-6xl gap-4 px-5 pb-24 lg:grid-cols-3">{plans.map((plan) => <article key={plan.id} className={`relative rounded-3xl border p-7 ${plan.highlighted ? 'border-[#7650a2] bg-[#34216f] text-white shadow-2xl shadow-[#34216f]/25' : 'border-[#e8e2f1] bg-white'}`}>{plan.highlighted && <span className="absolute right-6 top-6 rounded-full bg-[#d79bb6] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-[#34216f]">Most popular</span>}<h2 className="text-xl font-semibold">{plan.name}</h2><p className={`mt-2 min-h-12 text-sm leading-6 ${plan.highlighted ? 'text-white/70' : 'text-slate-500'}`}>{plan.tagline}</p><p className="mt-8 text-4xl font-semibold">{plan.price}<span className={`ml-1 text-sm font-normal ${plan.highlighted ? 'text-white/60' : 'text-slate-400'}`}>/{plan.period}</span></p><button onClick={onSignUp} className={`mt-8 w-full rounded-xl px-4 py-3 text-sm font-semibold transition ${plan.highlighted ? 'bg-white text-[#34216f] hover:bg-[#f5edf9]' : 'bg-[#f0eafa] text-[#34216f] hover:bg-[#e3d8f2]'}`}>Start writing</button><ul className={`mt-8 space-y-3 text-sm ${plan.highlighted ? 'text-white/85' : 'text-slate-600'}`}>{plan.features.map((feature) => <li key={feature} className="flex gap-2"><Check size={16} className="mt-0.5 shrink-0 text-[#d79bb6]" />{feature}</li>)}</ul></article>)}</section><section className="mx-auto max-w-3xl px-5 pb-24"><h2 className="font-serif text-3xl">Questions, answered.</h2><div className="mt-6 divide-y divide-[#e8e2f1] rounded-2xl border border-[#e8e2f1] bg-white">{faqs.map((faq) => <div key={faq.id}><button onClick={() => setOpenFaq(openFaq === faq.id ? null : faq.id)} className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left text-sm font-semibold"><span>{faq.question}</span><ChevronDown size={16} className={`shrink-0 text-[#7650a2] transition ${openFaq === faq.id ? 'rotate-180' : ''}`} /></button>{openFaq === faq.id && <p className="px-5 pb-5 text-sm leading-6 text-slate-500">{faq.answer}</p>}</div>)}</div></section></>;
}

function CallToAction({ onSignUp }: { onSignUp: () => void }) { return <section className="mx-5 mb-16 rounded-3xl bg-[#34216f] px-6 py-12 text-center text-white sm:px-12"><h2 className="font-serif text-3xl">Your next good sentence starts here.</h2><button onClick={onSignUp} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-white px-5 py-3 text-sm font-semibold text-[#34216f] transition hover:bg-[#f5edf9]">Create your free workspace <ArrowRight size={15} /></button></section>; }
