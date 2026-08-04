import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin, { type DateClickArg } from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import timeGridPlugin from '@fullcalendar/timegrid';
import luxonPlugin from '@fullcalendar/luxon3';
import jaLocale from '@fullcalendar/core/locales/ja';
import type { DatesSetArg, EventClickArg, EventContentArg, EventSourceFuncArg } from '@fullcalendar/core';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { CALENDAR_EVENT_GROUPS, CONFERENCE_TYPES } from '../../shared/constants';
import { JAPAN_TIME_ZONE } from '../../shared/timezone';
import { api, queryString } from '../lib/api';
import { deadlineName } from '../lib/deadlineDraft';
import { PageHeader } from '../components/ui';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay: boolean;
  url: string;
  extendedProps: { kind: string; status: string; deadlineType?: string; aoe?: boolean; editionId?: number; conferenceName?: string; sourceTimezone?: string };
}

const viewOptions = [
  { value: 'dayGridMonth', label: '月' },
  { value: 'timeGridWeek', label: '週' },
  { value: 'timeGridDay', label: '日' },
  { value: 'multiMonthYear', label: '年' }
];

export function CalendarPage() {
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar>(null);
  const [categories, setCategories] = useState<string[]>(CALENDAR_EVENT_GROUPS.map((group) => group.id));
  const [conferenceType, setConferenceType] = useState('');
  const [field, setField] = useState('');
  const [search, setSearch] = useState('');
  const [view, setView] = useState('dayGridMonth');
  const [calendarTitle, setCalendarTitle] = useState('');
  const [visibleEvents, setVisibleEvents] = useState<CalendarEvent[]>([]);
  const [calendarError, setCalendarError] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const eventSource = useMemo(() => async (info: EventSourceFuncArg, success: (events: CalendarEvent[]) => void, failure: (error: Error) => void) => {
    try {
      setCalendarError('');
      const { data } = await api<{ data: CalendarEvent[] }>(`/api/calendar/events${queryString({ start: info.startStr.slice(0, 10), end: info.endStr.slice(0, 10), event_categories: categories.length ? categories.join(',') : 'none', conference_types: conferenceType, fields: field.trim() })}`);
      const query = search.trim().toLocaleLowerCase('ja');
      const filtered = query ? data.filter((event) => `${event.title} ${event.extendedProps.conferenceName ?? ''} ${event.extendedProps.deadlineType ?? ''} ${deadlineName(event.extendedProps.deadlineType ?? '')} ${groupLabel(event.extendedProps.kind)}`.toLocaleLowerCase('ja').includes(query)) : data;
      setVisibleEvents(filtered);
      success(filtered);
    } catch (error) {
      const failureError = error instanceof Error ? error : new Error('読み込みに失敗しました。');
      setCalendarError(failureError.message);
      failure(failureError);
    }
  }, [categories, conferenceType, field, search]);

  const selectedDayEvents = selectedDay ? visibleEvents.filter((event) => occursOn(event, selectedDay)) : [];

  useEffect(() => {
    if (!selectedEvent && !selectedDay) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const close = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setSelectedEvent(null); setSelectedDay(null); }
    };
    window.addEventListener('keydown', close);
    return () => { document.body.style.overflow = previousOverflow; window.removeEventListener('keydown', close); };
  }, [selectedDay, selectedEvent]);

  function toggle(type: string) {
    setCategories((current) => current.includes(type) ? current.filter((item) => item !== type) : [...current, type]);
  }

  function resetFilters() {
    setCategories(CALENDAR_EVENT_GROUPS.map((group) => group.id));
    setConferenceType('');
    setField('');
    setSearch('');
  }

  function move(direction: 'prev' | 'next' | 'today') {
    calendarRef.current?.getApi()[direction]();
  }

  function changeView(nextView: string) {
    calendarRef.current?.getApi().changeView(nextView);
    setView(nextView);
  }

  function handleDateClick(arg: DateClickArg) {
    if (arg.view.type === 'multiMonthYear') {
      calendarRef.current?.getApi().changeView('dayGridMonth', arg.dateStr);
      setView('dayGridMonth');
      return;
    }
    setSelectedEvent(null);
    setSelectedDay(arg.dateStr.slice(0, 10));
  }

  function handleEventClick(arg: EventClickArg) {
    arg.jsEvent.preventDefault();
    setSelectedDay(null);
    setSelectedEvent({
      id: arg.event.id,
      title: arg.event.title,
      start: arg.event.startStr,
      end: arg.event.endStr || undefined,
      allDay: arg.event.allDay,
      url: arg.event.url,
      extendedProps: arg.event.extendedProps as CalendarEvent['extendedProps']
    });
  }

  function updateTitle(arg: DatesSetArg) {
    setCalendarTitle(arg.view.title);
    setView(arg.view.type);
  }

  return <>
    <PageHeader title="カレンダー" description="締切と開催日程を、月・週・日・年の表示で確認できます。" />
    {calendarError && <div className="mb-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">カレンダーを読み込めませんでした。{calendarError}</div>}
    <section className="calendar-app">
      <div className="calendar-commandbar">
        <button type="button" className="calendar-today-button" onClick={() => move('today')}>今日</button>
        <div className="calendar-nav-buttons" aria-label="表示期間を移動">
          <button type="button" onClick={() => move('prev')} aria-label="前の期間">‹</button>
          <button type="button" onClick={() => move('next')} aria-label="次の期間">›</button>
        </div>
        <div className="calendar-title"><h2>{calendarTitle}</h2><span>JST</span></div>
        <label className="calendar-search"><span className="sr-only">予定を検索</span><span aria-hidden="true">⌕</span><input value={search} onChange={(event) => setSearch(event.target.value)} placeholder="学会名・締切を検索" /></label>
        <label className="calendar-view-select"><span className="sr-only">表示形式</span><select value={view} onChange={(event) => changeView(event.target.value)}>{viewOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
      </div>

      <div className="calendar-layout">
        <aside className="calendar-sidebar">
          <Link className="calendar-add-button" to="/conferences">＋ 予定を追加</Link>
          <div className="calendar-sidebar-section"><div className="flex items-center justify-between"><h3>表示する予定</h3><button type="button" onClick={resetFilters}>リセット</button></div><div className="mt-3 space-y-1">{CALENDAR_EVENT_GROUPS.map((group) => <label key={group.id} className={`calendar-list-filter calendar-filter--${group.id}`}><input type="checkbox" checked={categories.includes(group.id)} onChange={() => toggle(group.id)} /><span className="calendar-filter-dot" /><span>{group.label}</span></label>)}</div></div>
          <div className="calendar-sidebar-section"><h3>絞り込み</h3><label className="mt-3 block"><span className="label">研究分野</span><input className="field" placeholder="例：数理最適化" value={field} onChange={(event) => setField(event.target.value)} /></label><label className="mt-4 block"><span className="label">学会種別</span><select className="field" value={conferenceType} onChange={(event) => setConferenceType(event.target.value)}><option value="">すべて</option>{CONFERENCE_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label></div>
          <div className="calendar-sidebar-section calendar-legend"><h3>色の見方</h3>{CALENDAR_EVENT_GROUPS.map((group) => <div key={group.id}><span className={`calendar-legend-dot calendar-legend-dot--${group.id}`} />{group.label}</div>)}</div>
        </aside>

        <div className="calendar-main">
          <FullCalendar
            ref={calendarRef}
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, multiMonthPlugin, luxonPlugin]}
            initialView="dayGridMonth"
            locales={[jaLocale]}
            locale="ja"
            timeZone={JAPAN_TIME_ZONE}
            firstDay={1}
            height="auto"
            headerToolbar={false}
            dayMaxEvents={3}
            moreLinkText={(count) => `他${count}件`}
            multiMonthMaxColumns={3}
            multiMonthMinWidth={220}
            nowIndicator
            stickyHeaderDates
            allDayText="終日"
            slotMinTime="06:00:00"
            slotMaxTime="24:00:00"
            scrollTime="08:00:00"
            slotDuration="00:30:00"
            eventTimeFormat={{ hour: '2-digit', minute: '2-digit', hour12: false }}
            defaultTimedEventDuration="00:00:01"
            events={eventSource}
            datesSet={updateTitle}
            dateClick={handleDateClick}
            eventClick={handleEventClick}
            eventContent={renderEvent}
            eventClassNames={(arg) => [`calendar-event--${String(arg.event.extendedProps.kind)}`]}
            eventDidMount={(arg) => { arg.el.title = cleanEventTitle(arg.event.title); }}
          />
        </div>
      </div>
    </section>

    {(selectedEvent || selectedDay) && <div className="calendar-detail-backdrop" role="presentation" onMouseDown={() => { setSelectedEvent(null); setSelectedDay(null); }}><aside className="calendar-detail-panel" role="dialog" aria-modal="true" aria-label={selectedEvent ? '予定の詳細' : 'この日の予定'} onMouseDown={(event) => event.stopPropagation()}>
      <button type="button" className="calendar-detail-close" onClick={() => { setSelectedEvent(null); setSelectedDay(null); }} aria-label="閉じる">×</button>
      {selectedEvent ? <EventDetail event={selectedEvent} onOpen={() => navigate(selectedEvent.url)} /> : selectedDay && <DayDetail date={selectedDay} events={selectedDayEvents} onSelect={setSelectedEvent} />}
    </aside></div>}
  </>;
}

function renderEvent(arg: EventContentArg) {
  return <div className="calendar-event-content"><span className="calendar-event-dot" />{arg.timeText && <time>{arg.timeText}</time>}<strong>{cleanEventTitle(arg.event.title)}</strong></div>;
}

function EventDetail({ event, onOpen }: { event: CalendarEvent; onOpen: () => void }) {
  return <><p className="section-kicker">{groupLabel(event.extendedProps.kind)}</p><h2 className="mt-2 pr-10 text-2xl font-black text-forest-950">{cleanEventTitle(event.title)}</h2>{event.extendedProps.conferenceName && <p className="mt-2 text-sm text-slate-500">{event.extendedProps.conferenceName}</p>}<div className="mt-5 flex gap-3"><span className={`calendar-detail-color calendar-detail-color--${event.extendedProps.kind}`} /><div><p className="font-bold">{formatCalendarDate(event.start, event.allDay)}</p>{!event.allDay && <p className="mt-1 text-xs font-semibold text-slate-500">カレンダー表示：日本標準時（JST）</p>}{event.extendedProps.sourceTimezone && event.extendedProps.sourceTimezone !== JAPAN_TIME_ZONE && <p className="mt-1 text-xs text-slate-500">登録元：{event.extendedProps.sourceTimezone}</p>}{event.end && <p className="mt-1 text-sm text-slate-500">終了：{formatCalendarEndDate(event.end, event.allDay)}</p>}{event.extendedProps.aoe && <p className="mt-1 text-sm text-slate-500">AoE（世界のどこかでその日が終わるまで）</p>}</div></div><dl className={`mt-6 grid gap-3 text-sm ${event.extendedProps.status === '公式' ? 'grid-cols-2' : 'grid-cols-1'}`}><div className="rounded-2xl bg-slate-50 p-3"><dt className="text-xs font-bold text-slate-400">種類</dt><dd className="mt-1 font-bold">{event.extendedProps.deadlineType ?? groupLabel(event.extendedProps.kind)}</dd></div>{event.extendedProps.status === '公式' && <div className="rounded-2xl bg-emerald-50 p-3"><dt className="text-xs font-bold text-emerald-700">確認</dt><dd className="mt-1 font-bold text-emerald-900">公式サイトで確認済み</dd></div>}</dl><button type="button" className="btn-primary mt-7 w-full" onClick={onOpen}>学会の詳細・管理へ</button></>;
}

function DayDetail({ date, events, onSelect }: { date: string; events: CalendarEvent[]; onSelect: (event: CalendarEvent) => void }) {
  return <><p className="section-kicker">Daily schedule</p><h2 className="mt-2 pr-10 text-2xl font-black text-forest-950">{formatDayHeading(date)}</h2>{events.length ? <div className="mt-6 space-y-2">{events.map((event) => <button key={event.id} type="button" className="calendar-day-event" onClick={() => onSelect(event)}><span className={`calendar-legend-dot calendar-legend-dot--${event.extendedProps.kind}`} /><span><strong>{cleanEventTitle(event.title)}</strong><small>{formatCalendarDate(event.start, event.allDay)}</small></span><b>›</b></button>)}</div> : <div className="mt-8 rounded-2xl border border-dashed border-slate-300 p-7 text-center"><p className="font-black text-forest-950">予定はありません</p><p className="mt-2 text-sm leading-6 text-slate-500">開催回を選ぶと、この日の締切を追加できます。</p></div>}<Link className="btn-secondary mt-6 w-full" to="/editions">開催回から締切を追加</Link></>;
}

function occursOn(event: CalendarEvent, date: string) {
  const start = event.start.slice(0, 10);
  if (!event.end) return start === date;
  return start <= date && date < event.end.slice(0, 10);
}

function cleanEventTitle(title: string) { return title.replace(/^\[[^\]]+\]\s*/, ''); }

function groupLabel(kind: string) { return CALENDAR_EVENT_GROUPS.find((group) => group.id === kind)?.label ?? '予定'; }

function formatCalendarDate(value: string, allDay: boolean) {
  const date = new Date(allDay ? `${value.slice(0, 10)}T00:00:00+09:00` : value);
  return new Intl.DateTimeFormat('ja-JP', allDay ? { timeZone: JAPAN_TIME_ZONE, year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' } : { timeZone: JAPAN_TIME_ZONE, year: 'numeric', month: 'long', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' }).format(date);
}

function formatCalendarEndDate(value: string, allDay: boolean) {
  if (!allDay) return formatCalendarDate(value, false);
  const date = new Date(`${value.slice(0, 10)}T00:00:00+09:00`);
  date.setUTCDate(date.getUTCDate() - 1);
  return new Intl.DateTimeFormat('ja-JP', { timeZone: JAPAN_TIME_ZONE, year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }).format(date);
}

function formatDayHeading(date: string) {
  return new Intl.DateTimeFormat('ja-JP', { timeZone: JAPAN_TIME_ZONE, month: 'long', day: 'numeric', weekday: 'long' }).format(new Date(`${date}T00:00:00+09:00`));
}
