/*
 * Timeline Section
 * Design: Daily comment trend + cumulative views trend
 */

import SectionHeader from '@/components/SectionHeader';
import { formatNumber } from '@/lib/utils';
import type { DashboardData } from '@/lib/types';
import {
  LineChart, Line, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, Legend, Cell
} from 'recharts';

interface Props {
  data: DashboardData;
}

export default function TimelineSection({ data }: Props) {
  const { daily_comments } = data;
  
  const formattedDaily = daily_comments.map(d => ({
    ...d,
    date: d.date_str.slice(5), // MM-DD
    positive_rate: d.total_comments > 0 ? Math.round(d.positive / d.total_comments * 100) : 0,
    overseas: d.en + d.ko,
  }));
  
  // Cumulative
  let cumTotal = 0;
  const cumulativeData = formattedDaily.map(d => {
    cumTotal += d.total_comments;
    return { ...d, cumulative: cumTotal };
  });
  
  return (
    <div>
      <SectionHeader
        title="TIMELINE ANALYSIS"
        subtitle="コメント投稿の時系列トレンド — 動画公開後の反応推移"
        badge="2026-02-22 〜 03-03"
      />
      
      {/* Daily comment volume */}
      <div className="dash-card p-5 mb-6">
        <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
          日別コメント数推移（感情別）
        </div>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={formattedDaily} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: 'oklch(0.55 0.012 264)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
              labelStyle={{ color: 'oklch(0.92 0.008 264)' }}
              formatter={(value: number, name: string) => [formatNumber(value), name]}
            />
            <Legend wrapperStyle={{ color: 'oklch(0.65 0.008 264)', fontSize: 12 }} />
            <Bar dataKey="positive" name="ポジティブ" stackId="a" fill="#10b981" />
            <Bar dataKey="neutral" name="ニュートラル" stackId="a" fill="#ffffff" />
            <Bar dataKey="negative" name="ネガティブ" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <div className="mt-3 p-3 rounded-lg" style={{ background: 'oklch(0.18 0.014 264)' }}>
          <div className="text-xs font-jp" style={{ color: 'oklch(0.55 0.012 264)' }}>
            💡 <strong style={{ color: 'oklch(0.75 0.008 264)' }}>トレンドインサイト：</strong>
            動画公開日（2/22）に最大{formatNumber(formattedDaily[0]?.total_comments || 0)}件のコメントが集中。
            その後急激に減少し、1週間後には1/10以下に。初日の反応が最も重要な指標となる。
          </div>
        </div>
      </div>
      
      {/* Cumulative + Positive Rate trend */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Cumulative */}
        <div className="dash-card p-5">
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
            累計コメント数推移
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={cumulativeData} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="cumGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ffffff" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'oklch(0.55 0.012 264)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }} tickFormatter={(v) => formatNumber(v)} />
              <Tooltip
                contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
                formatter={(value: number) => [formatNumber(value), '累計コメント数']}
              />
              <Area type="monotone" dataKey="cumulative" stroke="#ffffff" fill="url(#cumGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        
        {/* Positive rate trend */}
        <div className="dash-card p-5">
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
            日別ポジティブ率推移
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={formattedDaily} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
              <defs>
                <linearGradient id="posGrad" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#ffffff" />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" vertical={false} />
              <XAxis dataKey="date" tick={{ fill: 'oklch(0.55 0.012 264)', fontSize: 10 }} />
              <YAxis tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }} tickFormatter={(v) => `${v}%`} domain={[0, 60]} />
              <Tooltip
                contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value}%`, 'ポジティブ率']}
              />
              <Line
                type="monotone"
                dataKey="positive_rate"
                stroke="#10b981"
                strokeWidth={2.5}
                dot={{ fill: '#10b981', r: 4 }}
                activeDot={{ r: 6, fill: '#38bdf8' }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      
      {/* Language trend */}
      <div className="dash-card p-5">
        <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
          日別 言語別コメント数（日本語・英語・韓国語）
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <AreaChart data={formattedDaily} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
            <defs>
              <linearGradient id="jaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#ffffff" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#ffffff" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="enGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#38bdf8" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#38bdf8" stopOpacity={0.0} />
              </linearGradient>
              <linearGradient id="koGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.5} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0.0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" vertical={false} />
            <XAxis dataKey="date" tick={{ fill: 'oklch(0.55 0.012 264)', fontSize: 11 }} />
            <YAxis tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }} tickFormatter={(v) => formatNumber(v)} />
            <Tooltip
              contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
              formatter={(value: number, name: string) => [formatNumber(value), name]}
            />
            <Legend wrapperStyle={{ color: 'oklch(0.65 0.008 264)', fontSize: 12 }} />
            <Area type="monotone" dataKey="ja" name="日本語" stroke="#ffffff" fill="url(#jaGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="en" name="英語" stroke="#38bdf8" fill="url(#enGrad)" strokeWidth={2} />
            <Area type="monotone" dataKey="ko" name="韓国語" stroke="#10b981" fill="url(#koGrad)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
