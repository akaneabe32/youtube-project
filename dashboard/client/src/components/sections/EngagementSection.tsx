/*
 * Engagement Section v2.0 — 新スキーマ（GAS）対応
 * Design: STAT PICK Brand — Dark Navy + Pastel Gradient
 * 使用データ: trainees + playlistSummary
 * 表示: いいね率 vs コメント率 散布図 + エンゲージメント率分布ヒストグラム
 */

import SectionHeader from '@/components/SectionHeader';
import { formatPct, formatNumber } from '@/lib/utils';
import type { DashboardData, TraineeVideo, PlaylistSummary } from '@/lib/types';
import { useState, useMemo } from 'react';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine,
} from 'recharts';

interface Props {
  data: DashboardData;
}

const C_WHITE       = '#ffffff';
const C_CYAN        = '#38bdf8';
const C_MUTED       = 'rgba(255,255,255,0.30)';
const C_CARD_BG     = 'rgba(255,255,255,0.03)';
const C_CARD_BORDER = 'rgba(255,255,255,0.08)';

function shortLabel(label: string): string {
  if (label.includes('推しカメラ')) return '推しカメラ';
  if (label.includes('CLOSE-UP') || label.includes('Theme')) return 'Theme Song';
  if (label.includes('SELFIE')) return 'SELFIE';
  if (label.includes('1MIN')) return '1MIN PR';
  return label.slice(0, 8);
}

function buildHistogram(items: TraineeVideo[], bins = 20): { range: string; count: number; midpoint: number }[] {
  if (items.length === 0) return [];
  const rates = items.map((t) => t.engagementRate * 100);
  const min = Math.min(...rates);
  const max = Math.max(...rates);
  const binWidth = (max - min) / bins || 0.01;

  return Array.from({ length: bins }, (_, i) => {
    const lo = min + i * binWidth;
    const hi = min + (i + 1) * binWidth;
    return {
      range: `${lo.toFixed(1)}%`,
      count: rates.filter((r) => r >= lo && r < hi).length,
      midpoint: (lo + hi) / 2,
    };
  });
}

export default function EngagementSection({ data }: Props) {
  const { trainees, playlistSummary } = data;
  const [activePlaylist, setActivePlaylist] = useState<string>('all');

  const playlistMap = useMemo(() => {
    const map: Record<string, PlaylistSummary> = {};
    playlistSummary.forEach((p: PlaylistSummary) => { map[p.playlist_id] = p; });
    return map;
  }, [playlistSummary]);

  const sortedPlaylists = useMemo(
    () => [...playlistSummary].sort((a: PlaylistSummary, b: PlaylistSummary) => a.priority - b.priority),
    [playlistSummary]
  );

  const filtered = useMemo(
    () => activePlaylist === 'all' ? trainees : trainees.filter((t: TraineeVideo) => t.playlist_id === activePlaylist),
    [trainees, activePlaylist]
  );

  const scatterData = useMemo(() => {
    return sortedPlaylists.map((p: PlaylistSummary) => ({
      playlist: p,
      points: (activePlaylist === 'all'
        ? trainees.filter((t: TraineeVideo) => t.playlist_id === p.playlist_id)
        : filtered
      ).map((t: TraineeVideo) => ({
        x: t.likeRate * 100,
        y: t.commentRate * 100,
        videoId: t.videoId,
        title: t.videoTitle,
        er: t.engagementRate * 100,
        views: t.viewCount,
      })),
    })).filter((d) => d.points.length > 0);
  }, [filtered, sortedPlaylists, activePlaylist, trainees]);

  const avgLikeRate = filtered.length > 0
    ? filtered.reduce((s: number, t: TraineeVideo) => s + t.likeRate, 0) / filtered.length * 100
    : 0;
  const avgCommentRate = filtered.length > 0
    ? filtered.reduce((s: number, t: TraineeVideo) => s + t.commentRate, 0) / filtered.length * 100
    : 0;

  const histogram = useMemo(() => buildHistogram(filtered), [filtered]);

  const top10 = useMemo(
    () => [...filtered].sort((a: TraineeVideo, b: TraineeVideo) => b.engagementRate - a.engagementRate).slice(0, 10),
    [filtered]
  );

  return (
    <div>
      <SectionHeader
        title="ENGAGEMENT"
        subtitle="エンゲージメント分析 — いいね率 × コメント率"
        badge={`${filtered.length} VIDEOS`}
      />

      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <div className="text-xs font-display tracking-widest" style={{ color: C_MUTED }}>PL:</div>
        <button
          onClick={() => setActivePlaylist('all')}
          className="px-3 py-1 rounded text-xs font-display tracking-wide transition-all"
          style={{
            background: activePlaylist === 'all' ? 'rgba(56,189,248,0.12)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${activePlaylist === 'all' ? 'rgba(56,189,248,0.35)' : 'rgba(255,255,255,0.08)'}`,
            color: activePlaylist === 'all' ? C_CYAN : C_MUTED,
          }}
        >
          すべて
        </button>
        {sortedPlaylists.map((p: PlaylistSummary) => (
          <button
            key={p.playlist_id}
            onClick={() => setActivePlaylist(p.playlist_id)}
            className="px-3 py-1 rounded text-xs font-jp transition-all"
            style={{
              background: activePlaylist === p.playlist_id ? `${p.color}18` : 'rgba(255,255,255,0.04)',
              border: `1px solid ${activePlaylist === p.playlist_id ? `${p.color}50` : 'rgba(255,255,255,0.08)'}`,
              color: activePlaylist === p.playlist_id ? p.color : C_MUTED,
            }}
          >
            {shortLabel(p.label)}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div
          className="p-5 rounded-xl"
          style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
        >
          <div className="text-xs font-display tracking-widest mb-1" style={{ color: C_MUTED }}>
            LIKE RATE vs COMMENT RATE
          </div>
          <div className="text-[10px] font-jp mb-4" style={{ color: 'rgba(255,255,255,0.20)' }}>
            点線 = 平均（いいね率 {formatPct(avgLikeRate, 3)} / コメント率 {formatPct(avgCommentRate, 3)}）
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <ScatterChart margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis
                type="number"
                dataKey="x"
                name="いいね率"
                tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(1)}%`}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="コメント率"
                tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v: number) => `${v.toFixed(2)}%`}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3', stroke: 'rgba(255,255,255,0.15)' }}
                content={({ active, payload }) => {
                  if (!active || !payload || payload.length === 0) return null;
                  const d = payload[0].payload as { x: number; y: number; title: string; er: number; views: number };
                  return (
                    <div style={{ background: '#0d1230', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8, padding: '8px 12px' }}>
                      <div className="font-jp text-xs mb-1" style={{ color: C_WHITE }}>{d.title.slice(0, 40)}</div>
                      <div className="text-[10px] font-mono-data" style={{ color: C_MUTED }}>
                        いいね率: {formatPct(d.x, 3)} / コメント率: {formatPct(d.y, 3)}
                      </div>
                      <div className="text-[10px] font-mono-data" style={{ color: C_CYAN }}>
                        ER: {formatPct(d.er, 2)} / 視聴: {formatNumber(d.views)}
                      </div>
                    </div>
                  );
                }}
              />
              <ReferenceLine x={avgLikeRate} stroke="rgba(255,255,255,0.20)" strokeDasharray="4 4" />
              <ReferenceLine y={avgCommentRate} stroke="rgba(255,255,255,0.20)" strokeDasharray="4 4" />
              {scatterData.map((d) => (
                <Scatter
                  key={d.playlist.playlist_id}
                  name={shortLabel(d.playlist.label)}
                  data={d.points}
                  fill={d.playlist.color}
                  opacity={0.75}
                />
              ))}
            </ScatterChart>
          </ResponsiveContainer>
        </div>

        <div
          className="p-5 rounded-xl"
          style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
        >
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: C_MUTED }}>
            ENGAGEMENT RATE DISTRIBUTION
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={histogram} margin={{ top: 5, right: 10, left: 10, bottom: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis
                dataKey="range"
                tick={{ fill: 'rgba(255,255,255,0.25)', fontSize: 9 }}
                axisLine={false}
                tickLine={false}
                interval={3}
                angle={-30}
                textAnchor="end"
              />
              <YAxis
                tick={{ fill: 'rgba(255,255,255,0.30)', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{ background: '#0d1230', border: '1px solid rgba(255,255,255,0.12)', borderRadius: 8 }}
                labelStyle={{ color: C_WHITE, fontSize: 11 }}
                formatter={(value: number) => [value + ' 動画', '本数']}
              />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {histogram.map((entry: { range: string; count: number; midpoint: number }, i: number) => (
                  <Cell
                    key={`cell-${i}`}
                    fill={entry.midpoint > (avgLikeRate + avgCommentRate) ? C_CYAN : 'rgba(255,255,255,0.25)'}
                    opacity={0.85}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div
        className="rounded-xl overflow-hidden"
        style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
      >
        <div className="px-5 py-3" style={{ borderBottom: `1px solid ${C_CARD_BORDER}` }}>
          <div className="text-xs font-display tracking-widest" style={{ color: C_MUTED }}>
            TOP 10 — ENGAGEMENT RATE
          </div>
        </div>
        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {top10.map((t: TraineeVideo, i: number) => {
            const pl = playlistMap[t.playlist_id];
            return (
              <div
                key={t.videoId}
                className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                <div
                  className="w-6 h-6 rounded flex items-center justify-center flex-shrink-0 font-display text-xs"
                  style={{ background: 'rgba(56,189,248,0.08)', color: C_CYAN }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <a
                    href={`https://www.youtube.com/watch?v=${t.videoId}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-jp text-xs leading-snug hover:underline block truncate"
                    style={{ color: C_WHITE }}
                  >
                    {t.videoTitle}
                  </a>
                  {pl && (
                    <span
                      className="text-[10px] font-jp px-1.5 py-0.5 rounded mt-0.5 inline-block"
                      style={{ background: `${pl.color}15`, color: pl.color }}
                    >
                      {shortLabel(pl.label)}
                    </span>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <div className="font-mono-data text-sm font-bold" style={{ color: C_CYAN }}>
                    {formatPct(t.engagementRate * 100, 2)}
                  </div>
                  <div className="text-[10px] font-mono-data" style={{ color: C_MUTED }}>
                    👁 {formatNumber(t.viewCount)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
