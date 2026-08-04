import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Conference, ConferenceEdition } from '../../shared/types';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { EmptyState, ErrorState, formatDate, Loading, PageHeader, StatusBadge } from '../components/ui';

type Detail = Conference & { editions: ConferenceEdition[] };

export function ConferenceDetailPage() {
  const { id } = useParams(); const navigate = useNavigate();
  const { data, loading, error, reload } = useApi<Detail>(`/api/conferences/${id}`);
  const [deleting, setDeleting] = useState(false);
  const [busyEdition, setBusyEdition] = useState<number | null>(null);
  const [actionError, setActionError] = useState('');
  const [notice, setNotice] = useState('');
  if (loading) return <Loading />; if (error || !data) return <ErrorState message={error ?? '学会が見つかりません。'} retry={reload} />;
  async function archive() { if (!confirm(data!.is_archived ? 'アーカイブから復元しますか？' : 'この学会をアーカイブしますか？')) return; await api(`/api/conferences/${id}/${data!.is_archived ? 'restore' : 'archive'}`, { method: 'POST' }); if (data!.is_archived) reload(); else navigate('/conferences'); }
  async function removeConference() {
    if (!confirm(`「${data!.acronym}」を本当に消去しますか？\n\nこの学会に紐づく開催回・締切・通知履歴もすべて消去され、元に戻せません。`)) return;
    setDeleting(true); setActionError('');
    try { await api(`/api/conferences/${id}`, { method: 'DELETE' }); navigate('/conferences'); }
    catch (e) { setActionError(e instanceof Error ? e.message : '消去に失敗しました。'); setDeleting(false); }
  }
  async function duplicateEdition(edition: ConferenceEdition) {
    setBusyEdition(edition.id); setActionError(''); setNotice('');
    try {
      const { data: created } = await api<{ data: ConferenceEdition }>(`/api/editions/${edition.id}/duplicate-next-year`, { method: 'POST' });
      setNotice(`${created.year}年の開催回を複製しました。日程と締切を確認してください。`);
      reload();
    } catch (e) { setActionError(e instanceof Error ? e.message : '複製に失敗しました。'); }
    finally { setBusyEdition(null); }
  }
  async function removeEdition(edition: ConferenceEdition) {
    if (!confirm(`${edition.year}年の開催回を本当に消去しますか？\n\nこの開催回に紐づく締切と通知履歴も消去され、元に戻せません。学会自体は残ります。`)) return;
    setBusyEdition(edition.id); setActionError(''); setNotice('');
    try {
      await api(`/api/editions/${edition.id}`, { method: 'DELETE' });
      setNotice(`${edition.year}年の開催回を消去しました。`);
      reload();
    } catch (e) { setActionError(e instanceof Error ? e.message : '開催回の消去に失敗しました。'); }
    finally { setBusyEdition(null); }
  }
  return <><PageHeader title={`${data.acronym} — ${data.name}`} description="学会情報と年度別開催情報を、ここからまとめて管理できます。" action={<div className="flex flex-wrap gap-2"><Link className="btn-secondary" to={`/conferences/${id}/edit`}>学会情報を編集</Link><Link className="btn-primary" to={`/conferences/${id}/editions/new`}>＋ 年度別開催情報</Link><button className="btn-danger" onClick={removeConference} disabled={deleting}>{deleting ? '消去中…' : '学会を消去'}</button></div>} />
    {actionError && <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800">{actionError}</div>}
    {notice && <div className="mb-5 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">{notice}</div>}
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <aside className="surface h-fit p-5"><h2 className="text-sm font-black text-slate-400">基本情報</h2><dl className="mt-4 space-y-4 text-sm"><Info label="学会種別" value={data.conference_type} /><Info label="開催頻度" value={data.frequency} /><Info label="分野" value={data.fields.join(' · ') || '未設定'} /><Info label="キーワード" value={data.keywords.join(' · ') || '未設定'} /><Info label="備考" value={data.notes || 'なし'} /></dl><a className="btn-secondary mt-5 w-full" href={data.official_url} target="_blank" rel="noopener noreferrer">公式サイトを開く ↗</a><button className="mt-3 w-full text-sm font-bold text-slate-500 hover:text-forest-800" onClick={archive}>{data.is_archived ? 'アーカイブから復元' : '一覧からアーカイブ'}</button></aside>
      <section><div className="mb-3 flex items-center justify-between"><h2 className="text-xl font-black text-forest-950">年度別開催情報</h2><span className="text-sm text-slate-500">{data.editions.length}件</span></div>
        {!data.editions.length ? <EmptyState title="開催回が未登録です" body="今年度または次年度の開催情報を追加してください。日程が未定でも登録できます。" action={<Link className="btn-primary" to={`/conferences/${id}/editions/new`}>開催回を追加</Link>} /> : <div className="space-y-3">{data.editions.map((edition) => <article key={edition.id} className="surface p-5"><div className="grid gap-3 sm:grid-cols-[auto_1fr_auto] sm:items-center"><Link to={`/editions/${edition.id}`} className="text-2xl font-black text-forest-950 hover:underline">{edition.year}</Link><div><p className="font-bold">{formatDate(edition.start_date)}{edition.end_date && ` 〜 ${formatDate(edition.end_date)}`}</p><p className="mt-1 text-sm text-slate-500">{[edition.city, edition.country].filter(Boolean).join(', ') || '開催地未定'} · {edition.attendance_format}</p></div><StatusBadge value={edition.information_status} /></div><div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 pt-4"><Link className="btn-primary min-h-9 px-3 py-1 text-xs" to={`/editions/${edition.id}#deadlines`}>締切を管理</Link><Link className="btn-secondary min-h-9 px-3 py-1 text-xs" to={`/editions/${edition.id}/edit`}>編集</Link><button className="btn-secondary min-h-9 px-3 py-1 text-xs" onClick={() => duplicateEdition(edition)} disabled={busyEdition === edition.id}>{busyEdition === edition.id ? '処理中…' : '次年度へ複製'}</button><button className="min-h-9 px-3 py-1 text-xs font-black text-red-700 hover:text-red-900 disabled:opacity-50" onClick={() => removeEdition(edition)} disabled={busyEdition === edition.id}>消去</button></div></article>)}</div>}
      </section>
    </div>
  </>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold text-slate-400">{label}</dt><dd className="mt-1 leading-6 text-slate-700">{value}</dd></div>; }
