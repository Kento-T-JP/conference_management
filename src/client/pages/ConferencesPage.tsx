import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Conference } from '../../shared/types';
import { CONFERENCE_TYPES, FREQUENCIES } from '../../shared/constants';
import { useApi } from '../hooks/useApi';
import { queryString } from '../lib/api';
import { EmptyState, ErrorState, formatDate, Loading, PageHeader } from '../components/ui';

export function ConferencesPage() {
  const [filters, setFilters] = useState({ q: '', conference_type: '', frequency: '', archived: false });
  const path = `/api/conferences${queryString(filters)}`;
  const { data, loading, error, reload } = useApi<Conference[]>(path);
  return <>
    <PageHeader title="学会" description="学会を探し、詳細画面から編集・消去・年度別情報を管理します。" action={<Link to="/conferences/new" className="btn-primary">＋ 学会を追加</Link>} />
    <div className="surface mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
      <label><span className="label">キーワード</span><input className="field" type="search" placeholder="名称・略称・分野" value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} /></label>
      <label><span className="label">学会種別</span><select className="field" value={filters.conference_type} onChange={(e) => setFilters({ ...filters, conference_type: e.target.value })}><option value="">すべて</option>{CONFERENCE_TYPES.map((v) => <option key={v}>{v}</option>)}</select></label>
      <label><span className="label">開催頻度</span><select className="field" value={filters.frequency} onChange={(e) => setFilters({ ...filters, frequency: e.target.value })}><option value="">すべて</option>{FREQUENCIES.map((v) => <option key={v}>{v}</option>)}</select></label>
      <label className="flex items-end gap-2 pb-2 text-sm font-semibold"><input type="checkbox" className="size-4" checked={filters.archived} onChange={(e) => setFilters({ ...filters, archived: e.target.checked })} /> アーカイブを表示</label>
    </div>
    {loading ? <Loading /> : error ? <ErrorState message={error} retry={reload} /> : !data?.length ? <EmptyState title="条件に合う学会がありません" body="検索条件を変えるか、最初の学会を登録してください。" action={<Link className="btn-primary" to="/conferences/new">学会を追加</Link>} /> : <div className="grid gap-4 lg:grid-cols-2">{data.map((item) => <article className="surface p-5" key={item.id}>
      <div className="flex items-start justify-between gap-4"><Link to={`/conferences/${item.id}`} className="group min-w-0"><span className="block text-xl font-black text-forest-950 group-hover:underline">{item.acronym}</span><span className="mt-1 block text-sm leading-5 text-slate-600">{item.name}</span></Link><span className="chip shrink-0 bg-forest-50 text-forest-800">{item.conference_type}</span></div>
      <div className="mt-4 flex flex-wrap gap-2">{item.fields.map((field) => <span key={field} className="chip bg-slate-100 text-slate-600">{field}</span>)}</div>
      <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-slate-100 pt-4 text-sm"><div><dt className="text-xs font-bold text-slate-400">開催頻度</dt><dd className="mt-1 font-semibold">{item.frequency}</dd></div><div><dt className="text-xs font-bold text-slate-400">最新開催年</dt><dd className="mt-1 font-semibold">{item.latest_year ?? '未登録'}</dd></div><div className="col-span-2"><dt className="text-xs font-bold text-slate-400">次回締切</dt><dd className="mt-1 font-semibold text-forest-900">{formatDate(item.next_deadline, true)}</dd></div></dl>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-4"><a href={item.official_url} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-forest-700 hover:underline">公式サイト ↗</a><Link to={`/conferences/${item.id}`} className="btn-primary min-h-9 px-4 py-1 text-xs">詳細・管理 →</Link></div>
    </article>)}</div>}
  </>;
}
