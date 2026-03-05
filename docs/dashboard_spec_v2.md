# ダッシュボード仕様書 v2.0
> 作成日: 2026-03-05 / ステータス: 確認待ち（実装許可前）

---

## 背景・変更理由

旧ダッシュボード（v1）はコメント分析済みJSONを前提に設計されていた。
現在のデータ基盤はGAS（Code_collect.gs + Code_export.gs）が生成するJSONに変更されており、
スキーマが全く異なるため、ダッシュボード全体を新スキーマに合わせて再設計する。

---

## GAS出力JSONスキーマ（確定）

```
{
  "meta": {
    "generatedAt": "ISO8601",
    "dataRange": "Thu Mar 05 〜 Wed Mar 04",
    "totalVideos": 402,
    "totalComments": 53564,
    "totalViews": 11457606,
    "totalLikes": 519100
  },
  "trainees": [
    {
      "videoId": "string",
      "videoTitle": "string",
      "trainee_name": "string",   // 現状はvideoTitleと同値（将来的に練習生名に変更）
      "stage_type": "string",     // 現状は "other"（将来的に分類）
      "publishedAt": "YYYY-MM-DD",
      "viewCount": number,
      "likeCount": number,
      "commentCount": number,
      "updatedAt": "YYYY-MM-DD",
      "playlist_id": "string",
      "likeRate": number,         // likeCount / viewCount
      "commentRate": number,      // commentCount / viewCount
      "engagementRate": number    // (likeCount + commentCount) / viewCount
    }
  ],
  "dailyTrend": [
    {
      "date": "Wed Mar 04",
      "totalViews": number,
      "totalLikes": number,
      "totalComments": number
    }
  ],
  "playlistSummary": [
    {
      "playlist_id": "string",
      "label": "string",          // 例: "推しカメラ｜新世界"
      "priority": number,         // 1=推しカメラ, 2=ファイナルクローズアップ, 3=セルフィー, 4=1MIN PR
      "color": "#RRGGBB",
      "videoCount": number,
      "totalViews": number,
      "totalLikes": number,
      "totalComments": number,
      "avgLikeRate": number,
      "avgCommentRate": number,
      "avgEngagementRate": number
    }
  ],
  "playlistDailyTrend": {
    "PL3fCPdnAFT0YNA-DdjkWikiwcsct0vow0": [
      { "date": "Wed Mar 04", "totalViews": number, "totalLikes": number, "totalComments": number }
    ],
    ...
  }
}
```

---

## データ制約・注意事項

| 項目 | 現状 | 将来対応 |
|---|---|---|
| `trainee_name` | videoTitleと同値 | 練習生名マスタから抽出 |
| `stage_type` | 全て "other" | 動画タイトルから分類 |
| `dailyTrend` | 2日分のみ（収集開始直後） | 蓄積で増加 |
| コメント分析 | なし（コメント数のみ） | Chrome拡張+Pythonで別途実施 |
| `playlistDailyTrend` | 数値キー混在（バグ） | Code_export.gsで修正要 |

---

## ダッシュボード画面構成（v2）

### 基本方針
- GASのJSONのみで表示できる指標に絞る
- コメント分析（感情・言語・トップコメント等）は現時点では表示しない
- プレイリスト別の比較分析を中心に据える
- データが蓄積されるにつれて自動的にグラフが充実する設計

### セクション構成（11 → 5セクションに整理）

| # | セクションID | 表示名 | 使用データ | 優先度 |
|---|---|---|---|---|
| 1 | `overview` | 全体サマリー | `meta` + `playlistSummary` | 最高 |
| 2 | `playlist` | プレイリスト比較 | `playlistSummary` + `playlistDailyTrend` | 最高 |
| 3 | `ranking` | 動画ランキング | `trainees` | 高 |
| 4 | `trend` | トレンド推移 | `dailyTrend` + `playlistDailyTrend` | 高 |
| 5 | `engagement` | エンゲージメント分析 | `trainees` | 中 |

### 各セクションの詳細

#### 1. Overview（全体サマリー）
- 総視聴回数・総いいね数・総コメント数・動画本数のKPIカード（4枚）
- 最終更新日時（`meta.generatedAt`）
- データ範囲（`meta.dataRange`）

#### 2. Playlist（プレイリスト比較）
- プレイリスト別の棒グラフ比較（視聴回数・いいね数・コメント数・エンゲージメント率）
- プレイリスト別の平均エンゲージメント率の横棒グラフ
- 各プレイリストのカラーコード（GASで定義済み）を使用

#### 3. Ranking（動画ランキング）
- 視聴回数 / いいね数 / エンゲージメント率 の切り替えタブ
- 上位20本のリスト表示
- プレイリストフィルター（全て / 推しカメラ / ファイナルクローズアップ / セルフィー / 1MIN PR）
- YouTubeリンク付き

#### 4. Trend（トレンド推移）
- 全体の日次視聴回数推移（折れ線グラフ）
- プレイリスト別の日次推移（重ね折れ線グラフ）
- ※ 現時点では2日分のみ。蓄積で充実

#### 5. Engagement（エンゲージメント分析）
- いいね率 vs コメント率の散布図（動画単位）
- プレイリスト別の色分け
- エンゲージメント率の分布ヒストグラム

---

## 削除・保留するセクション

| セクション | 理由 |
|---|---|
| Sentiment（感情分析） | コメント分析データなし |
| Language（言語分布） | コメント分析データなし |
| TopComments（トップコメント） | コメント生データなし |
| Demographic（デモグラフィック） | データなし |
| MECE分析 | コメント分析データなし |
| OshiDiagnosis（推しタイプ診断） | UU数・コミットメント率等のデータなし |
| Surge（急上昇） | 日次データが2日分のみで計算不可 |

→ これらは将来的にChrome拡張+Pythonによるコメント分析データが揃い次第復活

---

## 型定義（新DashboardData）

```typescript
export interface PlaylistSummary {
  playlist_id: string;
  label: string;
  priority: number;
  color: string;
  videoCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgLikeRate: number;
  avgCommentRate: number;
  avgEngagementRate: number;
}

export interface TraineeVideo {
  videoId: string;
  videoTitle: string;
  trainee_name: string;
  stage_type: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  updatedAt: string;
  playlist_id: string;
  likeRate: number;
  commentRate: number;
  engagementRate: number;
}

export interface DailyTrendItem {
  date: string;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

export interface DashboardMeta {
  generatedAt: string;
  dataRange: string;
  totalVideos: number;
  totalComments: number;
  totalViews: number;
  totalLikes: number;
}

export interface DashboardData {
  meta: DashboardMeta;
  trainees: TraineeVideo[];
  dailyTrend: DailyTrendItem[];
  playlistSummary: PlaylistSummary[];
  playlistDailyTrend: Record<string, DailyTrendItem[]>;
}
```

---

## Code_export.gsの修正事項（バグ修正）

`playlistDailyTrend` に数値キー（`"1"`, `"2"` 等）が混在している。
これは `_buildDashboardData` 内でプレイリストIDの代わりに行インデックスが使われているバグ。
→ ダッシュボード実装前に修正が必要。

---

## 実装工数見積もり

| 作業 | 工数 |
|---|---|
| `lib/types.ts` の型定義更新 | 小 |
| `useDashboardData.ts` のバリデーション更新 | 小 |
| `OverviewSection.tsx` の改修 | 中 |
| `PlaylistSection.tsx` の新規作成 | 中 |
| `RankingSection.tsx` の改修 | 中 |
| `TrendSection.tsx` の新規作成 | 中 |
| `EngagementSection.tsx` の改修 | 中 |
| 不要セクションの削除・整理 | 小 |
| `Code_export.gs` のバグ修正 | 小 |
| **合計** | **約4〜6時間** |
