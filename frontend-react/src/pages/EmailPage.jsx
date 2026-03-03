import { useState } from 'react'
import { Mail, Wand2, Copy, Check, ChevronDown } from 'lucide-react'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import SourceCard from '../components/SourceCard'
import Spinner from '../components/Spinner'
import { draftEmail } from '../utils/api'

const TONES = ['professional', 'friendly', 'formal']
const PURPOSES = [
  'Q3 quarterly review',
  'Annual portfolio review',
  'Risk alert notification',
  'Rebalancing recommendation',
  'New investment opportunity',
  'Welcome / onboarding',
]

export default function EmailPage() {
  const [form, setForm] = useState({ clientName: '', purpose: '', tone: 'professional', context: '' })
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [copied, setCopied] = useState(false)

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }))

  const handleSubmit = async () => {
    if (!form.clientName.trim()) return toast.error('Client name required.')
    if (!form.purpose.trim()) return toast.error('Email purpose required.')
    setLoading(true)
    setResult(null)
    try {
      const { data } = await draftEmail({
        client_name: form.clientName,
        email_purpose: form.purpose,
        tone: form.tone,
        additional_context: form.context || undefined,
      })
      setResult(data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Request failed.')
    } finally {
      setLoading(false)
    }
  }

  const copyEmail = () => {
    if (!result) return
    navigator.clipboard.writeText(`Subject: ${result.subject}\n\n${result.body}`)
    toast.success('Copied to clipboard!')
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div>
      <PageHeader
        icon={Mail}
        title="Draft Client Email"
        subtitle="Generate professional, compliant client communications grounded in their portfolio data."
      />

      <div className="card p-5 mb-6">
        {/* Quick purpose chips */}
        <div className="mb-4">
          <label className="label">Quick select purpose</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {PURPOSES.map(p => (
              <button
                key={p}
                onClick={() => set('purpose', p)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all duration-150 ${
                  form.purpose === p
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-[#0d1017] border-[#1f2a3c] text-slate-500 hover:border-slate-600'
                }`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="label">Client Name *</label>
            <input value={form.clientName} onChange={e => set('clientName', e.target.value)} placeholder="John Smith" className="input" />
          </div>
          <div>
            <label className="label">Tone</label>
            <div className="relative">
              <select value={form.tone} onChange={e => set('tone', e.target.value)} className="input appearance-none pr-9">
                {TONES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-3 text-slate-500 pointer-events-none" />
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="label">Email Purpose *</label>
          <input
            value={form.purpose}
            onChange={e => set('purpose', e.target.value)}
            placeholder="e.g. Q3 quarterly portfolio review"
            className="input"
          />
        </div>

        <div className="mb-5">
          <label className="label">Additional Context <span className="normal-case text-slate-600 font-normal">(optional)</span></label>
          <textarea
            value={form.context}
            onChange={e => set('context', e.target.value)}
            placeholder="Mention specific concerns, recent market events, or talking points to include…"
            rows={2}
            className="input resize-none"
          />
        </div>

        <button onClick={handleSubmit} disabled={loading} className="btn-primary">
          {loading ? <Spinner size="sm" /> : <Wand2 size={14} />}
          {loading ? 'Drafting…' : 'Draft Email'}
        </button>
      </div>

      {result && (
        <div className="animate-fade-up space-y-5">
          <div className="card overflow-hidden">
            {/* Email header */}
            <div className="px-5 py-3.5 border-b border-[#1f2a3c] bg-[#111827] flex items-center justify-between">
              <div>
                <p className="text-[10px] text-slate-600 uppercase tracking-wider">Subject</p>
                <p className="text-sm text-slate-200 mt-0.5 font-medium">{result.subject}</p>
              </div>
              <button onClick={copyEmail} className="btn-ghost text-xs py-1.5">
                {copied ? <Check size={13} className="text-emerald-400" /> : <Copy size={13} />}
                {copied ? 'Copied' : 'Copy all'}
              </button>
            </div>

            {/* Email body */}
            <div className="p-6">
              <pre className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed font-body">
                {result.body}
              </pre>
            </div>
          </div>

          <div>
            <h3 className="text-xs text-slate-600 uppercase tracking-wider mb-3">
              Sources ({result.sources.length})
            </h3>
            <div className="grid grid-cols-1 gap-2.5">
              {result.sources.map((src, i) => (
                <SourceCard key={i} source={src} index={i} />
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
