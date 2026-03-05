/*
 * MECE Analysis Section
 * Updated: score renamed to コメント熱量スコア, radar axes updated
 * Added: Gini coefficient, UU count, comment heat score
 */

import { useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import { formatNumber, formatPct } from '@/lib/utils';
import type { DashboardData } from '@/lib/types';
import {
  RadarChart, PolarGrid, PolarAngleAxis, Radar, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Cell, Legend
} from 'recharts';

interface Props {
  data: DashboardData;
}

export default function MeceSection({ data }: Props) {
  const { video_stats, top20_total_score } = data;
  const [selectedTrainee, setSelectedTrainee] = useState(top20_total_score[0]?.en_name || '');
  
  const selected = video_stats.find(v => v.en_name === selectedTrainee);
  
  // Normalize helper for radar
  const allViews = video_stats.map(v => v.viewCount);
  const allUU = video_stats.map(v => v.uu_count || 0);
  const allAvgComment = video_stats.map(v => v.avg_comment_per_user);
  const allGini = video_stats.map(v => v.gini || 0);
  const allPositive = video_stats.map(v => v.positive_rate);
  const allOverseas = video_stats.map(v => v.overseas_rate);
  
  const norm = (val: number, arr: number[]) => {
    const mn = Math.min(...arr);
    const mx = Math.max(...arr);
    return mx === mn ? 50 : Math.round((val - mn) / (mx - mn) * 100);
  };
  
  const radarData = selected ? [
    { subject: '再生回数', value: norm(selected.viewCount, allViews), fullMark: 100 },
    { subject: 'コメントUU', value: norm(selected.uu_count || 0, allUU), fullMark: 100 },
    { subject: '平均コメ数', value: norm(selected.avg_comment_per_user, allAvgComment), fullMark: 100 },
    { subject: 'ジニ係数', value: norm(selected.gini || 0, allGini), fullMark: 100 },
    { subject: 'ポジティブ率', value: norm(selected.positive_rate, allPositive), fullMark: 100 },
    { subject: '海外率', value: norm(selected.overseas_rate, allOverseas), fullMark: 100 },
  ] : [];
  
  // Score matrix - top 20
  const scoreMatrix = top20_total_score.slice(0, 20);
  
  // Diagnosis logic
  const getDiagnosis = (v: typeof selected) => {
    if (!v) return '';
    const diagnoses = [];
    if (v.viewCount > 100000) diagnoses.push('🔥 高認知度');
    if (v.positive_rate > 40) diagnoses.push('💚 高好感度');
    if (v.overseas_rate > 15) diagnoses.push('🌏 グローバル人気');
    if ((v.reaction_rate || v.engagement_rate) > 8) diagnoses.push('⚡ 高反応率');
    if ((v.uu_count || 0) > 800) diagnoses.push('👥 コメントUU多');
    if (v.avg_comment_per_user > 1.5) diagnoses.push('💎 リピートコメント多');
    if ((v.gini || 0) > 0.3) diagnoses.push('🎯 コアファン集中型');
    if (v.avg_commentLike > 50) diagnoses.push('✨ 共感コメント多');
    return diagnoses.join(' · ');
  };
  
  return (
    <div>
      <SectionHeader
        title="MECE 総合診断"
        subtitle="量的・構造的・質的指標による練習生の多角的評価"
        badge="COMPREHENSIVE"
      />
      
      {/* MECE Framework explanation */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        {[
          {
            cat: 'A. 量的指標',
            desc: '認知の広さ',
            items: ['再生回数 → 到達範囲', 'コメントUU数 → 行動した人数'],
            color: '#ffffff',
            icon: '◈',
          },
          {
            cat: 'B. 構造的指標',
            desc: 'ファンの密度・熱量',
            items: ['1人あたりコメ数 → 熱量', 'ジニ係数 → コアファン集中度'],
            color: '#38bdf8',
            icon: '◉',
          },
          {
            cat: 'C. 質的指標',
            desc: '支持の性質',
            items: ['ポジティブ率 → 好感度', '海外率 → グローバル性'],
            color: 'oklch(0.55 0.012 264)',  // grey — 3-color rule
            icon: '◎',
          },
        ].map((section) => (
          <div key={section.cat} className="dash-card p-4" style={{ borderLeft: `3px solid ${section.color}` }}>
            <div className="flex items-center gap-2 mb-2">
              <span style={{ color: section.color }}>{section.icon}</span>
              <div>
                <div className="font-display text-sm" style={{ color: section.color }}>{section.cat}</div>
                <div className="text-xs font-jp" style={{ color: 'oklch(0.55 0.012 264)' }}>{section.desc}</div>
              </div>
            </div>
            {section.items.map((item) => (
              <div key={item} className="text-xs font-jp mt-1.5" style={{ color: 'oklch(0.60 0.012 264)' }}>
                • {item}
              </div>
            ))}
          </div>
        ))}
      </div>
      
      {/* Individual Radar + Score */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Trainee selector + Radar */}
        <div className="dash-card p-5">
          <div className="text-xs font-display tracking-widest mb-3" style={{ color: 'oklch(0.55 0.012 264)' }}>
            個別レーダーチャート
          </div>
          
          <select
            value={selectedTrainee}
            onChange={(e) => setSelectedTrainee(e.target.value)}
            className="w-full mb-4 px-3 py-2 rounded text-sm font-jp"
            style={{
              background: 'oklch(0.18 0.014 264)',
              color: 'oklch(0.80 0.008 264)',
              border: '1px solid oklch(1 0 0 / 15%)',
            }}
          >
            {video_stats.map(v => (
              <option key={v.videoId} value={v.en_name}>{v.en_name} ({v.jp_name})</option>
            ))}
          </select>
          
          {selected && (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <RadarChart data={radarData}>
                  <PolarGrid stroke="oklch(1 0 0 / 10%)" />
                  <PolarAngleAxis
                    dataKey="subject"
                    tick={{ fill: 'oklch(0.65 0.008 264)', fontSize: 11, fontFamily: 'Noto Sans JP' }}
                  />
                  <Radar
                    name={selectedTrainee}
                    dataKey="value"
                    stroke="#ffffff"
                    fill="#ffffff"
                    fillOpacity={0.3}
                    strokeWidth={2}
                  />
                  <Tooltip
                    contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
                    formatter={(value: number) => [value.toFixed(1), 'スコア（偏差値）']}
                  />
                </RadarChart>
              </ResponsiveContainer>
              
              <div className="mt-3 p-3 rounded-lg" style={{ background: 'oklch(0.18 0.014 264)' }}>
                <div className="font-display text-sm mb-1" style={{ color: '#38bdf8' }}>
                  {selectedTrainee} — 診断結果
                </div>
                <div className="text-xs font-jp" style={{ color: '#10b981' }}>
                  {getDiagnosis(selected) || '標準的なプロファイル'}
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2">
                  {[
                    { label: '再生回数', value: formatNumber(selected.viewCount) },
                    { label: 'コメントUU', value: formatNumber(selected.uu_count || 0) },
                    { label: 'ポジ率', value: formatPct(selected.positive_rate) },
                    { label: '平均コメ数', value: selected.avg_comment_per_user.toFixed(2) },
                    { label: 'ジニ係数', value: (selected.gini || 0).toFixed(3) },
                    { label: '熱量スコア', value: (selected.comment_heat_score || selected.total_score).toFixed(1) },
                  ].map((item) => (
                    <div key={item.label} className="text-center">
                      <div className="text-xs font-jp" style={{ color: 'oklch(0.45 0.012 264)' }}>{item.label}</div>
                      <div className="font-mono-data text-sm" style={{ color: 'oklch(0.80 0.008 264)' }}>{item.value}</div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
        
        {/* Score Matrix Top 20 */}
        <div className="dash-card p-5">
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
            コメント熱量スコア TOP 20
          </div>
          <div className="space-y-1.5 max-h-96 overflow-y-auto pr-1">
            {scoreMatrix.map((v, i) => (
              <div
                key={v.en_name}
                className="flex items-center gap-2 p-2 rounded cursor-pointer transition-colors"
                style={{
                  background: selectedTrainee === v.en_name ? 'rgba(255,255,255,0.04)' : 'transparent',
                }}
                onClick={() => setSelectedTrainee(v.en_name)}
              >
                <span className="font-display text-xs w-5 text-right flex-shrink-0" style={{
                  // gold=1st, indigo=2nd/3rd, grey=rest
                  color: i === 0 ? '#38bdf8' : i < 3 ? '#ffffff' : 'oklch(0.40 0.012 264)'
                }}>
                  {i + 1}
                </span>
                <span className="font-display text-xs w-20 flex-shrink-0" style={{
                  color: selectedTrainee === v.en_name ? '#38bdf8' : 'oklch(0.75 0.008 264)'
                }}>
                  {v.en_name}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.20 0.016 264)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(v.total_score / scoreMatrix[0].total_score) * 100}%`,
                      background: i === 0 ? 'linear-gradient(90deg, #38bdf8, #7dd3fc)' : 'linear-gradient(90deg, #ffffff, rgba(255,255,255,0.80))',
                    }}
                  />
                </div>
                <span className="font-mono-data text-xs w-10 text-right flex-shrink-0" style={{ color: i === 0 ? '#38bdf8' : '#ffffff' }}>
                  {v.total_score.toFixed(1)}
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 text-xs font-jp" style={{ color: 'oklch(0.40 0.012 264)' }}>
            ※ コメント熱量スコア = いいね率25% + コメントUU数25% + 平均コメント数20% + ポジティブ率15% + 応援率10% + コメント数5%
          </div>
        </div>
      </div>
      
      {/* Score comparison bar chart */}
      <div className="dash-card p-5">
        <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
          指標別スコア比較 — TOP 10（各指標の強みを可視化）
        </div>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={scoreMatrix.slice(0, 10).map(v => {
              const vs = video_stats.find(s => s.en_name === v.en_name);
              return {
                name: v.en_name,
                再生回数: vs ? norm(vs.viewCount, allViews) : 0,
                コメントUU: vs ? norm(vs.uu_count || 0, allUU) : 0,
                ポジティブ: vs ? norm(vs.positive_rate, allPositive) : 0,
                海外率: vs ? norm(vs.overseas_rate, allOverseas) : 0,
              };
            })}
            margin={{ left: 0, right: 10, top: 5, bottom: 60 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: 'oklch(0.55 0.012 264)', fontSize: 10 }}
              angle={-45}
              textAnchor="end"
              interval={0}
            />
            <YAxis tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }} domain={[0, 100]} />
            <Tooltip
              contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
              labelStyle={{ color: 'oklch(0.92 0.008 264)' }}
            />
            <Legend wrapperStyle={{ color: 'oklch(0.65 0.008 264)', fontSize: 11 }} />
            <Bar dataKey="再生回数" fill="#ffffff" radius={[2, 2, 0, 0]} />
            <Bar dataKey="コメントUU" fill="#38bdf8" radius={[2, 2, 0, 0]} />
            <Bar dataKey="ポジティブ" fill="oklch(0.50 0.12 264)" radius={[2, 2, 0, 0]} />
            <Bar dataKey="海外率" fill="oklch(0.40 0.012 264)" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
