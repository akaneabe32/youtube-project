/*
 * Overview Section v2.0 — 新スキーマ（GAS）対応
 * Design: STAT PICK Brand — Dark Navy + Pastel Gradient
 * 使用データ: meta + playlistSummary
 * KPI: 総視聴回数・総いいね数・総コメント数・動画本数
 * チャート: プレイリスト別視聴回数棒グラフ・エンゲージメント率比較
 */

import KpiCard from '@/components/KpiCard';
import SectionHeader from '@/components/SectionHeader';
import { formatNumber, formatPct } from '@/lib/utils';
import type { DashboardData } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Tooltip, ResponsiveContainer,
} from 'recharts';

interface Props {
  data: DashboardData;
}

const C_WHITE       = '#ffffff';
const C_CYAN        = '#38bdf8';
const C_MUTED       = 'rgba(255,255,255,0.30)';
const C_CARD_BG     = 'rgba(255,255,255,0.03)';
const C_CARD_BORDER = 'rgba(255,255,255,0.08)';

/** プレイリストラベルを短縮表示 */
function shortLabel(label: string): string {
  if (label.includes('推しカメラ')) return '推しカメラ';
  if (label.includes('CLOSE-UP') || label.includes('Theme')) return 'Theme Song';
  if (label.includes('SELFIE')) return 'SELFIE';
  if (label.includes('1MIN')) return '1MIN PR';
  return label.slice(0, 8);
}

export default function OverviewSection({ data }: Props) {
  const { meta, playlistSummary } = data;

  // プレイリスト別視聴回数（棒グラフ用）
  const viewsChartData = [...playlistSummary]
    .sort((a, b) => a.priority - b.priority)
    .map((p) => ({
      name: shortLabel(p.label),
      views: p.totalViews,
      color: p.color,
    }));

  // エンゲージメント率比較（棒グラフ用）
  const engagementChartData = [...playlistSummary]
    .sort((a, b) => a.priority - b.priority)
    .map((p) => ({
      name: shortLabel(p.label),
      engagement: Math.round(p.avgEngagementRate * 10000) / 100, // %表示
      likeRate: Math.round(p.avgLikeRate * 10000) / 100,
      commentRate: Math.round(p.avgCommentRate * 10000) / 100,
      color: p.color,
    }));

  // 最終更新日時の表示
  const generatedAt = meta.generatedAt
    ? new Date(meta.generatedAt).toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' })
    : '不明';

  // データ範囲の表示（日付順を正規化: 古い日付 〜 新しい日付）
  const normalizedDataRange = (() => {
    if (!meta.dataRange) return '取得中';
    const parts = meta.dataRange.split(/[〜~\-–—]/).map((s) => s.trim());
    if (parts.length === 2) {
      const [a, b] = parts;
      const da = new Date(a);
      const db = new Date(b);
      if (!isNaN(da.getTime()) && !isNaN(db.getTime())) {
        const [start, end] = da <= db ? [a, b] : [b, a];
        return `${start} 〜 ${end}`;
      }
    }
    return meta.dataRange;
  })();

  return (
    <div>
      {/* Page title banner */}
      <div className="mb-6 pb-5" style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="font-display text-sm tracking-[0.3em] mb-1" style={{ color: '#60a5fa' }}>
          PRODUCE 101 JAPAN
        </div>
        <h1 className="font-display leading-tight">
          <span className="text-4xl" style={{ color: '#60a5fa' }}>SHINSEKAI</span>{' '}
          <span className="text-3xl" style={{ color: 'rgba(255,255,255,0.55)' }}>ANALYSIS</span>
        </h1>
        <div className="text-xs font-jp mt-1" style={{ color: 'rgba(240,244,255,0.35)' }}>
          S4 YouTube動画 エンゲージメント分析ダッシュボード — 非公式ファンサイト
        </div>
      </div>

      <SectionHeader
        title="OVERVIEW"
        subtitle="全体サマリー — 4プレイリスト合計"
        badge={`${formatNumber(meta.totalVideos)} VIDEOS`}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KpiCard
          title="TOTAL VIEWS"
          value={formatNumber(meta.totalViews)}
          subtitle="総視聴回数"
          accent="cyan"
          delay={0}
        />
        <KpiCard
          title="TOTAL LIKES"
          value={formatNumber(meta.totalLikes)}
          subtitle="総いいね数"
          accent="default"
          delay={80}
        />
        <KpiCard
          title="TOTAL COMMENTS"
          value={formatNumber(meta.totalComments)}
          subtitle="総コメント数"
          accent="default"
          delay={160}
        />
        <KpiCard
          title="TOTAL VIDEOS"
          value={formatNumber(meta.totalVideos)}
          subtitle="動画本数（4プレイリスト）"
          accent="default"
          delay={240}
        />
      </div>

      {/* Data range & last updated */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono-data"
          style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}`, color: C_MUTED }}
        >
          <span style={{ color: C_CYAN }}>◈</span>
          データ範囲: {normalizedDataRange}
        </div>
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-mono-data"
          style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}`, color: C_MUTED }}
        >
          <span style={{ color: C_CYAN }}>◉</span>
          最終更新: {generatedAt} JST
        </div>
      </div>

      {/* Charts: Views by playlist + Engagement comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        {/* プレイリスト別視聴回数 */}
        <div
          className="p-5 rounded-xl"
          style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
        >
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: C_MUTED }}>
            VIEWS BY PLAYLIST
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={viewsChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'Noto Sans JP' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${(v / 10000).toFixed(0)}万`}
              />
              <Tooltip
                contentStyle={{ background: '#0d1230', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}
                labelStyle={{ color: C_WHITE, fontFamily: 'Noto Sans JP', fontSize: 12 }}
                formatter={(value: number) => [formatNumber(value) + ' 回', '視聴回数']}
              />
              <Bar dataKey="views" radius={[4, 4, 0, 0]}>
                {viewsChartData.map((entry: { name: string; views: number; color: string }, i: number) => (
                  <Cell key={`cell-${i}`} fill={entry.color} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* プレイリスト別平均エンゲージメント率 */}
        <div
          className="p-5 rounded-xl"
          style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
        >
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: C_MUTED }}>
            AVG ENGAGEMENT RATE BY PLAYLIST
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={engagementChartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="name"
                tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 11, fontFamily: 'Noto Sans JP' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip
                contentStyle={{ background: '#0d1230', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}
                labelStyle={{ color: C_WHITE, fontFamily: 'Noto Sans JP', fontSize: 12 }}
                formatter={(value: number) => [formatPct(value), '平均エンゲージメント率']}
              />
              <Bar dataKey="engagement" radius={[4, 4, 0, 0]}>
                {engagementChartData.map((entry: { name: string; engagement: number; likeRate: number; commentRate: number; color: string }, i: number) => (
                  <Cell key={`cell-${i}`} fill={entry.color} opacity={0.85} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Playlist summary table */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
      >
        <div className="px-5 py-3" style={{ borderBottom: `1px solid ${C_CARD_BORDER}` }}>
          <div className="text-xs font-display tracking-widest" style={{ color: C_MUTED }}>
            PLAYLIST SUMMARY
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr style={{ borderBottom: `1px solid ${C_CARD_BORDER}` }}>
                {['プレイリスト', '動画数', '視聴回数', 'いいね数', 'コメント数', '平均ER'].map(h => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-display tracking-wider"
                    style={{ color: 'rgba(255,255,255,0.35)' }}
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[...playlistSummary]
                .sort((a, b) => a.priority - b.priority)
                .map((p) => (
                  <tr
                    key={p.playlist_id}
                    style={{ borderBottom: `1px solid rgba(255,255,255,0.04)` }}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ background: p.color }}
                        />
                        <span className="font-jp text-xs" style={{ color: C_WHITE }}>
                          {p.label}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-mono-data text-xs" style={{ color: C_MUTED }}>
                      {p.videoCount}
                    </td>
                    <td className="px-4 py-3 font-mono-data text-xs" style={{ color: C_WHITE }}>
                      {formatNumber(p.totalViews)}
                    </td>
                    <td className="px-4 py-3 font-mono-data text-xs" style={{ color: C_MUTED }}>
                      {formatNumber(p.totalLikes)}
                    </td>
                    <td className="px-4 py-3 font-mono-data text-xs" style={{ color: C_MUTED }}>
                      {formatNumber(p.totalComments)}
                    </td>
                    <td className="px-4 py-3 font-mono-data text-xs" style={{ color: C_CYAN }}>
                      {formatPct(p.avgEngagementRate * 100, 2)}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
