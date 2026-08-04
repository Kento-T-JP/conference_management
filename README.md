# 学会管理 Web アプリ

篠宮研究室内で学会、年度別開催情報、投稿締切を共有・管理するWebアプリです。誰が投稿するか、論文の進捗、個人情報は管理しません。ログインなしで、共有URLを知る研究室メンバーが利用する前提です。

## 主な機能

- 学会マスター、年度別開催回、複数締切の登録・編集
- 学会と開催回のアーカイブ・復元
- 7日・30日・90日以内の締切を示すダッシュボード
- 学会の検索、種別・分野・開催頻度による絞り込み
- 開催回の締切順・開催日順の並べ替えと絞り込み
- 月間カレンダーで締切、採否通知、最終稿、参加登録、開催期間を表示
- 開催回の次年度複製と、定期開催学会の次年度未登録検出
- Slackへの新規開催回、週次まとめ、14日前・7日前・前日、締切変更通知
- 設定画面でのSlack連携状況、テスト通知、通知タイミング管理
- 通知履歴による二重送信防止と失敗記録
- 学会・開催回・締切のCSV、全データJSON出力
- PC、タブレット、スマートフォン対応

## 使用技術

- React 19 / TypeScript / Vite（依存を抑えた小型クライアントルーター）
- Tailwind CSS / FullCalendar
- Cloudflare Workers / Hono
- Cloudflare D1 / Cron Triggers
- Slack Incoming Webhook
- Vitest / ESLint

## 必要環境

- Node.js 22.17.0（`.node-version`および`package.json`で固定）
- npm 10以上
- Cloudflareアカウント（公開時のみ）
- Slack Incoming Webhook（通知を使う場合のみ）

Wrangler、TypeScript、Viteはすべてプロジェクト依存関係に含まれます。グローバルインストールは不要です。

## ローカル起動

```bash
npm install
cp .dev.vars.example .dev.vars
npm run db:migrate:local
npm run db:seed:local
npm run dev
```

表示された `http://localhost:5173` を開きます。`wrangler dev`はCloudflare Viteプラグインを通じてViteの開発サーバー内で起動し、ローカルD1だけを使用します。本番D1には接続しません。

`seed`にはIEEE BIBM、IEEE IEEM、IEEE CIC、ISMB、RECOMBのサンプルを含みます。URLは`example.com`、日付は動作確認用です。

## npm scripts

| コマンド | 用途 |
|---|---|
| `npm run dev` | ローカルWorker、React、D1を起動 |
| `npm run build` | Workerとクライアントを本番ビルド |
| `npm run deploy` | `production`環境へデプロイ |
| `npm run typecheck` | TypeScript検査 |
| `npm run lint` | ESLint検査 |
| `npm run test` | 単体・API・通知テスト |
| `npm run db:migrate:local` | ローカルD1へマイグレーション適用 |
| `npm run db:seed:local` | ローカルD1へサンプル投入 |
| `npm run db:migrate:remote` | 本番D1へマイグレーション適用 |

本番用コマンドには`--remote`または`--env production`が明示されており、ローカル操作と区別されています。

## データベース構成

- `conferences`: 学会マスター。正式名称、略称、公式URL、種別、頻度、分野、キーワードなど
- `conference_editions`: 年度別開催情報。`conference_id + year`は一意
- `conference_deadlines`: 開催回に紐づく締切。AoE、時刻不明、旧締切、延長状態を保持
- `notification_logs`: Slack通知の状態、応答コード、失敗理由、送信日時。通知キーは一意
- `system_settings`: リマインド日数など、Secretではない最小限の設定

スキーマは`migrations/0001_initial.sql`、サンプルは`seeds/seed.sql`にあります。アプリ内の全SQLはD1のプリペアドステートメントを使用します。

## Cloudflare D1の作成と公開

1. Cloudflareへログインします。

   ```bash
   npx wrangler login
   ```

2. 本番D1を作成します。

   ```bash
   npx wrangler d1 create conference-management
   ```

3. 出力された`database_id`を`wrangler.jsonc`の`env.production.d1_databases[0].database_id`へ設定します。

4. 公開URLに合わせ、`env.production.vars.APP_BASE_URL`を変更します。独自ドメインを使う場合も、そのオリジンを設定します。

5. 本番D1へマイグレーションを適用します。

   ```bash
   npm run db:migrate:remote
   ```

6. 必要ならSlack Secretを登録します。Webhook URLはD1、GitHub、設定ファイルへ保存しません。

   ```bash
   npx wrangler secret put SLACK_WEBHOOK_URL --env production
   ```

7. デプロイします。

   ```bash
   npm run deploy
   ```

デプロイ後、実際のURLが事前設定と異なる場合は`APP_BASE_URL`を修正して再デプロイしてください。

## GitHubとの連携

`.github/workflows/ci.yml`はPull Requestと`main`へのpushでtypecheck、lint、test、buildを実行します。`main`の検証成功後はCloudflareへデプロイします。

GitHub RepositoryのSettings → Secrets and variables → Actionsに以下を登録してください。

- `CLOUDFLARE_API_TOKEN`: Workers・D1を更新できる最小権限のAPI Token
- `CLOUDFLARE_ACCOUNT_ID`: Cloudflare Account ID

デプロイ前に、本番D1のIDと`APP_BASE_URL`を`wrangler.jsonc`へ設定し、Slackを利用する場合はCloudflare側で`SLACK_WEBHOOK_URL` Secretを登録してください。

## Slack Incoming Webhook

1. Slack AppでIncoming Webhooksを有効化し、学会情報専用チャンネル用Webhookを作成します。
2. ローカルでは`.dev.vars`へ設定します。実際のURLはコミットしないでください。
3. 本番では前述の`wrangler secret put`を使用します。
4. アプリの「設定」画面を開き、接続状況を確認してテスト通知を送信します。

通知対象は新規開催回、締切変更、設定した日数前のリマインド、週次まとめです。リマインド日数と週次まとめの有効・無効は「設定」画面から変更できます。Slack送信に失敗しても学会・開催回・締切の保存結果は維持され、`notification_logs`へ失敗が残ります。Webhook未設定時は通知を`skipped`として記録します。

`.dev.vars.example`には実際のWebhook URLを入れていません。ローカルでSlackを使う場合だけ、コピー後の`.dev.vars`へ実際の`SLACK_WEBHOOK_URL`を追加してください。サンプル文字列やSlack以外のURLは「未設定」と判定されます。

## Cron Triggers

`wrangler.jsonc`では次を設定しています。

- `0 0 * * *`: 毎日09:00 JST。締切リマインドを判定
- `0 0 * * 1`: 毎週月曜09:00 JST。週次まとめを送信

Cloudflare CronはUTC指定です。対象がない週次まとめは送信しません。同じ通知キーと日付は一度だけ送信されます。

## 環境変数

| 名前 | 必須 | 説明 |
|---|---|---|
| `APP_BASE_URL` | 必須 | アプリの公開オリジン。詳細リンクとCSRF検証に使用 |
| `ENVIRONMENT` | 必須 | `development`または`production` |
| `SLACK_WEBHOOK_URL` | 任意 | Cloudflare Secret。未設定時は通知をスキップ |

`.dev.vars.example`にはダミー値だけが入っています。`.dev.vars`、`.env`、`.wrangler`はGit管理対象外です。

## バックアップ・データ出力

画面または次のAPIから取得できます。

- `/api/export/conferences.csv`
- `/api/export/editions.csv`
- `/api/export/deadlines.csv`
- `/api/export/all.json`

JSONには`schema_version`、出力日時、学会、開催回、締切、システム設定が含まれます。Webhook URLや個人情報は含まれません。別環境へ移行する際は、JSON内のテーブル順（学会 → 開催回 → 締切）でD1へ投入してください。

## API概要

- `/api/conferences`: 学会CRUD、完全消去、アーカイブ、復元
- `/api/conferences/:id/editions`: 開催回作成
- `/api/editions`: 開催回一覧、更新、アーカイブ、復元、次年度複製
- `/api/editions/:id/deadlines`: 締切作成
- `/api/deadlines/:id`: 締切更新・削除
- `/api/dashboard/opportunities`: ダッシュボード
- `/api/calendar/events`: カレンダーイベント
- `/api/settings/slack`: Slack連携状況と直近の送信結果
- `/api/settings/notifications`: リマインド日数と週次まとめ設定
- `/api/settings/slack/test`: Slackテスト通知
- `/api/export/*`: CSV・JSON出力

APIエラーは`{ "error": { "code", "message", "details" } }`形式です。入力拒否と警告を分離し、締切が開催終了日より後の場合は保存可能な警告として返します。

## テスト

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```

締切日数、タイムゾーン、AoE、次年度判定、入力検証、APIのセキュリティヘッダー、Slack本文送信、重複防止、失敗記録、Webhook未設定を検証します。Slackはモックされ、実際のチャンネルへ送信しません。

## ディレクトリ構成

```text
src/
├── client/          React画面、共通部品、APIクライアント
├── shared/          フロント・Worker共通の型、定数、検証、日付処理
└── worker/
    ├── cron/        定期通知
    ├── lib/         API・D1共通処理
    ├── middleware/  CSRF、レート制限、セキュリティヘッダー
    ├── routes/      REST API
    └── services/    Slack通知
migrations/          D1マイグレーション
seeds/               ローカルサンプル
tests/               Vitestテスト
```

## トラブルシューティング

### ローカルDBにテーブルがない

`npm run db:migrate:local`を実行してください。マイグレーション状態は`.wrangler/`内にあり、Gitには含まれません。

### seed投入で一意制約エラーになる

seedは空のローカルDBへの初回投入を想定しています。既に投入済みなら再実行する必要はありません。

### Slack通知が送られない

`.dev.vars`またはCloudflare Secretの`SLACK_WEBHOOK_URL`、締切の「Slack通知対象」、Cron設定を確認してください。Webhook未設定や失敗は`notification_logs`へ記録されます。

### CSRFエラーになる

ブラウザで開いているオリジンと`APP_BASE_URL`を一致させてください。末尾のパスは含めず、`https://example.com`の形式で設定します。

### デプロイ時にD1 IDエラーになる

`wrangler.jsonc`の`REPLACE_WITH_PRODUCTION_D1_DATABASE_ID`を、`npx wrangler d1 create`で得た実IDへ置き換えてください。

### Node.jsや依存関係の差で失敗する

Node.js 22.17.0を使用し、CIや別環境では`npm ci`で`package-lock.json`どおりにインストールしてください。
