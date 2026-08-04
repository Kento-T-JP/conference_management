import { Link } from 'react-router-dom';
import type { DashboardData } from '../../shared/types';
import { useApi } from '../hooks/useApi';
import { DeadlineBadge, EmptyState, ErrorState, formatDate, Loading, PageHeader, StatusBadge } from '../components/ui';

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
    <PageHeader title="締切を確認する" description="直近の締切と、確認が必要な学会を表示しています。" action={<Link to="/conferences/new" className="btn-primary">＋ 学会を追加</Link>} />
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
  const styles = { urgent: 'border-red-200 bg-red-50 text-red-900', soon: 'border-amber-200 bg-amber-50 text-amber-900', normal: 'border-forest-100 bg-forest-50 text-forest-900' };
  return <div className={`rounded-2xl border p-5 ${styles[tone]}`}><p className="text-sm font-bold">{label}の締切</p><p className="mt-2 text-4xl font-black tabular-nums">{value}<span className="ml-1 text-sm">件</span></p></div>;
}

function SectionTitle({ title, link }: { title: string; link?: string }) { return <div className="mb-3 flex items-center justify-between"><h2 className="text-lg font-black text-forest-950">{title}</h2>{link && <Link to={link} className="text-sm font-bold text-forest-700 hover:underline">すべて見る →</Link>}</div>; }
