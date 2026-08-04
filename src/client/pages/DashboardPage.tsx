import { Link } from 'react-router-dom';
import type { DashboardData } from '../../shared/types';
import { useApi } from '../hooks/useApi';
import { DeadlineBadge, EmptyState, ErrorState, formatDate, Loading, StatusBadge } from '../components/ui';

export function DashboardPage() {
  const { data, loading, error, reload } = useApi<DashboardData>('/api/dashboard/opportunities');
  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? 'データがありません。'} retry={reload} />;
  const within = (days: number) => data.deadlines.filter((item) => {
    if (!item.next_deadline) return false;
    const diff = (new Date(item.next_deadline).getTime() - Date.now()) / 86_400_000;
    return diff >= 0 && diff <= days;
  });
  return <>
    <section className="dashboard-hero mb-5 flex flex-col justify-between gap-8 sm:flex-row sm:items-end">
      <div className="relative z-10 max-w-2xl"><p className="mb-5 text-[.68rem] font-black uppercase tracking-[.25em] text-white/55">Shinomiya Laboratory</p><h1 className="text-4xl font-black leading-[1.04] tracking-[-.055em] sm:text-6xl">次の締切を、<br />ひと目で。</h1><p className="mt-5 max-w-lg text-sm font-medium leading-7 text-white/70 sm:text-base">篠宮研究室の学会情報から、直近の締切と確認が必要な項目をまとめています。</p><Link to="/conferences/new" className="btn-primary mt-7">＋ 新規登録をはじめる</Link></div>
      <div className="hero-count"><div><strong className="block text-5xl font-black tracking-[-.06em]">{within(90).length}</strong><span className="mt-1 block text-[.62rem] font-black uppercase tracking-[.18em] text-white/60">Next 90 days</span></div></div>
    </section>
    <section className="grid gap-4 sm:grid-cols-3" aria-label="締切サマリー">
      <SummaryCard label="7日以内" value={within(7).length} tone="urgent" />
      <SummaryCard label="30日以内" value={within(30).length} tone="soon" />
      <SummaryCard label="90日以内" value={within(90).length} tone="normal" />
    </section>

    <div className="mt-8 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section><SectionTitle title="直近の締切" link="/editions" />
        {data.deadlines.length ? <div className="surface divide-y divide-slate-100 overflow-hidden">{data.deadlines.slice(0, 10).map((item) => <Link key={String((item as unknown as { deadline_id: number }).deadline_id)} to={`/editions/${item.id}`} className="grid gap-3 p-4 transition hover:bg-forest-50 sm:grid-cols-[1fr_auto] sm:items-center">
          <div><div className="flex flex-wrap items-center gap-2"><span className="text-base font-black text-forest-950">{item.acronym}</span><span className="text-sm text-slate-500">{item.year}</span><StatusBadge value={String((item as unknown as { deadline_status: string }).deadline_status)} /></div><p className="mt-1 text-sm font-semibold text-slate-700">{item.next_deadline_type} · {formatDate(item.next_deadline, true)}{Boolean((item as unknown as { is_aoe: number }).is_aoe) && ' (AoE)'}</p></div>
          <DeadlineBadge date={item.next_deadline!} aoe={Boolean((item as unknown as { is_aoe: number }).is_aoe)} hasTime={Boolean((item as unknown as { has_time: number }).has_time)} />
        </Link>)}</div> : <EmptyState title="90日以内の締切はありません" body="新しい開催回と締切を登録すると、ここに締切順で表示されます。" />}
      </section>

      <div className="space-y-6">
        <section><SectionTitle title="次年度情報が未登録" />
          <div className="surface p-4">{data.missing_next_editions.length ? <ul className="space-y-3">{data.missing_next_editions.map((item) => <li key={item.id} className="flex items-center justify-between gap-3"><Link className="font-bold text-forest-900 hover:underline" to={`/conferences/${item.id}`}>{item.acronym}</Link><span className="chip bg-amber-100 text-amber-900">{item.expected_year}年</span></li>)}</ul> : <p className="text-sm text-slate-500">未登録の定期開催学会はありません。</p>}</div>
        </section>
        <section><SectionTitle title="情報の確認が必要" />
          <div className="surface p-4">{data.unconfirmed.length ? <ul className="space-y-3">{data.unconfirmed.slice(0, 6).map((item) => <li key={item.id} className="flex items-center justify-between gap-3"><Link className="font-bold text-forest-900 hover:underline" to={`/editions/${item.id}`}>{item.acronym} {item.year}</Link><StatusBadge value={item.information_status} /></li>)}</ul> : <p className="text-sm text-slate-500">確認待ちの開催回はありません。</p>}</div>
        </section>
      </div>
    </div>

    <section className="mt-8"><SectionTitle title="今後開催される学会" link="/calendar" />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">{data.upcoming_editions.slice(0, 6).map((item) => <Link to={`/editions/${item.id}`} key={item.id} className="surface p-5 transition hover:-translate-y-0.5 hover:border-forest-700"><div className="flex items-start justify-between gap-3"><h3 className="text-lg font-black text-forest-950">{item.acronym} {item.year}</h3><StatusBadge value={item.information_status} /></div><p className="mt-3 text-sm text-slate-600">{formatDate(item.start_date)}{item.end_date && ` 〜 ${formatDate(item.end_date)}`}</p><p className="mt-1 text-sm text-slate-500">{[item.city, item.country].filter(Boolean).join(', ') || '開催地未定'} · {item.attendance_format}</p></Link>)}</div>
    </section>
  </>;
}

function SummaryCard({ label, value, tone }: { label: string; value: number; tone: 'urgent' | 'soon' | 'normal' }) {
  const styles = { urgent: 'bg-[#fae9e3] text-[#9e3f2d]', soon: 'bg-[#f5ead5] text-[#7e5a24]', normal: 'bg-[#dfece5] text-forest-900' };
  return <div className={`bento-card ${styles[tone]}`}><p className="text-[.68rem] font-black uppercase tracking-[.16em] opacity-65">{label}の締切</p><p className="mt-4 text-5xl font-black tracking-[-.06em] tabular-nums">{value}<span className="ml-2 text-xs tracking-normal opacity-60">件</span></p></div>;
}

function SectionTitle({ title, link }: { title: string; link?: string }) { return <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><span className="h-px w-6 bg-[#e36f50]" /><h2 className="text-lg font-black tracking-[-.025em] text-forest-950">{title}</h2></div>{link && <Link to={link} className="rounded-full bg-white/60 px-3 py-1.5 text-xs font-black text-forest-700 transition hover:bg-white">すべて見る →</Link>}</div>; }
