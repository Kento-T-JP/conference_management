import { NavLink, Outlet } from 'react-router-dom';
import { useState } from 'react';

const nav = [
  ['/', 'ダッシュボード'],
  ['/conferences', '学会'],
  ['/editions', '開催回'],
  ['/calendar', 'カレンダー']
] as const;

export function Layout() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-white/70 bg-[#f3f0e9]/85 text-forest-950 shadow-[0_8px_35px_-28px_rgba(16,39,31,.65)] backdrop-blur-xl">
        <div className="mx-auto flex h-[4.5rem] max-w-[88rem] items-center justify-between px-4 sm:px-7">
          <NavLink to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="grid size-10 rotate-[-3deg] place-items-center rounded-[.9rem] bg-forest-950 text-lg font-black text-white shadow-[0_8px_20px_-12px_rgba(16,39,31,.9)]">学</span>
            <span><span className="block text-[.95rem] font-black tracking-[-.02em]">学会管理</span><span className="block text-[.6rem] font-bold uppercase tracking-[.18em] text-forest-700">Conference desk</span></span>
          </NavLink>
          <button className="rounded-full border border-forest-900/15 bg-white/60 px-4 py-2 text-xs font-black sm:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="メニューを開く">メニュー</button>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="メインナビゲーション">
            {nav.map(([to, label]) => <NavItem key={to} to={to} label={label} />)}
            <NavLink to="/conferences/new" className="btn-primary ml-3 min-h-10 px-4">＋ 新規登録</NavLink>
          </nav>
        </div>
        {open && <nav className="border-t border-forest-900/10 bg-[#f3f0e9]/95 px-4 pb-4 sm:hidden">{nav.map(([to, label]) => <NavItem key={to} to={to} label={label} mobile onClick={() => setOpen(false)} />)}<NavLink to="/conferences/new" onClick={() => setOpen(false)} className="btn-primary mt-2 w-full">＋ 新規登録</NavLink></nav>}
      </header>
      <main className="mx-auto max-w-[88rem] px-4 py-7 sm:px-7 sm:py-11"><Outlet /></main>
      <footer className="mx-auto mt-8 flex max-w-[88rem] items-center justify-between border-t border-forest-900/10 px-4 py-8 text-[.68rem] font-bold uppercase tracking-[.14em] text-slate-500 sm:px-7"><span>Conference desk</span><span>学会情報と締切を管理</span></footer>
    </div>
  );
}

function NavItem({ to, label, mobile, onClick }: { to: string; label: string; mobile?: boolean; onClick?: () => void }) {
  return <NavLink to={to} end={to === '/'} onClick={onClick} className={({ isActive }) => `${mobile ? 'block px-3 py-3' : 'rounded-full px-3.5 py-2'} text-sm font-bold transition ${isActive ? 'bg-forest-950 text-white shadow-sm' : 'text-forest-900/65 hover:bg-white/70 hover:text-forest-950'}`}>{label}</NavLink>;
}
