import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Conference, ConferenceEdition } from '../../shared/types';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { EmptyState, ErrorState, formatDate, Loading, PageHeader, StatusBadge } from '../components/ui';

type Detail = Conference & { editions: ConferenceEdition[] };

export function ConferenceDetailPage() {
  const { id } = useParams(); const navigate = useNavigate();
  const { data, loading, error, reload } = useApi<Detail>(`/api/conferences/${id}`);
  if (loading) return <Loading />; if (error || !data) return <ErrorState message={error ?? '学会が見つかりません。'} retry={reload} />;
  async function archive() { if (!confirm(data!.is_archived ? 'アーカイブから復元しますか？' : 'この学会をアーカイブしますか？')) return; await api(`/api/conferences/${id}/${data!.is_archived ? 'restore' : 'archive'}`, { method: 'POST' }); if (data!.is_archived) reload(); else navigate('/conferences'); }
  return <><PageHeader eyebrow="Conference profile" title={`${data.acronym} — ${data.name}`} action={<div className="flex flex-wrap gap-2"><Link className="btn-secondary" to={`/conferences/${id}/edit`}>編集</Link><Link className="btn-primary" to={`/conferences/${id}/editions/new`}>＋ 開催回を追加</Link></div>} />
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <aside className="surface h-fit p-5"><h2 className="text-sm font-black text-slate-400">基本情報</h2><dl className="mt-4 space-y-4 text-sm"><Info label="学会種別" value={data.conference_type} /><Info label="開催頻度" value={data.frequency} /><Info label="分野" value={data.fields.join(' · ') || '未設定'} /><Info label="キーワード" value={data.keywords.join(' · ') || '未設定'} /><Info label="備考" value={data.notes || 'なし'} /></dl><a className="btn-secondary mt-5 w-full" href={data.official_url} target="_blank" rel="noopener noreferrer">公式サイトを開く ↗</a><button className="mt-3 w-full text-sm font-bold text-slate-500 hover:text-red-700" onClick={archive}>{data.is_archived ? 'アーカイブから復元' : 'アーカイブ'}</button></aside>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black text-forest-950">年度別開催情報</h2><span className="text-sm text-slate-500">{data.editions.length}件</span></div>
        {!data.editions.length ? <EmptyState title="開催回が未登録です" body="今年度または次年度の開催情報を追加してください。日程が未定でも登録できます。" action={<Link className="btn-primary" to={`/conferences/${id}/editions/new`}>開催回を追加</Link>} /> : <div className="space-y-3">{data.editions.map((edition) => <Link key={edition.id} to={`/editions/${edition.id}`} className="surface grid gap-3 p-5 transition hover:border-forest-700 sm:grid-cols-[auto_1fr_auto] sm:items-center"><span className="text-2xl font-black text-forest-950">{edition.year}</span><div><p className="font-bold">{formatDate(edition.start_date)}{edition.end_date && ` 〜 ${formatDate(edition.end_date)}`}</p><p className="mt-1 text-sm text-slate-500">{[edition.city, edition.country].filter(Boolean).join(', ') || '開催地未定'} · {edition.attendance_format}</p></div><div className="flex items-center gap-2"><StatusBadge value={edition.information_status} /><span className="text-forest-700">→</span></div></Link>)}</div>}
      </section>
    </div>
  </>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold text-slate-400">{label}</dt><dd className="mt-1 leading-6 text-slate-700">{value}</dd></div>; }
