# セットアップガイド

> 新世界 S4 チッケム動画分析ダッシュボード（STAT PICK）向け  
> 最終更新: 2026-03-05

---

## 概要

本ドキュメントは、STAT PICK プロジェクトの初期セットアップ手順を定めます。

---

## 1. 必要なもの

| 項目 | 内容 |
|---|---|
| Googleアカウント | GAS・スプレッドシート・Gmailを使用 |
| YouTube Data API v3 キー | Google Cloud Console で取得 |
| Chrome ブラウザ | Chrome拡張機能の実行に必要 |
| Python 3.x（任意） | 深堀り分析スクリプトの実行に必要 |

---

## 2. YouTube Data API v3 キーの取得

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新規プロジェクトを作成（または既存プロジェクトを選択）
3. 「APIとサービス」→「ライブラリ」から「YouTube Data API v3」を有効化
4. 「APIとサービス」→「認証情報」→「認証情報を作成」→「APIキー」
5. 取得したAPIキーをメモしておく

---

## 3. GAS スクリプトのセットアップ

### 3-1. スクリプトエディタを開く

1. [スプレッドシートA](https://docs.google.com/spreadsheets/d/16wOG1MctyXn4IW4nG33hUtrbiNewAhkvE-EYVI78gNA/) を開く
2. 「拡張機能」→「Apps Script」をクリック
3. スクリプトエディタが開く

### 3-2. コードの貼り替え

1. GitHub リポジトリの `gas/Code_collect.gs` の内容をコピー
2. スクリプトエディタで Ctrl+A（全選択）→ Ctrl+V（貼り付け）
3. Ctrl+S（保存）

### 3-3. APIキーの設定

1. スクリプトエディタで `setupApiKeyOnce` 関数を選択
2. 「実行」ボタンをクリック
3. 初回実行時は権限の承認が求められるので「許可」をクリック
4. スクリプトプロパティに `YT_API_KEY` と `SPREADSHEET_ID` が設定される

### 3-4. アラートメールの設定（任意）

1. 「プロジェクトの設定」→「スクリプトプロパティ」
2. 「プロパティを追加」をクリック
3. プロパティ名：`ALERT_EMAIL`、値：通知を受け取りたいメールアドレス
4. 「保存」をクリック

> 未設定の場合はスクリプト実行者のGmailに通知が送られます。

### 3-5. 既存データへの playlist_id 後付け（初回のみ）

1. スクリプトエディタで `backfillPlaylistIds` 関数を選択
2. 「実行」ボタンをクリック
3. 実行ログで「バックフィル完了: X件更新」と表示されれば成功

> **注意:** `backfillPlaylistIds` は冪等性を持つ（既に `playlist_id` が設定されている行はスキップ）。誤って複数回実行しても問題ない。

### 3-6. トリガーの設定

1. スクリプトエディタの左メニューから「トリガー」をクリック
2. 以下の2つのトリガーを設定する

| 関数名 | 実行タイミング | 時間帯 |
|---|---|---|
| `collectDailyData` | 日次タイマー | 午前2時〜3時 |
| `buildAndCacheJson` | 日次タイマー | 午前3時〜4時 |

> **日付処理について:** トリガーは02:00〜03:00 JSTに実行されるため、取得データは実質的に前日の実績を表す。`daily_log` の `date` 列は前日付けで記録し、`recorded_at` 列に実際の取得日時を保存する。

---

## 4. Chrome拡張機能のセットアップ

### 4-1. 拡張機能のインストール

1. Chrome で `chrome://extensions/` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `yt-comment-exporter` ディレクトリを選択

### 4-2. APIキーの設定

1. 拡張機能のアイコンをクリック
2. 設定画面で YouTube Data API v3 キーを入力
3. 「保存」をクリック

### 4-3. データ取得の手順（週1回）

1. YouTube のプレイリストページを開く
2. 拡張機能のアイコンをクリック
3. 取得したいプレイリストを選択
4. 「取得開始」をクリック
5. 完了後、ZIPファイルがダウンロードされる
6. ZIPを解凍して以下のCSVファイルを確認する：
   - `video_stats_all.csv`：動画基本指標
   - `video_metrics_for_ai.csv`：コメント集計指標
   - `sheet_raw_comments_all.csv`：コメントローデータ（スプシにインポートしない）

### 4-4. スプレッドシートBへのインポート

1. [スプレッドシートB](https://docs.google.com/spreadsheets/d/1K0WWY6C3wSqmRglDYN2e4lH9jPkVe4IJH85L2ndHzbo/) を開く
2. 対象シートを選択（`video_stats` / `video_metrics` など）
3. 「ファイル」→「インポート」→ CSVファイルを選択
4. 「現在のシートに追加」を選択してインポート
5. `import_log` シートにインポート日・プレイリスト・件数を手動記録

> **注意：** `sheet_raw_comments_all.csv`（コメントローデータ）はスプレッドシートにインポートしない。PCスペックへの配慮とスプシ軽量化のため、ローカルに保管するのみ。

---

## 5. スプレッドシート構成

### スプレッドシート A：チッケム系（GAS 自動更新）

**URL：** https://docs.google.com/spreadsheets/d/16wOG1MctyXn4IW4nG33hUtrbiNewAhkvE-EYVI78gNA/  
**対象プレイリスト：** Theme Song THE FINAL CLOSE-UP 💙 / 推しカメラ｜新世界 (SHINSEKAI)

### スプレッドシート B：Chrome拡張 手動取得データ

**URL：** https://docs.google.com/spreadsheets/d/1K0WWY6C3wSqmRglDYN2e4lH9jPkVe4IJH85L2ndHzbo/  
**更新方法：** 週1回手動（Chrome拡張 → CSVインポート）

---

## 6. 収集対象プレイリスト

| 優先度 | プレイリスト名 | プレイリストID | スプシ |
|---|---|---|---|
| 1 | Theme Song THE FINAL CLOSE-UP 💙 | `PL3fCPdnAFT0WqEHbmRCWZVBVpfKVUqUHx` | A |
| 2 | 推しカメラ｜新世界 (SHINSEKAI) | `PL3fCPdnAFT0YNA-DdjkWikiwcsct0vow0` | A |
| 3 | SHINSEKAI SELFIE CHALLENGE 📷 | `PL3fCPdnAFT0ZmfLCdHPPXGwMhEBJKNfwW` | Chrome拡張のみ |
| 4 | SHINSEKAI 1MIN PR 🌏 | `PL3fCPdnAFT0aCKwqGqJhBXHlLXDjOvQZh` | Chrome拡張のみ |

新しいプレイリストを追加する場合は、`Code_collect.gs` の `PLAYLISTS` 配列に以下の形式でオブジェクトを追加する。

```javascript
{
  id: 'PLxxxxxxxxxxxxxxxx',  // プレイリストID
  name: 'camelCaseName',     // 識別用の英語名（キャメルケース）
  label: '表示名',            // ログ・UI表示用の日本語名
  priority: 5                // 優先度（小さいほど高優先）
}
```

---

## 7. 動作確認

### GAS の動作確認

1. スクリプトエディタで `collectDailyData` 関数を選択
2. 「実行」ボタンをクリック
3. 実行ログで以下を確認する：
   - 「処理開始: Theme Song THE FINAL CLOSE-UP」
   - 「処理完了: X本の動画を処理」
   - 「daily_log に X件追記」
   - エラーがないこと

---

## 8. トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| 「APIキーが無効」エラー | APIキーが正しく設定されていない | `setupApiKeyOnce` を再実行 |
| 「クォータ超過」エラー | 1日10,000ユニットを超過 | 翌日まで待つ / 取得間隔を調整 |
| `playlist_id` が空のまま | `backfillPlaylistIds` 未実行 | 手動で `backfillPlaylistIds` を実行 |
| アラートメールが届かない | `ALERT_EMAIL` 未設定 | スクリプトプロパティに設定 |
| コメントが取得されない | コメントが無効化されている動画 | 仕様通り（スキップされる） |

---

*本ドキュメントはセットアップ手順変更の都度更新すること。*
