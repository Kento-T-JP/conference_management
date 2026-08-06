import { type FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import type { Conference } from '../../shared/types';
import { CONFERENCE_TYPES, FREQUENCIES } from '../../shared/constants';
import { ApiClientError, api } from '../lib/api';
import { FieldError, Loading, PageHeader } from '../components/ui';
import { SetupProgress } from '../components/SetupProgress';

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
      navigate(id ? `/conferences/${response.data.id}` : `/conferences/${response.data.id}/editions/new?setup=1`);
    } catch (error) {
      if (error instanceof ApiClientError) { setErrors(error.body.error.details ?? {}); setMessage(error.message); }
      else setMessage('保存に失敗しました。');
    } finally { setSaving(false); }
  }

  const update = (key: keyof typeof form, value: string) => setForm({ ...form, [key]: value });
  return <><PageHeader title={id ? '学会情報を編集' : '学会を登録'} description={id ? undefined : 'まず、年度によらない学会共通の情報を登録します。'} />
    {!id && <div className="mx-auto max-w-3xl"><SetupProgress current={1} /></div>}
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-5">
      {message && <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">{message}</div>}
      {!id && <div className="rounded-[1.35rem] border border-forest-700/15 bg-forest-50/80 p-4 text-sm leading-6 text-forest-900"><strong className="font-black">この画面で入力するもの</strong><p className="mt-1 text-forest-900/70">学会の名称・公式サイト・分野などの共通情報です。開催年、開催地、開催日程、締切は次の画面でまとめて入力します。</p></div>}
      <fieldset className="surface p-5 sm:p-7"><FormLegend number="01" title="基本情報" description="公式サイトを見ながら、学会を識別するための情報を入力します。" /><div className="grid gap-5 sm:grid-cols-3">
        <label className="sm:col-span-2"><span className="label">正式名称 <Required /></span><input className="field" placeholder="IEEE/CVF Conference on Computer Vision and Pattern Recognition" value={form.name} onChange={(e) => update('name', e.target.value)} maxLength={200} required /><FieldHint>公式サイトに記載されている学会名を入力します。</FieldHint><FieldError value={errors.name} /></label>
        <label><span className="label">略称 <Required /></span><input className="field" placeholder="例：IEEE/CVF CVPR" value={form.acronym} onChange={(e) => update('acronym', e.target.value)} maxLength={40} required /><FieldHint>一覧や通知で表示する短い名称です。</FieldHint><FieldError value={errors.acronym} /></label>
        <label className="sm:col-span-3"><span className="label">学会の公式URL <Required /></span><input className="field" type="url" placeholder="https://cvpr.thecvf.com/" value={form.official_url} onChange={(e) => update('official_url', e.target.value)} required /><FieldHint>学会全体の公式ページです。各開催回のページは次の画面で入力できます。</FieldHint><FieldError value={errors.official_url} /></label>
      </div></fieldset>
      <fieldset className="surface p-5 sm:p-7"><FormLegend number="02" title="分類と探しやすさ" description="一覧の整理や検索に使う情報です。" /><div className="grid gap-5 sm:grid-cols-2">
        <label><span className="label">学会種別 <Required /></span><select className="field" value={form.conference_type} onChange={(e) => update('conference_type', e.target.value)}>{CONFERENCE_TYPES.map((v) => <option key={v}>{v}</option>)}</select><FieldHint>国際会議、国内学会などの区分です。</FieldHint></label>
        <label><span className="label">開催頻度 <Required /></span><select className="field" value={form.frequency} onChange={(e) => update('frequency', e.target.value)}>{FREQUENCIES.map((v) => <option key={v}>{v}</option>)}</select><FieldHint>次年度情報の登録漏れを見つけるために使います。</FieldHint></label>
        <label><span className="label">研究分野 <Optional /></span><input className="field" placeholder="数理最適化, 機械学習" value={form.fields} onChange={(e) => update('fields', e.target.value)} /><FieldHint>複数ある場合はカンマで区切ります。</FieldHint></label>
        <label><span className="label">検索キーワード <Optional /></span><input className="field" placeholder="グラフ理論, 通信, 組合せ最適化" value={form.keywords} onChange={(e) => update('keywords', e.target.value)} /><FieldHint>正式名称や略称以外で検索したい言葉を入力します。</FieldHint></label>
      </div></fieldset>
      <fieldset className="surface p-5 sm:p-7"><FormLegend number="03" title="補足" description="年度によらず、この学会に共通する注意事項があれば記録します。" /><label><span className="label">備考 <Optional /></span><textarea className="field min-h-28" placeholder="例：本会議に加えてワークショップ日程あり" maxLength={1000} value={form.notes} onChange={(e) => update('notes', e.target.value)} /><FieldHint>開催回ごとの情報は次の画面の備考へ入力してください。</FieldHint></label></fieldset>
      <div className="flex justify-end gap-3"><Link to={id ? `/conferences/${id}` : '/conferences'} className="btn-secondary">キャンセル</Link><button className="btn-primary" disabled={saving}>{saving ? '保存中…' : id ? '保存する' : '次へ：開催回と締切を入力'}</button></div>
    </form></>;
}

function split(value: string) { return value.split(',').map((item) => item.trim()).filter(Boolean); }
function Required() { return <span className="text-xs text-red-700">必須</span>; }
function Optional() { return <span className="text-xs font-bold normal-case tracking-normal text-slate-400">任意</span>; }
function FieldHint({ children }: { children: string }) { return <span className="field-hint">{children}</span>; }
function FormLegend({ number, title, description }: { number: string; title: string; description: string }) { return <legend className="mb-6 w-full px-2"><span className="mr-3 inline-flex size-8 items-center justify-center rounded-full bg-forest-950 text-xs font-black text-white">{number}</span><span className="text-lg font-black text-forest-950">{title}</span><span className="mt-2 block pl-11 text-sm font-medium leading-6 text-slate-500">{description}</span></legend>; }
