/*
 * Ranking Section v2.0 — 新スキーマ（GAS）対応
 * Design: STAT PICK Brand — Dark Navy + Pastel Gradient
 * 使用データ: trainees + playlistSummary
 * 表示: 視聴回数/いいね数/コメント数/エンゲージメント率 切り替えランキング（上位20本）
 * フィルター: プレイリスト別
 */

import SectionHeader from '@/components/SectionHeader';
import { formatNumber, formatPct } from '@/lib/utils';
import type { DashboardData, TraineeVideo, PlaylistSummary, RankingMetric } from '@/lib/types';
import { useState, useMemo } from 'react';

interface Props {
  data: DashboardData;
}

const C_WHITE       = '#ffffff';
const C_CYAN        = '#38bdf8';
const C_MUTED       = 'rgba(255,255,255,0.30)';
const C_CARD_BG     = 'rgba(255,255,255,0.03)';
const C_CARD_BORDER = 'rgba(255,255,255,0.08)';

const METRIC_OPTIONS: { key: RankingMetric; label: string }[] = [
  { key: 'viewCount',      label: '視聴回数' },
  { key: 'likeCount',      label: 'いいね数' },
  { key: 'commentCount',   label: 'コメント数' },
  { key: 'engagementRate', label: 'エンゲージメント率' },
];

function shortLabel(label: string): string {
  if (label.includes('推しカメラ')) return '推しカメラ';
  if (label.includes('CLOSE-UP') || label.includes('Theme')) return 'Theme Song';
  if (label.includes('SELFIE')) return 'SELFIE';
  if (label.includes('1MIN')) return '1MIN PR';
  return label.slice(0, 8);
}

function getRankStyle(rank: number): { color: string; bg: string } {
  if (rank === 1) return { color: '#FFD700', bg: 'rgba(255,215,0,0.12)' };
  if (rank === 2) return { color: '#C0C0C0', bg: 'rgba(192,192,192,0.08)' };
  if (rank === 3) return { color: '#CD7F32', bg: 'rgba(205,127,50,0.08)' };
  return { color: C_MUTED, bg: 'transparent' };
}

export default function RankingSection({ data }: Props) {
  const { trainees, playlistSummary } = data;
  const [activeMetric, setActiveMetric] = useState<RankingMetric>('viewCount');
  const [activePlaylist, setActivePlaylist] = useState<string>('all');

  const playlistMap = useMemo(() => {
    const map: Record<string, PlaylistSummary> = {};
    playlistSummary.forEach((p) => { map[p.playlist_id] = p; });
    return map;
  }, [playlistSummary]);

  const sortedPlaylists = useMemo(
    () => [...playlistSummary].sort((a, b) => a.priority - b.priority),
    [playlistSummary]
  );

  const ranked = useMemo(() => {
    const filtered: TraineeVideo[] = activePlaylist === 'all'
      ? trainees
      : trainees.filter((t) => t.playlist_id === activePlaylist);

    return [...filtered]
      .sort((a, b) => {
        if (activeMetric === 'engagementRate') return b.engagementRate - a.engagementRate;
        return (b[activeMetric] as number) - (a[activeMetric] as number);
      })
      .slice(0, 20)
      .map((t, i) => ({ ...t, rank: i + 1 }));
  }, [trainees, activeMetric, activePlaylist]);

  const metricOption = METRIC_OPTIONS.find((m) => m.key === activeMetric)!;

  const formatValue = (t: TraineeVideo): string => {
    if (activeMetric === 'engagementRate') return formatPct(t.engagementRate * 100, 2);
    return formatNumber(t[activeMetric] as number);
  };

  return (
    <div>
      <SectionHeader
        title="RANKING"
        subtitle="動画ランキング — 上位20本"
        badge={`${trainees.length} VIDEOS TOTAL`}
      />

      {/* Metric selector */}
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="text-xs font-display tracking-widest self-center" style={{ color: C_MUTED }}>指標:</div>
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

      {/* Playlist filter */}
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
        {sortedPlaylists.map((p) => (
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

      {/* Ranking list */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ background: C_CARD_BG, border: `1px solid ${C_CARD_BORDER}` }}
      >
        <div className="px-5 py-3" style={{ borderBottom: `1px solid ${C_CARD_BORDER}` }}>
          <div className="text-xs font-display tracking-widest" style={{ color: C_MUTED }}>
            TOP 20 — {metricOption.label.toUpperCase()}
            {activePlaylist !== 'all' && ` — ${shortLabel(playlistMap[activePlaylist]?.label || '')}`}
          </div>
        </div>

        <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
          {ranked.map((t) => {
            const rankStyle = getRankStyle(t.rank);
            const pl = playlistMap[t.playlist_id];
            return (
              <div
                key={t.videoId}
                className="flex items-center gap-4 px-5 py-3 hover:bg-white/[0.02] transition-colors"
              >
                {/* Rank */}
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 font-display text-sm"
                  style={{ background: rankStyle.bg, color: rankStyle.color }}
                >
                  {t.rank}
                </div>

                {/* Title & playlist */}
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
                  <div className="flex items-center gap-2 mt-0.5">
                    {pl && (
                      <span
                        className="text-[10px] font-jp px-1.5 py-0.5 rounded"
                        style={{ background: `${pl.color}15`, color: pl.color }}
                      >
                        {shortLabel(pl.label)}
                      </span>
                    )}
                    <span className="text-[10px] font-mono-data" style={{ color: 'rgba(255,255,255,0.20)' }}>
                      {t.publishedAt}
                    </span>
                  </div>
                </div>

                {/* Primary metric */}
                <div className="text-right flex-shrink-0">
                  <div
                    className="font-mono-data text-sm font-bold"
                    style={{ color: t.rank <= 3 ? rankStyle.color : C_WHITE }}
                  >
                    {formatValue(t)}
                  </div>
                </div>

                {/* Sub metrics */}
                <div className="hidden lg:flex flex-col items-end gap-0.5 flex-shrink-0 w-28">
                  <div className="text-[10px] font-mono-data" style={{ color: C_MUTED }}>
                    👁 {formatNumber(t.viewCount)}
                  </div>
                  <div className="text-[10px] font-mono-data" style={{ color: C_MUTED }}>
                    ER {formatPct(t.engagementRate * 100, 2)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {ranked.length === 0 && (
          <div className="px-5 py-8 text-center">
            <div className="text-sm font-jp" style={{ color: C_MUTED }}>
              データがありません
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
