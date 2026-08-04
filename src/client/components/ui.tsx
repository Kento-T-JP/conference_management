/* eslint-disable react-refresh/only-export-components -- shared display formatter belongs with the UI primitives */
import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { ja } from 'date-fns/locale';
import { deadlineLabel } from '../../shared/date';

export function PageHeader({ eyebrow, title, description, action }: { eyebrow?: string; title: string; description?: string; action?: ReactNode }) {
  return <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div>{eyebrow && <p className="mb-1 text-xs font-black uppercase tracking-[.18em] text-forest-700">{eyebrow}</p>}<h1 className="text-2xl font-black tracking-tight text-forest-950 sm:text-3xl">{title}</h1>{description && <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">{description}</p>}</div>{action}</div>;
}

export function StatusBadge({ value }: { value: string }) {
  const style = value === '公式' ? 'bg-emerald-100 text-emerald-800' : value === '未確認' ? 'bg-slate-200 text-slate-700' : value === '予測' ? 'bg-violet-100 text-violet-800' : 'bg-amber-100 text-amber-800';
  return <span className={`chip ${style}`}>{value}</span>;
}

export function DeadlineBadge({ date, aoe, hasTime }: { date: string; aoe?: boolean; hasTime?: boolean }) {
  const label = deadlineLabel(date, new Date(), aoe, hasTime);
  const urgent = !label.includes('あと') || Number(label.replace(/\D/g, '')) <= 7;
  return <span className={`chip ${label === '締切済み' ? 'bg-slate-100 text-slate-500' : urgent ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-900'}`}>{label}</span>;
}

export function EmptyState({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return <div className="surface px-6 py-12 text-center"><div className="mx-auto mb-4 grid size-11 place-items-center rounded-full bg-forest-50 text-xl text-forest-800">○</div><h2 className="font-black text-forest-950">{title}</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{body}</p>{action && <div className="mt-5">{action}</div>}</div>;
}

export function Loading() { return <div className="surface animate-pulse p-8 text-sm text-slate-500">情報を読み込んでいます…</div>; }

export function ErrorState({ message, retry }: { message: string; retry?: () => void }) { return <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800"><strong>読み込みに失敗しました。</strong><p className="mt-1">{message}</p>{retry && <button className="mt-3 font-bold underline" onClick={retry}>再試行</button>}</div>; }

export function formatDate(value?: string | null, includeTime = false) {
  if (!value) return '未定';
  const date = new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : format(date, includeTime ? 'yyyy年M月d日 HH:mm' : 'yyyy年M月d日', { locale: ja });
}

export function ConferenceLink({ id, acronym, name }: { id: number; acronym?: string; name: string }) {
  return <Link to={`/conferences/${id}`} className="font-black text-forest-900 hover:underline">{acronym && <span className="mr-2">{acronym}</span>}<span className="font-medium text-slate-600">{name}</span></Link>;
}

export function FieldError({ value }: { value?: string }) { return value ? <p className="mt-1 text-xs font-semibold text-red-700">{value}</p> : null; }
