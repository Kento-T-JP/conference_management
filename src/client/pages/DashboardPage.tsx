import { useState } from 'react';
import { Link } from 'react-router-dom';
import type { Conference, ConferenceEdition, DashboardData, DashboardDeadline } from '../../shared/types';
import { daysUntil } from '../../shared/date';
import { editionDisplayName, editionPeriodLabel } from '../../shared/edition';
import { deadlineTypeLabel } from '../../shared/constants';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';
import { DeadlineBadge, ErrorState, formatDate, Loading, StatusBadge } from '../components/ui';

export function DashboardPage() {
  const { data, loading, error, reload } = useApi<DashboardData>('/api/dashboard/opportunities');
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? 'データがありません。'} retry={reload} />;
  const now = new Date();
  const within = (from: number, to: number) => data.deadlines.filter((item) => {
    if (!item.next_deadline) return false;
    const days = daysUntil(item.next_deadline, now, Boolean(item.is_aoe), Boolean(item.has_time));
    return days >= from && days <= to;
  });
  const nextDeadline = data.deadlines[0];
  const nextEdition = data.upcoming_editions[0];
  return <>
    <section className="dashboard-hero mb-5 flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
      <div className="relative z-10 max-w-2xl"><p className="mb-5 text-[.68rem] font-black uppercase tracking-[.25em] text-white/55">Shinomiya Laboratory</p><h1 className="text-4xl font-black leading-[1.04] tracking-[-.055em] sm:text-6xl">Next Deadline.<br />Instantly.</h1><p className="mt-5 max-w-lg text-sm font-medium leading-7 text-white/70 sm:text-base">篠宮研究室の学会情報から、直近の締切と今後の開催予定をまとめています。</p><Link to="/conferences/new" className="btn-primary mt-7">＋ 新規登録をはじめる</Link></div>
      <div className="hero-focus-card">
        <p className="text-xs font-black uppercase tracking-[.16em] text-white/65">次の予定</p>
        {nextDeadline ? <Link to={`/editions/${nextDeadline.id}`} className="mt-4 block rounded-2xl outline-none transition hover:bg-white/5 focus-visible:bg-white/5">
          <strong className="text-2xl font-black tracking-[-.04em]">{editionDisplayName(nextDeadline)}</strong>
          <p className="mt-2 text-sm font-bold text-white/80">{deadlineTypeLabel(nextDeadline.next_deadline_type ?? '')}</p>
          <p className="mt-1 text-sm text-white/65">{formatDate(nextDeadline.next_deadline, true)}{Boolean(nextDeadline.is_aoe) && ' (AoE)'}</p>
          <span className="mt-4 inline-flex text-xs font-black text-[#ffd4c8]">詳細を見る →</span>
        </Link> : nextEdition ? <Link to={`/editions/${nextEdition.id}`} className="mt-4 block rounded-2xl outline-none transition hover:bg-white/5 focus-visible:bg-white/5">
          <strong className="text-2xl font-black tracking-[-.04em]">{editionDisplayName(nextEdition)}</strong>
          <p className="mt-2 text-sm font-bold text-white/80">開催予定</p>
          <p className="mt-1 text-sm text-white/65">{formatDate(nextEdition.start_date)} · {[nextEdition.city, nextEdition.country].filter(Boolean).join(', ') || '開催地未定'}</p>
          <span className="mt-4 inline-flex text-xs font-black text-[#ffd4c8]">詳細を見る →</span>
        </Link> : <div className="mt-4"><p className="text-lg font-black">予定は未登録です</p><p className="mt-2 text-sm leading-6 text-white/65">学会と開催回を登録すると、次に確認すべき予定をここに表示します。</p></div>}
      </div>
    </section>
    <section className="grid gap-4 sm:grid-cols-3" aria-label="今後90日間の締切">
      <SummaryCard label="7日以内" items={within(0, 7)} tone="urgent" />
      <SummaryCard label="30日以内" items={within(8, 30)} tone="soon" />
      <SummaryCard label="90日以内" items={within(31, 90)} tone="normal" />
    </section>

    <section className="mt-8"><SectionTitle title="直近の締切" link="/editions" />
        {data.deadlines.length ? <div className="surface divide-y divide-slate-100 overflow-hidden">{data.deadlines.slice(0, 6).map((item) => <Link key={item.deadline_id} to={`/editions/${item.id}`} className="grid gap-3 p-4 transition hover:bg-forest-50 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><span className="text-base font-black text-forest-950">{editionDisplayName(item)}</span><StatusBadge value={item.deadline_status} /></div><p className="mt-1 text-sm font-semibold text-slate-700">{deadlineTypeLabel(item.next_deadline_type ?? '')} · {formatDate(item.next_deadline, true)}{Boolean(item.is_aoe) && ' (AoE)'}</p></div>
          <DeadlineBadge date={item.next_deadline!} aoe={Boolean(item.is_aoe)} hasTime={Boolean(item.has_time)} />
        </Link>)}</div> : <DeadlineEmptyState />}
    </section>

    <section className="mt-8"><SectionTitle title="今後開催される学会" link="/calendar" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.upcoming_editions.slice(0, 6).map((item) => <Link to={`/editions/${item.id}`} key={item.id} className="surface p-5 transition hover:-translate-y-0.5 hover:border-forest-700"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-black text-forest-950">{editionDisplayName(item)}</h3><StatusBadge value={item.information_status} /></div><p className="mt-3 text-sm text-slate-600">{formatDate(item.start_date)}{item.end_date && ` 〜 ${formatDate(item.end_date)}`}</p><p className="mt-1 text-sm text-slate-500">{[item.city, item.country].filter(Boolean).join(', ') || '開催地未定'} · {item.attendance_format}</p></Link>)}</div>
    </section>
  </>;
}

function SummaryCard({ label, items, tone }: { label: string; items: DashboardDeadline[]; tone: 'urgent' | 'soon' | 'normal' }) {
  const styles = { urgent: 'bg-[#fae9e3] text-[#9e3f2d]', soon: 'bg-[#f5ead5] text-[#7e5a24]', normal: 'bg-[#dfece5] text-forest-900' };
  const visibleItems = items.slice(0, 6);
  return <div className={`bento-card h-full ${styles[tone]}`}>
    <div className="flex items-center justify-between gap-3"><p className="text-sm font-black tracking-[.06em] opacity-75">{label}</p><span className="text-xs font-black opacity-60">{items.length}件</span></div>
    {visibleItems.length ? <div className="mt-4 space-y-2">{visibleItems.map((item) => <Link key={item.deadline_id} to={`/editions/${item.id}`} className="block rounded-2xl bg-white/45 p-3 outline-none transition hover:-translate-y-0.5 hover:bg-white/70 focus-visible:-translate-y-0.5 focus-visible:bg-white/70">
      <strong className="block truncate text-sm font-black">{editionDisplayName(item)}</strong>
      <span className="mt-1 block truncate text-xs font-bold opacity-75">{deadlineTypeLabel(item.next_deadline_type ?? '')} · {formatDate(item.next_deadline, true)}{item.is_aoe ? ' (AoE)' : ''}</span>
    </Link>)}</div> : <><p className="mt-5 text-lg font-black">予定なし</p><p className="mt-1 text-xs font-semibold opacity-65">この期間の締切はありません</p></>}
    {items.length > visibleItems.length && <Link className="mt-3 inline-flex text-xs font-black underline decoration-current/30 underline-offset-4" to="/editions">ほか{items.length - visibleItems.length}件を見る →</Link>}
  </div>;
}

function SectionTitle({ title, link }: { title: string; link?: string }) { return <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><span className="h-px w-6 bg-[#e36f50]" /><h2 className="text-lg font-black tracking-[-.025em] text-forest-950">{title}</h2></div>{link && <Link to={link} className="rounded-full bg-white/60 px-3 py-1.5 text-xs font-black text-forest-700 transition hover:bg-white">すべて見る →</Link>}</div>; }

function DeadlineEmptyState() {
  const [showExisting, setShowExisting] = useState(false);
  const [conferences, setConferences] = useState<Conference[] | null>(null);
  const [editions, setEditions] = useState<ConferenceEdition[]>([]);
  const [conferenceId, setConferenceId] = useState('');
  const [editionId, setEditionId] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function chooseExisting() {
    setShowExisting(true);
    if (conferences) return;
    setLoading(true);
    setMessage('');
    try {
      const response = await api<{ data: Conference[] }>('/api/conferences');
      setConferences(response.data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '学会一覧を読み込めませんでした。');
    } finally {
      setLoading(false);
    }
  }

  async function selectConference(value: string) {
    setConferenceId(value);
    setEditionId('');
    setEditions([]);
    setMessage('');
    if (!value) return;
    setLoading(true);
    try {
      const response = await api<{ data: Conference & { editions: ConferenceEdition[] } }>(`/api/conferences/${value}`);
      setEditions(response.data.editions.filter((edition) => !edition.is_archived));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : '開催回を読み込めませんでした。');
    } finally {
      setLoading(false);
    }
  }

  const destination = !conferenceId || !editionId ? '' : editionId === 'new' ? `/conferences/${conferenceId}/editions/new` : `/editions/${editionId}?add=deadline#deadline-form`;

  return <div className="surface overflow-hidden p-5 sm:p-7">
    <div className="text-center"><p className="section-kicker">Add a deadline</p><h3 className="mt-2 text-xl font-black text-forest-950">90日以内の締切はありません</h3><p className="mt-2 text-sm leading-6 text-slate-500">追加方法を選んでください。</p></div>
    <div className="mt-6 grid gap-3 sm:grid-cols-2">
      <Link to="/conferences/new" className="deadline-empty-choice"><span>01</span><div><strong>新しい学会を登録</strong><small>学会情報、開催回、締切・予定を順番に登録します</small></div><b>→</b></Link>
      <button type="button" className={`deadline-empty-choice text-left ${showExisting ? 'is-active' : ''}`} onClick={chooseExisting} aria-expanded={showExisting}><span>02</span><div><strong>既存の学会に追加</strong><small>登録済みの学会と開催回を選びます</small></div><b>{showExisting ? '↓' : '→'}</b></button>
    </div>
    {showExisting && <div className="mt-5 rounded-[1.35rem] border border-forest-700/15 bg-forest-50/70 p-4 sm:p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <label><span className="label">1. 学会を選択</span><select className="field" value={conferenceId} onChange={(event) => void selectConference(event.target.value)} disabled={loading && !conferences}><option value="">学会を選んでください</option>{conferences?.map((conference) => <option key={conference.id} value={conference.id}>{conference.acronym} — {conference.name}</option>)}</select></label>
        <label><span className="label">2. 開催回を選択</span><select className="field" value={editionId} onChange={(event) => setEditionId(event.target.value)} disabled={!conferenceId || loading}><option value="">開催回を選んでください</option>{editions.map((edition) => <option key={edition.id} value={edition.id}>{editionPeriodLabel(edition)}{edition.city ? ` — ${edition.city}` : ''}</option>)}<option value="new">＋ 新しい開催回と締切・予定を登録</option></select></label>
      </div>
      {loading && <p className="mt-3 text-xs font-bold text-slate-500">読み込んでいます…</p>}
      {message && <p className="mt-3 text-sm font-semibold text-red-700">{message}</p>}
      {conferences && !conferences.length && <p className="mt-3 text-sm text-slate-500">登録済みの学会がありません。「新しい学会を登録」を選んでください。</p>}
      <div className="mt-5 flex justify-end">{destination ? <Link className="btn-primary" to={destination}>{editionId === 'new' ? '開催回と締切・予定を登録' : 'この開催回に締切・予定を追加'} →</Link> : <button type="button" className="btn-primary" disabled>追加先を選択してください</button>}</div>
    </div>}
  </div>;
}
