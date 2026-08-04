import { type FormEvent, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ConferenceDeadline, ConferenceEdition } from '../../shared/types';
import { DEADLINE_TYPES, INFORMATION_STATUSES } from '../../shared/constants';
import { api } from '../lib/api';
import { useApi } from '../hooks/useApi';
import { DeadlineBadge, EmptyState, ErrorState, formatDate, Loading, PageHeader, StatusBadge } from '../components/ui';
import { SetupProgress } from '../components/SetupProgress';

const blank = { deadline_type: 'Full Paper', title: '', deadline_at: '', has_time: true, timezone: '', is_aoe: false, information_status: '未確認', notification_enabled: true, version: undefined as number | undefined };
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
  公式: '公式サイトで発表された日程',
  仮: '主催者による暫定的な日程',
  予測: '過去の開催回などから予測した日程',
  未確認: '情報源をまだ確認できていない日程'
};

export function EditionDetailPage() {
  const { id } = useParams(); const navigate = useNavigate();
  const setup = new URLSearchParams(window.location.search).get('setup') === '1';
  const { data, loading, error, reload } = useApi<ConferenceEdition>(`/api/editions/${id}`);
  const [form, setForm] = useState(blank); const [editingId, setEditingId] = useState<number | null>(null); const [showForm, setShowForm] = useState(setup); const [message, setMessage] = useState('');
  if (loading) return <Loading />; if (error || !data) return <ErrorState message={error ?? '開催回が見つかりません。'} retry={reload} />;
  async function archive() { if (!confirm('この開催回をアーカイブしますか？')) return; await api(`/api/editions/${id}/archive`, { method: 'POST' }); navigate(`/conferences/${data!.conference_id}`); }
  async function duplicate() { try { const { data: created } = await api<{ data: ConferenceEdition }>(`/api/editions/${id}/duplicate-next-year`, { method: 'POST' }); navigate(`/editions/${created.id}`); } catch (e) { setMessage(e instanceof Error ? e.message : '複製に失敗しました。'); } }
  async function submitDeadline(event: FormEvent) { event.preventDefault(); setMessage(''); try { await api(editingId ? `/api/deadlines/${editingId}` : `/api/deadlines/edition/${id}`, { method: editingId ? 'PUT' : 'POST', body: JSON.stringify({ ...form, title: form.title || null, timezone: form.timezone || null, deadline_at: form.has_time ? form.deadline_at : form.deadline_at.slice(0, 10) }) }); setForm(blank); setEditingId(null); setShowForm(false); setMessage(setup ? '登録が完了しました。必要に応じて締切を追加できます。' : ''); reload(); } catch (e) { setMessage(e instanceof Error ? e.message : '保存に失敗しました。'); } }
  function edit(deadline: ConferenceDeadline) { setForm({ deadline_type: deadline.deadline_type, title: deadline.title ?? '', deadline_at: deadline.has_time ? deadline.deadline_at.slice(0, 16) : deadline.deadline_at.slice(0, 10), has_time: Boolean(deadline.has_time), timezone: deadline.timezone ?? '', is_aoe: Boolean(deadline.is_aoe), information_status: deadline.information_status, notification_enabled: Boolean(deadline.notification_enabled), version: deadline.version }); setEditingId(deadline.id); setShowForm(true); }
  async function remove(deadlineId: number) { if (!confirm('この締切を削除しますか？')) return; await api(`/api/deadlines/${deadlineId}`, { method: 'DELETE' }); reload(); }
  const officialUrl = data.official_url || data.conference_official_url;
  return <>{setup && <SetupProgress current={3} />}<PageHeader title={setup ? '締切を登録' : `${data.acronym} ${data.year}`} description={setup ? `${data.acronym} ${data.year}の主要な締切を入力します。` : data.conference_name} action={<div className="flex flex-wrap gap-2">{setup && <Link className="btn-secondary" to="/">登録を完了</Link>}<Link className="btn-secondary" to={`/editions/${id}/edit`}>編集</Link><button className="btn-secondary" onClick={duplicate}>次年度へ複製</button><button className="btn-primary" onClick={() => setShowForm(true)}>＋ 締切を追加</button></div>} />
    {message && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{message}</div>}
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <aside className="surface h-fit p-5"><div className="flex items-center justify-between"><h2 className="font-black">開催情報</h2><StatusBadge value={data.information_status} /></div><dl className="mt-5 space-y-4 text-sm"><Info label="開催期間" value={`${formatDate(data.start_date)}${data.end_date ? ` 〜 ${formatDate(data.end_date)}` : ''}`} /><Info label="開催地" value={[data.city, data.country].filter(Boolean).join(', ') || '未定'} /><Info label="開催形式" value={data.attendance_format} /><Info label="タイムゾーン" value={data.timezone || '未設定'} /><Info label="備考" value={data.notes || 'なし'} /></dl>{officialUrl && <a className="btn-secondary mt-5 w-full" href={officialUrl} target="_blank" rel="noopener noreferrer">公式ページを開く ↗</a>}<button onClick={archive} className="mt-3 w-full text-sm font-bold text-slate-500 hover:text-red-700">アーカイブ</button></aside>
      <section><h2 className="mb-3 text-xl font-black text-forest-950">締切一覧</h2>{!data.deadlines?.length ? <EmptyState title="締切が未登録です" body="投稿締切や採否通知など、この開催回に関係する日程を追加してください。" action={<button className="btn-primary" onClick={() => setShowForm(true)}>締切を追加</button>} /> : <div className="surface divide-y divide-slate-100 overflow-hidden">{data.deadlines.map((d) => <div key={d.id} className="grid gap-3 p-5 sm:grid-cols-[1fr_auto] sm:items-center"><div><div className="flex flex-wrap items-center gap-2"><h3 className="font-black">{d.title || d.deadline_type}</h3><StatusBadge value={d.information_status} />{d.is_extended ? <span className="chip bg-blue-100 text-blue-800">延長</span> : null}</div><p className="mt-2 text-sm font-semibold">{formatDate(d.deadline_at, Boolean(d.has_time))}{d.is_aoe ? ' (AoE)' : d.timezone ? ` (${d.timezone})` : ''}</p>{d.previous_deadline_at && <p className="mt-1 text-xs text-slate-500">旧締切: {formatDate(d.previous_deadline_at, true)}</p>}</div><div className="flex items-center gap-3"><DeadlineBadge date={d.deadline_at} aoe={Boolean(d.is_aoe)} hasTime={Boolean(d.has_time)} /><button className="text-sm font-bold text-forest-700" onClick={() => edit(d)}>編集</button><button className="text-sm font-bold text-slate-400 hover:text-red-700" onClick={() => remove(d.id)}>削除</button></div></div>)}</div>}</section>
    </div>
    {showForm && <form onSubmit={submitDeadline} className="surface mt-7 p-5 sm:p-7">
      <div className="mb-6 flex items-start justify-between gap-4"><div><p className="section-kicker">Deadline</p><h2 className="mt-1 text-xl font-black text-forest-950">{editingId ? '締切を編集' : '締切を追加'}</h2><p className="mt-2 text-sm leading-6 text-slate-500">公式サイトの締切情報を見ながら、上から順に入力してください。</p></div><button type="button" className="shrink-0 text-sm font-bold text-slate-500" onClick={() => { setShowForm(false); setEditingId(null); setForm(blank); }}>閉じる</button></div>
      <div className="space-y-4">
        <section className="form-section" aria-labelledby="deadline-kind"><div className="mb-4 flex gap-3"><StepNumber value="1" /><div><h3 id="deadline-kind" className="font-black text-forest-950">何の締切ですか？</h3><p className="mt-1 text-xs leading-5 text-slate-500">投稿、採否通知、最終稿など、日程の種類を選びます。</p></div></div><div className="grid gap-5 sm:grid-cols-2">
          <label><span className="label">締切の種類</span><select className="field" value={form.deadline_type} onChange={(e) => setForm({ ...form, deadline_type: e.target.value })}>{DEADLINE_TYPES.map((v) => <option key={v} value={v}>{deadlineLabels[v] ?? v}</option>)}</select></label>
          <label><span className="label">表示名 <Optional /></span><input className="field" placeholder="例：第1回論文投稿締切" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /><span className="field-hint">区別が必要な場合だけ入力します。空欄なら上の種類を表示します。</span></label>
        </div></section>

        <section className="form-section" aria-labelledby="deadline-date"><div className="mb-4 flex gap-3"><StepNumber value="2" /><div><h3 id="deadline-date" className="font-black text-forest-950">いつですか？</h3><p className="mt-1 text-xs leading-5 text-slate-500">日付と時刻を入力し、公式サイトの表記に合わせて条件を選びます。</p></div></div><div className="grid gap-5 sm:grid-cols-2">
          <label><span className="label">締切{form.has_time ? '日時' : '日'} <Required /></span><input required className="field" type={form.has_time ? 'datetime-local' : 'date'} value={form.deadline_at} onChange={(e) => setForm({ ...form, deadline_at: e.target.value })} /><span className="field-hint">公式サイトに掲載された現地時間を入力してください。</span></label>
          <label><span className="label">タイムゾーン {!form.is_aoe && form.has_time && <Required />}</span><input required={!form.is_aoe && form.has_time} list="timezone-options" className="field" placeholder="例：Asia/Tokyo" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} disabled={form.is_aoe || !form.has_time} /><datalist id="timezone-options"><option value="Asia/Tokyo" /><option value="UTC" /><option value="America/New_York" /><option value="America/Los_Angeles" /><option value="Europe/London" /></datalist><span className="field-hint">開催地ではなく、締切に指定された地域を選びます。</span></label>
        </div><div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="choice-card"><input className="mt-1 size-4 accent-[#2c6652]" type="checkbox" checked={!form.has_time} onChange={(e) => setForm({ ...form, has_time: !e.target.checked, deadline_at: e.target.checked ? form.deadline_at.slice(0, 10) : form.deadline_at })} /><span><strong className="block text-sm text-forest-950">日付のみ登録する</strong><span className="mt-1 block text-xs leading-5 text-slate-500">時刻が発表されていない場合に選びます。</span></span></label>
          <label className="choice-card"><input className="mt-1 size-4 accent-[#2c6652]" type="checkbox" checked={form.is_aoe} onChange={(e) => setForm({ ...form, is_aoe: e.target.checked, timezone: e.target.checked ? 'AoE' : '' })} /><span><strong className="block text-sm text-forest-950">AoE として登録する</strong><span className="mt-1 block text-xs leading-5 text-slate-500">Anywhere on Earth。世界のどこかでその日が終わるまで、という指定です。</span></span></label>
        </div></section>

        <section className="form-section" aria-labelledby="deadline-handling"><div className="mb-4 flex gap-3"><StepNumber value="3" /><div><h3 id="deadline-handling" className="font-black text-forest-950">確認状態と通知</h3><p className="mt-1 text-xs leading-5 text-slate-500">情報の確かさと、リマインドの対象にするかを設定します。</p></div></div><div className="grid gap-5 sm:grid-cols-2">
          <label><span className="label">情報の確認状態</span><select className="field" value={form.information_status} onChange={(e) => setForm({ ...form, information_status: e.target.value })}>{INFORMATION_STATUSES.map((v) => <option key={v}>{v}</option>)}</select><span className="field-hint">{statusDescriptions[form.information_status] ?? ''}</span></label>
          <label className="choice-card self-start sm:mt-6"><input className="mt-1 size-4 accent-[#2c6652]" type="checkbox" checked={form.notification_enabled} onChange={(e) => setForm({ ...form, notification_enabled: e.target.checked })} /><span><strong className="block text-sm text-forest-950">Slackでリマインドする</strong><span className="mt-1 block text-xs leading-5 text-slate-500">この締切を研究室への通知対象にします。</span></span></label>
        </div></section>
      </div><div className="mt-6 flex justify-end"><button className="btn-primary min-w-40">{editingId ? '変更を保存' : 'この締切を追加'}</button></div>
    </form>}
  </>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold text-slate-400">{label}</dt><dd className="mt-1 leading-6">{value}</dd></div>; }
function StepNumber({ value }: { value: string }) { return <span className="grid size-7 shrink-0 place-items-center rounded-full bg-forest-950 text-xs font-black text-white">{value}</span>; }
function Required() { return <span className="text-xs text-red-700">必須</span>; }
function Optional() { return <span className="text-xs font-bold normal-case tracking-normal text-slate-400">任意</span>; }
