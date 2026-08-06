import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { ConferenceEdition } from '../../shared/types';
import { ATTENDANCE_FORMATS } from '../../shared/constants';
import { useApi } from '../hooks/useApi';
import { queryString } from '../lib/api';
import { DeadlineBadge, EmptyState, ErrorState, formatDate, Loading, PageHeader, StatusBadge } from '../components/ui';
import { editionDisplayName, editionPeriodLabel } from '../../shared/edition';

const INITIAL_FILTERS = { q: '', year: '', attendance_format: '', information_status: '', sort: 'deadline', include_past: false };

export function EditionsPage() {
  const [filters, setFilters] = useState({ ...INITIAL_FILTERS });
  const { data, loading, error, reload } = useApi<ConferenceEdition[]>(`/api/editions${queryString(filters)}`);
  return <><PageHeader title="開催回" description="各開催回の日程と締切を確認します。" />
    <div className="surface mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-6">
      <label className="lg:col-span-2"><span className="label">学会・開催回を検索</span><input className="field" type="search" placeholder="名称・略称・開催回名" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></label>
      <label><span className="label">開催年</span><input className="field" inputMode="numeric" placeholder="例: 2027" value={filters.year} onChange={(e) => setFilters({ ...filters, year: e.target.value })} /></label>
      <label><span className="label">開催形式</span><select className="field" value={filters.attendance_format} onChange={(e) => setFilters({ ...filters, attendance_format: e.target.value })}><option value="">すべて</option>{ATTENDANCE_FORMATS.map((v) => <option key={v}>{v}</option>)}</select></label>
      <label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" className="size-4 accent-[#2c6652]" checked={filters.information_status === '公式'} onChange={(e) => setFilters({ ...filters, information_status: e.target.checked ? '公式' : '' })} /> 公式サイトで確認済みのみ</label>
      <label><span className="label">並べ替え</span><select className="field" value={filters.sort} onChange={(e) => setFilters({ ...filters, sort: e.target.value })}><option value="deadline">締切が近い順</option><option value="start_date">開催日が近い順</option></select></label>
      <label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" className="size-4" checked={filters.include_past} onChange={(e) => setFilters({ ...filters, include_past: e.target.checked })} /> 過去の開催回も表示</label>
      <div className="flex items-end justify-end pb-1 lg:col-start-6"><button type="button" className="text-xs font-black text-forest-700 hover:underline disabled:cursor-default disabled:text-slate-300 disabled:no-underline" onClick={() => setFilters({ ...INITIAL_FILTERS })} disabled={Object.entries(filters).every(([key, value]) => value === INITIAL_FILTERS[key as keyof typeof INITIAL_FILTERS])}>条件をリセット</button></div>
    </div>
    {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <EmptyState title="表示できる開催回がありません" body="学会一覧から開催回を追加してください。" href="/conferences" linkLabel="学会一覧を開く" /> : <div className="surface overflow-hidden"><div className="hidden grid-cols-[1.25fr_.65fr_.9fr_.9fr_auto] gap-4 border-b bg-slate-50 px-5 py-3 text-xs font-black text-slate-500 md:grid"><span>学会・開催回</span><span>開催</span><span>次回締切</span><span>開催期間</span><span>操作</span></div>{data.map((item) => <div key={item.id} className="grid gap-3 border-b border-slate-100 p-5 last:border-0 hover:bg-forest-50 md:grid-cols-[1.25fr_.65fr_.9fr_.9fr_auto] md:items-center">
      <div><div className="flex flex-wrap items-center gap-2"><Link to={`/editions/${item.id}`} className="font-black text-forest-950 hover:underline">{editionDisplayName(item)}</Link><StatusBadge value={item.information_status} /></div><p className="text-xs text-slate-500">{item.conference_name}{item.edition_name ? ` · ${editionPeriodLabel(item)}` : ''}</p></div><p className="text-sm">{[item.city, item.country].filter(Boolean).join(', ') || '未定'}<span className="block text-xs text-slate-500">{item.attendance_format}</span></p><div><p className="text-sm font-bold">{item.next_deadline_type ?? '未登録'}</p>{item.next_deadline && <DeadlineBadge date={item.next_deadline} />}</div><p className="text-sm">{formatDate(item.start_date)}<span className="block text-xs text-slate-500">{item.end_date && `〜 ${formatDate(item.end_date)}`}</span></p><div><Link className="btn-secondary min-h-9 whitespace-nowrap px-3 py-1.5 text-xs" to={`/editions/${item.id}`}>詳細を見る</Link></div>
    </div>)}</div>}
  </>;
}
