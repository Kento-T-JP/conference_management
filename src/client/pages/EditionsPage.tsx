import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ConferenceEdition } from '../../shared/types';
import { ATTENDANCE_FORMATS } from '../../shared/constants';
import { useApi } from '../hooks/useApi';
import { queryString } from '../lib/api';
import { DeadlineBadge, EmptyState, ErrorState, formatDate, Loading, PageHeader, StatusBadge } from '../components/ui';

export function EditionsPage() {
  const [filters, setFilters] = useState({ year: '', attendance_format: '', information_status: '', sort: 'deadline', include_past: false });
  const { data, loading, error, reload } = useApi<ConferenceEdition[]>(`/api/editions${queryString(filters)}`);
  return <><PageHeader title="開催回" description="年度別の開催情報と締切を確認します。" />
    <div className="surface mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-5">
      <label><span className="label">開催年</span><input className="field" inputMode="numeric" placeholder="例: 2027" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} /></label>
      <label><span className="label">開催形式</span><select className="field" value={filters.attendance_format} onChange={(e) => setFilters({ ...filters, attendance_format: e.target.value })}><option value="">すべて</option>{ATTENDANCE_FORMATS.map((v) => <option key={v}>{v}</option>)}</select></label>
      <label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" className="size-4 accent-[#2c6652]" checked={filters.information_status === '公式'} onChange={(e) => setFilters({ ...filters, information_status: e.target.checked ? '公式' : '' })} /> 公式サイトで確認済みのみ</label>
      <label><span className="label">並べ替え</span><select className="field" value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}><option value="deadline">締切が近い順</option><option value="start_date">開催日が近い順</option></select></label>
      <label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" className="size-4" checked={filters.include_past} onChange={(e) => setFilters({ ...filters, include_past: e.target.checked })} /> 締切済みも表示</label>
    </div>
    {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <EmptyState title="表示できる開催回がありません" body="学会一覧から年度別開催情報を追加してください。" href="/conferences" linkLabel="学会一覧を開く" /> : <div className="surface overflow-hidden"><div className="hidden grid-cols-[1.25fr_.65fr_.9fr_.9fr_.6fr_auto] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-black text-slate-500 md:grid"><span>学会</span><span>開催</span><span>次回締切</span><span>開催期間</span><span>状態</span><span>操作</span></div>{data.map((item) => <div key={item.id} className="grid gap-3 border-b border-slate-100 p-5 last:border-0 hover:bg-forest-50 md:grid-cols-[1.25fr_.65fr_.9fr_.9fr_.6fr_auto] md:items-center">
      <div><Link to={`/conferences/${item.conference_id}`} className="font-black text-forest-950 hover:underline">{item.acronym} {item.year}</Link><p className="text-xs text-slate-500">{item.conference_name}</p></div><p className="text-sm">{[item.city, item.country].filter(Boolean).join(', ') || '未定'}<span className="block text-xs text-slate-500">{item.attendance_format}</span></p><div><p className="text-sm font-bold">{item.next_deadline_type ?? '未登録'}</p>{item.next_deadline && <DeadlineBadge date={item.next_deadline} />}</div><p className="text-sm">{formatDate(item.start_date)}<span className="block text-xs text-slate-500">{item.end_date && `〜 ${formatDate(item.end_date)}`}</span></p><StatusBadge value={item.information_status} /><div className="flex flex-wrap gap-2 md:flex-col"><Link className="text-xs font-black text-forest-700 hover:underline" to={`/conferences/${item.conference_id}`}>学会を管理</Link><Link className="text-xs font-bold text-slate-500 hover:text-forest-900" to={`/editions/${item.id}#deadlines`}>締切を管理</Link></div>
    </div>)}</div>}
  </>;
}
