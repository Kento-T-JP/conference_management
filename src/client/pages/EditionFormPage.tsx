import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { ConferenceEdition } from '../../shared/types';
import { ATTENDANCE_FORMATS } from '../../shared/constants';
import { ApiClientError, api } from '../lib/api';
import { FieldError, Loading, OfficialConfirmation, PageHeader } from '../components/ui';
import { SetupProgress } from '../components/SetupProgress';
import { DeadlinePicker } from '../components/DeadlinePicker';
import { type DeadlineDraft, deadlinePayload } from '../lib/deadlineDraft';

const empty = { year: new Date().getFullYear() + 1, official_url: '', country: '', city: '', attendance_format: '未定', start_date: '', end_date: '', timezone: '', information_status: '未確認', is_cancelled: false, notes: '', version: undefined as number | undefined };

export function EditionFormPage() {
  const { id, conferenceId } = useParams();
  const navigate = useNavigate();
  const setup = !id && new URLSearchParams(window.location.search).get('setup') === '1';
  const [form, setForm] = useState(empty);
  const [deadlines, setDeadlines] = useState<DeadlineDraft[]>([]);
  const [editionConferenceId, setEditionConferenceId] = useState<number | null>(null);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (!id) return;
    api<{ data: ConferenceEdition }>(`/api/editions/${id}`)
      .then(({ data }) => {
        setEditionConferenceId(data.conference_id);
        setForm({ year: data.year, official_url: data.official_url ?? '', country: data.country ?? '', city: data.city ?? '', attendance_format: data.attendance_format, start_date: data.start_date ?? '', end_date: data.end_date ?? '', timezone: data.timezone ?? '', information_status: data.information_status === '公式' ? '公式' : '未確認', is_cancelled: Boolean(data.is_cancelled), notes: data.notes ?? '', version: data.version });
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loading />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage('');
    try {
      const body = { ...form, official_url: form.official_url || null, country: form.country || null, city: form.city || null, start_date: form.start_date || null, end_date: form.end_date || null, timezone: form.timezone || null, notes: form.notes || null };
      const { data } = await api<{ data: ConferenceEdition }>(id ? `/api/editions/${id}` : `/api/editions/conference/${conferenceId}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
      if (!id && deadlines.length) {
        await api(`/api/deadlines/edition/${data.id}/batch`, { method: 'POST', body: JSON.stringify({ deadlines: deadlines.map(deadlinePayload) }) });
      }
      navigate(id ? `/conferences/${data.conference_id}` : `/editions/${data.id}`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setErrors(error.body.error.details ?? {});
        setMessage(error.message);
      } else setMessage('保存に失敗しました。');
    } finally {
      setSaving(false);
    }
  }

  const update = (key: keyof typeof form, value: string | boolean | number) => setForm({ ...form, [key]: value });
  const saveLabel = id ? '保存する' : deadlines.length ? `開催回と締切${deadlines.length}件を保存` : '開催回を保存';
  const cancelPath = id && editionConferenceId ? `/conferences/${editionConferenceId}` : `/conferences/${conferenceId ?? ''}`;

  return <>
    <PageHeader title={id ? '開催回を編集' : '開催回と締切を登録'} description={id ? '開催情報を更新します。保存後は学会の管理画面へ戻ります。' : '開催情報と必要な締切を、この画面で一緒に登録します。'} action={id ? <Link className="btn-secondary" to={cancelPath}>← 学会の管理画面</Link> : undefined} />
    {setup && <div className="mx-auto max-w-3xl"><SetupProgress current={2} /></div>}
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
      {message && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{message}</div>}
      <fieldset className="surface p-5 sm:p-7"><legend className="px-2 text-lg font-black">開催情報</legend><div className="grid gap-5 sm:grid-cols-2"><label><span className="label">開催年 <b className="text-xs text-red-700">必須</b></span><input className="field" type="number" min="2000" max="2100" value={form.year} onChange={(event) => update('year', Number(event.target.value))} required /><FieldError value={errors.year} /></label><label><span className="label">開催形式</span><select className="field" value={form.attendance_format} onChange={(event) => update('attendance_format', event.target.value)}>{ATTENDANCE_FORMATS.map((value) => <option key={value}>{value}</option>)}</select></label><label><span className="label">開催国</span><input className="field" value={form.country} onChange={(event) => update('country', event.target.value)} /></label><label><span className="label">開催都市</span><input className="field" value={form.city} onChange={(event) => update('city', event.target.value)} /></label><label className="sm:col-span-2"><span className="label">年度別公式URL</span><input className="field" type="url" placeholder="未入力時は学会公式URLを使用" value={form.official_url} onChange={(event) => update('official_url', event.target.value)} /><FieldError value={errors.official_url} /></label></div></fieldset>
      <fieldset className="surface p-5 sm:p-7"><legend className="px-2 text-lg font-black">日程</legend><div className="grid gap-5 sm:grid-cols-2"><label><span className="label">開催開始日</span><input className="field" type="date" value={form.start_date} onChange={(event) => update('start_date', event.target.value)} /></label><label><span className="label">開催終了日</span><input className="field" type="date" value={form.end_date} onChange={(event) => update('end_date', event.target.value)} /><FieldError value={errors.end_date} /></label><label><span className="label">タイムゾーン</span><input className="field" placeholder="Asia/Tokyo" value={form.timezone} onChange={(event) => update('timezone', event.target.value)} /></label><OfficialConfirmation checked={form.information_status === '公式'} onChange={(checked) => update('information_status', checked ? '公式' : '未確認')} /></div></fieldset>
      {!id && <fieldset className="surface p-5 sm:p-7"><legend className="px-2 text-lg font-black">締切</legend><p className="mb-5 text-sm leading-6 text-slate-500">この開催回に必要な締切をチェックしてください。選択した締切だけ入力欄が表示されます。</p><DeadlinePicker drafts={deadlines} onChange={setDeadlines} /></fieldset>}
      <fieldset className="surface p-5 sm:p-7"><legend className="px-2 text-lg font-black">補足</legend><p className="mb-3 text-sm leading-6 text-slate-500">未確定の内容など、必要な補足事項を記載してください。</p><textarea className="field min-h-24" placeholder="例：開催地は公式発表後に更新" maxLength={1000} value={form.notes} onChange={(event) => update('notes', event.target.value)} /><label className="mt-4 flex gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_cancelled} onChange={(event) => update('is_cancelled', event.target.checked)} /> 開催中止</label></fieldset>
      <div className="flex justify-end gap-3"><Link className="btn-secondary" to={cancelPath}>{setup ? '後で入力する' : 'キャンセル'}</Link><button className="btn-primary" disabled={saving}>{saving ? '保存中…' : saveLabel}</button></div>
    </form>
  </>;
}
