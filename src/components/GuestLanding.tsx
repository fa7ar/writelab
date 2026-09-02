import {
  ArrowRight, BookOpen, BookOpenText, Check, Coffee, FileText, Github,
  Home as HomeIcon, Leaf, MessageCircle, Moon, MoreHorizontal, PenLine,
  Puzzle, Search, Settings, Share2, Sparkles, Sun, Trash2,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

interface Props {
  onSignIn: () => void;
  onSignUp: () => void;
  onNavigate: (page: 'features' | 'usecases' | 'plans') => void;
}

const FEATURES = [
  { icon: <Sparkles size={18} />, title: 'AI Writing Assistant', desc: 'Generate ideas, rewrite, expand, and refine your content with AI that understands you.' },
  { icon: <FileText size={18} />, title: 'Distraction-Free Editor', desc: 'A clean, minimal editor that helps you focus on what matters: your story.' },
  { icon: <Sparkles size={18} />, title: 'Smart AI Actions', desc: 'Use AI actions anywhere in your text to improve, fix, or transform your writing instantly.' },
  { icon: <Share2 size={18} />, title: 'Export & Share', desc: 'Export your work to PDF, share with others, and publish your stories anywhere.' },
];

function EditorPreview() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-[#e8e2f1] bg-white shadow-[0_24px_70px_rgba(61,35,105,0.12)]">
      <div className="flex h-[370px] sm:h-[410px]">
        <aside className="hidden w-[168px] shrink-0 flex-col border-r border-[#f0eafa] bg-[#fcfbff] p-3 sm:flex">
          <div className="mb-8 flex items-center gap-1.5 px-1 text-[10px] font-bold text-[#34216f]">
            <img src="/wlogo.webp" alt="Writelab" className="h-4 w-4 object-contain" />
            Writelab
          </div>
          <div className="space-y-1 text-[10px] text-[#7650a2]">
            <div className="flex items-center gap-2 rounded-md bg-[#f0eafa] px-2 py-1.5 font-semibold text-[#34216f]"><HomeIcon size={11} /> Home</div>
            <div className="flex items-center gap-2 px-2 py-1.5"><Search size={11} /> Search</div>
            <div className="flex items-center gap-2 px-2 py-1.5"><BookOpenText size={11} /> Tutorials</div>
            <div className="flex items-center gap-2 px-2 py-1.5"><Puzzle size={11} /> Extensions</div>
            <div className="flex items-center gap-2 px-2 py-1.5"><Settings size={11} /> Settings</div>
          </div>
          <div className="mt-6 px-2 text-[9px] font-semibold uppercase tracking-wider text-[#b07aa2]">Projects</div>
          <div className="mt-2 space-y-1 text-[10px] text-[#7650a2]">
            <div className="flex items-center gap-2 px-2 py-1.5"><FileText size={11} /> My Stories</div>
            <div className="flex items-center gap-2 px-2 py-1.5"><FileText size={11} /> Blog Posts</div>
            <div className="flex items-center gap-2 px-2 py-1.5"><FileText size={11} /> Ideas</div>
          </div>
          <div className="mt-auto flex items-center gap-2 px-2 py-1.5 text-[10px] text-[#7650a2]"><Trash2 size={11} /> Trash</div>
        </aside>

        <main className="min-w-0 flex-1 bg-white">
          <div className="flex h-10 items-center justify-between border-b border-[#f0eafa] px-3 sm:px-4">
            <div className="flex items-center gap-2 text-[10px] font-semibold text-[#34216f]"><span className="truncate">The last light</span><span className="font-normal text-[#b07aa2]">● Saved</span></div>
            <div className="flex items-center gap-2 text-[9px] text-[#7650a2]"><span className="rounded border border-[#e8e2f1] px-2 py-1">Share</span><span className="rounded border border-[#e8e2f1] px-2 py-1">Export</span><MoreHorizontal size={13} /></div>
          </div>
          <div className="flex h-8 items-center gap-3 border-b border-[#f0eafa] px-3 text-[8px] font-medium text-[#b07aa2] sm:px-4">
            <span>H1</span><span>H2</span><span className="font-bold">B</span><span className="italic">I</span><span className="underline">U</span><span>↗</span><span>◌</span><span>☷</span>
          </div>
          <article className="mx-auto max-w-[420px] px-5 py-7 text-left sm:px-8 sm:py-9">
            <h3 className="mb-4 font-serif text-xl font-bold text-[#34216f] sm:text-2xl">The last light</h3>
            <p className="mb-3 text-[10px] leading-[1.8] text-slate-700 sm:text-[11px]">The world ended quietly.</p>
            <p className="mb-3 text-[10px] leading-[1.8] text-slate-700 sm:text-[11px]">No explosions. No final battle. Just a dimming—like a candle running out of breath.</p>
            <p className="mb-3 text-[10px] leading-[1.8] text-slate-700 sm:text-[11px]">Mira stood on the hill, watching the sky surrender its colors one by one. The structures we built, the systems we trusted, the stories we told ourselves—all of it faded into the same shade of gray.</p>
            <p className="text-[10px] leading-[1.8] text-slate-700 sm:text-[11px]">But somewhere in that silence, she believed a new story was waiting.</p>
          </article>
          <div className="absolute bottom-2 left-3 text-[9px] text-[#b07aa2] sm:left-[185px]">1,234 words</div>
        </main>

        <aside className="hidden w-[180px] shrink-0 flex-col border-l border-[#f0eafa] bg-[#fdfcfe] sm:flex">
          <div className="flex h-10 items-center gap-5 border-b border-[#f0eafa] px-3 text-[10px]"><span className="border-b border-[#34216f] py-3 font-semibold text-[#34216f]">Chat</span><span className="text-[#b07aa2]">AI Actions</span></div>
          <div className="flex-1 space-y-3 p-3 text-[9px] leading-[1.6] text-slate-600">
            <div className="ml-auto max-w-[120px] rounded-lg bg-[#f0eafa] px-2 py-2 text-right text-[#34216f]">What happens next?</div>
            <div className="rounded-lg border border-[#f0eafa] bg-white p-2 shadow-sm">She hears a sound—a child's laughter carried by the wind. It reminds her that as long as stories exist, endings are never truly the end.<button className="mt-2 rounded border border-[#e8e2f1] px-2 py-1 text-[8px] font-semibold text-[#34216f]">Insert to editor</button></div>
            <div className="ml-auto max-w-[120px] rounded-lg bg-[#f0eafa] px-2 py-2 text-right text-[#34216f]">Make it more hopeful.</div>
            <div className="rounded-lg border border-[#f0eafa] bg-white p-2 shadow-sm">The laughter grows closer, leading her down the hill. She realizes that the last light isn't the end—it's the beginning of a new dawn.</div>
          </div>
          <div className="m-2 flex items-center justify-between rounded border border-[#e8e2f1] bg-white px-2 py-2 text-[9px] text-[#b07aa2]">Ask anything... <MessageCircle size={11} /></div>
        </aside>
      </div>
    </div>
  );
}

export default function GuestLanding({ onSignIn, onSignUp, onNavigate }: Props) {
  const { theme, toggle } = useTheme();
  return (
    <div className="min-h-screen bg-[#fcfbff] text-slate-950 transition-colors dark:bg-stone-950 dark:text-stone-100">
      <nav className="mx-auto flex max-w-[1180px] items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2 text-sm font-bold tracking-tight text-[#34216f] dark:text-stone-100"><img src="/wlogo.webp" alt="Writelab" className="h-7 w-7 object-contain" />Writelab</div>
        <div className="hidden items-center gap-8 text-[11px] font-medium text-[#7650a2] md:flex dark:text-stone-400">
          <button onClick={() => onNavigate('features')} className="hover:text-[#34216f] dark:hover:text-stone-100 transition">Features</button>
          <button onClick={() => onNavigate('usecases')} className="hover:text-[#34216f] dark:hover:text-stone-100 transition">Use Cases</button>
          <button onClick={() => onNavigate('plans')} className="hover:text-[#34216f] dark:hover:text-stone-100 transition">Plans</button>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggle} className="rounded-lg p-2 text-[#7650a2] hover:bg-[#f0eafa] dark:hover:bg-stone-800">{theme === 'dark' ? <Sun size={14} /> : <Moon size={14} />}</button>
          <button onClick={onSignIn} className="hidden px-3 py-2 text-[11px] font-medium text-[#7650a2] sm:block dark:text-stone-400">Sign in</button>
          <button onClick={onSignUp} className="rounded-lg bg-[#34216f] px-4 py-2.5 text-[11px] font-semibold text-white shadow-lg shadow-[#34216f]/20 transition hover:bg-[#4e348d] dark:bg-white dark:text-stone-900">Get started</button>
        </div>
      </nav>

      <section className="mx-auto max-w-[980px] px-5 pb-12 pt-16 text-center sm:pb-16 sm:pt-20">
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#e8e2f1] bg-[#f0eafa] px-3 py-1.5 text-[10px] font-medium text-[#7650a2] dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400"><Sparkles size={11} className="text-[#d79bb6]" /> AI-Powered Writing Workspace</div>
        <h1 className="mx-auto max-w-[650px] font-serif text-5xl leading-[0.98] tracking-[-0.04em] text-[#34216f] sm:text-7xl dark:text-stone-100">Smart Editor<br />for Storyteller</h1>
        <p className="mx-auto mt-6 max-w-[390px] text-[13px] leading-[1.65] text-slate-500 dark:text-stone-400">Writelab helps you turn ideas into polished stories.<br className="hidden sm:block" /> Write, refine, and create with AI—all in one place.</p>
        <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <button onClick={onSignUp} className="inline-flex items-center gap-2 rounded-xl bg-[#34216f] px-5 py-3 text-[11px] font-semibold text-white shadow-lg shadow-[#34216f]/20 transition hover:bg-[#4e348d] dark:bg-white dark:text-stone-900"><PenLine size={13} /> Start writing — it's free <ArrowRight size={13} /></button>
          <button type="button" className="inline-flex items-center gap-2 rounded-xl border border-[#e8e2f1] px-5 py-3 text-[11px] font-semibold text-[#34216f] hover:bg-[#f0eafa] dark:border-stone-700 dark:text-stone-300 dark:hover:bg-stone-900"><span>View on GitHub</span><Github size={13} /></button>
        </div>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-[10px] text-[#7650a2] dark:text-stone-400"><span className="flex items-center gap-1.5"><Sparkles size={11} /> AI Writing Assistant</span><span className="flex items-center gap-1.5"><PenLine size={11} /> Beautiful Editor</span><span className="flex items-center gap-1.5"><Github size={11} /> Open Source</span></div>
      </section>

      <section className="mx-auto max-w-[980px] px-4 pb-14 sm:px-8 sm:pb-20"><EditorPreview /></section>

      <section className="mx-auto flex max-w-[760px] flex-wrap items-center justify-center gap-x-10 gap-y-4 border-b border-[#e8e2f1] pb-12 text-[11px] font-semibold text-[#b07aa2] dark:border-stone-900 dark:text-stone-600"><span>Trusted by writers at</span><span className="flex items-center gap-1.5 text-[#b07aa2]"><BookOpen size={16} /> Notion</span><span className="text-lg font-black tracking-tighter">▲ Vercel</span><span className="flex items-center gap-1"><Leaf size={16} /> Linear</span><span className="flex items-center gap-1"><BookOpenText size={15} /> tailwindcss</span><span className="flex items-center gap-1"><CloudIcon /> CLOUDFLARE</span></section>

      <section id="features" className="mx-auto max-w-[980px] px-5 py-16 text-center sm:py-20">
        <h2 className="font-serif text-3xl tracking-tight text-[#34216f] sm:text-4xl dark:text-stone-100">Everything you need to write better</h2>
        <p className="mt-3 text-[12px] text-slate-500 dark:text-stone-400">Powerful features built for modern storytellers.</p>
        <div className="mt-10 grid gap-3 text-left sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map((feature) => (
            <div key={feature.title} className="group rounded-xl border border-[#e8e2f1] bg-white p-4 transition hover:-translate-y-1 hover:shadow-lg dark:border-stone-800 dark:bg-stone-900">
              <div className="mb-4 flex h-8 w-8 items-center justify-center rounded-lg bg-[#f0eafa] text-[#34216f] transition group-hover:bg-[#34216f] group-hover:text-white dark:bg-stone-800 dark:text-stone-200">{feature.icon}</div>
              <h3 className="text-[12px] font-bold text-[#34216f] dark:text-stone-100">{feature.title}</h3>
              <p className="mt-2 text-[11px] leading-[1.65] text-slate-500 dark:text-stone-400">{feature.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-[980px] px-5 pb-16 sm:px-8 sm:pb-20">
        <div className="flex min-h-[205px] items-center justify-between overflow-hidden rounded-xl border border-[#e8e2f1] bg-[#f5edf9] px-7 py-8 dark:border-stone-800 dark:bg-stone-900 sm:px-11">
          <div>
            <h2 className="font-serif text-3xl tracking-tight text-[#34216f] dark:text-stone-100">Ready to tell your story?</h2>
            <p className="mt-3 max-w-[250px] text-[12px] leading-relaxed text-slate-500 dark:text-stone-400">Join Writelab and experience writing without limits.</p>
            <button onClick={onSignUp} className="mt-5 inline-flex items-center gap-2 rounded-lg bg-[#34216f] px-4 py-2.5 text-[11px] font-semibold text-white shadow-lg shadow-[#34216f]/20 transition hover:bg-[#4e348d] dark:bg-white dark:text-stone-900">Get started for free <ArrowRight size={13} /></button>
          </div>
          <div className="relative hidden h-36 w-56 sm:block"><BookOpen className="absolute left-10 top-5 h-24 w-28 -rotate-6 text-[#d79bb6]" strokeWidth={1} /><Coffee className="absolute bottom-1 right-2 h-14 w-14 text-[#d79bb6]" strokeWidth={1} /><Leaf className="absolute right-12 top-1 h-12 w-12 text-[#d79bb6]" strokeWidth={1} /></div>
        </div>
      </section>

      <footer className="mx-auto flex max-w-[980px] items-end justify-between border-t border-[#e8e2f1] px-5 py-7 text-[10px] text-[#b07aa2] dark:border-stone-900 sm:px-8 dark:text-stone-500">
        <div>
          <div className="mb-3 flex items-center gap-1.5 font-bold text-[#34216f] dark:text-stone-200"><img src="/wlogo.webp" alt="Writelab" className="h-5 w-5 object-contain" /> Writelab</div>
          <p>© 2024 Writelab. All rights reserved.</p>
        </div>
        <div className="hidden gap-16 sm:flex">
          <div>
            <b className="text-[#34216f] dark:text-stone-300">Explore</b>
            <div className="mt-2 space-y-1">
              <button onClick={() => onNavigate('features')} className="block hover:text-[#34216f] dark:hover:text-stone-100">Features</button>
              <button onClick={() => onNavigate('usecases')} className="block hover:text-[#34216f] dark:hover:text-stone-100">Use Cases</button>
              <button onClick={() => onNavigate('plans')} className="block hover:text-[#34216f] dark:hover:text-stone-100">Plans</button>
            </div>
          </div>
          <div><b className="text-[#34216f] dark:text-stone-300">Resources</b><p className="mt-2">Documentation<br />Guides<br />Blog<br />Help Center</p></div>
          <div><b className="text-[#34216f] dark:text-stone-300">Company</b><p className="mt-2">GitHub<br />About<br />Contact</p></div>
        </div>
        <div className="flex gap-3 text-[#7650a2] dark:text-stone-300"><Github size={14} /><span className="font-bold">X</span><span className="font-bold">◈</span></div>
      </footer>
    </div>
  );
}

function CloudIcon() {
  return <span className="text-base leading-none">☁</span>;
}
