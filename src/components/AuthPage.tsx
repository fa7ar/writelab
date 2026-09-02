import { useState } from 'react';
import {
  PenLine, Loader2, AlertCircle, Sparkles, Layers, Lock, Zap,
  FileText, PencilLine, Rocket,
} from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useTheme } from '@/hooks/useTheme';
import { Sun, Moon } from 'lucide-react';

const FEATURES = [
  { icon: <Layers size={20} />, title: 'Document-first', desc: 'Your document is the workspace. AI is the assistant beside it, not the other way around.' },
  { icon: <Sparkles size={20} />, title: 'Context-aware AI', desc: 'The AI reads your document and selection to give relevant, grounded suggestions.' },
  { icon: <Lock size={20} />, title: 'BYOK ready', desc: 'Bring your own API key for full control over models, providers, and costs.' },
  { icon: <Zap size={20} />, title: 'Multi-provider', desc: 'OpenAI, Anthropic, Google, DeepSeek, Groq, Mistral, and OpenRouter supported.' },
];

const STEPS = [
  { icon: <PencilLine size={20} />, title: 'Describe', desc: 'Tell Writelab what you want to write in plain language.' },
  { icon: <Sparkles size={20} />, title: 'Generate', desc: 'AI creates a structured first draft in your document.' },
  { icon: <FileText size={20} />, title: 'Refine', desc: 'Edit inline and use AI to improve, shorten, or rephrase any section.' },
];

interface Props {
  onAuthenticated: () => void;
}

export default function AuthPage({ onAuthenticated }: Props) {
  const { theme, toggle } = useTheme();
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onAuthenticated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong';
      setError(msg === 'Invalid login credentials' ? 'Incorrect email or password.' : msg);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white dark:bg-stone-950 flex flex-col transition-colors">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 sm:px-8 py-4 sticky top-0 z-20 bg-white/90 dark:bg-stone-950/90 backdrop-blur-md border-b border-stone-100 dark:border-stone-900">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 bg-stone-900 dark:bg-stone-100 rounded-xl flex items-center justify-center">
            <PenLine size={17} className="text-white dark:text-stone-900" />
          </div>
          <span className="text-lg font-bold text-stone-900 dark:text-stone-100 tracking-tight">Writelab</span>
        </div>
        <button onClick={toggle} className="p-2 rounded-lg text-stone-500 hover:text-stone-900 dark:hover:text-stone-100 hover:bg-stone-100 dark:hover:bg-stone-800 transition">
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>
      </nav>

      {/* Hero with auth form */}
      <section className="relative px-4 py-16 sm:py-24 overflow-hidden">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-72 h-72 bg-stone-100 dark:bg-stone-900 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-stone-100 dark:bg-stone-900 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: headline */}
          <div className="text-center lg:text-left">
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-stone-900 dark:text-stone-100 leading-[1.1] tracking-tight mb-6">
              Start Writing Now
            </h1>
            <p className="text-stone-500 dark:text-stone-400 text-lg leading-relaxed max-w-md mx-auto lg:mx-0">
              A minimalist, AI-powered writing workspace. Generate drafts, refine inline, and own your words.
            </p>
          </div>

          {/* Right: auth card */}
          <div className="w-full max-w-sm mx-auto lg:mx-0">
            <div className="bg-white dark:bg-stone-900 rounded-2xl border border-stone-200 dark:border-stone-800 p-8 shadow-lg shadow-stone-200/40 dark:shadow-none">
              <h2 className="text-xl font-semibold text-stone-900 dark:text-stone-100 mb-1">
                {mode === 'signin' ? 'Welcome back' : 'Create your account'}
              </h2>
              <p className="text-sm text-stone-500 dark:text-stone-400 mb-6">
                {mode === 'signin'
                  ? 'Sign in to your writing workspace.'
                  : 'Start writing smarter with AI by your side.'}
              </p>

              {error && (
                <div className="flex items-center gap-2 bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-400 text-sm rounded-lg px-4 py-3 mb-5">
                  <AlertCircle size={15} className="flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="you@example.com"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 focus:border-transparent transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-stone-700 dark:text-stone-300 mb-1.5">Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 rounded-lg border border-stone-200 dark:border-stone-700 bg-stone-50 dark:bg-stone-800 text-stone-900 dark:text-stone-100 text-sm placeholder:text-stone-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-stone-900 dark:focus:ring-stone-400 focus:border-transparent transition"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 font-medium text-sm py-2.5 rounded-lg transition disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {loading ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : mode === 'signin' ? (
                    'Sign in'
                  ) : (
                    'Create account'
                  )}
                </button>
              </form>
            </div>

            <p className="text-center text-sm text-stone-500 dark:text-stone-400 mt-5">
              {mode === 'signin' ? "Don't have an account? " : 'Already have an account? '}
              <button
                onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); }}
                className="text-stone-900 dark:text-stone-100 font-medium hover:underline"
              >
                {mode === 'signin' ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-stone-100 dark:border-stone-900 bg-stone-50 dark:bg-stone-950 py-16 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 text-center mb-2 tracking-tight">How it works</h2>
          <p className="text-center text-stone-500 dark:text-stone-400 text-sm mb-10">Three steps from idea to polished document</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {STEPS.map((step, i) => (
              <div key={step.title} className="text-center">
                <div className="w-12 h-12 mx-auto bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl flex items-center justify-center text-stone-600 dark:text-stone-300 mb-3">
                  {step.icon}
                </div>
                <div className="text-xs font-mono text-stone-300 dark:text-stone-700 mb-1">{`0${i + 1}`}</div>
                <h3 className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1.5">{step.title}</h3>
                <p className="text-xs text-stone-500 dark:text-stone-400 leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-t border-stone-100 dark:border-stone-900 bg-white dark:bg-stone-950 py-16 px-4">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-stone-900 dark:text-stone-100 text-center mb-2 tracking-tight">Why Writelab</h2>
          <p className="text-center text-stone-500 dark:text-stone-400 text-sm mb-10">Built for writers who want AI assistance without losing control</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
            {FEATURES.map((f) => (
              <div key={f.title} className="flex gap-4">
                <div className="w-11 h-11 bg-stone-100 dark:bg-stone-800 rounded-xl flex items-center justify-center flex-shrink-0 text-stone-600 dark:text-stone-300">
                  {f.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-stone-900 dark:text-stone-100 mb-1">{f.title}</p>
                  <p className="text-sm text-stone-500 dark:text-stone-400 leading-relaxed">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-stone-100 dark:border-stone-900 bg-stone-50 dark:bg-stone-950 py-16 px-4">
        <div className="max-w-2xl mx-auto text-center">
          <div className="w-12 h-12 mx-auto bg-stone-900 dark:bg-stone-100 rounded-xl flex items-center justify-center mb-4">
            <Rocket size={22} className="text-white dark:text-stone-900" />
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold text-stone-900 dark:text-stone-100 mb-3 tracking-tight">Ready to start writing?</h2>
          <p className="text-stone-500 dark:text-stone-400 text-sm mb-6">Create your account and generate your first AI-powered draft in seconds.</p>
          <button
            onClick={() => { setMode('signup'); }}
            className="inline-flex items-center gap-2 bg-stone-900 dark:bg-stone-100 hover:bg-stone-800 dark:hover:bg-stone-200 text-white dark:text-stone-900 text-sm font-medium px-6 py-3 rounded-xl transition hover:scale-[1.02] active:scale-[0.98]"
          >
            <Sparkles size={16} />
            Get started free
          </button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-stone-100 dark:border-stone-900 bg-white dark:bg-stone-950 py-6 px-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-stone-900 dark:bg-stone-100 rounded-lg flex items-center justify-center">
              <PenLine size={13} className="text-white dark:text-stone-900" />
            </div>
            <span className="text-sm font-semibold text-stone-900 dark:text-stone-100">Writelab</span>
          </div>
          <p className="text-xs text-stone-400 dark:text-stone-500">Document-first AI writing</p>
        </div>
      </footer>
    </div>
  );
}
