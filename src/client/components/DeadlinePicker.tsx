import { DEADLINE_TYPES } from '../../shared/constants';
import { createDeadlineDraft, deadlineLabel, deadlineName, type DeadlineDraft } from '../lib/deadlineDraft';
import { OfficialConfirmation } from './ui';

const TIME_PRESETS = [
  { value: '23:59', label: '23:59', detail: '日末' },
  { value: '17:00', label: '17:00', detail: '業務終了' },
  { value: '12:00', label: '12:00', detail: '正午' }
];

const COMMON_TIMEZONES = [
  { value: 'Asia/Tokyo', label: '日本', detail: 'JST / UTC+9' },
  { value: 'UTC', label: 'UTC', detail: '協定世界時' },
  { value: 'America/New_York', label: '米国東部', detail: 'ET' },
  { value: 'America/Los_Angeles', label: '米国西部', detail: 'PT' },
  { value: 'Europe/London', label: '英国', detail: 'UK time' }
];

const browserTimezone = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Tokyo'; }
  catch { return 'Asia/Tokyo'; }
})();

export function DeadlinePicker({ drafts, onChange, selectable = true }: { drafts: DeadlineDraft[]; onChange: (drafts: DeadlineDraft[]) => void; selectable?: boolean }) {
  function toggle(type: string) {
    onChange(drafts.some((draft) => draft.deadline_type === type) ? drafts.filter((draft) => draft.deadline_type !== type) : [...drafts, createDeadlineDraft(type)]);
  }
  function update(index: number, patch: Partial<DeadlineDraft>) { onChange(drafts.map((draft, draftIndex) => draftIndex === index ? { ...draft, ...patch } : draft)); }

  return <div>
    {selectable && <div><p className="text-sm font-black text-forest-950">登録する締切を選択</p><p className="mt-1 text-xs leading-5 text-slate-500">該当するものだけチェックしてください。選択すると入力欄が表示されます。</p><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="登録する締切">{DEADLINE_TYPES.map((type) => { const checked = drafts.some((draft) => draft.deadline_type === type); return <label key={type} className="deadline-type-choice"><input type="checkbox" checked={checked} onChange={() => toggle(type)} /><span><strong>{deadlineName(type)}</strong><small>{type}</small></span></label>; })}</div></div>}
    {drafts.length ? <div className={`${selectable ? 'mt-6' : ''} space-y-4`}>{drafts.map((draft, index) => {
      const timezonePresets = [{ value: browserTimezone, label: 'この端末', detail: browserTimezone }, ...COMMON_TIMEZONES].filter((preset, presetIndex, all) => all.findIndex((item) => item.value === preset.value) === presetIndex);
      return <section key={`${draft.deadline_type}-${index}`} className="deadline-draft-card">
      <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-forest-950 text-xs font-black text-white">{index + 1}</span><h3 className="font-black text-forest-950">{deadlineLabel(draft.deadline_type)}</h3></div>{selectable && <button type="button" className="text-xs font-bold text-slate-400 hover:text-red-700" onClick={() => toggle(draft.deadline_type)}>選択を解除</button>}</div>
      <div className={`grid gap-4 ${selectable ? 'md:grid-cols-3' : 'md:grid-cols-2 lg:grid-cols-4'}`}>
        {!selectable && <label><span className="label">種類 <Required /></span><select className="field" value={draft.deadline_type} onChange={(event) => update(index, { deadline_type: event.target.value })}>{DEADLINE_TYPES.map((type) => <option key={type} value={type}>{deadlineLabel(type)}</option>)}</select></label>}
        <label><span className="label">日付 <Required /></span><input required className="field" type="date" value={draft.date} onChange={(event) => update(index, { date: event.target.value })} /></label>
        <label><span className="label">時刻 <Optional /></span><input className="field" type="time" step="60" value={draft.time} onChange={(event) => update(index, { time: event.target.value })} disabled={draft.is_aoe} /><span className="field-hint">公式サイトに時刻がなければ空欄で構いません。</span></label>
        <label><span className="label">タイムゾーン <Optional /></span><input list="timezone-options" className="field" placeholder="例：Asia/Tokyo" value={draft.is_aoe ? 'AoE' : draft.timezone} onChange={(event) => update(index, { timezone: event.target.value })} disabled={draft.is_aoe} /><span className="field-hint">時刻を入力した場合は、公式表記に合う地域を選びます。</span></label>
      </div>
      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white/65 p-4">
          <p className="text-xs font-black text-forest-950">時刻をすばやく入力</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {TIME_PRESETS.map((preset) => <button key={preset.value} type="button" className={`rounded-xl border px-3 py-2 text-left transition ${draft.time === preset.value && !draft.is_aoe ? 'border-forest-700 bg-forest-50 text-forest-950' : 'border-slate-200 bg-white text-slate-600 hover:border-forest-700/40'}`} aria-pressed={draft.time === preset.value && !draft.is_aoe} onClick={() => update(index, { time: preset.value })} disabled={draft.is_aoe}><strong className="block text-sm">{preset.label}</strong><small className="text-[.68rem]">{preset.detail}</small></button>)}
            <button type="button" className={`rounded-xl border px-3 py-2 text-left transition ${!draft.time && !draft.is_aoe ? 'border-forest-700 bg-forest-50 text-forest-950' : 'border-slate-200 bg-white text-slate-600 hover:border-forest-700/40'}`} aria-pressed={!draft.time && !draft.is_aoe} onClick={() => update(index, { time: '', timezone: '' })} disabled={draft.is_aoe}><strong className="block text-sm">時刻なし</strong><small className="text-[.68rem]">日付のみ</small></button>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white/65 p-4">
          <p className="text-xs font-black text-forest-950">よく使うタイムゾーン</p>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {timezonePresets.map((preset) => <button key={preset.value} type="button" className={`rounded-xl border px-3 py-2 text-left transition ${draft.timezone === preset.value && !draft.is_aoe ? 'border-forest-700 bg-forest-50 text-forest-950' : 'border-slate-200 bg-white text-slate-600 hover:border-forest-700/40'}`} aria-pressed={draft.timezone === preset.value && !draft.is_aoe} onClick={() => update(index, { timezone: preset.value, is_aoe: false })} disabled={draft.is_aoe}><strong className="block truncate text-xs">{preset.label}</strong><small className="block truncate text-[.65rem]" title={preset.detail}>{preset.detail}</small></button>)}
          </div>
        </div>
      </div>
      {draft.time && !draft.timezone && !draft.is_aoe && <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs font-semibold leading-5 text-amber-900" role="alert">時刻を正しく解釈できるよう、タイムゾーンも選択してください。</p>}
      <div className="mt-4 grid gap-4">
        <label><span className="label">表示名 <Optional /></span><input className="field" placeholder="区別が必要な場合のみ" value={draft.title} onChange={(event) => update(index, { title: event.target.value })} /></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3"><OfficialConfirmation checked={draft.information_status === '公式'} onChange={(checked) => update(index, { information_status: checked ? '公式' : '未確認' })} /><label className="deadline-inline-option"><input type="checkbox" checked={draft.is_aoe} onChange={(event) => update(index, { is_aoe: event.target.checked, timezone: event.target.checked ? 'AoE' : '', time: event.target.checked ? '' : draft.time })} /><span><strong>AoE</strong><small>世界のどこかでその日が終わるまで</small></span></label><label className="deadline-inline-option"><input type="checkbox" checked={draft.notification_enabled} onChange={(event) => update(index, { notification_enabled: event.target.checked })} /><span><strong>Slack通知</strong><small>締切前に研究室へ通知</small></span></label></div>
      <div className="mt-4 rounded-xl bg-slate-100/80 px-4 py-3 text-xs leading-5 text-slate-600" aria-live="polite"><strong className="text-forest-950">入力内容：</strong> {deadlineSummary(draft)}</div>
    </section>; })}</div> : selectable && <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">締切を登録しない場合は、このまま保存できます。</div>}
    <datalist id="timezone-options">{COMMON_TIMEZONES.map((timezone) => <option key={timezone.value} value={timezone.value}>{timezone.label}</option>)}</datalist>
  </div>;
}

function deadlineSummary(draft: DeadlineDraft) {
  if (!draft.date) return '日付を選択してください。';
  if (draft.is_aoe) return `${draft.date}（AoE：世界のどこかでその日が終わるまで）`;
  if (!draft.time) return `${draft.date}（時刻指定なし）`;
  return `${draft.date} ${draft.time}（${draft.timezone || 'タイムゾーン未選択'}）`;
}

function Required() { return <span className="text-xs text-red-700">必須</span>; }
function Optional() { return <span className="text-xs font-bold normal-case tracking-normal text-slate-400">任意</span>; }
