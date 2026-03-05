/*
 * Surge Rankings Section (急上昇ランキング)
 * Design: Dark dashboard with indigo/amber accents, Bebas Neue headings
 * Shows day-over-day growth rates for views, likes, comments
 * Data source: daily_log from Google Spreadsheet
 */

import { useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import type { SurgeRankings, DailyTrend, SurgeEntry } from '@/lib/types';
import { formatNumber } from '@/lib/utils';

interface SurgeSectionProps {
  surgeRankings?: SurgeRankings;
  dailyTrend?: DailyTrend[];
}

type MetricTab = 'views' | 'likes' | 'comments';

// COLOR RULE: gold=views(primary metric), indigo=likes, grey=comments
const tabConfig: { key: MetricTab; label: string; labelJp: string; color: string; bgColor: string }[] = [
  { key: 'views', label: 'VIEWS', labelJp: '再生回数', color: '#38bdf8', bgColor: 'rgba(56,189,248,0.10)' },       // gold
  { key: 'likes', label: 'LIKES', labelJp: 'いいね数', color: '#ffffff', bgColor: 'oklch(0.55 0.22 264 / 12%)' },  // indigo
  { key: 'comments', label: 'COMMENTS', labelJp: 'コメント数', color: 'oklch(0.65 0.012 264)', bgColor: 'oklch(0.65 0.012 264 / 12%)' }, // grey
];

function SurgeTable({ entries, metric, color }: { entries: SurgeEntry[]; metric: MetricTab; color: string }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr style={{ borderBottom: '1px solid oklch(1 0 0 / 10%)' }}>
            <th className="text-left py-2 px-3 font-display text-xs tracking-wider" style={{ color: 'oklch(0.50 0.012 264)' }}>#</th>
            <th className="text-left py-2 px-3 font-display text-xs tracking-wider" style={{ color: 'oklch(0.50 0.012 264)' }}>TRAINEE</th>
            <th className="text-right py-2 px-3 font-display text-xs tracking-wider" style={{ color: 'oklch(0.50 0.012 264)' }}>GROWTH</th>
            <th className="text-right py-2 px-3 font-display text-xs tracking-wider" style={{ color: 'oklch(0.50 0.012 264)' }}>DELTA</th>
            <th className="text-right py-2 px-3 font-display text-xs tracking-wider" style={{ color: 'oklch(0.50 0.012 264)' }}>CURRENT</th>
          </tr>
        </thead>
        <tbody>
          {entries.slice(0, 20).map((entry, i) => {
            const isTop3 = i < 3;
            return (
              <tr
                key={entry.en_name}
                className="transition-colors hover:bg-white/5"
                style={{ borderBottom: '1px solid oklch(1 0 0 / 5%)' }}
              >
                <td className="py-2.5 px-3">
                  <span
                    className="font-display text-sm"
                    style={{
                      color: isTop3 ? color : 'oklch(0.50 0.012 264)',
                    }}
                  >
                    {entry.rank}
                  </span>
                </td>
                <td className="py-2.5 px-3">
                  <div className="font-display text-xs tracking-wider text-white">
                    {entry.en_name}
                  </div>
                  <div className="text-[10px] font-jp mt-0.5" style={{ color: 'oklch(0.50 0.012 264)' }}>
                    {entry.jp_name}
                  </div>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span
                    className="font-mono-data text-sm font-semibold"
                    style={{ color: entry.growth_rate > 0 ? color : 'oklch(0.50 0.012 264)' }}
                  >
                    {entry.growth_rate > 0 ? '+' : ''}{entry.growth_rate.toFixed(2)}%
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="font-mono-data text-xs" style={{ color: 'oklch(0.65 0.012 264)' }}>
                    +{formatNumber(entry.delta)}
                  </span>
                </td>
                <td className="py-2.5 px-3 text-right">
                  <span className="font-mono-data text-xs" style={{ color: 'oklch(0.50 0.012 264)' }}>
                    {formatNumber(entry.current)}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function DailyTrendChart({ dailyTrend }: { dailyTrend: DailyTrend[] }) {
  if (!dailyTrend || dailyTrend.length < 2) return null;

  // Calculate day-over-day totals
  const trendData = dailyTrend.map((d, i) => {
    const prev = i > 0 ? dailyTrend[i - 1] : null;
    return {
      date: d.date.replace('2026/', ''),
      views: d.total_views,
      likes: d.total_likes,
      comments: d.total_comments,
      delta_views: prev ? d.total_views - prev.total_views : 0,
      delta_likes: prev ? d.total_likes - prev.total_likes : 0,
      delta_comments: prev ? d.total_comments - prev.total_comments : 0,
    };
  });

  const maxDeltaViews = Math.max(...trendData.map(d => d.delta_views));

  return (
    <div className="rounded-xl p-5" style={{ background: 'oklch(0.16 0.013 264)', border: '1px solid oklch(1 0 0 / 8%)' }}>
      <div className="font-display text-sm tracking-wider text-white mb-1">DAILY TOTAL TREND</div>
      <div className="text-xs font-jp mb-4" style={{ color: 'oklch(0.50 0.012 264)' }}>
        全動画合計の日次推移
      </div>
      <div className="space-y-3">
        {trendData.map((d, i) => (
          <div key={d.date} className="flex items-center gap-3">
            <span className="font-mono-data text-xs w-14 shrink-0" style={{ color: 'oklch(0.55 0.012 264)' }}>
              {d.date}
            </span>
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <div
                  className="h-5 rounded-sm transition-all"
                  style={{
                    width: i === 0 ? '0%' : `${Math.max(4, (d.delta_views / maxDeltaViews) * 100)}%`,
                    background: 'rgba(56,189,248,0.50)',
                  }}
                />
                <span className="font-mono-data text-xs shrink-0" style={{ color: 'oklch(0.65 0.012 264)' }}>
                  {i === 0 ? '—' : `+${formatNumber(d.delta_views)}`}
                </span>
              </div>
            </div>
            <span className="font-mono-data text-xs w-16 text-right shrink-0" style={{ color: 'oklch(0.50 0.012 264)' }}>
              {formatNumber(d.views)}
            </span>
          </div>
        ))}
      </div>
      
      {/* Summary row */}
      <div className="mt-4 pt-3 grid grid-cols-3 gap-4" style={{ borderTop: '1px solid oklch(1 0 0 / 8%)' }}>
        {[
          { label: '再生回数増加', value: trendData[trendData.length - 1].views - trendData[0].views, color: '#38bdf8' },
          { label: 'いいね増加', value: trendData[trendData.length - 1].likes - trendData[0].likes, color: 'oklch(0.72 0.19 150)' },
          { label: 'コメント増加', value: trendData[trendData.length - 1].comments - trendData[0].comments, color: 'oklch(0.70 0.18 264)' },
        ].map((item) => (
          <div key={item.label} className="text-center">
            <div className="font-mono-data text-lg font-semibold" style={{ color: item.color }}>
              +{formatNumber(item.value)}
            </div>
            <div className="text-[10px] font-jp mt-0.5" style={{ color: 'oklch(0.45 0.012 264)' }}>
              {item.label}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SurgeSection({ surgeRankings, dailyTrend }: SurgeSectionProps) {
  const [activeTab, setActiveTab] = useState<MetricTab>('views');

  if (!surgeRankings) {
    return (
      <section id="surge" className="space-y-6">
        <SectionHeader
          title="SURGE RANKINGS"
          subtitle="急上昇ランキング — 日次データが読み込まれていません"
        />
      </section>
    );
  }

  const activeConfig = tabConfig.find(t => t.key === activeTab)!;
  const entries = surgeRankings[activeTab];

  return (
    <section id="surge" className="space-y-6">
      <SectionHeader
        title="SURGE RANKINGS"
        subtitle={`急上昇ランキング — 前日比の増加率（${surgeRankings.period}）`}
      />

      {/* Daily Trend Overview */}
      {dailyTrend && <DailyTrendChart dailyTrend={dailyTrend} />}

      {/* Metric Tabs */}
      <div className="rounded-xl p-5" style={{ background: 'oklch(0.16 0.013 264)', border: '1px solid oklch(1 0 0 / 8%)' }}>
        <div className="flex gap-2 mb-4">
          {tabConfig.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className="px-4 py-2 rounded-lg font-display text-xs tracking-wider transition-all"
              style={{
                background: activeTab === tab.key ? tab.bgColor : 'transparent',
                color: activeTab === tab.key ? tab.color : 'oklch(0.50 0.012 264)',
                border: activeTab === tab.key ? `1px solid ${tab.color}30` : '1px solid transparent',
              }}
            >
              {tab.label}
              <span className="font-jp text-[10px] ml-1.5 opacity-70">{tab.labelJp}</span>
            </button>
          ))}
        </div>

        {/* Top 3 Highlight */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {entries.slice(0, 3).map((entry, i) => {
            const medals = ['🥇', '🥈', '🥉'];
            return (
              <div
                key={entry.en_name}
                className="rounded-lg p-4 text-center"
                style={{
                  background: i === 0 ? `${activeConfig.color}15` : 'oklch(0.14 0.013 264)',
                  border: i === 0 ? `1px solid ${activeConfig.color}30` : '1px solid oklch(1 0 0 / 6%)',
                }}
              >
                <div className="text-lg mb-1">{medals[i]}</div>
                <div className="font-display text-sm tracking-wider text-white">{entry.en_name}</div>
                <div className="text-[10px] font-jp mt-0.5" style={{ color: 'oklch(0.50 0.012 264)' }}>
                  {entry.jp_name}
                </div>
                <div className="font-mono-data text-xl font-bold mt-2" style={{ color: activeConfig.color }}>
                  +{entry.growth_rate.toFixed(2)}%
                </div>
                <div className="font-mono-data text-xs mt-1" style={{ color: 'oklch(0.55 0.012 264)' }}>
                  +{formatNumber(entry.delta)} → {formatNumber(entry.current)}
                </div>
              </div>
            );
          })}
        </div>

        {/* Full Table */}
        <SurgeTable entries={entries} metric={activeTab} color={activeConfig.color} />
      </div>

      {/* Data Source Note */}
      <div className="text-[10px] font-jp text-center" style={{ color: 'oklch(0.38 0.012 264)' }}>
        データソース: Google スプレッドシート daily_log シート | 更新頻度: 1日1回
      </div>
    </section>
  );
}
