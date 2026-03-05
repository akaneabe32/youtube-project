/**
 * types.ts — ダッシュボード型定義 v2.0
 * GAS Code_export.gs の出力スキーマに完全対応
 * 旧コメント分析スキーマは削除済み（将来的にコメント分析データが揃い次第復活）
 */

// ============================================================
// GAS出力スキーマ（新）
// ============================================================

export interface DashboardMeta {
  generatedAt: string;   // ISO8601
  dataRange: string;     // "YYYY-MM-DD 〜 YYYY-MM-DD"
  totalVideos: number;
  totalComments: number;
  totalViews: number;
  totalLikes: number;
}

export interface TraineeVideo {
  videoId: string;
  videoTitle: string;
  trainee_name: string;   // 現状はvideoTitleと同値
  stage_type: string;     // 現状は "other"
  publishedAt: string;    // "YYYY-MM-DD"
  viewCount: number;
  likeCount: number;
  commentCount: number;
  updatedAt: string;      // "YYYY-MM-DD"
  playlist_id: string;
  likeRate: number;       // likeCount / viewCount
  commentRate: number;    // commentCount / viewCount
  engagementRate: number; // (likeCount + commentCount) / viewCount
}

export interface DailyTrendItem {
  date: string;           // "YYYY-MM-DD"
  totalViews: number;
  totalLikes: number;
  totalComments: number;
}

export interface PlaylistSummary {
  playlist_id: string;
  label: string;          // 例: "推しカメラ｜新世界"
  priority: number;       // 1=推しカメラ, 2=ファイナルクローズアップ, 3=セルフィー, 4=1MIN PR
  color: string;          // "#RRGGBB"
  videoCount: number;
  totalViews: number;
  totalLikes: number;
  totalComments: number;
  avgLikeRate: number;
  avgCommentRate: number;
  avgEngagementRate: number;
}

export interface DashboardData {
  meta: DashboardMeta;
  trainees: TraineeVideo[];
  dailyTrend: DailyTrendItem[];
  playlistSummary: PlaylistSummary[];
  playlistDailyTrend: Record<string, DailyTrendItem[]>;
}

// ============================================================
// UI用ユーティリティ型
// ============================================================

/** ランキング表示用（traineesから派生） */
export interface RankingRow {
  rank: number;
  videoId: string;
  videoTitle: string;
  playlist_id: string;
  playlistLabel: string;
  playlistColor: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  engagementRate: number;
  likeRate: number;
  commentRate: number;
  publishedAt: string;
}

/** プレイリストIDの定数 */
export const PLAYLIST_IDS = {
  OSHI_CAMERA:   'PL3fCPdnAFT0YNA-DdjkWikiwcsct0vow0',
  THEME_SONG:    'PL3fCPdnAFT0aogIr7kkuJS1mZnEZvpebm',
  SELFIE:        'PL3fCPdnAFT0aLb85MxO107J-_vagdf3H_',
  ONE_MIN_PR:    'PL3fCPdnAFT0bkU6FmQplcjNJXKw7M5ROC',
} as const;

/** ランキングの並び替えキー */
export type RankingMetric = 'viewCount' | 'likeCount' | 'commentCount' | 'engagementRate';
