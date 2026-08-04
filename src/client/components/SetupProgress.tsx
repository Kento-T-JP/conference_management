const steps = ['学会', '開催回', '締切'];

export function SetupProgress({ current }: { current: 1 | 2 | 3 }) {
  return <ol className="mb-6 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-white" aria-label="登録手順">
    {steps.map((label, index) => {
      const step = index + 1;
      const active = step === current;
      const complete = step < current;
      return <li key={label} className={`flex items-center justify-center gap-2 border-r border-slate-200 px-2 py-3 text-xs font-bold last:border-r-0 sm:text-sm ${active ? 'bg-forest-900 text-white' : complete ? 'bg-forest-50 text-forest-800' : 'text-slate-400'}`} aria-current={active ? 'step' : undefined}>
        <span className={`grid size-5 place-items-center rounded-full text-[11px] ${active ? 'bg-white text-forest-900' : complete ? 'bg-forest-700 text-white' : 'bg-slate-100'}`}>{complete ? '✓' : step}</span>
        {label}
      </li>;
    })}
  </ol>;
}
