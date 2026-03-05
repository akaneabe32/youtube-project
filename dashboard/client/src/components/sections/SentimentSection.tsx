/*
 * Sentiment Analysis Section
 * Design: Positive rate ranking + scatter plot + language×sentiment heatmap
 */

import SectionHeader from '@/components/SectionHeader';
import { formatNumber, formatPct } from '@/lib/utils';
import type { DashboardData } from '@/lib/types';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Cell, ReferenceLine, Legend
} from 'recharts';

interface Props {
  data: DashboardData;
}

export default function SentimentSection({ data }: Props) {
  const { video_stats, top20_positive, sentiment_by_lang } = data;
  
  // Scatter: views vs positive_rate
  const scatterData = video_stats.map(v => ({
    x: v.viewCount,
    y: v.positive_rate,
    name: v.en_name,
    comments: v.comment_collected,
  }));
  
  // Sentiment by language
  const langs = ['ja', 'en', 'ko', 'zh'];
  const langLabels: Record<string, string> = { ja: '日本語', en: '英語', ko: '韓国語', zh: '中国語' };
  const sentimentByLangData = langs.map(lang => {
    const pos = sentiment_by_lang.find(s => s.language === lang && s.sentimentLabel === 'positive')?.count || 0;
    const neu = sentiment_by_lang.find(s => s.language === lang && s.sentimentLabel === 'neutral')?.count || 0;
    const neg = sentiment_by_lang.find(s => s.language === lang && s.sentimentLabel === 'negative')?.count || 0;
    const total = pos + neu + neg;
    return {
      lang: langLabels[lang],
      positive: total > 0 ? Math.round(pos / total * 100) : 0,
      neutral: total > 0 ? Math.round(neu / total * 100) : 0,
      negative: total > 0 ? Math.round(neg / total * 100) : 0,
      total,
    };
  });
  
  // Positive rate distribution — semantic green for high positive (exception)
  const positiveRanges = [
    { label: '50%以上', min: 50, max: 100, color: '#10b981' },         // green: semantic positive
    { label: '40-50%', min: 40, max: 50, color: '#ffffff' },           // indigo
    { label: '30-40%', min: 30, max: 40, color: 'oklch(0.50 0.15 264)' }, // mid indigo
    { label: '20-30%', min: 20, max: 30, color: 'oklch(0.40 0.08 264)' }, // muted indigo
    { label: '20%未満', min: 0, max: 20, color: 'oklch(0.35 0.012 264)' }, // grey
  ];
  
  const distData = positiveRanges.map(r => ({
    label: r.label,
    count: video_stats.filter(v => v.positive_rate >= r.min && v.positive_rate < r.max).length,
    color: r.color,
  }));
  
  return (
    <div>
      <SectionHeader
        title="SENTIMENT ANALYSIS"
        subtitle="コメント感情分析 — ポジティブ率・ネガティブ率の多角的分析"
        badge="30,392 COMMENTS"
      />
      
      {/* Top 20 Positive Rate */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        <div className="dash-card p-5">
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
            TOP 20 — ポジティブ率ランキング
          </div>
          <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
            {top20_positive.map((v, i) => (
              <div key={v.en_name} className="flex items-center gap-3">
                <span className="font-display text-xs w-5 text-right flex-shrink-0" style={{
                  color: i === 0 ? '#38bdf8' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2f' : 'oklch(0.45 0.012 264)'
                }}>
                  {i + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-center mb-0.5">
                    <span className="font-display text-xs truncate" style={{ color: 'oklch(0.80 0.008 264)' }}>
                      {v.en_name}
                    </span>
                    <span className="font-mono-data text-xs ml-2 flex-shrink-0" style={{ color: '#10b981' }}>
                      {formatPct(v.positive_rate)}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'oklch(0.20 0.016 264)' }}>
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${v.positive_rate}%`,
                        background: '#ffffff', // indigo — consistent with color rule
                      }}
                    />
                  </div>
                </div>
                <span className="text-xs font-jp flex-shrink-0" style={{ color: 'oklch(0.40 0.012 264)' }}>
                  ({v.comment_collected}件)
                </span>
              </div>
            ))}
          </div>
        </div>
        
        {/* Positive Rate Distribution */}
        <div className="dash-card p-5">
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
            ポジティブ率 分布
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={distData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" vertical={false} />
              <XAxis dataKey="label" tick={{ fill: 'oklch(0.55 0.012 264)', fontSize: 11 }} />
              <YAxis tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
                labelStyle={{ color: 'oklch(0.92 0.008 264)' }}
                formatter={(value: number) => [`${value}動画`, '件数']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {distData.map((entry) => (
                  <Cell key={entry.label} fill={entry.color} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          
          <div className="mt-4 p-3 rounded-lg" style={{ background: 'oklch(0.18 0.014 264)' }}>
            <div className="text-xs font-jp" style={{ color: 'oklch(0.55 0.012 264)' }}>
              💡 <strong style={{ color: 'oklch(0.75 0.008 264)' }}>分析インサイト：</strong>
              全体の約{formatPct(video_stats.filter(v => v.positive_rate >= 40).length / video_stats.length * 100)}（{video_stats.filter(v => v.positive_rate >= 40).length}動画）がポジティブ率40%以上。
              ポジティブ率が高い動画は視聴数が少ない傾向があり、コアなファンダムが形成されている可能性を示す。
            </div>
          </div>
        </div>
      </div>
      
      {/* Views vs Positive Rate Scatter */}
      <div className="dash-card p-5 mb-6">
        <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
          視聴数 × ポジティブ率 — 散布図（各点 = 1練習生）
        </div>
        <ResponsiveContainer width="100%" height={280}>
          <ScatterChart margin={{ left: 10, right: 20, top: 10, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
            <XAxis
              type="number"
              dataKey="x"
              name="視聴数"
              tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }}
              tickFormatter={(v) => formatNumber(v)}
              label={{ value: '視聴数', position: 'insideBottom', offset: -5, fill: 'oklch(0.45 0.012 264)', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="y"
              name="ポジティブ率"
              tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              label={{ value: 'ポジティブ率(%)', angle: -90, position: 'insideLeft', fill: 'oklch(0.45 0.012 264)', fontSize: 11 }}
            />
            <Tooltip
              contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
              cursor={{ strokeDasharray: '3 3', stroke: 'oklch(1 0 0 / 20%)' }}
              formatter={(value: number, name: string) => [
                name === '視聴数' ? formatNumber(value) : `${value.toFixed(1)}%`,
                name
              ]}
              labelFormatter={(_, payload) => payload?.[0]?.payload?.name || ''}
            />
            <ReferenceLine y={32.6} stroke="rgba(56,189,248,0.50)" strokeDasharray="4 4" label={{ value: '平均 32.6%', fill: '#38bdf8', fontSize: 10 }} />
            <Scatter
              data={scatterData}
              fill="#ffffff"
              fillOpacity={0.7}
              r={5}
            />
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-2 text-xs font-jp" style={{ color: 'oklch(0.45 0.012 264)' }}>
          ※ 黄色の破線 = 全体平均ポジティブ率 (32.6%)。視聴数が少ない動画ほどポジティブ率が高い傾向（コアファン効果）。
        </div>
      </div>
      
      {/* Sentiment by Language */}
      <div className="dash-card p-5">
        <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
          言語別 感情分布（積み上げ棒グラフ）
        </div>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={sentimentByLangData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" vertical={false} />
            <XAxis dataKey="lang" tick={{ fill: 'oklch(0.65 0.008 264)', fontSize: 12, fontFamily: 'Noto Sans JP' }} />
            <YAxis tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }} tickFormatter={(v) => `${v}%`} />
            <Tooltip
              contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
              formatter={(value: number, name: string) => [`${value}%`, name]}
            />
            <Legend wrapperStyle={{ color: 'oklch(0.65 0.008 264)', fontSize: 12 }} />
            <Bar dataKey="positive" name="ポジティブ" stackId="a" fill="#10b981" />
            <Bar dataKey="neutral" name="ニュートラル" stackId="a" fill="oklch(0.40 0.012 264)" /> {/* grey — neutral */}
            <Bar dataKey="negative" name="ネガティブ" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 p-3 rounded-lg" style={{ background: 'oklch(0.18 0.014 264)' }}>
          <div className="text-xs font-jp" style={{ color: 'oklch(0.55 0.012 264)' }}>
            💡 <strong style={{ color: 'oklch(0.75 0.008 264)' }}>言語別インサイト：</strong>
            韓国語コメントはポジティブ率が高い傾向。英語コメントは多様な感情表現を含む。
            日本語コメントは「ニュートラル」（応援・情報共有）が多く、日本のファン文化を反映。
          </div>
        </div>
      </div>
    </div>
  );
}
