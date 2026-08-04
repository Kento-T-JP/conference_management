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
    <div className="min-h-screen bg-[#f7f8f5]">
      <header className="sticky top-0 z-40 border-b border-forest-800 bg-forest-950 text-white shadow-sm">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <NavLink to="/" className="flex items-center gap-3" onClick={() => setOpen(false)}>
            <span className="grid size-9 place-items-center rounded-xl bg-amber-500 font-black text-forest-950">C</span>
            <span className="text-sm font-black tracking-wide">学会管理</span>
          </NavLink>
          <button className="rounded-lg border border-white/20 px-3 py-2 text-sm sm:hidden" onClick={() => setOpen(!open)} aria-expanded={open} aria-label="メニューを開く">メニュー</button>
          <nav className="hidden items-center gap-1 sm:flex" aria-label="メインナビゲーション">
            {nav.map(([to, label]) => <NavItem key={to} to={to} label={label} />)}
            <NavLink to="/conferences/new" className="ml-3 rounded-xl bg-amber-500 px-4 py-2 text-sm font-black text-forest-950 hover:bg-amber-400">＋ 学会を追加</NavLink>
          </nav>
        </div>
        {open && <nav className="border-t border-white/10 px-4 pb-4 sm:hidden">{nav.map(([to, label]) => <NavItem key={to} to={to} label={label} mobile onClick={() => setOpen(false)} />)}<NavLink to="/conferences/new" onClick={() => setOpen(false)} className="mt-2 block rounded-xl bg-amber-500 px-4 py-3 text-center text-sm font-black text-forest-950">＋ 学会を追加</NavLink></nav>}
      </header>
      <main className="mx-auto max-w-7xl px-4 py-7 sm:px-6 sm:py-10"><Outlet /></main>
      <footer className="mx-auto max-w-7xl border-t border-slate-200 px-4 py-6 text-xs text-slate-500 sm:px-6">学会情報と締切を管理します。</footer>
    </div>
  );
}

function NavItem({ to, label, mobile, onClick }: { to: string; label: string; mobile?: boolean; onClick?: () => void }) {
  return <NavLink to={to} end={to === '/'} onClick={onClick} className={({ isActive }) => `${mobile ? 'block px-3 py-3' : 'rounded-lg px-3 py-2'} text-sm font-bold transition ${isActive ? 'bg-white/15 text-white' : 'text-forest-100 hover:bg-white/10 hover:text-white'}`}>{label}</NavLink>;
}
