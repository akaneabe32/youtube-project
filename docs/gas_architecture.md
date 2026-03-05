# GAS アーキテクチャ設計書

> 新世界 S4 チッケム動画分析ダッシュボード（STAT PICK）向け  
> 最終更新: 2026-03-05

---

## 概要

本ドキュメントは、Google Apps Script（GAS）を用いた YouTube データ自動収集システムのアーキテクチャを定めます。

---

## 1. システム全体像

```
YouTube Data API v3
        ↓ 毎日自動（GAS トリガー 02:00〜03:00 JST）
Code_collect.gs
        ↓
スプレッドシート A（チッケム系）
  └ 日ぷS4シグナルソングチッケム実績
        ↓ 毎日自動（GAS トリガー 03:00〜04:00 JST）
buildAndCacheJson.gs
        ↓
dashboard_data.json（GAS WebApp）
        ↓
ダッシュボード（shinsekai-dashboard）
```

```
Chrome拡張機能（YT Comment Exporter）
        ↓ 週1回手動
ローカルCSV（コメントローデータ）
        ↓ 手動インポート
スプレッドシート B（Chrome拡張 手動取得データ）
  └ STAT PICK | Chrome拡張 手動取得データ
        ↓ コンテンツ制作時
Pythonスクリプト（深堀り分析）
```

---

## 2. スプレッドシート構成

### スプレッドシート A：チッケム系（GAS 自動更新）

**ファイル名：** 日ぷS4シグナルソングチッケム実績  
**スプレッドシートID：** `16wOG1MctyXn4IW4nG33hUtrbiNewAhkvE-EYVI78gNA`  
**対象プレイリスト：** Theme Song THE FINAL CLOSE-UP 💙 / 推しカメラ｜新世界 (SHINSEKAI)

| シート名 | 内容 |
|---|---|
| `動画マスタ` | 動画の基本情報（videoId・タイトル・練習生名・ステージ種別・playlist_id） |
| `daily_log` | 日次スナップショット（前日付けで記録） |
| `views_cum` | 再生数累計（横展開形式） |
| `likes_cum` | いいね数累計（横展開形式） |
| `comments_cum` | コメント数累計（横展開形式） |
| `total_cum` | 合計スコア累計（横展開形式） |
| `views_delta` | 再生数日次増加量 |
| `likes_delta` | いいね数日次増加量 |
| `comments_delta` | コメント数日次増加量 |
| `ranking` | 最新日の累計スコア降順ランキング |
| `rank_trend_views` | 再生数ランキング推移（上位20） |
| `rank_trend_likes` | いいね数ランキング推移（上位20） |
| `rank_trend_comments` | コメント数ランキング推移（上位20） |
| `rank_trend_total` | 合計スコアランキング推移（上位20） |

### スプレッドシート B：Chrome拡張 手動取得データ

**ファイル名：** STAT PICK | Chrome拡張 手動取得データ  
**スプレッドシートID：** `1K0WWY6C3wSqmRglDYN2e4lH9jPkVe4IJH85L2ndHzbo`  
**更新方法：** 週1回手動（Chrome拡張 → CSVインポート）

| シート名 | 内容 | 主要列 |
|---|---|---|
| `video_stats` | 動画基本指標（取得日付き） | fetch_date, playlist_id, videoId, viewCount, likeCount, commentCount, engagementRate |
| `video_metrics` | コメント集計指標 | commentUU, commentParticipationRate, avgCommentsPerUser, commentDispersionRate, commentGini, commitmentRate, 言語率, トーン率 |
| `comment_metrics` | テキスト分析結果 | keyword_frequency_json, bigram_frequency_json, sentiment_score |
| `import_log` | インポート履歴 | import_date, playlist_id, video_count, comment_count, source |

> **設計方針：** コメントローデータ（1行1コメント）はスプレッドシートに保存しない。PCスペックへの配慮とスプシ軽量化のため、ローカルCSVとして保管する。

---

## 3. GAS スクリプト構成

### Code_collect.gs（メインスクリプト）

**スクリプトID：** `1F1ffhzeZfAtmQTB4itsAU2Sz18RHs59BBQO15q0gJT06nU_wIptxGls8`

#### 主要関数

| 関数名 | 役割 | 実行方法 |
|---|---|---|
| `collectDailyData()` | 全プレイリストの動画データを取得・保存 | トリガー（毎日02:00〜03:00 JST） |
| `buildAndCacheJson()` | ダッシュボード用JSONを生成・キャッシュ | トリガー（毎日03:00〜04:00 JST） |
| `setupApiKeyOnce()` | APIキーをスクリプトプロパティに設定 | 初回1回のみ手動実行 |
| `backfillPlaylistIds()` | 既存データに playlist_id を後付け | 初回1回のみ手動実行 |

#### 対象プレイリスト（PLAYLISTS 配列）

| 優先度 | name | label | プレイリストID |
|---|---|---|---|
| 1 | `finalCloseUp` | Theme Song THE FINAL CLOSE-UP 💙 | `PL3fCPdnAFT0WqEHbmRCWZVBVpfKVUqUHx` |
| 2 | `oshiCamera` | 推しカメラ｜新世界 (SHINSEKAI) | `PL3fCPdnAFT0YNA-DdjkWikiwcsct0vow0` |
| 3 | `selfie` | SHINSEKAI SELFIE CHALLENGE 📷 | `PL3fCPdnAFT0ZmfLCdHPPXGwMhEBJKNfwW` |
| 4 | `oneMinPr` | SHINSEKAI 1MIN PR 🌏 | `PL3fCPdnAFT0aCKwqGqJhBXHlLXDjOvQZh` |

---

## 4. データスキーマ

### 動画マスタ（`動画マスタ` シート）

| 列名 | 型 | 説明 |
|---|---|---|
| `videoId` | string | YouTube 動画ID |
| `videoTitle` | string | 動画タイトル |
| `trainee_name` | string | 練習生名（タイトルから抽出） |
| `stage_type` | string | ステージ種別（タイトルから抽出） |
| `publishedAt` | date | 公開日時 |
| `viewCount` | number | 再生回数（最終取得値） |
| `likeCount` | number | いいね数（最終取得値） |
| `commentCount` | number | コメント数（最終取得値） |
| `playlist_id` | string | 所属プレイリストID |
| `updatedAt` | datetime | 最終更新日時 |

### daily_log（`daily_log` シート）

| 列名 | 型 | 説明 |
|---|---|---|
| `date` | date | 記録日付（**前日付け**・実績日） |
| `recorded_at` | datetime | 実際の取得日時（監査用） |
| `playlist_id` | string | プレイリストID |
| `videoId` | string | YouTube 動画ID |
| `trainee_name` | string | 練習生名 |
| `viewCount` | number | 再生回数（スナップショット） |
| `likeCount` | number | いいね数（スナップショット） |
| `commentCount` | number | コメント数（スナップショット） |

> **前日付けの理由：** トリガーは02:00〜03:00 JSTに実行されるため、取得データは実質的に前日の実績を表す。`date` 列は前日付けで記録し、`recorded_at` 列に実際の取得日時を保存することで監査可能にする。

---

## 5. アラート機能

### 失敗アラート（Gmailメール通知）

`collectDailyData()` の実行中にエラーが発生した場合、自動でGmailに通知を送る。

**設定方法：**
- スクリプトプロパティ `ALERT_EMAIL` に通知先メールアドレスを設定
- 未設定の場合はスクリプト実行者のGmailに送信

**通知内容：**
- エラー発生日時
- エラーが発生したプレイリスト名
- エラーメッセージ
- 正常完了したプレイリスト数 / 全プレイリスト数

---

## 6. コメント取得設計

### 差分取得（早期終了方式）

毎回全件取得するのではなく、前回取得済みの最新コメントIDが出現した時点で取得を停止する。

| 条件 | 動作 |
|---|---|
| 通常時 | `order=time` で新規コメントのみ取得（既知ID出現で停止） |
| 最大ページ超過時（上限: 10ページ = 1,000件） | 警告ログを出して停止 |
| 前回取得から7日以上経過 | 全件取得モードに切り替え |
| コメントが無効化されている動画 | スキップ |

> **制約：** YouTube Data API の `commentThreads.list` には `publishedAfter` パラメータが存在しないため、日付によるフィルタリングは公式にはサポートされていない。上記の早期終了方式はこの制約への対応策である。

---

## 7. スクリプトプロパティ

| プロパティ名 | 説明 | 設定方法 |
|---|---|---|
| `YT_API_KEY` | YouTube Data API v3 キー | `setupApiKeyOnce()` で設定 |
| `SPREADSHEET_ID` | スプレッドシートAのID | `setupApiKeyOnce()` で設定 |
| `ALERT_EMAIL` | アラート通知先メールアドレス | 手動で設定（任意） |

---

## 8. APIクォータ管理

YouTube Data API v3 の1日あたりのクォータ上限は **10,000ユニット**。

| 操作 | コスト（ユニット） | 1回の実行での消費量 |
|---|---|---|
| `playlistItems.list` | 1 / リクエスト | 4プレイリスト × 数ページ ≈ 20〜40 |
| `videos.list` | 1 / リクエスト | 約82本 ÷ 50 × 4 ≈ 8 |
| `commentThreads.list` | 1 / リクエスト | 差分取得のため変動（通常1〜10） |
| **合計（通常時）** | — | **約50〜100ユニット/日** |

---

## 9. 既存データへの移行手順

`playlist_id` 列を新規追加したため、既存データへの後付け設定が必要。

1. GASスクリプトエディタを開く
2. `backfillPlaylistIds` 関数を選択
3. 「実行」ボタンをクリック（1回のみ）
4. 実行ログで更新件数を確認する

> **注意:** `backfillPlaylistIds` は冪等性を持つ（既に `playlist_id` が設定されている行はスキップ）。誤って複数回実行しても問題ない。

---

*本ドキュメントはシステム変更の都度更新すること。*
