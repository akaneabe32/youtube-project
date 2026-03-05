/*
 * Trend Section v2.0 — 新スキーマ（GAS）対応
 * Design: STAT PICK Brand — Dark Navy + Pastel Gradient
 * 使用データ: dailyTrend + playlistDailyTrend
 * 表示: 全体日次推移折れ線グラフ + プレイリスト別日次推移
 */

import SectionHeader from '@/components/SectionHeader';
import { formatNumber } from '@/lib/utils';
import type { DashboardData, DailyTrendItem } from '@/lib/types';
import { useState } from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, Cell,
} from 'recharts';

interface Props {
  data: DashboardData;
}

const C_WHITE       = '#ffffff';
const C_CYAN        = '#38bdf8';
const C_MUTED       = 'rgba(255,255,255,0.30)';
const C_CARD_BG     = 'rgba(255,255,255,0.03)';
const C_CARD_BORDER = 'rgba(255,255,255,0.08)';

type TrendMetric = 'totalViews' | 'totalLikes' | 'totalComments';

const METRIC_OPTIONS: { key: TrendMetric; label: string; color: string }[] = [
  { key: 'totalViews',    label: '視聴回数',   color: C_CYAN },
  { key: 'totalLikes',    label: 'いいね数',   color: '#a78bfa' },
  { key: 'totalComments', label: 'コメント数', color: '#f9a8d4' },
];

function shortLabel(label: string): string {
  if (label.includes('推しカメラ')) return '推しカメラ';
  if (label.includes('CLOSE-UP') || label.includes('Theme')) return 'Theme Song';
  if (label.includes('SELFIE')) return 'SELFIE';
  if (label.includes('1MIN')) return '1MIN PR';
  return label.slice(0, 8);
}

export default function TrendSection({ data }: Props) {
  const { dailyTrend, playlistDailyTrend, playlistSummary } = data;
  const [activeMetric, setActiveMetric] = useState<TrendMetric>('totalViews');

  const sorted = [...playlistSummary].sort((a, b) => a.priority - b.priority);

  // 全体トレンドデータ（日付順）
  const overallData = [...dailyTrend].sort((a, b) => a.date.localeCompare(b.date));

  // プレイリスト別日次トレンドデータ（全日付を統合）
  const allDatesArr: string[] = [];
  Object.values(playlistDailyTrend).forEach((items) => {
    (items as DailyTrendItem[]).forEach((item) => {
      if (!allDatesArr.includes(item.date)) allDatesArr.push(item.date);
    });
  });
  const sortedDates = allDatesArr.sort();

  const playlistTrendData = sortedDates.map((date) => {
    const row: Record<string, string | number> = { date };
    sorted.forEach((p) => {
      const items = (playlistDailyTrend[p.playlist_id] || []) as DailyTrendItem[];
      const found = items.find((item: DailyTrendItem) => item.date === date);
      row[p.playlist_id] = found ? found[activeMetric] : 0;
    });
    return row;
  });

  const metricOption = METRIC_OPTIONS.find((m) => m.key === activeMetric)!;
  const hasData = overallData.length > 0;
  const hasMultipleDays = overallData.length > 1;

  return (
    <div>
      <SectionHeader
        title="TREND"
        subtitle="日次トレンド推移"
        badge={`${overallData.length} DAYS`}
      />

      {/* Metric selector */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="text-xs font-display tracking-widest" style={{ color: C_MUTED }}>指標:</div>
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

      {!hasData && (
        <div
          className="p-8 rounded-xl text-center"
          style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
        >
          <div className="text-sm font-jp" style={{ color: C_MUTED }}>
            日次トレンドデータを収集中です
          </div>
          <div className="text-xs font-jp mt-1" style={{ color: 'rgba(255,255,255,0.20)' }}>
            毎日自動収集されるため、数日後にグラフが表示されます
          </div>
        </div>
      )}

      {hasData && (
        <>
          {/* Overall daily trend */}
          <div
            className="p-5 rounded-xl mb-6"
            style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
          >
            <div className="text-xs font-display tracking-widest mb-4" style={{ color: C_MUTED }}>
              OVERALL DAILY {metricOption.label.toUpperCase()}
            </div>
            {hasMultipleDays ? (
              <ResponsiveContainer width="100%" height={220}>
                <LineChart data={overallData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
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
                    labelStyle={{ color: C_WHITE, fontSize: 12 }}
                    formatter={(value: number) => [formatNumber(value), metricOption.label]}
                  />
                  <Line
                    type="monotone"
                    dataKey={activeMetric}
                    stroke={metricOption.color}
                    strokeWidth={2.5}
                    dot={{ fill: metricOption.color, r: 4 }}
                    activeDot={{ r: 6 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              /* 1日分のみの場合は棒グラフ */
              <div>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={overallData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
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
                      labelStyle={{ color: C_WHITE, fontSize: 12 }}
                      formatter={(value: number) => [formatNumber(value), metricOption.label]}
                    />
                    <Bar dataKey={activeMetric} fill={metricOption.color} radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
                <div className="text-xs font-jp mt-2 text-center" style={{ color: 'rgba(255,255,255,0.25)' }}>
                  ※ 現在 {overallData.length} 日分のデータです。蓄積で折れ線グラフに変わります
                </div>
              </div>
            )}
          </div>

          {/* Playlist daily trend */}
          {playlistTrendData.length > 0 && (
            <div
              className="p-5 rounded-xl"
              style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
            >
              <div className="text-xs font-display tracking-widest mb-4" style={{ color: C_MUTED }}>
                PLAYLIST DAILY {metricOption.label.toUpperCase()}
              </div>
              {playlistTrendData.length > 1 ? (
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={playlistTrendData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
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
                        return [formatNumber(value), p ? shortLabel(p.label) : name];
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
                        dot={{ fill: p.color, r: 3 }}
                        activeDot={{ r: 5 }}
                      />
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                /* 1日分のみ */
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={playlistTrendData} margin={{ top: 5, right: 20, left: 20, bottom: 5 }}>
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
                        return [formatNumber(value), p ? shortLabel(p.label) : name];
                      }}
                    />
                    {sorted.map((p) => (
                      <Bar key={p.playlist_id} dataKey={p.playlist_id} fill={p.color} radius={[4, 4, 0, 0]} />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          )}

          {/* Data summary table */}
          <div
            className="mt-6 rounded-xl overflow-hidden"
            style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
          >
            <div className="px-5 py-3" style={{ borderBottom: `1px solid ${C_CARD_BORDER}` }}>
              <div className="text-xs font-display tracking-widest" style={{ color: C_MUTED }}>
                DAILY DATA TABLE
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: `1px solid ${C_CARD_BORDER}` }}>
                    {['日付', '視聴回数', 'いいね数', 'コメント数'].map((h) => (
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
                  {overallData.map((d) => (
                    <tr
                      key={d.date}
                      style={{ borderBottom: 'rgba(255,255,255,0.04)' }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3 font-mono-data text-xs" style={{ color: C_MUTED }}>{d.date}</td>
                      <td className="px-4 py-3 font-mono-data text-xs" style={{ color: C_WHITE }}>{formatNumber(d.totalViews)}</td>
                      <td className="px-4 py-3 font-mono-data text-xs" style={{ color: C_MUTED }}>{formatNumber(d.totalLikes)}</td>
                      <td className="px-4 py-3 font-mono-data text-xs" style={{ color: C_MUTED }}>{formatNumber(d.totalComments)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
