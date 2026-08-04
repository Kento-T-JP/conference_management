import { useEffect, useState, type FormEvent } from 'react';
import type { SlackSettingsData } from '../../shared/types';
import { ErrorState, formatDate, Loading, PageHeader } from '../components/ui';
import { useApi } from '../hooks/useApi';
import { api } from '../lib/api';

const REMINDER_OPTIONS = [30, 14, 7, 3, 1];

export function SettingsPage() {
  const { data, loading, error, reload } = useApi<SlackSettingsData>('/api/settings/slack');
  const [reminderDays, setReminderDays] = useState<number[]>([]);
  const [weeklyEnabled, setWeeklyEnabled] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState('');
  const [actionError, setActionError] = useState('');

  useEffect(() => {
    if (!data) return;
    setReminderDays(data.reminder_days);
    setWeeklyEnabled(data.weekly_enabled);
  }, [data]);

  if (loading) return <Loading />;
  if (error || !data) return <ErrorState message={error ?? '設定を読み込めませんでした。'} retry={reload} />;

  function toggleDay(day: number) {
    setReminderDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day].sort((a, b) => b - a));
  }

  async function save(event: FormEvent) {
    event.preventDefault(); setSaving(true); setMessage(''); setActionError('');
    try {
      await api('/api/settings/notifications', { method: 'PUT', body: JSON.stringify({ reminder_days: reminderDays, weekly_enabled: weeklyEnabled }) });
      setMessage('通知設定を保存しました。');
      reload();
    } catch (e) { setActionError(e instanceof Error ? e.message : '通知設定を保存できませんでした。'); }
    finally { setSaving(false); }
  }

  async function sendTest() {
    setTesting(true); setMessage(''); setActionError('');
    try {
      await api('/api/settings/slack/test', { method: 'POST' });
      setMessage('Slackへテスト通知を送信しました。');
      reload();
    } catch (e) { setActionError(e instanceof Error ? e.message : 'テスト通知を送信できませんでした。'); }
    finally { setTesting(false); }
  }

  return <><PageHeader title="設定" description="Slack連携の状態と、研究室へ送る通知のタイミングを管理します。" />
    {message && <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900" role="status">{message}</div>}
    {actionError && <div className="mb-5 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-800" role="alert">{actionError}</div>}
    <div className="grid gap-6 lg:grid-cols-[1fr_1.25fr]">
      <section className="surface p-5 sm:p-7">
        <p className="section-kicker">Connection</p>
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3"><h2 className="text-xl font-black text-forest-950">Slack連携</h2><span className={`chip ${data.configured ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>{data.configured ? '接続済み' : '未設定'}</span></div>
        <p className="mt-4 text-sm leading-7 text-slate-600">{data.configured ? 'Incoming Webhookが設定されています。テスト通知で送信先を確認できます。' : '通知を利用するには、管理者がIncoming Webhookを環境変数へ登録する必要があります。'}</p>
        <button type="button" className="btn-primary mt-6 w-full" onClick={sendTest} disabled={!data.configured || testing}>{testing ? '送信中…' : 'テスト通知を送る'}</button>
        {!data.configured && <p className="mt-3 text-xs leading-5 text-slate-500">Webhook設定後にページを再読み込みすると、テスト通知を利用できます。</p>}
        <div className="mt-7 border-t border-slate-100 pt-5"><h3 className="text-sm font-black text-forest-950">直近の送信結果</h3>{data.last_delivery ? <dl className="mt-4 grid grid-cols-2 gap-4 text-sm"><Info label="状態" value={deliveryStatus(data.last_delivery.status)} /><Info label="日時" value={formatDate(data.last_delivery.sent_at ?? data.last_delivery.created_at, true)} /><div className="col-span-2"><Info label="通知" value={notificationLabel(data.last_delivery.notification_type)} /></div>{data.last_delivery.error_message && <div className="col-span-2"><Info label="エラー" value={data.last_delivery.error_message} /></div>}</dl> : <p className="mt-3 text-sm text-slate-500">送信履歴はまだありません。</p>}</div>
      </section>

      <form className="surface p-5 sm:p-7" onSubmit={save}>
        <p className="section-kicker">Notifications</p><h2 className="mt-3 text-xl font-black text-forest-950">通知タイミング</h2><p className="mt-3 text-sm leading-7 text-slate-600">「Slack通知」が有効な締切について、選択した日数前に通知します。</p>
        <fieldset className="mt-6"><legend className="label">締切の何日前に通知するか</legend><div className="grid grid-cols-2 gap-2 sm:grid-cols-5">{REMINDER_OPTIONS.map((day) => <label key={day} className="deadline-type-choice justify-center"><input type="checkbox" checked={reminderDays.includes(day)} onChange={() => toggleDay(day)} /><strong>{day}日前</strong></label>)}</div><p className="field-hint">すべて外すと、締切前の自動通知を停止します。</p></fieldset>
        <label className="mt-6 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 bg-white/70 p-4 transition hover:border-forest-700/40"><input type="checkbox" className="mt-1 size-4 accent-[#2c6652]" checked={weeklyEnabled} onChange={(event) => setWeeklyEnabled(event.target.checked)} /><span><strong className="block text-sm font-black text-forest-950">週次まとめを送る</strong><small className="mt-1 block text-xs leading-5 text-slate-500">今後90日以内の締切と最近追加された開催回を週1回まとめます。</small></span></label>
        <div className="mt-7 flex justify-end"><button className="btn-primary" disabled={saving}>{saving ? '保存中…' : '通知設定を保存'}</button></div>
      </form>
    </div>

    <section className="surface mt-6 p-5 sm:p-7"><p className="section-kicker">Setup guide</p><h2 className="mt-3 text-xl font-black text-forest-950">連携の設定方法</h2><div className="mt-6 grid gap-4 md:grid-cols-4">{[
      ['01', 'Webhookを作成', 'Slack AppでIncoming Webhooksを有効にします。'],
      ['02', '通知先を選択', '研究室の学会通知用チャンネルを選び、Webhook URLを発行します。'],
      ['03', '秘密情報を登録', '管理者がSLACK_WEBHOOK_URLとして実行環境へ登録します。URLは画面やデータベースへ保存しません。'],
      ['04', '送信を確認', 'この画面を再読み込みし、テスト通知を送って確認します。']
    ].map(([number, title, body]) => <div key={number} className="rounded-2xl border border-slate-200 bg-[#fbfaf7]/80 p-4"><span className="grid size-8 place-items-center rounded-full bg-forest-950 text-xs font-black text-white">{number}</span><h3 className="mt-4 font-black text-forest-950">{title}</h3><p className="mt-2 text-xs leading-6 text-slate-500">{body}</p></div>)}</div><div className="mt-6 flex flex-wrap items-center gap-3"><a className="btn-secondary" href="https://api.slack.com/messaging/webhooks" target="_blank" rel="noopener noreferrer">Slack公式手順を開く ↗</a><code className="rounded-xl bg-slate-100 px-3 py-2 text-xs text-slate-600">SLACK_WEBHOOK_URL</code></div></section>
  </>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold text-slate-400">{label}</dt><dd className="mt-1 font-semibold leading-6 text-slate-700">{value}</dd></div>; }
function deliveryStatus(status: string) { return ({ sent: '送信成功', failed: '送信失敗', skipped: 'スキップ', pending: '送信待ち' } as Record<string, string>)[status] ?? status; }
function notificationLabel(type: string) { return type === 'slack_test' ? 'テスト通知' : type === 'weekly_summary' ? '週次まとめ' : type.startsWith('deadline_reminder_') ? '締切リマインド' : type === 'deadline_changed' ? '締切変更' : type === 'new_edition' ? '新しい開催回' : type; }
