import { DEADLINE_TYPES, INFORMATION_STATUSES } from '../../shared/constants';
import { createDeadlineDraft, deadlineLabel, deadlineName, type DeadlineDraft } from '../lib/deadlineDraft';

const statusDescriptions: Record<string, string> = {
  公式: '公式サイトで確認済み',
  仮: '主催者による暫定情報',
  予測: '過去情報などからの予測',
  未確認: '情報源をまだ確認していない'
};

export function DeadlinePicker({ drafts, onChange, selectable = true }: { drafts: DeadlineDraft[]; onChange: (drafts: DeadlineDraft[]) => void; selectable?: boolean }) {
  function toggle(type: string) {
    onChange(drafts.some((draft) => draft.deadline_type === type) ? drafts.filter((draft) => draft.deadline_type !== type) : [...drafts, createDeadlineDraft(type)]);
  }
  function update(index: number, patch: Partial<DeadlineDraft>) { onChange(drafts.map((draft, draftIndex) => draftIndex === index ? { ...draft, ...patch } : draft)); }

  return <div>
    {selectable && <div><p className="text-sm font-black text-forest-950">登録する締切を選択</p><p className="mt-1 text-xs leading-5 text-slate-500">該当するものだけチェックしてください。選択すると入力欄が表示されます。</p><div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3" role="group" aria-label="登録する締切">{DEADLINE_TYPES.map((type) => { const checked = drafts.some((draft) => draft.deadline_type === type); return <label key={type} className="deadline-type-choice"><input type="checkbox" checked={checked} onChange={() => toggle(type)} /><span><strong>{deadlineName(type)}</strong><small>{type}</small></span></label>; })}</div></div>}
    {drafts.length ? <div className={`${selectable ? 'mt-6' : ''} space-y-4`}>{drafts.map((draft, index) => <section key={`${draft.deadline_type}-${index}`} className="deadline-draft-card">
      <div className="mb-4 flex items-center justify-between"><div className="flex items-center gap-3"><span className="grid size-7 place-items-center rounded-full bg-forest-950 text-xs font-black text-white">{index + 1}</span><h3 className="font-black text-forest-950">{deadlineLabel(draft.deadline_type)}</h3></div>{selectable && <button type="button" className="text-xs font-bold text-slate-400 hover:text-red-700" onClick={() => toggle(draft.deadline_type)}>選択を解除</button>}</div>
      <div className="grid gap-4 md:grid-cols-[1.25fr_1fr_.8fr]">
        {!selectable && <label><span className="label">種類 <Required /></span><select className="field" value={draft.deadline_type} onChange={(event) => update(index, { deadline_type: event.target.value })}>{DEADLINE_TYPES.map((type) => <option key={type} value={type}>{deadlineLabel(type)}</option>)}</select></label>}
        <label><span className="label">日付 <Required /></span><input required className="field" type="date" value={draft.date} onChange={(event) => update(index, { date: event.target.value })} /></label>
        <label><span className="label">時刻 <Optional /></span><input className="field" type="time" value={draft.time} onChange={(event) => update(index, { time: event.target.value })} disabled={draft.is_aoe} /></label>
        {selectable && <label><span className="label">タイムゾーン <Optional /></span><input list="timezone-options" className="field" placeholder="例：Asia/Tokyo" value={draft.timezone} onChange={(event) => update(index, { timezone: event.target.value })} disabled={draft.is_aoe} /></label>}
      </div>
      <div className="mt-4 grid gap-4 md:grid-cols-[1.25fr_1fr_1fr]">
        <label><span className="label">表示名 <Optional /></span><input className="field" placeholder="区別が必要な場合のみ" value={draft.title} onChange={(event) => update(index, { title: event.target.value })} /></label>
        {!selectable && <label><span className="label">タイムゾーン <Optional /></span><input list="timezone-options" className="field" placeholder="例：Asia/Tokyo" value={draft.timezone} onChange={(event) => update(index, { timezone: event.target.value })} disabled={draft.is_aoe} /></label>}
        <label><span className="label">情報状態</span><select className="field" value={draft.information_status} onChange={(event) => update(index, { information_status: event.target.value })}>{INFORMATION_STATUSES.map((status) => <option key={status}>{status}</option>)}</select><span className="field-hint">{statusDescriptions[draft.information_status]}</span></label>
      </div>
      <div className="mt-4 flex flex-wrap gap-3"><label className="deadline-inline-option"><input type="checkbox" checked={draft.is_aoe} onChange={(event) => update(index, { is_aoe: event.target.checked, timezone: event.target.checked ? 'AoE' : '', time: event.target.checked ? '' : draft.time })} /><span><strong>AoE</strong><small>世界のどこかでその日が終わるまで</small></span></label><label className="deadline-inline-option"><input type="checkbox" checked={draft.notification_enabled} onChange={(event) => update(index, { notification_enabled: event.target.checked })} /><span><strong>Slack通知</strong><small>締切前に研究室へ通知</small></span></label></div>
    </section>)}</div> : selectable && <div className="mt-5 rounded-2xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">締切を登録しない場合は、このまま保存できます。</div>}
    <datalist id="timezone-options"><option value="Asia/Tokyo" /><option value="UTC" /><option value="America/New_York" /><option value="America/Los_Angeles" /><option value="Europe/London" /></datalist>
  </div>;
}

function Required() { return <span className="text-xs text-red-700">必須</span>; }
function Optional() { return <span className="text-xs font-bold normal-case tracking-normal text-slate-400">任意</span>; }
