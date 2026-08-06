const steps = ['学会', '開催回と締切・予定'];

export function SetupProgress({ current }: { current: 1 | 2 }) {
  return <ol className="mb-7 grid grid-cols-2 overflow-hidden rounded-[1.35rem] border border-white/80 bg-white/70 p-1.5 shadow-[0_16px_40px_-32px_rgba(16,39,31,.5)] backdrop-blur-sm" aria-label="登録手順">
    {steps.map((label, index) => {
      const step = index + 1;
      const active = step === current;
      const complete = step < current;
      return <li key={label} className={`flex items-center justify-center gap-2 rounded-2xl px-2 py-3 text-xs font-bold sm:text-sm ${active ? 'bg-forest-900 text-white shadow-sm' : complete ? 'text-forest-800' : 'text-slate-400'}`} aria-current={active ? 'step' : undefined}>
        <span className={`grid size-5 place-items-center rounded-full text-[11px] ${active ? 'bg-white text-forest-900' : complete ? 'bg-forest-700 text-white' : 'bg-slate-100'}`}>{complete ? '✓' : step}</span>
        {label}
      </li>;
    })}
  </ol>;
}
