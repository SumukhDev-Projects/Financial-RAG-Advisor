import { useState } from 'react'
import { BarChart3, Play, ChevronDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import SourceCard from '../components/SourceCard'
import Spinner from '../components/Spinner'
import { summarizePortfolio } from '../utils/api'

const FOCUS_OPTIONS = ['portfolio', 'risk', 'performance', 'allocation', 'fees', 'compliance']

export default function SummaryPage() {
  const [clientName, setClientName] = useState('')
  const [focus, setFocus] = useState(['portfolio', 'risk', 'performance'])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const toggleFocus = (f) =>
    setFocus(prev => prev.includes(f) ? prev.filter(x => x !== f) : [...prev, f])

  const handleSubmit = async () => {
    if (!clientName.trim()) return toast.error('Client name is required.')
    setLoading(true)
    setResult(null)
    try {
      const { data } = await summarizePortfolio({ client_name: clientName, focus_areas: focus })
      setResult(data)
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Request failed.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <PageHeader
        icon={BarChart3}
        title="Portfolio Summary"
        subtitle="Generate a structured summary with risk assessment and key metrics from client documents."
      />

      <div className="card p-5 mb-6">
        <div className="mb-4">
          <label className="label">Client Name *</label>
          <input
            value={clientName}
            onChange={e => setClientName(e.target.value)}
            placeholder="John Smith"
            className="input"
          />
        </div>

        <div className="mb-5">
          <label className="label">Focus Areas</label>
          <div className="flex flex-wrap gap-2 mt-1">
            {FOCUS_OPTIONS.map(f => (
              <button
                key={f}
                onClick={() => toggleFocus(f)}
                className={`px-3 py-1.5 rounded-full text-xs border transition-all duration-150 ${
                  focus.includes(f)
                    ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-400'
                    : 'bg-[#0d1017] border-[#1f2a3c] text-slate-500 hover:border-slate-600'
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} className="btn-primary">
          {loading ? <Spinner size="sm" /> : <Play size={14} />}
          {loading ? 'Generating…' : 'Generate Summary'}
        </button>
      </div>

      {result && (
        <div className="animate-fade-up space-y-5">
          {/* Tabs */}
          <div className="card p-0 overflow-hidden">
            <Tab result={result} />
          </div>

          {result.key_metrics?.length > 0 && (
            <div className="card p-5">
              <h3 className="text-xs text-slate-500 uppercase tracking-wider mb-3">Key Metrics</h3>
              <div className="flex flex-wrap gap-2">
                {result.key_metrics.map((m, i) => (
                  <span key={i} className="source-pill">
                    {m}
                  </span>
                ))}
              </div>
            </div>
          )}

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

function Tab({ result }) {
  const [active, setActive] = useState('summary')
  const tabs = [
    { id: 'summary', label: 'Summary' },
    { id: 'risk', label: 'Risk Assessment' },
  ]

  return (
    <div>
      <div className="flex border-b border-[#1f2a3c]">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setActive(t.id)}
            className={`px-5 py-3 text-xs font-medium uppercase tracking-wider transition-colors duration-150 ${
              active === t.id
                ? 'text-emerald-400 border-b border-emerald-500'
                : 'text-slate-500 hover:text-slate-300'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      <div className="p-6 prose-fin">
        <ReactMarkdown>
          {active === 'summary' ? result.summary : result.risk_notes}
        </ReactMarkdown>
      </div>
    </div>
  )
}
