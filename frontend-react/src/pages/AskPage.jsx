import { useState } from 'react'
import { MessageSquare, Send, Zap } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import toast from 'react-hot-toast'
import PageHeader from '../components/PageHeader'
import SourceCard from '../components/SourceCard'
import Spinner from '../components/Spinner'
import { askAdvisor } from '../utils/api'

const EXAMPLE_QUESTIONS = [
  "What is the current asset allocation for this client?",
  "What are the main risk factors in the portfolio?",
  "Summarize the recent performance metrics.",
  "What fixed income positions does the client hold?",
]

export default function AskPage() {
  const [question, setQuestion] = useState('')
  const [clientName, setClientName] = useState('')
  const [topK, setTopK] = useState(5)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)

  const handleSubmit = async () => {
    if (!question.trim()) return toast.error('Please enter a question.')
    setLoading(true)
    setResult(null)
    try {
      const { data } = await askAdvisor({
        question,
        client_name: clientName || undefined,
        top_k: topK,
      })
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
        icon={MessageSquare}
        title="Ask the Advisor AI"
        subtitle="Ask any question about client portfolios. Claude retrieves relevant context from indexed documents."
      />

      {/* Example prompts */}
      <div className="flex flex-wrap gap-2 mb-5">
        {EXAMPLE_QUESTIONS.map(q => (
          <button
            key={q}
            onClick={() => setQuestion(q)}
            className="text-xs text-slate-500 hover:text-emerald-400 border border-[#1f2a3c] hover:border-emerald-500/30
                       bg-[#161d2a] hover:bg-emerald-500/5 px-3 py-1.5 rounded-full transition-all duration-150"
          >
            {q}
          </button>
        ))}
      </div>

      {/* Form */}
      <div className="card p-5 mb-6">
        <div className="mb-4">
          <label className="label">Your Question</label>
          <textarea
            value={question}
            onChange={e => setQuestion(e.target.value)}
            placeholder="What is the client's equity allocation and how has it changed over the last quarter?"
            rows={3}
            className="input resize-none"
            onKeyDown={e => {
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit()
            }}
          />
          <p className="text-[11px] text-slate-600 mt-1.5">⌘ + Enter to submit</p>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-5">
          <div>
            <label className="label">Filter by Client</label>
            <input
              value={clientName}
              onChange={e => setClientName(e.target.value)}
              placeholder="e.g. John Smith (optional)"
              className="input"
            />
          </div>
          <div>
            <label className="label">Sources to Retrieve ({topK})</label>
            <input
              type="range"
              min={3}
              max={10}
              value={topK}
              onChange={e => setTopK(+e.target.value)}
              className="w-full mt-2 accent-emerald-500"
            />
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="btn-primary"
        >
          {loading ? <Spinner size="sm" /> : <Send size={14} />}
          {loading ? 'Querying Claude…' : 'Get Answer'}
        </button>
      </div>

      {/* Result */}
      {result && (
        <div className="animate-fade-up space-y-5">
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Zap size={14} className="text-emerald-400" />
                <span className="text-xs font-medium text-emerald-400 uppercase tracking-wider">Answer</span>
              </div>
              {result.tokens_used && (
                <span className="text-[11px] text-slate-600 font-mono">{result.tokens_used} tokens</span>
              )}
            </div>
            <div className="prose-fin">
              <ReactMarkdown>{result.answer}</ReactMarkdown>
            </div>
          </div>

          <div>
            <h3 className="text-xs text-slate-600 uppercase tracking-wider mb-3">
              Retrieved Sources ({result.sources.length})
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
