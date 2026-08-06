import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Conference, ConferenceDeadline, ConferenceEdition } from '../../shared/types';
import { ATTENDANCE_FORMATS } from '../../shared/constants';
import { shiftIsoDateToYear } from '../../shared/date';
import { editionCardTitle } from '../../shared/edition';
import { ApiClientError, api } from '../lib/api';
import { FieldError, Loading, OfficialConfirmation, PageHeader } from '../components/ui';
import { SetupProgress } from '../components/SetupProgress';
import { DeadlinePicker } from '../components/DeadlinePicker';
import { type DeadlineDraft, deadlinePayload, deadlineToDraft } from '../lib/deadlineDraft';

const empty = { year: new Date().getFullYear() + 1, edition_name: '', official_url: '', country: '', city: '', attendance_format: '未定', start_date: '', end_date: '', timezone: '', information_status: '未確認', is_cancelled: false, notes: '', version: undefined as number | undefined };
type ConferenceWithEditions = Conference & { editions: ConferenceEdition[] };

export function EditionFormPage() {
  const { id, conferenceId } = useParams();
  const navigate = useNavigate();
  const search = new URLSearchParams(window.location.search);
  const setup = !id && search.get('setup') === '1';
  const copyFrom = !id ? search.get('copyFrom') : null;
  const copyTarget = search.get('target') === 'same' ? 'same' : 'next';
  const [form, setForm] = useState(empty);
  const [deadlines, setDeadlines] = useState<DeadlineDraft[]>([]);
  const [editionConferenceId, setEditionConferenceId] = useState<number | null>(null);
  const [conference, setConference] = useState<ConferenceWithEditions | null>(null);
  const [loading, setLoading] = useState(Boolean(id || conferenceId));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');

  useEffect(() => {
    if (id) api<{ data: ConferenceEdition }>(`/api/editions/${id}`)
      .then(({ data }) => {
        setEditionConferenceId(data.conference_id);
        setForm(formFromEdition(data));
      })
      .catch((error: Error) => setMessage(error.message))
      .finally(() => setLoading(false));
    else if (conferenceId) Promise.all([
      api<{ data: ConferenceWithEditions }>(`/api/conferences/${conferenceId}`),
      copyFrom ? api<{ data: ConferenceEdition }>(`/api/editions/${copyFrom}`) : Promise.resolve(null)
    ]).then(([conferenceResponse, sourceResponse]) => {
      setConference(conferenceResponse.data);
      if (!sourceResponse) return;
      const source = sourceResponse.data;
      const targetYear = copyTarget === 'next' ? source.year + 1 : source.year;
      setForm({
        ...formFromEdition(source),
        year: targetYear,
        edition_name: '',
        official_url: '',
        start_date: copyTarget === 'next' && source.start_date ? shiftIsoDateToYear(source.start_date, targetYear) : '',
        end_date: copyTarget === 'next' && source.end_date ? shiftIsoDateToYear(source.end_date, targetYear) : '',
        information_status: '未確認',
        is_cancelled: false,
        version: undefined
      });
      setDeadlines((source.deadlines ?? []).map((deadline) => copiedDeadline(deadline, copyTarget, targetYear)));
    }).catch((error: Error) => setMessage(error.message)).finally(() => setLoading(false));
  }, [conferenceId, copyFrom, copyTarget, id]);

  if (loading) return <Loading />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);
    setErrors({});
    setMessage('');
    try {
      const body = { ...form, edition_name: form.edition_name || null, official_url: form.official_url || null, country: form.country || null, city: form.city || null, start_date: form.start_date || null, end_date: form.end_date || null, timezone: form.timezone || null, notes: form.notes || null };
      const { data } = await api<{ data: ConferenceEdition }>(id ? `/api/editions/${id}` : `/api/editions/conference/${conferenceId}`, { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
      if (!id && deadlines.length) {
        await api(`/api/deadlines/edition/${data.id}/batch`, { method: 'POST', body: JSON.stringify({ deadlines: deadlines.map(deadlinePayload) }) });
      }
      navigate(`/editions/${data.id}`);
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
  const saveLabel = id ? '保存する' : deadlines.length ? `開催回と予定${deadlines.length}件を保存` : '開催回を保存';
  const cancelPath = id && editionConferenceId ? `/conferences/${editionConferenceId}` : `/conferences/${conferenceId ?? ''}`;
  const sameYearEditions = conference?.editions.filter((edition) => edition.year === form.year) ?? [];

  return <>
    <PageHeader title={id ? '開催回を編集' : '開催回と締切・予定を登録'} description={id ? '開催情報を更新します。保存後は開催回の詳細へ戻ります。' : '開催情報と必要な締切・予定を、この画面で一緒に登録します。'} action={id ? <Link className="btn-secondary" to={cancelPath}>← 学会の管理画面</Link> : undefined} />
    {setup && <div className="mx-auto max-w-3xl"><SetupProgress current={2} /></div>}
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
      {message && <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{message}</div>}
      {copyFrom && <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-900">複製内容はまだ保存されていません。日程と締切・予定を確認してから保存してください。</div>}
      <section className="surface p-5 sm:p-7"><h2 className="mb-5 px-2 text-lg font-black text-forest-950">開催情報</h2><div className="grid gap-5 sm:grid-cols-2"><label><span className="label">開催年 <b className="text-xs text-red-700">必須</b></span><input className="field" type="number" min="2000" max="2100" value={form.year} onChange={(event) => update('year', Number(event.target.value))} required /><FieldError value={errors.year} /></label><label><span className="label">開催回名 <span className="text-xs font-medium text-slate-400">任意</span></span><input className="field" placeholder="例：11月研究会" maxLength={120} value={form.edition_name} onChange={(event) => update('edition_name', event.target.value)} /><span className="mt-1 block text-xs leading-5 text-slate-500">年に複数回ある場合だけ入力すると、一覧で見分けやすくなります。</span><FieldError value={errors.edition_name} /></label>{!id && sameYearEditions.length > 0 && <div className="sm:col-span-2 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><p className="font-black">{form.year}年はすでに{sameYearEditions.length}件あります</p><p className="mt-1 text-xs leading-5">別の開催回ならそのまま追加できます。開催回名または開催開始日を入力してください。</p><div className="mt-2 flex flex-wrap gap-2">{sameYearEditions.map((edition) => <Link key={edition.id} className="font-bold text-forest-800 underline" to={`/editions/${edition.id}`}>{editionCardTitle(edition)}</Link>)}</div></div>}<label><span className="label">開催形式</span><select className="field" value={form.attendance_format} onChange={(event) => update('attendance_format', event.target.value)}>{ATTENDANCE_FORMATS.map((value) => <option key={value}>{value}</option>)}</select></label><label><span className="label">開催国</span><input className="field" value={form.country} onChange={(event) => update('country', event.target.value)} /></label><label><span className="label">開催都市</span><input className="field" value={form.city} onChange={(event) => update('city', event.target.value)} /></label><label className="sm:col-span-2"><span className="label">この開催回の公式URL</span><input className="field" type="url" placeholder="未入力時は学会公式URLを使用" value={form.official_url} onChange={(event) => update('official_url', event.target.value)} /><FieldError value={errors.official_url} /></label></div></section>
      <section className="surface p-5 sm:p-7"><h2 className="mb-5 px-2 text-lg font-black text-forest-950">日程</h2><div className="grid gap-5 sm:grid-cols-2"><label><span className="label">開催開始日</span><input className="field" type="date" value={form.start_date} onChange={(event) => update('start_date', event.target.value)} /></label><label><span className="label">開催終了日</span><input className="field" type="date" value={form.end_date} onChange={(event) => update('end_date', event.target.value)} /><FieldError value={errors.end_date} /></label><label><span className="label">タイムゾーン</span><input className="field" placeholder="Asia/Tokyo" value={form.timezone} onChange={(event) => update('timezone', event.target.value)} /></label><OfficialConfirmation checked={form.information_status === '公式'} onChange={(checked) => update('information_status', checked ? '公式' : '未確認')} /></div></section>
      {!id && <section className="surface p-5 sm:p-7"><h2 className="mb-5 px-2 text-lg font-black text-forest-950">締切・予定</h2><p className="mb-5 text-sm leading-6 text-slate-500">この開催回に必要な締切・予定をチェックしてください。選択した項目だけ入力欄が表示されます。</p><DeadlinePicker drafts={deadlines} onChange={setDeadlines} /></section>}
      <section className="surface p-5 sm:p-7"><h2 className="mb-5 px-2 text-lg font-black text-forest-950">補足</h2><p className="mb-3 text-sm leading-6 text-slate-500">未確定の内容など、必要な補足事項を記載してください。</p><textarea className="field min-h-24" placeholder="例：開催地は公式発表後に更新" maxLength={1000} value={form.notes} onChange={(event) => update('notes', event.target.value)} /><label className="mt-4 flex gap-2 text-sm font-semibold"><input type="checkbox" checked={form.is_cancelled} onChange={(event) => update('is_cancelled', event.target.checked)} /> 開催中止</label></section>
      <div className="flex justify-end gap-3"><Link className="btn-secondary" to={cancelPath}>{setup ? '後で入力する' : 'キャンセル'}</Link><button className="btn-primary" disabled={saving}>{saving ? '保存中…' : saveLabel}</button></div>
    </form>
  </>;
}

function formFromEdition(data: ConferenceEdition) {
  return { year: data.year, edition_name: data.edition_name ?? '', official_url: data.official_url ?? '', country: data.country ?? '', city: data.city ?? '', attendance_format: data.attendance_format, start_date: data.start_date ?? '', end_date: data.end_date ?? '', timezone: data.timezone ?? '', information_status: data.information_status === '公式' ? '公式' : '未確認', is_cancelled: Boolean(data.is_cancelled), notes: data.notes ?? '', version: data.version };
}

function copiedDeadline(deadline: ConferenceDeadline, target: 'same' | 'next', year: number): DeadlineDraft {
  const draft = deadlineToDraft(deadline);
  return {
    ...draft,
    date: target === 'next' ? shiftIsoDateToYear(draft.date, year) : '',
    information_status: '未確認',
    version: undefined
  };
}
