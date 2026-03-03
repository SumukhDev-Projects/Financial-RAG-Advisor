export default function PageHeader({ icon: Icon, title, subtitle }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
          <Icon size={17} className="text-emerald-400" />
        </div>
        <h1 className="font-display text-3xl text-white italic">{title}</h1>
      </div>
      {subtitle && <p className="text-sm text-slate-500 ml-12">{subtitle}</p>}
    </div>
  )
}
