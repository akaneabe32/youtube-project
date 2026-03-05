/*
 * Playlist Section v2.0 — 新スキーマ（GAS）対応
 * Design: STAT PICK Brand — Dark Navy + Pastel Gradient
 * 使用データ: playlistSummary + playlistDailyTrend
 * 表示: プレイリスト別比較カード・指標別棒グラフ・日次トレンド折れ線グラフ
 */

import SectionHeader from '@/components/SectionHeader';
import { formatNumber, formatPct } from '@/lib/utils';
import type { DashboardData, PlaylistSummary, DailyTrendItem } from '@/lib/types';
import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  LineChart, Line, Legend,
} from 'recharts';

interface Props {
  data: DashboardData;
}

const C_WHITE       = '#ffffff';
const C_CYAN        = '#38bdf8';
const C_MUTED       = 'rgba(255,255,255,0.30)';
const C_CARD_BG     = 'rgba(255,255,255,0.03)';
const C_CARD_BORDER = 'rgba(255,255,255,0.08)';

type MetricKey = 'totalViews' | 'totalLikes' | 'totalComments' | 'avgEngagementRate';

const METRIC_OPTIONS: { key: MetricKey; label: string; format: (v: number) => string }[] = [
  { key: 'totalViews',        label: '視聴回数',         format: (v) => formatNumber(v) },
  { key: 'totalLikes',        label: 'いいね数',         format: (v) => formatNumber(v) },
  { key: 'totalComments',     label: 'コメント数',       format: (v) => formatNumber(v) },
  { key: 'avgEngagementRate', label: '平均エンゲージメント率', format: (v) => formatPct(v * 100, 2) },
];

function shortLabel(label: string): string {
  if (label.includes('推しカメラ')) return '推しカメラ';
  if (label.includes('CLOSE-UP') || label.includes('Theme')) return 'Theme Song';
  if (label.includes('SELFIE')) return 'SELFIE';
  if (label.includes('1MIN')) return '1MIN PR';
  return label.slice(0, 8);
}

export default function PlaylistSection({ data }: Props) {
  const { playlistSummary, playlistDailyTrend } = data;
  const [activeMetric, setActiveMetric] = useState<MetricKey>('totalViews');

  const sorted = [...playlistSummary].sort((a, b) => a.priority - b.priority);

  // 棒グラフ用データ
  const barData = sorted.map((p) => ({
    name: shortLabel(p.label),
    value: p[activeMetric] as number,
    color: p.color,
  }));

  // 日次トレンド折れ線グラフ用データ
  // 全プレイリストの日付を統合してマージ
  const allDatesArr: string[] = [];
  Object.values(playlistDailyTrend).forEach((items) => {
    (items as DailyTrendItem[]).forEach((item) => {
      if (!allDatesArr.includes(item.date)) allDatesArr.push(item.date);
    });
  });
  const sortedDates = allDatesArr.sort();

  const trendData = sortedDates.map((date) => {
    const row: Record<string, string | number> = { date };
    sorted.forEach((p) => {
      const items = (playlistDailyTrend[p.playlist_id] || []) as DailyTrendItem[];
      const found = items.find((item: DailyTrendItem) => item.date === date);
      row[p.playlist_id] = found ? found.totalViews : 0;
    });
    return row;
  });

  const metricOption = METRIC_OPTIONS.find((m) => m.key === activeMetric)!;

  return (
    <div>
      <SectionHeader
        title="PLAYLIST"
        subtitle="プレイリスト別比較分析"
        badge={`${sorted.length} PLAYLISTS`}
      />

      {/* Playlist cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {sorted.map((p) => (
          <div
            key={p.playlist_id}
            className="p-4 rounded-xl"
            style={{
              background: `${p.color}10`,
              border: `1px solid ${p.color}30`,
            }}
          >
            {/* Priority badge */}
            <div className="flex items-center justify-between mb-3">
              <div
                className="text-xs font-mono-data px-2 py-0.5 rounded"
                style={{ background: `${p.color}20`, color: p.color }}
              >
                #{p.priority}
              </div>
              <div className="text-xs font-mono-data" style={{ color: C_MUTED }}>
                {p.videoCount} 動画
              </div>
            </div>
            {/* Label */}
            <div className="font-jp text-xs mb-3 leading-snug" style={{ color: C_WHITE }}>
              {p.label}
            </div>
            {/* Metrics */}
            <div className="space-y-1.5">
              <div className="flex justify-between text-xs">
                <span style={{ color: C_MUTED }}>視聴回数</span>
                <span className="font-mono-data" style={{ color: C_WHITE }}>{formatNumber(p.totalViews)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: C_MUTED }}>いいね数</span>
                <span className="font-mono-data" style={{ color: C_MUTED }}>{formatNumber(p.totalLikes)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span style={{ color: C_MUTED }}>コメント数</span>
                <span className="font-mono-data" style={{ color: C_MUTED }}>{formatNumber(p.totalComments)}</span>
              </div>
              <div className="flex justify-between text-xs pt-1" style={{ borderTop: `1px solid ${p.color}20` }}>
                <span style={{ color: C_MUTED }}>平均ER</span>
                <span className="font-mono-data font-bold" style={{ color: p.color }}>
                  {formatPct(p.avgEngagementRate * 100, 2)}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Metric selector + Bar chart */}
      <div
        className="p-5 rounded-xl mb-6"
        style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
      >
        {/* Tab selector */}
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <div className="text-xs font-display tracking-widest mr-2" style={{ color: C_MUTED }}>
            指標:
          </div>
          {METRIC_OPTIONS.map((opt) => (
            <button
              key={opt.key}
              onClick={() => setActiveMetric(opt.key)}
              className="px-3 py-1 rounded text-xs font-display tracking-wide transition-all"
              style={{
                background: activeMetric === opt.key ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${activeMetric === opt.key ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.08)'}`,
                color: activeMetric === opt.key ? C_CYAN : C_MUTED,
              }}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="text-xs font-display tracking-widest mb-3" style={{ color: C_MUTED }}>
          {metricOption.label.toUpperCase()} BY PLAYLIST
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={barData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis
              dataKey="name"
              tick={{ fill: 'rgba(255,255,255,0.45)', fontSize: 12, fontFamily: 'Noto Sans JP' }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 10 }}
              axisLine={false}
              tickLine={false}
              tickFormatter={(v: number) =>
                activeMetric === 'avgEngagementRate'
                  ? `${(v * 100).toFixed(1)}%`
                  : `${(v / 10000).toFixed(0)}万`
              }
            />
            <Tooltip
              contentStyle={{ background: '#0d1230', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}
              labelStyle={{ color: C_WHITE, fontFamily: 'Noto Sans JP', fontSize: 12 }}
              formatter={(value: number) => [metricOption.format(value), metricOption.label]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {barData.map((entry: { name: string; value: number; color: string }, i: number) => (
                <Cell key={`cell-${i}`} fill={entry.color} opacity={0.85} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Daily trend line chart (views) */}
      {trendData.length > 1 && (
        <div
          className="p-5 rounded-xl"
          style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
        >
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: C_MUTED }}>
            DAILY VIEWS TREND BY PLAYLIST
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={trendData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                dataKey="date"
                tick={{ fill: 'rgba(255,255,255,0.35)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${(v / 10000).toFixed(0)}万`}
              />
              <Tooltip
                contentStyle={{ background: '#0d1230', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}
                labelStyle={{ color: C_WHITE, fontFamily: 'Noto Sans JP', fontSize: 12 }}
                formatter={(value: number, name: string) => {
                  const p = sorted.find((pl) => pl.playlist_id === name);
                  return [formatNumber(value) + ' 回', p ? shortLabel(p.label) : name];
                }}
              />
              <Legend
                formatter={(value: string) => {
                  const p = sorted.find((pl) => pl.playlist_id === value);
                  return <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontFamily: 'Noto Sans JP' }}>{p ? shortLabel(p.label) : value}</span>;
                }}
              />
              {sorted.map((p) => (
                <Line
                  key={p.playlist_id}
                  type="monotone"
                  dataKey={p.playlist_id}
                  stroke={p.color}
                  strokeWidth={2}
                  dot={{ fill: p.color, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
          <div className="text-xs font-jp mt-2 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
            ※ データ蓄積中（収集開始直後のため日数が少ない場合があります）
          </div>
        </div>
      )}

      {trendData.length <= 1 && (
        <div
          className="p-5 rounded-xl text-center"
          style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
        >
          <div className="text-xs font-display tracking-widest mb-2" style={{ color: C_MUTED }}>
            DAILY TREND
          </div>
          <div className="text-sm font-jp" style={{ color: 'rgba(255,255,255,0.35)' }}>
            日次トレンドデータを蓄積中です（現在 {trendData.length} 日分）
          </div>
          <div className="text-xs font-jp mt-1" style={{ color: 'rgba(255,255,255,0.20)' }}>
            毎日自動収集されるため、数日後にグラフが表示されます
          </div>
        </div>
      )}
    </div>
  );
}
