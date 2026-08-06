import { type FormEvent, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import type { ConferenceDeadline, ConferenceEdition } from '../../shared/types';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { DeadlineBadge, EmptyState, ErrorState, formatDate, Loading, PageHeader, StatusBadge } from '../components/ui';
import { DeadlinePicker } from '../components/DeadlinePicker';
import { type DeadlineDraft, deadlineLabel, deadlinePayload, deadlineToDraft } from '../lib/deadlineDraft';
import { editionDisplayName } from '../../shared/edition';

export function EditionDetailPage() {
  const { id } = useParams();
  const searchParams = new URLSearchParams(window.location.search);
  const setup = searchParams.get('setup') === '1';
  const addDeadline = searchParams.get('add') === 'deadline';
  const manageDeadlines = window.location.hash === '#deadlines';
  const { data, loading, error, reload } = useApi<ConferenceEdition>(`/api/editions/${id}`);
  const [drafts, setDrafts] = useState<DeadlineDraft[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(setup || addDeadline);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && (addDeadline || manageDeadlines)) requestAnimationFrame(() => document.getElementById(addDeadline ? 'deadline-form' : 'deadlines')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [addDeadline, loading, manageDeadlines]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? '開催回が見つかりません。'} retry={reload} />;

  async function submitDeadlines(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      const payloads = drafts.map(deadlinePayload);
      if (editingId) {
        await api(`/api/deadlines/${editingId}`, { method: 'PUT', body: JSON.stringify(payloads[0]) });
        setMessage('締切を更新しました。');
      } else {
        const response = await api<{ data: ConferenceDeadline[]; warnings?: Array<{ index: number; message: string }> }>(`/api/deadlines/edition/${id}/batch`, { method: 'POST', body: JSON.stringify({ deadlines: payloads }) });
        const warning = response.warnings?.length ? ` ${response.warnings.length}件は開催終了日より後の日付です。` : '';
        setMessage(`${response.data.length}件の締切を登録しました。${warning}`);
      }
      setDrafts([]);
      setEditingId(null);
      setShowForm(false);
      reload();
    } catch (e) { setMessage(e instanceof Error ? e.message : '保存に失敗しました。'); }
    finally { setSaving(false); }
  }

  function startCreate() {
    setEditingId(null);
    setDrafts([]);
    setShowForm(true);
    scrollToDeadlineForm();
  }

  function edit(deadline: ConferenceDeadline) {
    setDrafts([deadlineToDraft(deadline)]);
    setEditingId(deadline.id);
    setShowForm(true);
    scrollToDeadlineForm();
  }

  async function remove(deadlineId: number) {
    if (!confirm('この締切を削除しますか？')) return;
    setMessage('');
    setDeletingId(deadlineId);
    try {
      await api(`/api/deadlines/${deadlineId}`, { method: 'DELETE' });
      setMessage('締切を削除しました。');
      await reload();
    } catch (e) { setMessage(e instanceof Error ? e.message : '締切の削除に失敗しました。'); }
    finally { setDeletingId(null); }
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setDrafts([]);
  }

  const officialUrl = data.official_url || data.conference_official_url;
  return <>
    <PageHeader title={editionDisplayName(data)} description={data.conference_name} action={<div className="flex flex-wrap gap-2"><Link className="btn-secondary" to={`/conferences/${data.conference_id}`}>← 学会の詳細・管理</Link><Link className="btn-secondary" to={`/editions/${data.id}/edit`}>開催回を編集</Link><button className="btn-primary" onClick={startCreate}>＋ 締切を追加</button></div>} />
    {message && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{message}</div>}
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <aside className="surface h-fit p-5"><div className="flex items-center justify-between"><h2 className="font-black">開催情報</h2><StatusBadge value={data.information_status} /></div><dl className="mt-5 space-y-4 text-sm">{data.edition_name && <Info label="開催回名" value={data.edition_name} />}<Info label="開催期間" value={`${formatDate(data.start_date)}${data.end_date ? ` 〜 ${formatDate(data.end_date)}` : ''}`} /><Info label="開催地" value={[data.city, data.country].filter(Boolean).join(', ') || '未定'} /><Info label="開催形式" value={data.attendance_format} /><Info label="タイムゾーン" value={data.timezone || '未設定'} /><Info label="備考" value={data.notes || 'なし'} /></dl>{officialUrl && <a className="btn-secondary mt-5 w-full" href={officialUrl} target="_blank" rel="noopener noreferrer">公式ページを開く ↗</a>}</aside>
      <section id="deadlines" aria-busy={deletingId !== null}><h2 className="mb-3 text-xl font-black text-forest-950">締切一覧</h2>{!data.deadlines?.length ? <EmptyState title="締切が未登録です" body="必要な締切を選び、表示された項目だけ入力できます。" action={<button className="btn-primary" onClick={startCreate}>締切を追加</button>} /> : <div className="surface divide-y divide-slate-100 overflow-hidden">{data.deadlines.map((deadline) => <div key={deadline.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{deadline.title || deadlineLabel(deadline.deadline_type)}</h3><StatusBadge value={deadline.information_status} />{deadline.is_extended ? <span className="chip bg-blue-100 text-blue-800">延長</span> : null}</div><p className="mt-2 text-sm font-semibold">{formatDate(deadline.deadline_at, Boolean(deadline.has_time))}{deadline.is_aoe ? ' (AoE)' : deadline.timezone ? ` (${deadline.timezone})` : ''}</p>{deadline.previous_deadline_at && <p className="mt-1 text-xs text-slate-500">旧締切: {formatDate(deadline.previous_deadline_at, true)}</p>}</div><div className="flex items-center gap-3"><DeadlineBadge date={deadline.deadline_at} aoe={Boolean(deadline.is_aoe)} hasTime={Boolean(deadline.has_time)} /><button className="text-sm font-bold text-forest-700 disabled:cursor-wait disabled:opacity-50" onClick={() => edit(deadline)} disabled={deletingId !== null}>編集</button><button className="min-w-14 text-sm font-bold text-slate-400 hover:text-red-700 disabled:cursor-wait disabled:opacity-60" onClick={() => remove(deadline.id)} disabled={deletingId !== null}>{deletingId === deadline.id ? '削除中…' : '削除'}</button></div></div>)}</div>}</section>
    </div>

    {showForm && <form id="deadline-form" onSubmit={submitDeadlines} className="surface mt-7 scroll-mt-24 p-5 sm:p-7" aria-busy={saving}>
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start"><div><p className="section-kicker">Deadlines</p><h2 className="mt-1 text-xl font-black text-forest-950">{editingId ? '締切を編集' : '締切を追加'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">登録する締切を選択し、表示された項目だけ入力してください。</p></div><button type="button" className="shrink-0 text-sm font-bold text-slate-500" onClick={closeForm}>閉じる</button></div>
      <div className="mt-5"><DeadlinePicker drafts={drafts} onChange={setDrafts} selectable={!editingId} /></div>
      <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row"><button type="button" className="btn-secondary" onClick={closeForm}>キャンセル</button><button className="btn-primary min-w-44" disabled={saving || !drafts.length}>{saving ? '保存中…' : editingId ? '変更を保存' : `${drafts.length}件を登録`}</button></div>
    </form>}
  </>;
}

function scrollToDeadlineForm() { requestAnimationFrame(() => document.getElementById('deadline-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold text-slate-400">{label}</dt><dd className="mt-1 leading-6">{value}</dd></div>; }
