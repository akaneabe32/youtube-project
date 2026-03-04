# セットアップガイド

YouTube収益化プロジェクトのGAS（Google Apps Script）環境をセットアップするための手順書です。

## 1. スプレッドシートの準備

1. 新しいGoogleスプレッドシートを作成します。
2. 以下のシート名でシートを作成します。
   - `動画マスタ`
   - `daily_log`
   - `生コメント_YYYY-MM`（例: `生コメント_2026-03`）

## 2. GASスクリプトの配置

1. スプレッドシートのメニューから「拡張機能」>「Apps Script」を選択し、スクリプトエディタを開きます。
2. `Code_collect.gs` と `Code_export.gs` の内容をそれぞれ新しいスクリプトファイルとしてコピー＆ペーストします。

## 3. スクリプトプロパティの設定

GASスクリプトが正しく動作するために、以下のスクリプトプロパティを設定します。

1. スクリプトエディタの左側メニューから「プロジェクトの設定」（歯車アイコン）をクリックします。
2. 「スクリプトプロパティ」セクションまでスクロールし、「スクリプトプロパティを追加」をクリックします。
3. 以下のプロパティを追加します。

| プロパティ名 | 値 | 説明 |
|---|---|---|
| `YT_API_KEY` | `AIza...` | YouTube Data API v3のAPIキー |
| `SPREADSHEET_ID` | `1AlYN-...` | GoogleスプレッドシートのID（URLから取得） |

## 4. YouTube Data API v3の有効化

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセスします。
2. プロジェクトを選択または新規作成します。
3. 「APIとサービス」>「ライブラリ」に移動します。
4. 「YouTube Data API v3」を検索し、有効化します。
5. 「認証情報」ページでAPIキーを作成し、上記 `YT_API_KEY` に設定します。

## 5. トリガーの設定

GASスクリプトを自動実行するために、以下のトリガーを設定します。

1. スクリプトエディタの左側メニューから「トリガー」（時計アイコン）をクリックします。
2. 「トリガーを追加」をクリックします。
3. 以下の2つのトリガーを設定します。

### `collectDailyData` 関数用トリガー

| 設定項目 | 値 |
|---|---|
| 実行する関数 | `collectDailyData` |
| イベントのソース | 時間主導型 |
| 時間ベースのトリガーのタイプ | 日付ベースのタイマー |
| 時刻 | 午前2時〜3時（毎日） |

> **日付処理について**: 午前2〜3時に取得したデータは実質「前日の実績」です。`daily_log` の `date` 列は自動的に前日付けで記録されます。実際の取得日時は `recorded_at` 列に別途保存されます。

### `buildAndCacheJson` 関数用トリガー

| 設定項目 | 値 |
|---|---|
| 実行する関数 | `buildAndCacheJson` |
| イベントのソース | 時間主導型 |
| 時間ベースのトリガーのタイプ | 日付ベースのタイマー |
| 時刻 | 午前3時〜4時（毎日） |

これにより、毎日自動的にデータ収集と集計処理が実行されます。

## 6. 既存データへの playlist_id 後付け設定（移行作業）

`playlist_id` 列を新規追加したため、既存データへの後付け設定が必要です。**初回1回のみ**実行してください。

1. GASスクリプトエディタを開きます。
2. 関数選択ドロップダウンから `backfillPlaylistIds` を選択します。
3. 「実行」ボタンをクリックします。
4. 実行ログ（「表示」>「ログ」）で更新件数を確認します。

> **注意**: この関数は冪等性を持ちます（既に `playlist_id` が設定されている行はスキップ）。誤って複数回実行しても問題ありません。

## 7. 収集対象プレイリスト

現在設定されているプレイリストは以下の通りです（`Code_collect.gs` 内の `PLAYLISTS` 定数で管理）。

| 優先度 | プレイリスト名 | プレイリストID |
|---|---|---|
| 1 | Theme Song THE FINAL CLOSE-UP 💙 | `PL3fCPdnAFT0WqEHbmRCWZVBVpfKVUqUHx` |
| 2 | 推しカメラ｜新世界 (SHINSEKAI) | `PL3fCPdnAFT0YNA-DdjkWikiwcsct0vow0` |
| 3 | SHINSEKAI SELFIE CHALLENGE 📷 | `PL3fCPdnAFT0ZmfLCdHPPXGwMhEBJKNfwW` |
| 4 | SHINSEKAI 1MIN PR 🌏 | `PL3fCPdnAFT0aCKwqGqJhBXHlLXDjOvQZh` |

新しいプレイリストを追加する場合は、`Code_collect.gs` の `PLAYLISTS` 配列に以下の形式でオブジェクトを追加します。

```javascript
{
  id: 'PLxxxxxxxxxxxxxxxx',  // プレイリストID
  name: 'camelCaseName',     // 識別用の英語名（キャメルケース）
  label: '表示名',            // ログ・UI表示用の日本語名
  priority: 5                // 優先度（小さいほど高優先）
}
```
