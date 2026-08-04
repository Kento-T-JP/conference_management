import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ConferenceDeadline, ConferenceEdition } from '../../shared/types';
import { DEADLINE_TYPES, INFORMATION_STATUSES } from '../../shared/constants';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { DeadlineBadge, EmptyState, ErrorState, formatDate, Loading, PageHeader, StatusBadge } from '../components/ui';
import { SetupProgress } from '../components/SetupProgress';

type DeadlineDraft = {
  deadline_type: string;
  title: string;
  date: string;
  time: string;
  timezone: string;
  is_aoe: boolean;
  information_status: string;
  notification_enabled: boolean;
  version?: number;
};

const deadlineLabels: Record<string, string> = {
  Abstract: 'Abstract（要旨）',
  'Full Paper': 'Full Paper（論文）',
  'Short Paper': 'Short Paper（短報）',
  Poster: 'Poster（ポスター）',
  Workshop: 'Workshop（ワークショップ）',
  'Camera-ready': 'Camera-ready（最終稿）',
  'Author Notification': 'Author Notification（採否通知）',
  Registration: 'Registration（参加登録）',
  Other: 'Other（その他）'
};
const statusDescriptions: Record<string, string> = {
  公式: '公式サイトで確認済み',
  仮: '主催者による暫定情報',
  予測: '過去情報などからの予測',
  未確認: '情報源をまだ確認していない'
};

function newDraft(deadlineType = 'Full Paper'): DeadlineDraft {
  return { deadline_type: deadlineType, title: '', date: '', time: '', timezone: '', is_aoe: false, information_status: '未確認', notification_enabled: true };
}

function commonDrafts(): DeadlineDraft[] {
  return [newDraft('Full Paper'), newDraft('Author Notification'), newDraft('Camera-ready')];
}

export function EditionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const setup = searchParams.get('setup') === '1';
  const addDeadline = searchParams.get('add') === 'deadline';
  const manageDeadlines = window.location.hash === '#deadlines';
  const { data, loading, error, reload } = useApi<ConferenceEdition>(`/api/editions/${id}`);
  const [drafts, setDrafts] = useState<DeadlineDraft[]>(setup || addDeadline ? commonDrafts() : [newDraft()]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showForm, setShowForm] = useState(setup || addDeadline);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!loading && (addDeadline || manageDeadlines)) requestAnimationFrame(() => document.getElementById(addDeadline ? 'deadline-form' : 'deadlines')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }, [addDeadline, loading, manageDeadlines]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? '開催回が見つかりません。'} retry={reload} />;

  async function archive() {
    if (!confirm('この開催回をアーカイブしますか？')) return;
    await api(`/api/editions/${id}/archive`, { method: 'POST' });
    navigate(`/conferences/${data!.conference_id}`);
  }

  async function duplicate() {
    try {
      const { data: created } = await api<{ data: ConferenceEdition }>(`/api/editions/${id}/duplicate-next-year`, { method: 'POST' });
      navigate(`/editions/${created.id}`);
    } catch (e) { setMessage(e instanceof Error ? e.message : '複製に失敗しました。'); }
  }

  async function submitDeadlines(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    setSaving(true);
    try {
      const payloads = drafts.map(toPayload);
      if (editingId) {
        await api(`/api/deadlines/${editingId}`, { method: 'PUT', body: JSON.stringify(payloads[0]) });
        setMessage('締切を更新しました。');
      } else {
        const response = await api<{ data: ConferenceDeadline[]; warnings?: Array<{ index: number; message: string }> }>(`/api/deadlines/edition/${id}/batch`, { method: 'POST', body: JSON.stringify({ deadlines: payloads }) });
        const warning = response.warnings?.length ? ` ${response.warnings.length}件は開催終了日より後の日付です。` : '';
        setMessage(`${response.data.length}件の締切を登録しました。${warning}`);
      }
      setDrafts([newDraft()]);
      setEditingId(null);
      setShowForm(false);
      reload();
    } catch (e) { setMessage(e instanceof Error ? e.message : '保存に失敗しました。'); }
    finally { setSaving(false); }
  }

  function startCreate() {
    setEditingId(null);
    setDrafts(commonDrafts());
    setShowForm(true);
    scrollToDeadlineForm();
  }

  function edit(deadline: ConferenceDeadline) {
    setDrafts([{
      deadline_type: deadline.deadline_type,
      title: deadline.title ?? '',
      date: deadline.deadline_at.slice(0, 10),
      time: deadline.has_time ? deadline.deadline_at.slice(11, 16) : '',
      timezone: deadline.is_aoe ? 'AoE' : deadline.timezone ?? '',
      is_aoe: Boolean(deadline.is_aoe),
      information_status: deadline.information_status,
      notification_enabled: Boolean(deadline.notification_enabled),
      version: deadline.version
    }]);
    setEditingId(deadline.id);
    setShowForm(true);
    scrollToDeadlineForm();
  }

  async function remove(deadlineId: number) {
    if (!confirm('この締切を削除しますか？')) return;
    await api(`/api/deadlines/${deadlineId}`, { method: 'DELETE' });
    reload();
  }

  function updateDraft(index: number, patch: Partial<DeadlineDraft>) {
    setDrafts((current) => current.map((draft, draftIndex) => draftIndex === index ? { ...draft, ...patch } : draft));
  }

  function removeDraft(index: number) {
    setDrafts((current) => current.filter((_, draftIndex) => draftIndex !== index));
  }

  function addCommonMissing() {
    const common = ['Full Paper', 'Author Notification', 'Camera-ready'];
    setDrafts((current) => [...current, ...common.filter((type) => !current.some((draft) => draft.deadline_type === type)).map((type) => newDraft(type))]);
  }

  function closeForm() {
    setShowForm(false);
    setEditingId(null);
    setDrafts([newDraft()]);
  }

  const officialUrl = data.official_url || data.conference_official_url;
  return <>
    {setup && <SetupProgress current={3} />}
    <PageHeader title={setup ? '締切を登録' : `${data.acronym} ${data.year}`} description={setup ? `${data.acronym} ${data.year}の主要な締切をまとめて入力します。` : data.conference_name} action={<div className="flex flex-wrap gap-2">{setup && <Link className="btn-secondary" to="/">登録を完了</Link>}<Link className="btn-secondary" to={`/editions/${id}/edit`}>編集</Link><button className="btn-secondary" onClick={duplicate}>次年度へ複製</button><button className="btn-primary" onClick={startCreate}>＋ 締切をまとめて追加</button></div>} />
    {message && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{message}</div>}
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <aside className="surface h-fit p-5"><div className="flex items-center justify-between"><h2 className="font-black">開催情報</h2><StatusBadge value={data.information_status} /></div><dl className="mt-5 space-y-4 text-sm"><Info label="開催期間" value={`${formatDate(data.start_date)}${data.end_date ? ` 〜 ${formatDate(data.end_date)}` : ''}`} /><Info label="開催地" value={[data.city, data.country].filter(Boolean).join(', ') || '未定'} /><Info label="開催形式" value={data.attendance_format} /><Info label="タイムゾーン" value={data.timezone || '未設定'} /><Info label="備考" value={data.notes || 'なし'} /></dl>{officialUrl && <a className="btn-secondary mt-5 w-full" href={officialUrl} target="_blank" rel="noopener noreferrer">公式ページを開く ↗</a>}<button onClick={archive} className="mt-3 w-full text-sm font-bold text-slate-500 hover:text-red-700">アーカイブ</button></aside>
      <section id="deadlines"><h2 className="mb-3 text-xl font-black text-forest-950">締切一覧</h2>{!data.deadlines?.length ? <EmptyState title="締切が未登録です" body="論文投稿、採否通知、最終稿などの日程を一度にまとめて登録できます。" action={<button className="btn-primary" onClick={startCreate}>締切をまとめて追加</button>} /> : <div className="surface divide-y divide-slate-100 overflow-hidden">{data.deadlines.map((deadline) => <div key={deadline.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{deadline.title || deadlineLabels[deadline.deadline_type] || deadline.deadline_type}</h3><StatusBadge value={deadline.information_status} />{deadline.is_extended ? <span className="chip bg-blue-100 text-blue-800">延長</span> : null}</div><p className="mt-2 text-sm font-semibold">{formatDate(deadline.deadline_at, Boolean(deadline.has_time))}{deadline.is_aoe ? ' (AoE)' : deadline.timezone ? ` (${deadline.timezone})` : ''}</p>{deadline.previous_deadline_at && <p className="mt-1 text-xs text-slate-500">旧締切: {formatDate(deadline.previous_deadline_at, true)}</p>}</div><div className="flex items-center gap-3"><DeadlineBadge date={deadline.deadline_at} aoe={Boolean(deadline.is_aoe)} hasTime={Boolean(deadline.has_time)} /><button className="text-sm font-bold text-forest-700" onClick={() => edit(deadline)}>編集</button><button className="text-sm font-bold text-slate-400 hover:text-red-700" onClick={() => remove(deadline.id)}>削除</button></div></div>)}</div>}</section>
    </div>

    {showForm && <form id="deadline-form" onSubmit={submitDeadlines} className="surface mt-7 scroll-mt-24 p-5 sm:p-7">
      <div className="flex flex-col justify-between gap-4 border-b border-slate-200/80 pb-5 sm:flex-row sm:items-start"><div><p className="section-kicker">Deadlines</p><h2 className="mt-1 text-xl font-black text-forest-950">{editingId ? '締切を編集' : '締切をまとめて登録'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">日付だけでも登録できます。時刻やタイムゾーンが発表されている場合だけ追加してください。</p></div><button type="button" className="shrink-0 text-sm font-bold text-slate-500" onClick={closeForm}>閉じる</button></div>
      {!editingId && <div className="my-5 flex flex-wrap items-center gap-2"><button type="button" className="btn-secondary min-h-9 px-4 py-1 text-xs" onClick={() => setDrafts((current) => [...current, newDraft()])}>＋ 行を追加</button><button type="button" className="rounded-full px-4 py-2 text-xs font-black text-forest-700 hover:bg-forest-50" onClick={addCommonMissing}>主要3件をセット</button><span className="text-xs text-slate-400">最大20件まで一括登録できます</span></div>}
      <datalist id="timezone-options"><option value="Asia/Tokyo" /><option value="UTC" /><option value="America/New_York" /><option value="America/Los_Angeles" /><option value="Europe/London" /></datalist>
      <div className="space-y-4">{drafts.map((draft, index) => <section key={index} className="deadline-draft-card">
        <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-forest-950 text-xs font-black text-white">{index + 1}</span><h3 className="font-black text-forest-950">{deadlineLabels[draft.deadline_type] ?? draft.deadline_type}</h3></div>{!editingId && drafts.length > 1 && <button type="button" className="text-xs font-bold text-slate-400 hover:text-red-700" onClick={() => removeDraft(index)}>この行を削除</button>}</div>
        <div className="grid gap-4 md:grid-cols-[1.25fr_1fr_.8fr]">
          <label><span className="label">種類 <Required /></span><select className="field" value={draft.deadline_type} onChange={(event) => updateDraft(index, { deadline_type: event.target.value })}>{DEADLINE_TYPES.map((type) => <option key={type} value={type}>{deadlineLabels[type] ?? type}</option>)}</select></label>
          <label><span className="label">日付 <Required /></span><input required className="field" type="date" value={draft.date} onChange={(event) => updateDraft(index, { date: event.target.value })} /></label>
          <label><span className="label">時刻 <Optional /></span><input className="field" type="time" value={draft.time} onChange={(event) => updateDraft(index, { time: event.target.value })} disabled={draft.is_aoe} /></label>
        </div>
        <div className="mt-4 grid gap-4 md:grid-cols-[1.25fr_1fr_1fr]">
          <label><span className="label">表示名 <Optional /></span><input className="field" placeholder="区別が必要な場合のみ" value={draft.title} onChange={(event) => updateDraft(index, { title: event.target.value })} /></label>
          <label><span className="label">タイムゾーン <Optional /></span><input list="timezone-options" className="field" placeholder="例：Asia/Tokyo" value={draft.timezone} onChange={(event) => updateDraft(index, { timezone: event.target.value })} disabled={draft.is_aoe} /></label>
          <label><span className="label">情報状態</span><select className="field" value={draft.information_status} onChange={(event) => updateDraft(index, { information_status: event.target.value })}>{INFORMATION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><span className="field-hint">{statusDescriptions[draft.information_status]}</span></label>
        </div>
        <div className="mt-4 flex flex-wrap gap-3"><label className="deadline-inline-option"><input type="checkbox" checked={draft.is_aoe} onChange={(event) => updateDraft(index, { is_aoe: event.target.checked, timezone: event.target.checked ? 'AoE' : '', time: event.target.checked ? '' : draft.time })} /><span><strong>AoE</strong><small>世界のどこかでその日が終わるまで</small></span></label><label className="deadline-inline-option"><input type="checkbox" checked={draft.notification_enabled} onChange={(event) => updateDraft(index, { notification_enabled: event.target.checked })} /><span><strong>Slack通知</strong><small>締切前に研究室へ通知</small></span></label></div>
      </section>)}</div>
      {!drafts.length && <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-500">「行を追加」から締切を入力してください。</div>}
      <div className="mt-6 flex flex-col-reverse justify-end gap-3 sm:flex-row"><button type="button" className="btn-secondary" onClick={closeForm}>キャンセル</button><button className="btn-primary min-w-44" disabled={saving || !drafts.length}>{saving ? '保存中…' : editingId ? '変更を保存' : `${drafts.length}件をまとめて登録`}</button></div>
    </form>}
  </>;
}

function toPayload(draft: DeadlineDraft) {
  return {
    deadline_type: draft.deadline_type,
    title: draft.title || null,
    deadline_at: draft.time && !draft.is_aoe ? `${draft.date}T${draft.time}` : draft.date,
    has_time: Boolean(draft.time) && !draft.is_aoe,
    timezone: draft.is_aoe ? 'AoE' : draft.timezone || null,
    is_aoe: draft.is_aoe,
    information_status: draft.information_status,
    notification_enabled: draft.notification_enabled,
    version: draft.version
  };
}

function scrollToDeadlineForm() { requestAnimationFrame(() => document.getElementById('deadline-form')?.scrollIntoView({ behavior: 'smooth', block: 'start' })); }

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold text-slate-400">{label}</dt><dd className="mt-1 leading-6">{value}</dd></div>; }
function Required() { return <span className="text-xs text-red-700">必須</span>; }
function Optional() { return <span className="text-xs font-bold normal-case tracking-normal text-slate-400">任意</span>; }
