import { useState, useRef, useEffect } from 'react';
import {
  ArrowRight, ArrowLeft, Check, ChevronDown, Loader2, Sparkles,
  BookOpen, Mail, Linkedin, FileCode, MessageSquare, FileText,
  PenLine, Wand2, Globe, Users as UsersIcon, AlignLeft,
} from 'lucide-react';
import { useTheme } from '@/hooks/useTheme';

export interface StorytellersConfig {
  writingType: string;
  writingTypeLabel: string;
  goal: string;
  topic: string;
  workingTitle: string;
  targetAudience: string;
  keyPoints: string;
  tone: string;
  length: string;
  language: string;
}

interface Props {
  onOpenEditor: (config: StorytellersConfig, generate: boolean) => void;
  onBlankDraft: () => void;
}

const WRITING_TYPES = [
  { id: 'blog', icon: <BookOpen size={18} />, label: 'Blog post', desc: 'Share ideas, insights, or expertise.', prompt: 'a blog post about ' },
  { id: 'email', icon: <Mail size={18} />, label: 'Email', desc: 'Communicate clearly and professionally.', prompt: 'a professional email about ' },
  { id: 'linkedin', icon: <Linkedin size={18} />, label: 'LinkedIn post', desc: 'Build thought leadership and engage.', prompt: 'a LinkedIn post about ' },
  { id: 'docs', icon: <FileCode size={18} />, label: 'Documentation', desc: 'Explain how something works.', prompt: 'technical documentation for ' },
  { id: 'essay', icon: <MessageSquare size={18} />, label: 'Essay', desc: 'Explore a topic in depth.', prompt: 'a thoughtful essay about ' },
  { id: 'report', icon: <FileText size={18} />, label: 'Report', desc: 'Present findings or analysis.', prompt: 'a report on ' },
] as const;

const GOALS_BY_TYPE: Record<string, string[]> = {
  blog: ['Educate readers', 'Explain a concept', 'Share an opinion', 'Build SEO authority', 'Promote a product', 'Tell a story'],
  email: ['Inform', 'Persuade', 'Request action', 'Follow up', 'Introduce something'],
  linkedin: ['Share insight', 'Build authority', 'Spark discussion', 'Promote content', 'Celebrate a milestone'],
  docs: ['Explain usage', 'Onboard users', 'Document an API', 'Describe architecture'],
  essay: ['Argue a point', 'Explore an idea', 'Reflect', 'Analyze', 'Persuade'],
  report: ['Summarize findings', 'Recommend actions', 'Analyze data', 'Present status'],
};

const TONES = ['Professional', 'Casual', 'Conversational', 'Persuasive', 'Technical', 'Storytelling'];
const LENGTHS = ['Short (200-500 words)', 'Medium (500-1000 words)', 'Long (1000+ words)'];
const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Portuguese', 'Indonesian'];

const STEPS = ['Choose', 'Goal', 'Describe', 'Refine', 'Review'] as const;

export default function Storytellers({ onOpenEditor, onBlankDraft }: Props) {
  const { theme, toggle } = useTheme();
  const [step, setStep] = useState(0);
  const [config, setConfig] = useState<StorytellersConfig>({
    writingType: '',
    writingTypeLabel: '',
    goal: '',
    topic: '',
    workingTitle: '',
    targetAudience: '',
    keyPoints: '',
    tone: '',
    length: '',
    language: 'English',
  });
  const [customGoal, setCustomGoal] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showAllTypes, setShowAllTypes] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (step === 2 && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [step]);

  const visibleTypes = showAllTypes ? WRITING_TYPES : WRITING_TYPES.slice(0, 6);
  const goals = config.writingType ? (GOALS_BY_TYPE[config.writingType] ?? []) : [];

  function selectType(wt: typeof WRITING_TYPES[number]) {
    setConfig({ ...config, writingType: wt.id, writingTypeLabel: wt.label, goal: '' });
    setStep(1);
  }

  function selectGoal(goal: string) {
    setConfig({ ...config, goal });
    setStep(2);
  }

  function canContinue(): boolean {
    if (step === 1) return !!config.goal || !!customGoal.trim();
    if (step === 2) return !!config.topic.trim();
    return true;
  }

  function next() {
    if (step === 1 && customGoal.trim() && !config.goal) {
      setConfig({ ...config, goal: customGoal.trim() });
    }
    if (step < STEPS.length - 1) setStep(step + 1);
  }

  function back() {
    if (step > 0) setStep(step - 1);
  }

  function buildGenerationInstruction(): string {
    const wt = WRITING_TYPES.find(t => t.id === config.writingType);
    const base = wt ? `${wt.prompt}` : '';
    const parts: string[] = [`${base}${config.topic.trim()}`];
    if (config.goal) parts.push(`Goal: ${config.goal}.`);
    if (config.targetAudience) parts.push(`Target audience: ${config.targetAudience}.`);
    if (config.keyPoints) parts.push(`Key points to cover: ${config.keyPoints}.`);
    if (config.tone) parts.push(`Tone: ${config.tone}.`);
    if (config.length) parts.push(`Length: ${config.length}.`);
    if (config.language && config.language !== 'English') parts.push(`Language: ${config.language}.`);
    if (config.workingTitle) parts.push(`Working title: "${config.workingTitle}".`);
    return parts.join(' ');
  }

  const typedWt = WRITING_TYPES.find(t => t.id === config.writingType);

  return (
    <div className="min-h-screen bg-[#fcfbff] dark:bg-stone-950 flex flex-col transition-colors">
      {/* Nav */}
      <nav className="flex items-center justify-between px-5 sm:px-8 py-4">
        <div className="flex items-center gap-2">
          <img src="/wlogo.webp" alt="Writelab" className="h-9 w-9 object-contain" />
          <span className="text-lg font-bold text-[#34216f] dark:text-stone-100 tracking-tight">Writelab</span>
        </div>
        <button onClick={toggle} className="p-2 rounded-lg text-[#7650a2] hover:bg-[#f0eafa] dark:hover:bg-stone-800 transition">
          {theme === 'dark' ? '☀' : '☾'}
        </button>
      </nav>

      <div className="flex-1 flex flex-col items-center px-4 pb-12 pt-4 sm:pt-8">
        <div className="w-full max-w-2xl">
          {/* Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 rounded-full border border-[#e8e2f1] bg-[#f0eafa] px-3 py-1.5 text-[10px] font-medium text-[#7650a2] dark:border-stone-800 dark:bg-stone-900 dark:text-stone-400 mb-4">
              <Sparkles size={11} className="text-[#d79bb6]" /> Storytellers
            </div>
            <h1 className="font-serif text-3xl sm:text-4xl text-[#34216f] dark:text-stone-100 tracking-tight">
              Every story starts with an idea.
            </h1>
            <p className="mt-3 text-sm text-slate-500 dark:text-stone-400 max-w-md mx-auto">
              Tell us what you want to create. We'll help you shape it into something worth reading.
            </p>
          </div>

          {/* Progress */}
          <div className="flex items-center justify-center gap-2 mb-8">
            {STEPS.map((label, i) => (
              <div key={label} className="flex items-center gap-2">
                <div className={`flex items-center gap-1.5 ${i <= step ? 'text-[#34216f] dark:text-stone-100' : 'text-[#b07aa2]/50 dark:text-stone-600'}`}>
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition ${
                    i < step
                      ? 'bg-[#34216f] text-white dark:bg-stone-100 dark:text-stone-900'
                      : i === step
                      ? 'bg-[#f0eafa] text-[#34216f] border border-[#34216f] dark:bg-stone-800 dark:text-stone-100 dark:border-stone-100'
                      : 'bg-[#f5edf9] text-[#b07aa2] dark:bg-stone-900 dark:text-stone-600'
                  }`}>
                    {i < step ? <Check size={11} /> : i + 1}
                  </div>
                  <span className="text-[10px] font-medium hidden sm:block">{label}</span>
                </div>
                {i < STEPS.length - 1 && <div className={`w-6 h-px ${i < step ? 'bg-[#34216f] dark:bg-stone-100' : 'bg-[#e8e2f1] dark:bg-stone-800'}`} />}
              </div>
            ))}
          </div>

          {/* Step content */}
          <div className="bg-white dark:bg-stone-900 border border-[#e8e2f1] dark:border-stone-800 rounded-2xl shadow-lg shadow-[#34216f]/10 dark:shadow-none p-6 sm:p-8">
            {/* Step 0: Choose type */}
            {step === 0 && (
              <div>
                <h2 className="text-sm font-semibold text-[#34216f] dark:text-stone-100 mb-4">What do you want to create?</h2>
                <div className="grid gap-3 sm:grid-cols-2">
                  {visibleTypes.map((wt) => (
                    <button
                      key={wt.id}
                      onClick={() => selectType(wt)}
                      className={`flex items-start gap-3 p-4 rounded-xl border text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                        config.writingType === wt.id
                          ? 'border-[#34216f] bg-[#f5edf9] dark:border-stone-100 dark:bg-stone-800'
                          : 'border-[#e8e2f1] bg-white hover:border-[#7650a2] dark:border-stone-800 dark:bg-stone-900'
                      }`}
                    >
                      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#f0eafa] text-[#34216f] dark:bg-stone-800 dark:text-stone-200 flex-shrink-0">
                        {wt.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-[#34216f] dark:text-stone-100">{wt.label}</p>
                        <p className="text-xs text-slate-500 dark:text-stone-400 mt-0.5">{wt.desc}</p>
                      </div>
                    </button>
                  ))}
                </div>
                {WRITING_TYPES.length > 6 && (
                  <button
                    onClick={() => setShowAllTypes(!showAllTypes)}
                    className="mt-4 flex items-center gap-1 text-xs font-medium text-[#7650a2] hover:text-[#34216f] dark:text-stone-400 dark:hover:text-stone-100 transition"
                  >
                    <ChevronDown size={12} className={`transition-transform ${showAllTypes ? 'rotate-180' : ''}`} />
                    {showAllTypes ? 'Show fewer options' : 'Show more options'}
                  </button>
                )}
                <div className="mt-6 pt-6 border-t border-[#f0eafa] dark:border-stone-800">
                  <button
                    onClick={onBlankDraft}
                    className="flex items-center gap-2 text-sm font-medium text-[#7650a2] hover:text-[#34216f] dark:text-stone-400 dark:hover:text-stone-100 transition"
                  >
                    <PenLine size={14} /> Or start with a blank draft
                  </button>
                </div>
              </div>
            )}

            {/* Step 1: Choose goal */}
            {step === 1 && (
              <div>
                <h2 className="text-sm font-semibold text-[#34216f] dark:text-stone-100 mb-1">What do you want this piece to achieve?</h2>
                <p className="text-xs text-slate-500 dark:text-stone-400 mb-4">For your {config.writingTypeLabel.toLowerCase()}</p>
                <div className="flex flex-wrap gap-2">
                  {goals.map((goal) => (
                    <button
                      key={goal}
                      onClick={() => selectGoal(goal)}
                      className={`px-4 py-2.5 rounded-xl text-sm font-medium border transition ${
                        config.goal === goal
                          ? 'bg-[#34216f] text-white border-[#34216f] dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                          : 'bg-white text-[#5b3d8d] border-[#e8e2f1] hover:border-[#7650a2] dark:bg-stone-900 dark:text-stone-300 dark:border-stone-800'
                      }`}
                    >
                      {goal}
                    </button>
                  ))}
                </div>
                <div className="mt-4">
                  <label className="block text-xs font-medium text-[#7650a2] dark:text-stone-400 mb-1.5">Or define your own goal</label>
                  <input
                    value={customGoal}
                    onChange={(e) => { setCustomGoal(e.target.value); setConfig({ ...config, goal: '' }); }}
                    placeholder="e.g. Inspire readers to take action"
                    className="w-full px-3 py-2.5 rounded-lg border border-[#e8e2f1] dark:border-stone-700 bg-[#fcfbff] dark:bg-stone-800 text-slate-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#34216f] dark:focus:ring-stone-400 transition"
                  />
                </div>
                <StepNav onBack={back} onNext={next} nextLabel="Continue" canContinue={canContinue()} />
              </div>
            )}

            {/* Step 2: Describe idea */}
            {step === 2 && (
              <div>
                <h2 className="text-sm font-semibold text-[#34216f] dark:text-stone-100 mb-1">Describe your idea</h2>
                <p className="text-xs text-slate-500 dark:text-stone-400 mb-4">
                  {typedWt ? `What topic do you want to explore, and who is it for?` : 'Tell us what you want to write about.'}
                </p>
                <textarea
                  ref={textareaRef}
                  value={config.topic}
                  onChange={(e) => setConfig({ ...config, topic: e.target.value })}
                  placeholder="e.g. The future of remote work for tech teams, focusing on async collaboration tools"
                  rows={3}
                  className="w-full resize-none px-3 py-2.5 rounded-lg border border-[#e8e2f1] dark:border-stone-700 bg-[#fcfbff] dark:bg-stone-800 text-slate-800 dark:text-stone-100 text-sm placeholder:text-slate-400 dark:placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-[#34216f] dark:focus:ring-stone-400 transition leading-relaxed"
                />
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-[#7650a2] dark:text-stone-400 mb-1.5">Working title <span className="text-slate-400">(optional)</span></label>
                    <input
                      value={config.workingTitle}
                      onChange={(e) => setConfig({ ...config, workingTitle: e.target.value })}
                      placeholder="A working title for your piece"
                      className="w-full px-3 py-2 rounded-lg border border-[#e8e2f1] dark:border-stone-700 bg-[#fcfbff] dark:bg-stone-800 text-slate-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#34216f] dark:focus:ring-stone-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#7650a2] dark:text-stone-400 mb-1.5">Target audience <span className="text-slate-400">(optional)</span></label>
                    <input
                      value={config.targetAudience}
                      onChange={(e) => setConfig({ ...config, targetAudience: e.target.value })}
                      placeholder="e.g. Engineering managers, startup founders"
                      className="w-full px-3 py-2 rounded-lg border border-[#e8e2f1] dark:border-stone-700 bg-[#fcfbff] dark:bg-stone-800 text-slate-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#34216f] dark:focus:ring-stone-400 transition"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-[#7650a2] dark:text-stone-400 mb-1.5">Key points to cover <span className="text-slate-400">(optional)</span></label>
                    <input
                      value={config.keyPoints}
                      onChange={(e) => setConfig({ ...config, keyPoints: e.target.value })}
                      placeholder="Comma-separated points you want included"
                      className="w-full px-3 py-2 rounded-lg border border-[#e8e2f1] dark:border-stone-700 bg-[#fcfbff] dark:bg-stone-800 text-slate-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#34216f] dark:focus:ring-stone-400 transition"
                    />
                  </div>
                </div>
                <StepNav onBack={back} onNext={next} nextLabel="Continue" canContinue={canContinue()} />
              </div>
            )}

            {/* Step 3: Refine */}
            {step === 3 && (
              <div>
                <h2 className="text-sm font-semibold text-[#34216f] dark:text-stone-100 mb-4">Refine your writing direction</h2>
                <p className="text-xs text-slate-500 dark:text-stone-400 mb-4">All fields are optional — skip to continue.</p>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-[#7650a2] dark:text-stone-400 mb-1.5">Tone</label>
                    <div className="flex flex-wrap gap-2">
                      {TONES.map((tone) => (
                        <button
                          key={tone}
                          onClick={() => setConfig({ ...config, tone: config.tone === tone ? '' : tone })}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium border transition ${
                            config.tone === tone
                              ? 'bg-[#34216f] text-white border-[#34216f] dark:bg-stone-100 dark:text-stone-900 dark:border-stone-100'
                              : 'bg-white text-[#5b3d8d] border-[#e8e2f1] hover:border-[#7650a2] dark:bg-stone-900 dark:text-stone-300 dark:border-stone-800'
                          }`}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-[#7650a2] dark:text-stone-400 mb-1.5">Length</label>
                      <select
                        value={config.length}
                        onChange={(e) => setConfig({ ...config, length: e.target.value })}
                        className="w-full appearance-none px-3 py-2 rounded-lg border border-[#e8e2f1] dark:border-stone-700 bg-[#fcfbff] dark:bg-stone-800 text-slate-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#34216f] dark:focus:ring-stone-400 transition"
                      >
                        <option value="">Default</option>
                        {LENGTHS.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#7650a2] dark:text-stone-400 mb-1.5">Language</label>
                      <select
                        value={config.language}
                        onChange={(e) => setConfig({ ...config, language: e.target.value })}
                        className="w-full appearance-none px-3 py-2 rounded-lg border border-[#e8e2f1] dark:border-stone-700 bg-[#fcfbff] dark:bg-stone-800 text-slate-800 dark:text-stone-100 text-sm focus:outline-none focus:ring-2 focus:ring-[#34216f] dark:focus:ring-stone-400 transition"
                      >
                        {LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    </div>
                  </div>
                </div>
                <StepNav onBack={back} onNext={next} nextLabel="Review" canContinue={true} />
              </div>
            )}

            {/* Step 4: Review */}
            {step === 4 && (
              <div>
                <h2 className="text-sm font-semibold text-[#34216f] dark:text-stone-100 mb-4">Review and continue</h2>
                <div className="space-y-2.5">
                  <ReviewRow icon={<BookOpen size={13} />} label="Type" value={config.writingTypeLabel} onEdit={() => setStep(0)} />
                  <ReviewRow icon={<Check size={13} />} label="Goal" value={config.goal || customGoal} onEdit={() => setStep(1)} />
                  <ReviewRow icon={<PenLine size={13} />} label="Topic" value={config.topic} onEdit={() => setStep(2)} />
                  {config.workingTitle && <ReviewRow icon={<FileText size={13} />} label="Title" value={config.workingTitle} onEdit={() => setStep(2)} />}
                  {config.targetAudience && <ReviewRow icon={<UsersIcon size={13} />} label="Audience" value={config.targetAudience} onEdit={() => setStep(2)} />}
                  {config.tone && <ReviewRow icon={<Wand2 size={13} />} label="Tone" value={config.tone} onEdit={() => setStep(3)} />}
                  {config.length && <ReviewRow icon={<AlignLeft size={13} />} label="Length" value={config.length} onEdit={() => setStep(3)} />}
                  {config.language !== 'English' && <ReviewRow icon={<Globe size={13} />} label="Language" value={config.language} onEdit={() => setStep(3)} />}
                </div>

                <div className="mt-6 pt-6 border-t border-[#f0eafa] dark:border-stone-800 space-y-2.5">
                  <button
                    onClick={() => onOpenEditor(config, true)}
                    className="w-full flex items-center justify-center gap-2 bg-[#34216f] hover:bg-[#4e348d] text-white text-sm font-semibold py-3 rounded-xl transition hover:scale-[1.01] active:scale-[0.99]"
                  >
                    <Sparkles size={14} /> Generate draft and open editor
                  </button>
                  <button
                    onClick={() => onOpenEditor(config, false)}
                    className="w-full flex items-center justify-center gap-2 border border-[#e8e2f1] dark:border-stone-700 text-[#34216f] dark:text-stone-100 text-sm font-semibold py-3 rounded-xl hover:bg-[#f5edf9] dark:hover:bg-stone-800 transition"
                  >
                    <PenLine size={14} /> Open editor (no generation)
                  </button>
                  <button
                    onClick={onBlankDraft}
                    className="w-full flex items-center justify-center gap-2 text-[#7650a2] dark:text-stone-400 text-sm font-medium py-2 hover:text-[#34216f] dark:hover:text-stone-100 transition"
                  >
                    Start with a blank draft
                  </button>
                </div>
                <button
                  onClick={back}
                  className="mt-3 flex items-center gap-1 text-xs text-[#b07aa2] dark:text-stone-500 hover:text-[#34216f] dark:hover:text-stone-100 transition mx-auto"
                >
                  <ArrowLeft size={12} /> Go back
                </button>
              </div>
            )}
          </div>

          {/* Bottom nav for non-review steps */}
          {step < 4 && step > 0 && null}
        </div>
      </div>
    </div>
  );
}

function StepNav({ onBack, onNext, nextLabel, canContinue }: { onBack: () => void; onNext: () => void; nextLabel: string; canContinue: boolean }) {
  return (
    <div className="flex items-center justify-between mt-6 pt-6 border-t border-[#f0eafa] dark:border-stone-800">
      <button
        onClick={onBack}
        className="flex items-center gap-1.5 text-sm font-medium text-[#7650a2] dark:text-stone-400 hover:text-[#34216f] dark:hover:text-stone-100 transition"
      >
        <ArrowLeft size={14} /> Back
      </button>
      <button
        onClick={onNext}
        disabled={!canContinue}
        className="flex items-center gap-2 bg-[#34216f] hover:bg-[#4e348d] text-white text-sm font-semibold px-5 py-2.5 rounded-xl transition disabled:opacity-40 disabled:cursor-not-allowed"
      >
        {nextLabel} <ArrowRight size={14} />
      </button>
    </div>
  );
}

function ReviewRow({ icon, label, value, onEdit }: { icon: React.ReactNode; label: string; value: string; onEdit: () => void }) {
  return (
    <button
      onClick={onEdit}
      className="flex items-center justify-between w-full py-2.5 px-3 rounded-lg hover:bg-[#f5edf9] dark:hover:bg-stone-800 transition text-left"
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="text-[#b07aa2] dark:text-stone-500 flex-shrink-0">{icon}</span>
        <span className="text-xs font-medium text-[#7650a2] dark:text-stone-400 flex-shrink-0">{label}:</span>
        <span className="text-sm text-[#34216f] dark:text-stone-100 truncate">{value}</span>
      </div>
      <span className="text-xs text-[#b07aa2] dark:text-stone-500 flex-shrink-0 ml-2">Edit</span>
    </button>
  );
}
