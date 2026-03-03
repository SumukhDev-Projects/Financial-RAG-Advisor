import { FileText } from 'lucide-react'

export default function SourceCard({ source, index }) {
  const pct = Math.round(source.relevance_score * 100)
  return (
    <div className="card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center flex-shrink-0">
            <FileText size={13} className="text-emerald-400" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-medium text-slate-300 truncate">{source.filename}</p>
            <p className="text-[11px] text-slate-600 mt-0.5">Source {index + 1}</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <div className="w-16 h-1.5 bg-[#1f2a3c] rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[10px] text-emerald-400 font-mono">{pct}%</span>
        </div>
      </div>
      <p className="mt-3 text-xs text-slate-500 leading-relaxed line-clamp-3">
        {source.content_preview}
      </p>
    </div>
  )
}
