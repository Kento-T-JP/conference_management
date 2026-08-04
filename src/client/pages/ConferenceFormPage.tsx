import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Conference } from '../../shared/types';
import { CONFERENCE_TYPES, FREQUENCIES } from '../../shared/constants';
import { ApiClientError, api } from '../lib/api';
import { FieldError, Loading, PageHeader } from '../components/ui';

const empty = { name: '', acronym: '', official_url: '', conference_type: '国際会議', frequency: '毎年', fields: '', keywords: '', notes: '', version: undefined as number | undefined };

export function ConferenceFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState(empty);
  const [loading, setLoading] = useState(Boolean(id));
  const [saving, setSaving] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (!id) return;
    api<{ data: Conference }>(`/api/conferences/${id}`).then(({ data }) => setForm({ name: data.name, acronym: data.acronym, official_url: data.official_url, conference_type: data.conference_type, frequency: data.frequency, fields: data.fields.join(', '), keywords: data.keywords.join(', '), notes: data.notes ?? '', version: data.version })).catch((e: Error) => setMessage(e.message)).finally(() => setLoading(false));
  }, [id]);
  if (loading) return <Loading />;

  async function submit(event: FormEvent) {
    event.preventDefault(); setSaving(true); setErrors({}); setMessage('');
    const body = { ...form, fields: split(form.fields), keywords: split(form.keywords), notes: form.notes || null };
    try {
      const response = await api<{ data: Conference; warnings?: { duplicates?: unknown[] } }>(id ? `/api/conferences/${id}` : '/api/conferences', { method: id ? 'PUT' : 'POST', body: JSON.stringify(body) });
      if (response.warnings?.duplicates?.length) setMessage('重複候補があります。登録内容を確認してください。');
      navigate(`/conferences/${response.data.id}`);
    } catch (error) {
      if (error instanceof ApiClientError) { setErrors(error.body.error.details ?? {}); setMessage(error.message); }
      else setMessage('保存に失敗しました。');
    } finally { setSaving(false); }
  }

  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  return <><PageHeader title={id ? '学会情報を編集' : '学会を追加'} description="年度ごとの開催日や締切は、学会を保存した後に開催回として追加します。" />
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
      {message && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{message}</div>}
      <fieldset className="surface p-5 sm:p-7"><legend className="px-2 text-lg font-black text-forest-950">基本情報</legend><div className="grid gap-5 sm:grid-cols-3">
        <label className="sm:col-span-2"><span className="label">正式名称 <Required /></span><input className="field" value={form.name} onChange={(e) => update('name', e.target.value)} maxLength={200} required /><FieldError value={errors.name} /></label>
        <label><span className="label">略称 <Required /></span><input className="field" value={form.acronym} onChange={(e) => update('acronym', e.target.value)} maxLength={40} required /><FieldError value={errors.acronym} /></label>
        <label className="sm:col-span-3"><span className="label">公式URL <Required /></span><input className="field" type="url" placeholder="https://…" value={form.official_url} onChange={(e) => update('official_url', e.target.value)} required /><FieldError value={errors.official_url} /></label>
      </div></fieldset>
      <fieldset className="surface p-5 sm:p-7"><legend className="px-2 text-lg font-black text-forest-950">分類</legend><div className="grid gap-5 sm:grid-cols-2">
        <label><span className="label">学会種別 <Required /></span><select className="field" value={form.conference_type} onChange={(e) => update('conference_type', e.target.value)}>{CONFERENCE_TYPES.map((v) => <option key={v}>{v}</option>)}</select></label>
        <label><span className="label">開催頻度 <Required /></span><select className="field" value={form.frequency} onChange={(e) => update('frequency', e.target.value)}>{FREQUENCIES.map((v) => <option key={v}>{v}</option>)}</select></label>
        <label><span className="label">分野</span><input className="field" placeholder="バイオ情報, 医療情報" value={form.fields} onChange={(e) => update('fields', e.target.value)} /><span className="mt-1 block text-xs text-slate-500">カンマ区切りで入力</span></label>
        <label><span className="label">検索キーワード</span><input className="field" placeholder="bioinformatics, BIBM" value={form.keywords} onChange={(e) => update('keywords', e.target.value)} /></label>
      </div></fieldset>
      <fieldset className="surface p-5 sm:p-7"><legend className="px-2 text-lg font-black text-forest-950">補足</legend><label><span className="label">備考</span><textarea className="field min-h-28" maxLength={1000} value={form.notes} onChange={(e) => update('notes', e.target.value)} /></label></fieldset>
      <div className="flex justify-end gap-3"><Link to={id ? `/conferences/${id}` : '/conferences'} className="btn-secondary">キャンセル</Link><button className="btn-primary" disabled={saving}>{saving ? '保存中…' : '保存する'}</button></div>
    </form></>;
}

function split(value: string) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function Required() { return <span className="text-xs text-red-700">必須</span>; }
