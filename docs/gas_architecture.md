# GASアーキテクチャ設計

## 1. 概要

YouTube収益化プロジェクトにおけるデータ収集および分析処理は、Google Apps Script (GAS) を用いて実装されます。GASは、Googleスプレッドシートを中間データストアとして活用し、YouTube Data API v3からのデータ取得、および各種指標の計算を行います。

## 2. システム構成

GASは以下の2つの主要なスクリプトファイルと、Googleスプレッドシートで構成されます。

| コンポーネント | 役割 | 詳細 |
|---|---|---|
| `Code_collect.gs` | データ収集 | 毎日、YouTube Data API v3から複数プレイリストの動画・コメントの差分データを取得し、Googleスプレッドシートに追記します。 |
| `Code_export.gs` | データ集計・出力 | スプレッドシートに蓄積された生データから各種分析指標を計算し、必要に応じて外部にデータを提供します（例: `doGet` 関数によるWeb API形式での出力）。 |
| Googleスプレッドシート | 中間データストア | 以下のシートで構成され、生データおよび集計データを保持します。 |

## 3. 収集対象プレイリスト

PRODUCE 101 JAPAN 新世界 (SHINSEKAI) チャンネルの以下4プレイリストを対象とします。

| 優先度 | プレイリスト名 | プレイリストID | 動画数 | 備考 |
|---|---|---|---|---|
| 1 | Theme Song THE FINAL CLOSE-UP 💙 | `PL3fCPdnAFT0WqEHbmRCWZVBVpfKVUqUHx` | 82本 | 最新・推移追跡対象 |
| 2 | 推しカメラ｜新世界 (SHINSEKAI) | `PL3fCPdnAFT0YNA-DdjkWikiwcsct0vow0` | 82本 | 既設定・チッケム分析メイン |
| 3 | SHINSEKAI SELFIE CHALLENGE 📷 | `PL3fCPdnAFT0ZmfLCdHPPXGwMhEBJKNfwW` | 121本 | 公開済み・推移追跡なし |
| 4 | SHINSEKAI 1MIN PR 🌏 | `PL3fCPdnAFT0aCKwqGqJhBXHlLXDjOvQZh` | 121本 | 公開済み・推移追跡なし |

## 4. スプレッドシート構造

### 動画マスタシート

| 列名 | 型 | 説明 |
|---|---|---|
| `videoId` | string | YouTube動画ID（主キー） |
| `videoTitle` | string | 動画タイトル |
| `trainee_name` | string | 練習生名（手動またはスクリプトで設定） |
| `stage_type` | string | ステージ種別（手動またはスクリプトで設定） |
| `publishedAt` | datetime | 動画公開日時 |
| `viewCount` | integer | 再生回数 |
| `likeCount` | integer | いいね数 |
| `commentCount` | integer | コメント数 |
| `updatedAt` | datetime | 最終更新日時 |
| `playlist_id` | string | **[新規追加]** 取得元プレイリストID |

### 生コメント_YYYY-MMシート（月別）

| 列名 | 型 | 説明 |
|---|---|---|
| `videoId` | string | YouTube動画ID |
| `commentId` | string | コメントID（重複排除キー） |
| `authorName` | string | コメント投稿者名 |
| `text` | string | コメント本文 |
| `likeCount` | integer | コメントのいいね数 |
| `publishedAt` | datetime | コメント投稿日時 |
| `updatedAt` | datetime | コメント更新日時 |
| `playlist_id` | string | **[新規追加]** 取得元プレイリストID |

### daily_logシート

| 列名 | 型 | 説明 |
|---|---|---|
| `date` | date | **前日付け**（実績日、yyyy-MM-dd）。トリガーは午前2〜3時実行のため、取得データは前日の実績として記録する。 |
| `videoId` | string | YouTube動画ID |
| `viewCount` | integer | 再生回数 |
| `likeCount` | integer | いいね数 |
| `commentCount` | integer | コメント数 |
| `playlist_id` | string | **[新規追加]** 取得元プレイリストID |
| `recorded_at` | datetime | **[新規追加]** 実際のデータ取得日時（監査・デバッグ用） |

## 5. データフロー

```
YouTube Data API v3
        ↓
Code_collect.gs
  ├─ playlistItems API → 全動画ID取得（ページネーション対応）
  ├─ videos API → 動画詳細・統計取得（50件バッチ）
  ├─ commentThreads API → コメント取得（差分のみ）
  └─ Googleスプレッドシート書き込み
       ├─ 動画マスタ（upsert）
       ├─ 生コメント_YYYY-MM（追記）
       └─ daily_log（追記）
        ↓
Code_export.gs
  ├─ 分析指標計算
  └─ doGet → Web API出力（ダッシュボード向け）
```

## 6. 主要関数一覧

| 関数名 | 説明 | 実行方法 |
|---|---|---|
| `collectDailyData()` | 全プレイリストのデータを収集するメイン関数 | トリガー（毎日 午前2〜3時） |
| `backfillPlaylistIds()` | 既存データに `playlist_id` を後付けするパッチ関数 | 手動実行（初回1回のみ） |
| `_processPlaylist()` | 1プレイリストの処理（動画マスタ更新・コメント取得・daily_log記録） | 内部関数 |
| `_fetchAllVideoIdsFromPlaylist()` | プレイリスト内の全動画IDを取得（ページネーション対応） | 内部関数 |
| `_fetchVideoDetails()` | 動画IDリストから詳細情報を取得（50件バッチ） | 内部関数 |
| `_updateMasterSheet()` | 動画マスタシートをupsert更新 | 内部関数 |
| `_fetchAndSaveComments()` | コメントを取得して月別シートに保存（差分のみ） | 内部関数 |
| `_appendDailyLog()` | daily_logシートに日次データを追記 | 内部関数 |

## 7. 日付処理の設計方針

トリガーは毎日 **午前2〜3時** に実行されます。この時間帯に取得したデータは実質「前日の実績」であるため、以下のルールで日付を管理します。

| 列名 | 内容 | 例（3月5日2時実行の場合） |
|---|---|---|
| `daily_log.date` | 前日付け（実績日） | `2026-03-04` |
| `daily_log.recorded_at` | 実際の取得日時 | `2026-03-05 02:30:00 JST` |
| `動画マスタ.updatedAt` | 実際の取得日時 | `2026-03-05 02:30:00 JST` |

> **注意**: 手動実行時は前日付けになります。意図的に当日付けで記録したい場合は、コード内の `recordDate` を直接指定してください。

## 8. 特徴・設計方針

- **データの一元管理**: Googleスプレッドシートを介して、生データから集計データまでを一元的に管理。
- **処理の分離**: データ収集とデータ集計・出力の役割を明確に分離し、保守性と拡張性を向上。
- **複数プレイリスト対応**: `PLAYLISTS` 配列に追加するだけで新規プレイリストに対応可能。
- **差分取得**: `commentId` による重複チェックで、既取得コメントの再保存を防止。
- **playlist_id による追跡**: 全データに `playlist_id` を付与し、プレイリスト別の分析・フィルタリングを可能にする。
- **APIクォータ保護**: プレイリスト間・バッチ間にスリープを挿入し、API制限を回避。
- **柔軟なデータ提供**: `doGet` 関数により、GASを簡易的なWeb APIとして機能させ、外部からのデータアクセスを可能にする。

## 9. 既存データへの移行手順

`playlist_id` 列を新規追加したため、既存データへの後付け設定が必要です。

1. GASスクリプトエディタを開く
2. `backfillPlaylistIds` 関数を選択
3. 「実行」ボタンをクリック（1回のみ）
4. 実行ログで更新件数を確認する

> **注意**: `backfillPlaylistIds` は冪等性を持ちます（既に `playlist_id` が設定されている行はスキップ）。誤って複数回実行しても問題ありません。
