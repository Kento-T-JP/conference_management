import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import jaLocale from '@fullcalendar/core/locales/ja';
import type { DatesSetArg, EventClickArg, EventSourceFuncArg } from '@fullcalendar/core';
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { DEADLINE_TYPES } from '../../shared/constants';
import { api, queryString } from '../lib/api';
import { PageHeader } from '../components/ui';

interface CalendarEvent { id: string; title: string; start: string; end?: string; allDay: boolean; url: string; extendedProps: { kind: string; status: string }; }

export function CalendarPage() {
  const navigate = useNavigate();
  const [types, setTypes] = useState<string[]>([...DEADLINE_TYPES, 'Conference']);
  const [officialOnly, setOfficialOnly] = useState(false);
  const [range, setRange] = useState({ start: '', end: '' });
  const eventSource = useMemo(() => async (info: EventSourceFuncArg, success: (events: CalendarEvent[]) => void, failure: (error: Error) => void) => { try { const { data } = await api<{ data: CalendarEvent[] }>(`/api/calendar/events${queryString({ start: info.startStr.slice(0, 10), end: info.endStr.slice(0, 10), event_types: types.join(','), information_status: officialOnly ? '公式' : '' })}`); success(data); } catch (e) { failure(e instanceof Error ? e : new Error('読み込みに失敗しました。')); } }, [types, officialOnly]);
  function toggle(type: string) { setTypes((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]); }
  return <><PageHeader title="カレンダー" description="締切と開催期間を月ごとに確認します。" />
    <div className="surface mb-5 p-4"><div className="flex flex-wrap gap-2">{[...DEADLINE_TYPES, 'Conference'].map((type) => <label key={type} className={`cursor-pointer rounded-full border px-3 py-2 text-xs font-bold ${types.includes(type) ? 'border-forest-700 bg-forest-50 text-forest-900' : 'border-slate-200 text-slate-400'}`}><input className="sr-only" type="checkbox" checked={types.includes(type)} onChange={() => toggle(type)} />{type === 'Conference' ? '開催期間' : type}</label>)}</div><label className="mt-4 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={officialOnly} onChange={(e) => setOfficialOnly(e.target.checked)} /> 公式情報のみ表示</label></div>
    <div className="surface overflow-x-auto p-3 sm:p-5"><div className="min-w-[680px]"><FullCalendar key={`${types.join('-')}-${officialOnly}-${range.start}`} plugins={[dayGridPlugin, interactionPlugin]} initialView="dayGridMonth" locales={[jaLocale]} locale="ja" firstDay={1} height="auto" dayMaxEvents={false} headerToolbar={{ left: 'prev,next today', center: 'title', right: '' }} buttonText={{ today: '今日' }} events={eventSource} datesSet={(arg: DatesSetArg) => setRange({ start: arg.startStr, end: arg.endStr })} eventClick={(arg: EventClickArg) => { arg.jsEvent.preventDefault(); navigate(new URL(arg.event.url, window.location.origin).pathname); }} eventClassNames={(arg) => arg.event.extendedProps.status === '公式' ? ['bg-forest-700'] : arg.event.extendedProps.status === '未確認' ? ['bg-slate-500'] : ['bg-amber-500']} /></div></div>
  </>;
}
