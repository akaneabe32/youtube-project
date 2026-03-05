/**
 * Oshi Diagnosis Section — 推しタイプ診断
 * Design: Dark dashboard, indigo/gold 3-color rule
 * Axes:
 *   X = いいね数（広がり）— 上位25%境界
 *   Y = コミットメント率（深さ = コメントUU数/いいね数）— 上位25%境界
 * Quadrants: 覇権型 / ライト人気型 / コア人気型 / 潜在型
 */

import { useState } from 'react';
import SectionHeader from '@/components/SectionHeader';
import { formatNumber } from '@/lib/utils';
import type { DashboardData } from '@/lib/types';
import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine, Cell
} from 'recharts';

interface Props {
  data: DashboardData;
}

const QUADRANT_CONFIG = {
  dominant:      { label: '覇権型',       label_en: 'DOMINANT',      color: '#38bdf8',              desc: 'いいね数も多く、コミットメント率も高い。広がりと深さを兼ね備えた真のエリート。' },
  light_popular: { label: 'ライト人気型', label_en: 'LIGHT POPULAR', color: '#ffffff',              desc: 'いいね数は多いが、コミットメント率は低い。広く浅いライト層に支えられている。' },
  core_fanbase:  { label: 'コア人気型',   label_en: 'CORE FANBASE',  color: 'oklch(0.55 0.12 264)', desc: 'いいね数は少ないが、コミットメント率が高い。少数の熱狂的なコアファンに支えられている。' },
  potential:     { label: '潜在型',       label_en: 'POTENTIAL',     color: 'oklch(0.40 0.012 264)',desc: 'いいね数・コミットメント率ともに平均以下。これから伸びる可能性を秘めている。' },
};

type QuadrantKey = keyof typeof QUADRANT_CONFIG;

export default function OshiDiagnosisSection({ data }: Props) {
  const [activeQuadrant, setActiveQuadrant] = useState<QuadrantKey | 'all'>('all');
  const [hoveredPoint, setHoveredPoint] = useState<string | null>(null);

  const diagnosis = (data as any).oshi_diagnosis;
  if (!diagnosis) return null;

  const { points, meta } = diagnosis;
  const { spread_threshold, depth_threshold, counts } = meta;

  const filteredPoints = activeQuadrant === 'all'
    ? points
    : points.filter((p: any) => p.quadrant === activeQuadrant);

  const getColor = (quadrant: string) =>
    QUADRANT_CONFIG[quadrant as QuadrantKey]?.color || 'oklch(0.40 0.012 264)';

  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const p = payload[0]?.payload;
    if (!p) return null;
    const qc = QUADRANT_CONFIG[p.quadrant as QuadrantKey];
    return (
      <div className="rounded-lg p-3 text-xs" style={{
        background: 'oklch(0.13 0.014 264)',
        border: `1px solid ${qc?.color || '#ffffff'}`,
        minWidth: 180,
      }}>
        <div className="font-display text-sm mb-1" style={{ color: qc?.color || '#ffffff' }}>
          {p.en_name}
        </div>
        <div className="font-jp mb-2" style={{ color: 'oklch(0.65 0.008 264)' }}>{p.jp_name}</div>
        <div className="space-y-1">
          <div className="flex justify-between gap-4">
            <span style={{ color: 'oklch(0.50 0.012 264)' }}>いいね数</span>
            <span className="font-mono-data" style={{ color: 'oklch(0.85 0.008 264)' }}>{formatNumber(p.like_count)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span style={{ color: 'oklch(0.50 0.012 264)' }}>コミット率</span>
            <span className="font-mono-data" style={{ color: 'oklch(0.85 0.008 264)' }}>{p.commitment_rate.toFixed(1)}%</span>
          </div>
          <div className="flex justify-between gap-4">
            <span style={{ color: 'oklch(0.50 0.012 264)' }}>コメントUU</span>
            <span className="font-mono-data" style={{ color: 'oklch(0.85 0.008 264)' }}>{formatNumber(p.uu_count)}</span>
          </div>
          <div className="flex justify-between gap-4">
            <span style={{ color: 'oklch(0.50 0.012 264)' }}>ジニ係数</span>
            <span className="font-mono-data" style={{ color: 'oklch(0.85 0.008 264)' }}>{(p.gini || 0).toFixed(3)}</span>
          </div>
        </div>
        <div className="mt-2 pt-2 font-jp text-[10px]" style={{
          color: qc?.color || '#ffffff',
          borderTop: '1px solid oklch(1 0 0 / 10%)',
        }}>
          {qc?.label} — {qc?.label_en}
        </div>
      </div>
    );
  };

  return (
    <div>
      <SectionHeader
        title="推しタイプ診断"
        subtitle="いいね数（広がり）× コミットメント率（深さ）による4象限分類"
        badge="OSHI DIAGNOSIS"
      />

      {/* 軸の説明 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="dash-card p-4" style={{ borderLeft: '3px solid #38bdf8' }}>
          <div className="font-display text-xs tracking-widest mb-1" style={{ color: '#38bdf8' }}>
            横軸 — 広がり指標
          </div>
          <div className="font-jp text-sm font-medium mb-1" style={{ color: 'oklch(0.85 0.008 264)' }}>
            いいね数
          </div>
          <div className="text-xs font-jp" style={{ color: 'oklch(0.55 0.012 264)' }}>
            1人1回制限のため水増し不可。どれだけ多くの人にリーチし、行動を引き出したかを示す最も信頼性の高い広がり指標。
          </div>
          <div className="mt-2 text-xs font-mono-data" style={{ color: 'oklch(0.45 0.012 264)' }}>
            境界: {formatNumber(Math.round(spread_threshold))} （上位25%）
          </div>
        </div>
        <div className="dash-card p-4" style={{ borderLeft: '3px solid #ffffff' }}>
          <div className="font-display text-xs tracking-widest mb-1" style={{ color: '#ffffff' }}>
            縦軸 — 深さ指標
          </div>
          <div className="font-jp text-sm font-medium mb-1" style={{ color: 'oklch(0.85 0.008 264)' }}>
            コミットメント率 = コメントUU数 ÷ いいね数 × 100
          </div>
          <div className="text-xs font-jp" style={{ color: 'oklch(0.55 0.012 264)' }}>
            いいねした人のうち何%がコメントまでしたか。1人大量投稿の影響を受けず、ファンの行動コミットメントを測る。
          </div>
          <div className="mt-2 text-xs font-mono-data" style={{ color: 'oklch(0.45 0.012 264)' }}>
            境界: {depth_threshold.toFixed(1)}% （上位25%）
          </div>
        </div>
      </div>

      {/* 象限フィルター */}
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          onClick={() => setActiveQuadrant('all')}
          className="px-3 py-1.5 rounded text-xs font-display tracking-wider transition-all"
          style={{
            background: activeQuadrant === 'all' ? 'rgba(56,189,248,0.08)' : 'transparent',
            color: activeQuadrant === 'all' ? '#38bdf8' : 'oklch(0.50 0.012 264)',
            border: `1px solid ${activeQuadrant === 'all' ? 'rgba(255,255,255,0.20)' : 'oklch(1 0 0 / 10%)'}`,
          }}
        >
          ALL ({points.length})
        </button>
        {(Object.entries(QUADRANT_CONFIG) as [QuadrantKey, typeof QUADRANT_CONFIG[QuadrantKey]][]).map(([key, qc]) => (
          <button
            key={key}
            onClick={() => setActiveQuadrant(key)}
            className="px-3 py-1.5 rounded text-xs font-display tracking-wider transition-all"
            style={{
              background: activeQuadrant === key ? `${qc.color}20` : 'transparent',
              color: activeQuadrant === key ? qc.color : 'oklch(0.50 0.012 264)',
              border: `1px solid ${activeQuadrant === key ? qc.color + '80' : 'oklch(1 0 0 / 10%)'}`,
            }}
          >
            {qc.label_en} ({counts[key]})
          </button>
        ))}
      </div>

      {/* 散布図 */}
      <div className="dash-card p-5 mb-6">
        <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
          散布図 — 各点 = 1練習生（ホバーで詳細表示）
        </div>
        <ResponsiveContainer width="100%" height={380}>
          <ScatterChart margin={{ left: 20, right: 30, top: 20, bottom: 30 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" />
            <XAxis
              type="number"
              dataKey="like_count"
              name="いいね数"
              tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }}
              tickFormatter={(v) => formatNumber(v)}
              label={{ value: 'いいね数（広がり）', position: 'insideBottom', offset: -15, fill: 'oklch(0.45 0.012 264)', fontSize: 11 }}
            />
            <YAxis
              type="number"
              dataKey="commitment_rate"
              name="コミットメント率"
              tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }}
              tickFormatter={(v) => `${v.toFixed(0)}%`}
              label={{ value: 'コミットメント率（深さ）', angle: -90, position: 'insideLeft', offset: 10, fill: 'oklch(0.45 0.012 264)', fontSize: 11 }}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', stroke: 'oklch(1 0 0 / 20%)' }} />
            {/* 境界線 */}
            <ReferenceLine
              x={spread_threshold}
              stroke="oklch(1 0 0 / 20%)"
              strokeDasharray="6 3"
              label={{ value: `上位25% (${formatNumber(Math.round(spread_threshold))})`, position: 'top', fill: 'oklch(0.50 0.012 264)', fontSize: 10 }}
            />
            <ReferenceLine
              y={depth_threshold}
              stroke="oklch(1 0 0 / 20%)"
              strokeDasharray="6 3"
              label={{ value: `上位25% (${depth_threshold.toFixed(1)}%)`, position: 'right', fill: 'oklch(0.50 0.012 264)', fontSize: 10 }}
            />
            <Scatter data={filteredPoints} r={6}>
              {filteredPoints.map((p: any, i: number) => (
                <Cell
                  key={i}
                  fill={getColor(p.quadrant)}
                  fillOpacity={hoveredPoint === p.en_name ? 1 : 0.75}
                  stroke={hoveredPoint === p.en_name ? '#fff' : 'none'}
                  strokeWidth={1.5}
                />
              ))}
            </Scatter>
          </ScatterChart>
        </ResponsiveContainer>
        <div className="mt-2 text-xs font-jp" style={{ color: 'oklch(0.40 0.012 264)' }}>
          ※ 破線 = 上位25%境界（第3四分位数）。右上 = 覇権型、右下 = ライト人気型、左上 = コア人気型、左下 = 潜在型。
        </div>
      </div>

      {/* 象限別カード */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {(Object.entries(QUADRANT_CONFIG) as [QuadrantKey, typeof QUADRANT_CONFIG[QuadrantKey]][]).map(([key, qc]) => {
          const qPoints = points.filter((p: any) => p.quadrant === key)
            .sort((a: any, b: any) => b.like_count - a.like_count);
          return (
            <div key={key} className="dash-card p-4" style={{ borderLeft: `3px solid ${qc.color}` }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <div className="font-display text-xs tracking-widest" style={{ color: qc.color }}>
                    {qc.label_en}
                  </div>
                  <div className="font-jp text-sm font-medium" style={{ color: 'oklch(0.85 0.008 264)' }}>
                    {qc.label}
                  </div>
                </div>
                <div className="font-display text-3xl" style={{ color: qc.color }}>
                  {counts[key]}
                </div>
              </div>
              <div className="text-xs font-jp mb-3" style={{ color: 'oklch(0.50 0.012 264)' }}>
                {qc.desc}
              </div>
              <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                {qPoints.map((p: any, i: number) => (
                  <div key={p.en_name} className="flex items-center gap-2 text-xs">
                    <span className="font-mono-data w-4 text-right flex-shrink-0" style={{
                      color: i === 0 ? '#38bdf8' : 'oklch(0.40 0.012 264)'
                    }}>{i + 1}</span>
                    <span className="font-display flex-1 truncate" style={{ color: 'oklch(0.75 0.008 264)' }}>
                      {p.en_name}
                    </span>
                    <span className="font-mono-data flex-shrink-0" style={{ color: 'oklch(0.45 0.012 264)' }}>
                      {formatNumber(p.like_count)}♡
                    </span>
                    <span className="font-mono-data flex-shrink-0" style={{ color: qc.color }}>
                      {p.commitment_rate.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      {/* 指標の定義 */}
      <div className="dash-card p-4">
        <div className="text-xs font-display tracking-widest mb-3" style={{ color: 'oklch(0.55 0.012 264)' }}>
          指標の定義と設計根拠
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-jp" style={{ color: 'oklch(0.50 0.012 264)' }}>
          <div>
            <strong style={{ color: 'oklch(0.70 0.008 264)' }}>なぜいいね数を広がり指標に？</strong><br />
            再生回数はスミン（繰り返し再生）に弱く、コメントUU数は絶対値が小さい。いいね数は1人1回制限で水増し困難、かつ再生数より行動コストが高いため、最も信頼性の高い広がり指標。
          </div>
          <div>
            <strong style={{ color: 'oklch(0.70 0.008 264)' }}>なぜコミットメント率を深さ指標に？</strong><br />
            平均コメント数は1人の大量投稿で跳ね上がる。コメントUU数÷いいね数は「いいねした人のうち何%がさらにコメントまでしたか」を測り、1人大量投稿の影響を受けない。
          </div>
        </div>
      </div>
    </div>
  );
}
