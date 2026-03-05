/*
 * Demographic Section
 * Updated: dynamic age stats from data, corrected oldest trainee
 */

import SectionHeader from '@/components/SectionHeader';
import { formatPct } from '@/lib/utils';
import type { DashboardData } from '@/lib/types';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface Props {
  data: DashboardData;
}

// MBTI types grouped
const mbtiGroups: Record<string, string> = {
  ENFJ: 'NF', ENFP: 'NF', INFJ: 'NF', INFP: 'NF',
  ENTJ: 'NT', ENTP: 'NT', INTJ: 'NT', INTP: 'NT',
  ESFJ: 'SF', ESFP: 'SF', ISFJ: 'SF', ISFP: 'SF',
  ESTJ: 'ST', ESTP: 'ST', ISTJ: 'ST', ISTP: 'ST',
};

const mbtiGroupColors: Record<string, string> = {
  NF: '#ffffff',
  NT: '#38bdf8',
  SF: '#10b981',
  ST: '#ec4899',
};

const mbtiGroupLabels: Record<string, string> = {
  NF: 'NF型（理想主義者）',
  NT: 'NT型（合理主義者）',
  SF: 'SF型（保護者型）',
  ST: 'ST型（管理者型）',
};

export default function DemographicSection({ data }: Props) {
  const { age_dist, mbti_dist, hometown_dist, overview } = data;
  
  // Compute age stats dynamically
  const totalTrainees = age_dist.reduce((s, d) => s + d.count, 0);
  const avgAge = age_dist.reduce((s, d) => s + d.age * d.count, 0) / totalTrainees;
  const minAge = Math.min(...age_dist.map(d => d.age));
  const maxAge = Math.max(...age_dist.map(d => d.age));
  
  // Find mode age
  const modeAge = age_dist.reduce((prev, curr) => curr.count > prev.count ? curr : prev).age;
  
  // Age chart data
  const ageData = age_dist.map(d => ({
    age: `${d.age}歳`,
    count: d.count,
    isMode: d.age === modeAge,
  }));
  
  // MBTI group aggregation
  const mbtiGroupData: Record<string, number> = {};
  mbti_dist.forEach(m => {
    const group = mbtiGroups[m.mbti] || 'Other';
    mbtiGroupData[group] = (mbtiGroupData[group] || 0) + m.count;
  });
  const mbtiGroupArray = Object.entries(mbtiGroupData).map(([group, count]) => ({
    group,
    label: mbtiGroupLabels[group] || group,
    count,
    color: mbtiGroupColors[group] || '#6b7280',
  })).sort((a, b) => b.count - a.count);
  
  const totalMbti = mbtiGroupArray.reduce((s, m) => s + m.count, 0);
  
  // Top MBTI types
  const topMbti = [...mbti_dist].sort((a, b) => b.count - a.count).slice(0, 10);
  
  // Hometown data
  const hometownData = hometown_dist.slice(0, 12);
  
  // E vs I, N vs S, T vs F, J vs P
  const eiData = { E: 0, I: 0 };
  const nsData = { N: 0, S: 0 };
  const tfData = { T: 0, F: 0 };
  const jpData = { J: 0, P: 0 };
  
  mbti_dist.forEach(m => {
    if (m.mbti.length >= 4) {
      eiData[m.mbti[0] as 'E' | 'I'] = (eiData[m.mbti[0] as 'E' | 'I'] || 0) + m.count;
      nsData[m.mbti[1] as 'N' | 'S'] = (nsData[m.mbti[1] as 'N' | 'S'] || 0) + m.count;
      tfData[m.mbti[2] as 'T' | 'F'] = (tfData[m.mbti[2] as 'T' | 'F'] || 0) + m.count;
      jpData[m.mbti[3] as 'J' | 'P'] = (jpData[m.mbti[3] as 'J' | 'P'] || 0) + m.count;
    }
  });
  
  const totalEI = eiData.E + eiData.I;
  
  return (
    <div>
      <SectionHeader
        title="DEMOGRAPHIC ANALYSIS"
        subtitle={`練習生デモグラフィック — 年齢・MBTI・出身地分析（${totalTrainees}名）`}
        badge={`${totalTrainees} TRAINEES`}
      />
      
      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { label: '平均年齢', value: `${avgAge.toFixed(1)}歳`, sub: `最頻値：${modeAge}歳`, color: '#ffffff' },
          { label: '最年少', value: `${minAge}歳`, sub: `ARCHER UY / アーチャー・ウイ`, color: '#38bdf8' },
          { label: '最年長', value: `${maxAge}歳`, sub: `ONO KEITO / 小野 慶人`, color: '#10b981' },
          { label: '国際メンバー', value: '約30%', sub: '海外出身練習生', color: '#ec4899' },
        ].map((item) => (
          <div key={item.label} className="dash-card p-4" style={{ borderColor: `${item.color}40` }}>
            <div className="text-xs font-jp mb-1" style={{ color: 'oklch(0.55 0.012 264)' }}>{item.label}</div>
            <div className="font-display text-2xl" style={{ color: item.color }}>{item.value}</div>
            {item.sub && <div className="text-xs font-jp mt-1" style={{ color: 'oklch(0.45 0.012 264)' }}>{item.sub}</div>}
          </div>
        ))}
      </div>
      
      {/* Age + Hometown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* Age distribution */}
        <div className="dash-card p-5">
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
            年齢分布（練習生{totalTrainees}名）
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={ageData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" vertical={false} />
              <XAxis dataKey="age" tick={{ fill: 'oklch(0.65 0.008 264)', fontSize: 11, fontFamily: 'Noto Sans JP' }} />
              <YAxis tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }} />
              <Tooltip
                contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value}名`, '人数']}
              />
              <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                {ageData.map((d, i) => (
                  <Cell key={i} fill={d.isMode ? '#38bdf8' : '#ffffff'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-2 text-xs font-jp" style={{ color: 'oklch(0.45 0.012 264)' }}>
            ※ ゴールドは最頻値の年齢帯（{modeAge}歳）。
          </div>
        </div>
        
        {/* Hometown top */}
        <div className="dash-card p-5">
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
            出身地分布 TOP 12
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
            {hometownData.map((h, i) => (
              <div key={h.hometown} className="flex items-center gap-2">
                <span className="font-display text-xs w-5 text-right flex-shrink-0" style={{ color: 'oklch(0.40 0.012 264)' }}>
                  {i + 1}
                </span>
                <span className="font-jp text-xs w-20 flex-shrink-0" style={{ color: 'oklch(0.75 0.008 264)' }}>
                  {h.hometown}
                </span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.20 0.016 264)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${(h.count / hometownData[0].count) * 100}%`,
                      background: i < 3 ? '#38bdf8' : '#ffffff',
                    }}
                  />
                </div>
                <span className="font-mono-data text-xs w-8 text-right flex-shrink-0" style={{ color: 'oklch(0.55 0.012 264)' }}>
                  {h.count}名
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
      
      {/* MBTI Analysis */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        
        {/* MBTI Group */}
        <div className="dash-card p-5">
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
            MBTI グループ分布
          </div>
          <div className="space-y-3">
            {mbtiGroupArray.map((g) => (
              <div key={g.group}>
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-jp" style={{ color: 'oklch(0.75 0.008 264)' }}>{g.label}</span>
                  <span className="font-mono-data" style={{ color: g.color }}>
                    {g.count}名 ({formatPct(g.count / totalMbti * 100)})
                  </span>
                </div>
                <div className="h-2 rounded-full overflow-hidden" style={{ background: 'oklch(0.20 0.016 264)' }}>
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: `${g.count / totalMbti * 100}%`,
                      background: g.color,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
          
          {/* E/I N/S T/F J/P */}
          <div className="grid grid-cols-2 gap-3 mt-4 pt-4" style={{ borderTop: '1px solid oklch(1 0 0 / 8%)' }}>
            {[
              { label: 'E vs I', e: eiData.E, i: eiData.I, total: totalEI, eLabel: 'E(外向)', iLabel: 'I(内向)' },
              { label: 'N vs S', e: nsData.N, i: nsData.S, total: totalEI, eLabel: 'N(直感)', iLabel: 'S(感覚)' },
              { label: 'T vs F', e: tfData.T, i: tfData.F, total: totalEI, eLabel: 'T(思考)', iLabel: 'F(感情)' },
              { label: 'J vs P', e: jpData.J, i: jpData.P, total: totalEI, eLabel: 'J(判断)', iLabel: 'P(知覚)' },
            ].map((item) => (
              <div key={item.label}>
                <div className="text-xs font-display mb-1" style={{ color: 'oklch(0.50 0.012 264)' }}>{item.label}</div>
                <div className="flex h-2 rounded-full overflow-hidden">
                  <div style={{ width: `${item.e / item.total * 100}%`, background: '#ffffff' }} />
                  <div style={{ width: `${item.i / item.total * 100}%`, background: '#38bdf8' }} />
                </div>
                <div className="flex justify-between text-xs mt-0.5">
                  <span style={{ color: '#ffffff' }}>{item.eLabel} {formatPct(item.e / item.total * 100)}</span>
                  <span style={{ color: '#38bdf8' }}>{item.iLabel} {formatPct(item.i / item.total * 100)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        {/* Top MBTI types */}
        <div className="dash-card p-5">
          <div className="text-xs font-display tracking-widest mb-4" style={{ color: 'oklch(0.55 0.012 264)' }}>
            MBTI タイプ TOP 10
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={topMbti} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="oklch(1 0 0 / 5%)" horizontal={false} />
              <XAxis type="number" tick={{ fill: 'oklch(0.45 0.012 264)', fontSize: 10 }} />
              <YAxis type="category" dataKey="mbti" tick={{ fill: 'oklch(0.65 0.008 264)', fontSize: 11 }} width={45} />
              <Tooltip
                contentStyle={{ background: 'oklch(0.15 0.014 264)', border: '1px solid oklch(1 0 0 / 15%)', borderRadius: '8px' }}
                formatter={(value: number) => [`${value}名`, '人数']}
              />
              <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                {topMbti.map((m) => (
                  <Cell key={m.mbti} fill={mbtiGroupColors[mbtiGroups[m.mbti]] || '#6b7280'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 p-3 rounded-lg" style={{ background: 'oklch(0.18 0.014 264)' }}>
            <div className="text-xs font-jp" style={{ color: 'oklch(0.55 0.012 264)' }}>
              <strong style={{ color: 'oklch(0.75 0.008 264)' }}>MBTIインサイト：</strong>
              ENFPが最多（19名・{formatPct(19 / totalMbti * 100)}）。外向的・直感的・感情的・知覚的な「運動家型」が多く、
              表現力豊かなアイドル志望者の傾向と一致。
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
