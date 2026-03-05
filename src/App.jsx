import React, { useState, useEffect } from 'react';
import {
  Mail,
  CheckCircle,
  Briefcase,
  Zap,
  Copy,
  RefreshCw,
  ChevronRight,
  Users,
  AlertTriangle,
  Sparkles,
  Crown,
  X,
  Settings,
  ArrowRight,
  Info,
  Target,
  MessageSquare
} from 'lucide-react';

// --- CONFIGURATION ---

const TONES = [
  {
    id: 'manager',
    label: 'Manager',
    icon: '👔',
    desc: 'Direct, authoritative, yet supportive.',
    color: 'bg-blue-50 border-blue-200 text-blue-700',
    relatedGoal: 'leadership'
  },
  {
    id: 'support',
    label: 'Support',
    icon: '🎧',
    desc: 'Empathetic, clear, and solution-oriented.',
    color: 'bg-purple-50 border-purple-200 text-purple-700',
    relatedGoal: 'clarity'
  },
  {
    id: 'sales',
    label: 'Sales',
    icon: '📈',
    desc: 'Persuasive, energetic, and action-driven.',
    color: 'bg-green-50 border-green-200 text-green-700',
    relatedGoal: 'conversion'
  },
  {
    id: 'exec',
    label: 'Executive',
    icon: '🏛️',
    desc: 'Brief, strategic, and high-level.',
    color: 'bg-slate-50 border-slate-200 text-slate-700',
    relatedGoal: 'leadership'
  },
  {
    id: 'formal',
    label: 'Formal Client',
    icon: '✒️',
    desc: 'Strictly professional, structured, and polite.',
    color: 'bg-indigo-50 border-indigo-200 text-indigo-700',
    relatedGoal: 'professionalism'
  },
  {
    id: 'simple',
    label: 'Simple Client',
    icon: '👋',
    desc: 'Warm, accessible, and jargon-free.',
    color: 'bg-teal-50 border-teal-200 text-teal-700',
    relatedGoal: 'clarity'
  }
];

const TONE_LABELS = {
  manager: 'Manager',
  support: 'Support',
  sales: 'Sales',
  exec: 'Executive',
  formal: 'Formal Client',
  simple: 'Simple Client'
};

const GOALS = [
  { id: 'leadership', label: 'Improve Leadership Presence', icon: '👔' },
  { id: 'efficiency', label: 'Write Emails Faster', icon: '⚡' },
  { id: 'clarity', label: 'Avoid Misunderstandings', icon: '🗣️' },
  { id: 'conversion', label: 'Close More Deals', icon: '💰' },
  { id: 'professionalism', label: 'Sound More Professional', icon: '🎓' }
];

const SAMPLE_DRAFTS = [
  "Good morning, Jared, Quick questions regarding this replacement request: Are we approving a replacement for the following items? And are we approving an RMA for the replacement order or the original invoice? Please advise when you can so I can proceed.",
  "hey i need that report by friday or else we are gonna be in big trouble with the client",
  "sorry i missed the meeting i was stuck in traffic traffic was crazy"
];

// --- MAIN APP ---

export default function ProToneApp() {
  const [activeTab, setActiveTab] = useState('app');
  const [inputText, setInputText] = useState('');
  const [selectedTone, setSelectedTone] = useState('manager');
  const [isProcessing, setIsProcessing] = useState(false);
  const [result, setResult] = useState(null); // { rewritten, notes, tone, subject_lines, risk_flags, cta }
  const [error, setError] = useState(null);
  const [showCopySuccess, setShowCopySuccess] = useState(false);
  const [bannedPhraseWarning, setBannedPhraseWarning] = useState(null);
  const [userGoals, setUserGoals] = useState(['leadership']);
  const [showGoalsModal, setShowGoalsModal] = useState(false);

  useEffect(() => {
    const lowerText = inputText.toLowerCase();
    if (lowerText.includes('stupid') || lowerText.includes('hate') || lowerText.includes('guarantee')) {
      setBannedPhraseWarning("Contains non-compliant language.");
    } else {
      setBannedPhraseWarning(null);
    }
  }, [inputText]);

  const loadSample = () => {
    setInputText(SAMPLE_DRAFTS[0]);
    setResult(null);
    setError(null);
  };

  const handleRewrite = async () => {
    if (!inputText.trim()) return;
    setIsProcessing(true);
    setResult(null);
    setError(null);

    try {
      const response = await fetch('/api/rewrite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          draft: inputText,
          tone: TONE_LABELS[selectedTone] || selectedTone
        })
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error || `Server error ${response.status}`);
      }

      const data = await response.json();
      setResult(data);
    } catch (err) {
      setError(err.message || 'Something went wrong. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const copyToClipboard = () => {
    if (!result?.rewritten) return;
    navigator.clipboard.writeText(result.rewritten).then(() => {
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    }).catch(() => {
      // Fallback
      const textArea = document.createElement("textarea");
      textArea.value = result.rewritten;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 2000);
    });
  };

  const toggleGoal = (goalId) => {
    if (userGoals.includes(goalId)) {
      setUserGoals(userGoals.filter(g => g !== goalId));
    } else {
      setUserGoals([...userGoals, goalId]);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800 flex flex-col">

      {/* Goals Modal */}
      {showGoalsModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <div>
                <h3 className="text-xl font-bold text-slate-900">Personalize Your Assistant</h3>
                <p className="text-sm text-slate-500">What do you want to achieve with your writing?</p>
              </div>
              <button onClick={() => setShowGoalsModal(false)} className="text-slate-400 hover:text-slate-600">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 grid gap-3">
              {GOALS.map(goal => (
                <button
                  key={goal.id}
                  onClick={() => toggleGoal(goal.id)}
                  className={`flex items-center justify-between p-4 rounded-xl border transition-all ${
                    userGoals.includes(goal.id)
                      ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-blue-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-xl">{goal.icon}</span>
                    <span className="font-semibold">{goal.label}</span>
                  </div>
                  {userGoals.includes(goal.id) && <CheckCircle size={18} />}
                </button>
              ))}
            </div>
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setShowGoalsModal(false)}
                className="bg-slate-900 text-white px-6 py-2.5 rounded-xl font-bold hover:bg-slate-800 transition"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'landing' ? (
        <LandingPage onTryClick={() => setActiveTab('app')} />
      ) : (
        <EditorInterface
          inputText={inputText}
          setInputText={setInputText}
          selectedTone={selectedTone}
          setSelectedTone={setSelectedTone}
          handleRewrite={handleRewrite}
          isProcessing={isProcessing}
          result={result}
          error={error}
          copyToClipboard={copyToClipboard}
          showCopySuccess={showCopySuccess}
          loadSample={loadSample}
          bannedPhraseWarning={bannedPhraseWarning}
          userGoals={userGoals}
          openGoals={() => setShowGoalsModal(true)}
          goToLanding={() => setActiveTab('landing')}
        />
      )}
    </div>
  );
}

// --- EDITOR INTERFACE ---

function EditorInterface({
  inputText,
  setInputText,
  selectedTone,
  setSelectedTone,
  handleRewrite,
  isProcessing,
  result,
  error,
  copyToClipboard,
  showCopySuccess,
  loadSample,
  bannedPhraseWarning,
  userGoals,
  openGoals,
  goToLanding
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-white">

      {/* Left Rail */}
      <div className="w-[60px] bg-slate-50 border-r border-slate-200 flex flex-col items-center py-6 gap-6 z-20">
        <div
          onClick={goToLanding}
          className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold cursor-pointer hover:bg-blue-700 transition"
        >
          P
        </div>
        <div className="flex-1 flex flex-col gap-4 mt-4">
          <div className="p-2 rounded-lg bg-blue-100 text-blue-600 cursor-pointer">
            <Briefcase size={20} />
          </div>
          <div className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition">
            <Users size={20} />
          </div>
          <div className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer transition">
            <Settings size={20} />
          </div>
        </div>
      </div>

      {/* Center: Writing Canvas */}
      <div className="flex-1 flex flex-col relative bg-slate-50/30">
        <div className="h-16 border-b border-transparent px-8 flex items-center justify-between">
          <div className="flex items-center gap-2 text-slate-400 text-sm font-medium">
            <span>Untitled Draft</span>
            <span className="text-slate-300">•</span>
            <span>Saved just now</span>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-8 py-4 flex justify-center">
          <div className="w-full max-w-2xl mt-4 relative">
            <textarea
              className="w-full h-[70vh] bg-transparent resize-none focus:outline-none text-lg text-slate-800 leading-relaxed placeholder:text-slate-300"
              placeholder="Start writing or paste your text here..."
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              spellCheck="false"
            />
            {!inputText && (
              <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-center pointer-events-none opacity-50">
                <p className="mb-4 text-slate-400">Not sure where to start?</p>
              </div>
            )}
          </div>
        </div>

        <div className="h-12 px-8 flex items-center justify-between text-xs text-slate-400 bg-white border-t border-slate-100">
          <div className="flex gap-4">
            <span>{inputText.length} chars</span>
            <span>{inputText.split(/\s+/).filter(w => w.length > 0).length} words</span>
          </div>
          <button onClick={loadSample} className="flex items-center gap-1 hover:text-blue-600 transition">
            <Sparkles size={12} /> Load Example
          </button>
        </div>
      </div>

      {/* Right Rail: Assistant */}
      <div className="w-[420px] bg-white border-l border-slate-200 flex flex-col shadow-xl z-10">

        <div className="h-16 px-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
            <span className="font-bold text-slate-700">ProTone Assistant</span>
          </div>
          <button onClick={openGoals} className="text-xs font-bold text-blue-600 bg-blue-50 px-3 py-1 rounded-full hover:bg-blue-100 transition">
            Goals: {userGoals.length}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">

          {/* Tone Selector */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Audience & Tone
            </label>
            <div>
              <button className="w-full flex items-center justify-between p-3 bg-white border border-slate-200 rounded-xl shadow-sm text-left mb-2">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{TONES.find(t => t.id === selectedTone).icon}</span>
                  <div>
                    <div className="font-bold text-slate-800">{TONES.find(t => t.id === selectedTone).label}</div>
                    <div className="text-[10px] text-slate-500">{TONES.find(t => t.id === selectedTone).desc}</div>
                  </div>
                </div>
                <ChevronRight size={16} className="text-slate-300" />
              </button>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map(tone => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={`text-[10px] py-1.5 rounded-md font-medium transition ${selectedTone === tone.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                  >
                    {tone.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Compliance Warning */}
          {bannedPhraseWarning && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="text-amber-600 shrink-0" size={20} />
              <div>
                <h4 className="text-sm font-bold text-amber-800">Compliance Alert</h4>
                <p className="text-xs text-amber-700 mt-1">{bannedPhraseWarning}</p>
              </div>
            </div>
          )}

          {/* Rewrite Button */}
          <button
            onClick={handleRewrite}
            disabled={!inputText || isProcessing}
            className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl font-bold shadow-lg shadow-blue-200 hover:shadow-xl hover:scale-[1.02] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isProcessing ? <RefreshCw size={18} className="animate-spin" /> : <Zap size={18} className="fill-white" />}
            {result ? 'Regenerate' : 'Polish My Draft'}
          </button>

          {/* Error State */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={16} />
              <p className="text-xs text-red-700">{error}</p>
            </div>
          )}

          {/* Result Cards */}
          {result && (
            <div className="space-y-4">

              {/* Rewritten Email */}
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden ring-1 ring-black/5">
                <div className="p-3 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 flex items-center gap-1">
                    <CheckCircle size={12} className="text-green-500" /> Rewritten
                  </span>
                  <button onClick={copyToClipboard} className="text-slate-400 hover:text-blue-600 transition flex items-center gap-1 text-[10px]">
                    {showCopySuccess ? <><CheckCircle size={12} className="text-green-500" /> Copied</> : <><Copy size={12} /> Copy</>}
                  </button>
                </div>
                <div className="p-4 text-sm leading-relaxed text-slate-700 whitespace-pre-wrap">
                  {result.rewritten}
                </div>
              </div>

              {/* Risk Flags */}
              {result.risk_flags && result.risk_flags.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
                    <AlertTriangle size={12} /> Risk Flags in Original
                  </h4>
                  <ul className="space-y-1">
                    {result.risk_flags.map((flag, i) => (
                      <li key={i} className="text-xs text-amber-700 flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0">•</span> {flag}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Notes */}
              {result.notes && result.notes.length > 0 && (
                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-blue-800 mb-2 flex items-center gap-1">
                    <Info size={12} /> What Changed
                  </h4>
                  <ul className="space-y-1">
                    {result.notes.map((note, i) => (
                      <li key={i} className="text-xs text-blue-700 flex items-start gap-1.5">
                        <span className="mt-0.5 shrink-0">•</span> {note}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Subject Lines */}
              {result.subject_lines && result.subject_lines.length > 0 && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
                  <h4 className="text-xs font-bold text-slate-600 mb-2 flex items-center gap-1">
                    <Mail size={12} /> Subject Line Suggestions
                  </h4>
                  <ul className="space-y-1.5">
                    {result.subject_lines.map((line, i) => (
                      <li key={i} className="text-xs text-slate-700 bg-white border border-slate-200 rounded-lg px-3 py-1.5 font-medium">
                        {line}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* CTA */}
              {result.cta && (
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 flex gap-3">
                  <Target size={14} className="text-green-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-green-800 mb-0.5">Call to Action</h4>
                    <p className="text-xs text-green-700">{result.cta}</p>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer: Upgrade Card */}
        <div className="p-4 bg-white border-t border-slate-100">
          <TailoredUpgradeCard tone={selectedTone} />
        </div>
      </div>
    </div>
  );
}

// --- UPGRADE CARD ---

function TailoredUpgradeCard({ tone }) {
  const getUpgradeSuggestion = () => {
    switch (tone) {
      case 'manager': return { text: "Unlock Team Analytics to see if your reports are reading your emails.", feature: "View Read Rates" };
      case 'sales': return { text: "Connect Salesforce to auto-log this email interaction.", feature: "Connect CRM" };
      case 'exec': return { text: "Enable Brand Guard to ensure compliance.", feature: "Enable Guard" };
      default: return { text: "Rewrite entire threads in one click with Pro.", feature: "Bulk Edit" };
    }
  };
  const suggestion = getUpgradeSuggestion();

  return (
    <div className="bg-slate-900 rounded-xl p-3 text-white flex gap-3 group cursor-pointer hover:bg-slate-800 transition">
      <div className="shrink-0 pt-1">
        <Crown size={16} className="text-yellow-400" />
      </div>
      <div>
        <p className="text-xs text-slate-300 leading-snug mb-1">{suggestion.text}</p>
        <div className="text-[10px] font-bold text-white flex items-center gap-1 group-hover:text-yellow-300 transition-colors">
          {suggestion.feature} <ArrowRight size={10} />
        </div>
      </div>
    </div>
  );
}

// --- LANDING PAGE ---

function LandingPage({ onTryClick }) {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
      <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold uppercase tracking-wide mb-8">
        <Zap size={14} className="fill-blue-700" />
        Powered by Claude AI
      </div>
      <h1 className="text-5xl md:text-7xl font-extrabold text-slate-900 mb-6 tracking-tight">
        Write like a pro.
      </h1>
      <p className="text-xl text-slate-600 max-w-2xl mx-auto mb-10">
        The AI writing assistant that rewrites your emails in the perfect tone — with risk analysis, subject lines, and CTAs.
      </p>
      <button onClick={onTryClick} className="px-8 py-4 bg-blue-600 text-white rounded-xl font-bold text-lg hover:bg-blue-700 transition shadow-lg shadow-blue-200 flex items-center justify-center gap-2">
        Open Editor <ChevronRight size={20} />
      </button>
    </div>
  );
}
