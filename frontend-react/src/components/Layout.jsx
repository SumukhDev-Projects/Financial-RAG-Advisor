import { NavLink } from 'react-router-dom'
import { useState, useEffect } from 'react'
import {
  MessageSquare, FileText, BarChart3, Mail,
  ShieldCheck, TrendingUp, Circle
} from 'lucide-react'
import { getHealth } from '../utils/api'
import clsx from 'clsx'

const NAV = [
  { path: '/ask',       icon: MessageSquare, label: 'Ask Advisor' },
  { path: '/documents', icon: FileText,       label: 'Documents' },
  { path: '/summary',   icon: BarChart3,      label: 'Portfolio Summary' },
  { path: '/email',     icon: Mail,           label: 'Draft Email' },
  { path: '/audit',     icon: ShieldCheck,    label: 'Audit Log' },
]

export default function Layout({ children }) {
  const [status, setStatus] = useState(null)

  useEffect(() => {
    getHealth()
      .then(r => setStatus(r.data))
      .catch(() => setStatus(null))
    const t = setInterval(() => {
      getHealth().then(r => setStatus(r.data)).catch(() => setStatus(null))
    }, 30000)
    return () => clearInterval(t)
  }, [])

  return (
    <div className="flex h-screen overflow-hidden bg-[#0d1017]">
      {/* ── Sidebar ── */}
      <aside className="w-60 flex-shrink-0 flex flex-col bg-[#0d1017] border-r border-[#1f2a3c]">
        {/* Logo */}
        <div className="px-6 pt-7 pb-6 border-b border-[#1f2a3c]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
              <TrendingUp size={16} className="text-emerald-400" />
            </div>
            <div>
              <p className="font-display text-white text-lg leading-none italic">FinRAG</p>
              <p className="text-[10px] text-slate-600 tracking-widest uppercase mt-0.5">Advisor AI</p>
            </div>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(({ path, icon: Icon, label }) => (
            <NavLink
              key={path}
              to={path}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-150',
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'text-slate-500 hover:text-slate-300 hover:bg-white/4'
                )
              }
            >
              <Icon size={15} />
              {label}
            </NavLink>
          ))}
        </nav>

        {/* Status */}
        <div className="px-4 py-4 border-t border-[#1f2a3c]">
          <div className="flex items-center gap-2">
            <Circle
              size={7}
              className={status?.status === 'ok' ? 'fill-emerald-500 text-emerald-500' : 'fill-red-500 text-red-500'}
            />
            <span className="text-xs text-slate-600">
              {status?.status === 'ok'
                ? `API connected · DB ${status.database}`
                : 'Backend offline'}
            </span>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-8">
          {children}
        </div>
      </main>
    </div>
  )
}
