import { useState, useEffect } from 'react'
import { ShieldCheck, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react'
import PageHeader from '../components/PageHeader'
import Spinner from '../components/Spinner'
import api from '../utils/api'
import toast from 'react-hot-toast'

const ACTION_COLORS = {
  ask: 'text-blue-400 bg-blue-400/10 border-blue-400/20',
  summarize: 'text-purple-400 bg-purple-400/10 border-purple-400/20',
  draft_email: 'text-amber-400 bg-amber-400/10 border-amber-400/20',
}

export default function AuditPage() {
  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [expanded, setExpanded] = useState(null)

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const { data } = await api.get('/api/advisor/audit-logs')
      setLogs(data)
    } catch (e) {
      // Endpoint may not be wired yet — show placeholder
      setLogs([])
      toast.error('Audit log endpoint not available yet.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchLogs() }, [])

  return (
    <div>
      <PageHeader
        icon={ShieldCheck}
        title="Audit Log"
        subtitle="Complete record of all advisor queries, retrieved sources, and Claude responses."
      />

      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-slate-500">{logs.length} entries</p>
        <button onClick={fetchLogs} className="btn-ghost text-xs">
          <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
          Refresh
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Spinner size="lg" /></div>
      ) : logs.length === 0 ? (
        <div className="card p-16 text-center">
          <ShieldCheck size={32} className="text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No audit entries yet.</p>
          <p className="text-slate-600 text-xs mt-1">Each query to the advisor is automatically logged here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {logs.map(log => (
            <div key={log.id} className="card overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                className="w-full px-4 py-3.5 flex items-center justify-between text-left hover:bg-white/2 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border uppercase tracking-wider ${ACTION_COLORS[log.action] || 'text-slate-400 bg-slate-400/10 border-slate-400/20'}`}>
                    {log.action}
                  </span>
                  <span className="text-sm text-slate-300 truncate max-w-md">{log.prompt}</span>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-[11px] text-slate-600 font-mono">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                  {expanded === log.id
                    ? <ChevronDown size={14} className="text-slate-500" />
                    : <ChevronRight size={14} className="text-slate-500" />
                  }
                </div>
              </button>

              {expanded === log.id && (
                <div className="border-t border-[#1f2a3c] px-4 py-4 space-y-3">
                  <div>
                    <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5">Response</p>
                    <p className="text-sm text-slate-400 leading-relaxed whitespace-pre-wrap">{log.response}</p>
                  </div>
                  <div className="flex gap-4 text-[11px] text-slate-600 font-mono">
                    <span>Model: {log.model_used}</span>
                    {log.tokens_used && <span>Tokens: {log.tokens_used}</span>}
                    {log.advisor_id && <span>Advisor: {log.advisor_id}</span>}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
