/*
 * Language & Overseas Analysis Section
 * Design: Pie chart + top overseas ranking + language breakdown per trainee
 */

import SectionHeader from '@/components/SectionHeader';
import { formatNumber, formatPct, getLangColor, getLangLabel } from '@/lib/utils';
import type { DashboardData } from '@/lib/types';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
  BarChart, Bar, XAxis, YAxis, CartesianGrid
} from 'recharts';

interface Props {
  data: DashboardData;
}

export default function LanguageSection({ data }: Props) {
  const { overall_language, top20_overseas, video_stats, lang_dist } = data;
  
  const pieData = [
    { name: '日本語', value: overall_language.ja, color: '#ffffff' },
    { name: '英語', value: overall_language.en, color: '#38bdf8' },
    { name: '韓国語', value: overall_language.ko, color: '#10b981' },
    { name: '中国語', value: overall_language.zh, color: '#ec4899' },
    { name: 'その他', value: overall_language.other, color: '#6b7280' },
  ];
  
  const total = pieData.reduce((s, d) => s + d.value, 0);
  const overseasTotal = overall_language.en + overall_language.ko + overall_language.zh + overall_language.other;
  
  // Top 15 overseas for chart
  const overseasChartData = top20_overseas.slice(0, 15).map(v => ({
    name: v.en_name,
    en: v.en_count,
    ko: v.ko_count,
    zh: v.zh_count,
    rate: v.overseas_rate,
  }));
  
  // Language diversity score (entropy)
  const languageDiversityData = video_stats.map(v => {
    const counts = [v.ja_count, v.en_count, v.ko_count, v.zh_count, v.other_count];
    const total = counts.reduce((s, c) => s + c, 0);
    if (total === 0) return { name: v.en_name, diversity: 0, overseas_rate: v.overseas_rate };
    const entropy = counts.reduce((s, c) => {
      if (c === 0) return s;
      const p = c / total;
      return s - p * Math.log2(p);
    }, 0);
    return { name: v.en_name, diversity: entropy, overseas_rate: v.overseas_rate };
  }).sort((a, b) => b.diversity - a.diversity).slice(0, 15);
  
  return (
    <div>
      <SectionHeader
        title="LANGUAGE ANALYSIS"
        subtitle="コメント言語分布 — 海外ファン率・グローバル人気分析"
        badge={`海外率 avg ${formatPct(overseasTotal / total * 100)}`}
      />
      
      {/* Overview cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {pieData.map((item) => (
          <div key={item.name} className="dash-card p-4" style={{ borderColor: `${item.color}40` }}>
            <div className="text-xs font-jp mb-1" style={{ color: 'oklch(0.55 0.012 264)' }}>{item.name}</div>
            <div className="font-display text-2xl" style={{ color: item.color }}>
              {formatNumber(item.value)}
            </div>
            <div className="text-xs font-mono-data mt-1" style={{ color: 'oklch(0.50 0.012 264)' }}>
              {formatPct(item.value / total * 100)}
            </div>
          </div>
        ))}
      </div>
      
      {/* Pie chart + Top overseas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Pie chart */}
        <div className="dash-card p-5">
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
            全体言語分布
          </div>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width={180} height={180}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {pieData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
                  formatter={(value: number) => [formatNumber(value), '']}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-2">
              {pieData.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }}></div>
                  <div className="flex-1 flex justify-between">
                    <span className="text-xs font-jp" style={{ color: 'oklch(0.70 0.008 264)' }}>{item.name}</span>
                    <span className="text-xs font-mono-data" style={{ color: item.color }}>
                      {formatPct(item.value / total * 100)}
                    </span>
                  </div>
                </div>
              ))}
              <div className="pt-2 mt-2" style={{ borderTop: '1px solid oklch(1 0 0 / 8%)' }}>
                <div className="text-xs font-jp" style={{ color: 'oklch(0.55 0.012 264)' }}>
                  海外コメント合計
                </div>
                <div className="font-display text-xl mt-0.5" style={{ color: '#38bdf8' }}>
                  {formatNumber(overseasTotal)} ({formatPct(overseasTotal / total * 100)})
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Top overseas ranking */}
        <div className="dash-card p-5">
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
            TOP 20 — 海外コメント率ランキング
          </div>
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {top20_overseas.map((v, i) => (
              <div key={v.en_name} className="flex items-center gap-2">
                <span className="font-display text-xs w-5 text-right flex-shrink-0" style={{
                  color: i < 3 ? '#38bdf8' : 'oklch(0.40 0.012 264)'
                }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-display text-xs truncate" style={{ color: 'oklch(0.80 0.008 264)' }}>
                      {v.en_name}
                    </span>
                    <span className="font-mono-data text-xs ml-2 flex-shrink-0" style={{ color: '#38bdf8' }}>
                      {formatPct(v.overseas_rate)}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    {v.en_count > 0 && (
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(v.en_count / 30, 1) * 60}%`, background: '#38bdf8', minWidth: '4px' }} />
                    )}
                    {v.ko_count > 0 && (
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(v.ko_count / 30, 1) * 60}%`, background: '#10b981', minWidth: '4px' }} />
                    )}
                    {v.zh_count > 0 && (
                      <div className="h-1.5 rounded-full" style={{ width: `${Math.min(v.zh_count / 30, 1) * 60}%`, background: '#ec4899', minWidth: '4px' }} />
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="flex gap-3 mt-3 pt-3" style={{ borderTop: '1px solid oklch(1 0 0 / 8%)' }}>
            {[['英語', '#38bdf8'], ['韓国語', '#10b981'], ['中国語', '#ec4899']].map(([lang, color]) => (
              <div key={lang} className="flex items-center gap-1">
                <div className="w-2 h-2 rounded-full" style={{ background: color }}></div>
                <span className="text-xs font-jp" style={{ color: 'oklch(0.50 0.012 264)' }}>{lang}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* Overseas breakdown stacked bar */}
      <div className="dash-card p-5 mb-6">
        <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
          TOP 15 海外コメント内訳（英語・韓国語・中国語）
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={overseasChartData} margin={{ left: 0, right: 10, top: 5, bottom: 60 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'oklch(0.55 0.012 264)', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }} />
            <Tooltip
              contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
              labelStyle={{ color: 'oklch(0.92 0.008 264)' }}
            />
            <Legend wrapperStyle={{ color: 'oklch(0.65 0.008 264)', fontSize: 11, paddingTop: '8px' }} />
            <Bar dataKey="en" name="英語" stackId="a" fill="#38bdf8" />
            <Bar dataKey="ko" name="韓国語" stackId="a" fill="#10b981" />
            <Bar dataKey="zh" name="中国語" stackId="a" fill="#ec4899" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
      
      {/* Language diversity */}
      <div className="dash-card p-5">
        <div className="text-xs font-display tracking-widest mb-2" style={{ color: 'oklch(0.55 0.012 264)' }}>
          言語多様性スコア TOP 15（情報エントロピー）
        </div>
        <div className="text-xs font-jp mb-4" style={{ color: 'oklch(0.45 0.012 264)' }}>
          ※ 高いほど多様な言語のファンが存在することを示す（最大値 = log₂(5) ≈ 2.32）
        </div>
        <div className="space-y-2">
          {languageDiversityData.map((v, i) => (
            <div key={v.name} className="flex items-center gap-3">
              <span className="font-display text-xs w-5 text-right flex-shrink-0" style={{ color: 'oklch(0.40 0.012 264)' }}>
                {i + 1}
              </span>
              <span className="font-display text-xs w-24 flex-shrink-0" style={{ color: 'oklch(0.75 0.008 264)' }}>
                {v.name}
              </span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.20 0.016 264)' }}>
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${(v.diversity / 2.32) * 100}%`,
                    background: `linear-gradient(90deg, #ffffff, #ec4899)`,
                  }}
                />
              </div>
              <span className="font-mono-data text-xs w-12 text-right flex-shrink-0" style={{ color: '#ec4899' }}>
                {v.diversity.toFixed(2)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
