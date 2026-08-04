import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import jaLocale from '@fullcalendar/core/locales/ja';
import type { EventClickArg, EventSourceFuncArg } from '@fullcalendar/core';
import { type MouseEvent as ReactMouseEvent, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { CALENDAR_EVENT_GROUPS, CONFERENCE_TYPES } from '../../shared/constants';
import { api, queryString } from '../lib/api';
import { PageHeader } from '../components/ui';

interface CalendarEvent { id: string; title: string; start: string; end?: string; allDay: boolean; url: string; extendedProps: { kind: string; status: string }; }

export function CalendarPage() {
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar>(null);
  const [categories, setCategories] = useState<string[]>(CALENDAR_EVENT_GROUPS.map((group) => group.id));
  const [officialOnly, setOfficialOnly] = useState(false);
  const [conferenceType, setConferenceType] = useState('');
  const [field, setField] = useState('');
  const eventSource = useMemo(() => async (info: EventSourceFuncArg, success: (events: CalendarEvent[]) => void, failure: (error: Error) => void) => { try { const { data } = await api<{ data: CalendarEvent[] }>(`/api/calendar/events${queryString({ start: info.startStr.slice(0, 10), end: info.endStr.slice(0, 10), event_categories: categories.length ? categories.join(',') : 'none', information_status: officialOnly ? '公式' : '', conference_types: conferenceType, fields: field.trim() })}`); success(data); } catch (e) { failure(e instanceof Error ? e : new Error('読み込みに失敗しました。')); } }, [categories, officialOnly, conferenceType, field]);
  function toggle(type: string) { setCategories((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]); }
  function resetFilters() { setCategories(CALENDAR_EVENT_GROUPS.map((group) => group.id)); setOfficialOnly(false); setConferenceType(''); setField(''); }
  function openMonth(event: ReactMouseEvent<HTMLDivElement>) {
    const target = event.target instanceof Element ? event.target : null;
    if (!target || target.closest('.fc-event, button, a')) return;
    const month = target.closest<HTMLElement>('.fc-multimonth-month');
    const calendar = calendarRef.current?.getApi();
    if (month?.dataset.date && calendar?.view.type === 'multiMonthYear') calendar.changeView('dayGridMonth', `${month.dataset.date}-01`);
  }
  return <><PageHeader title="カレンダー" description="月／年を切り替えられます。年表示では日付を選ぶと、その月を開きます。" />
    <div className="surface mb-5 p-4 sm:p-5"><div className="flex items-center justify-between gap-4"><p className="text-sm font-black text-forest-950">表示する予定</p><button type="button" onClick={resetFilters} className="text-xs font-bold text-slate-500 hover:text-forest-900">条件をリセット</button></div><div className="mt-3 flex flex-wrap gap-2">{CALENDAR_EVENT_GROUPS.map((group) => <label key={group.id} className={`calendar-filter calendar-filter--${group.id} ${categories.includes(group.id) ? 'is-active' : ''}`}><input className="sr-only" type="checkbox" checked={categories.includes(group.id)} onChange={() => toggle(group.id)} /><span className="calendar-filter-dot" />{group.label}</label>)}</div><div className="mt-5 grid gap-4 border-t border-slate-200/70 pt-5 sm:grid-cols-[1fr_1fr_auto] sm:items-end"><label><span className="label">研究分野</span><input className="field" placeholder="例：数理最適化" value={field} onChange={(e) => setField(e.target.value)} /></label><label><span className="label">学会種別</span><select className="field" value={conferenceType} onChange={(e) => setConferenceType(e.target.value)}><option value="">すべて</option>{CONFERENCE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label className="choice-card min-h-[3.1rem] items-center py-3"><input className="size-4 accent-[#2c6652]" type="checkbox" checked={officialOnly} onChange={(e) => setOfficialOnly(e.target.checked)} /><span className="text-sm font-bold text-forest-950">公式情報のみ</span></label></div></div>
    <div className="surface overflow-x-auto p-3 sm:p-5"><div className="min-w-[680px]" onClick={openMonth}><FullCalendar ref={calendarRef} plugins={[dayGridPlugin, interactionPlugin, multiMonthPlugin]} initialView="dayGridMonth" locales={[jaLocale]} locale="ja" firstDay={1} height="auto" dayMaxEvents={false} multiMonthMaxColumns={3} multiMonthMinWidth={220} headerToolbar={{ left: 'prev,next', center: 'title', right: 'today dayGridMonth,multiMonthYear' }} buttonText={{ today: '今日' }} views={{ dayGridMonth: { buttonText: '月' }, multiMonthYear: { buttonText: '年' } }} events={eventSource} dayCellClassNames={(arg) => arg.view.type === 'multiMonthYear' ? ['calendar-year-day'] : []} eventClick={(arg: EventClickArg) => { arg.jsEvent.preventDefault(); navigate(new URL(arg.event.url, window.location.origin).pathname); }} eventClassNames={(arg) => [`calendar-event--${String(arg.event.extendedProps.kind)}`]} /></div></div>
  </>;
}
