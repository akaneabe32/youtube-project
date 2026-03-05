/*
 * Home Page v2.0 — 5セクション構成
 * Design: Fixed left sidebar (220px) + scrollable main content
 * Theme: STAT PICK Brand — Dark Navy + Pastel Gradient
 * Typography: Bebas Neue (display) + DM Sans (body) + Noto Sans JP (Japanese)
 * セクション: Overview / Playlist / Ranking / Trend / Engagement
 */

import { useState, useEffect, useRef } from 'react';
import { useDashboardData } from '@/hooks/useDashboardData';
import Sidebar from '@/components/Sidebar';
import DataUpdateModal from '@/components/DataUpdateModal';
import OverviewSection from '@/components/sections/OverviewSection';
import PlaylistSection from '@/components/sections/PlaylistSection';
import RankingSection from '@/components/sections/RankingSection';
import TrendSection from '@/components/sections/TrendSection';
import EngagementSection from '@/components/sections/EngagementSection';
import ExportableSection from '@/components/ExportableSection';

const SECTIONS = ['overview', 'playlist', 'ranking', 'trend', 'engagement'];

export default function Home() {
  const { data, loading, error, meta, updateData, fetchFromGas, getSavedGasUrl, resetData } = useDashboardData();
  const [activeSection, setActiveSection] = useState('overview');
  const [isDataModalOpen, setIsDataModalOpen] = useState(false);
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const handleNavigate = (id: string) => {
    setActiveSection(id);
    const el = sectionRefs.current[id];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  useEffect(() => {
    if (!data) return;

    const ACTIVATION_THRESHOLD = 0.4;

    const handleScroll = () => {
      const viewportHeight = window.innerHeight;
      const activationLine = viewportHeight * ACTIVATION_THRESHOLD;
      let activeId = SECTIONS[0];

      for (let i = SECTIONS.length - 1; i >= 0; i--) {
        const id = SECTIONS[i];
        const el = sectionRefs.current[id];
        if (el) {
          const rect = el.getBoundingClientRect();
          if (rect.top <= activationLine + 60) {
            activeId = id;
            break;
          }
        }
      }
      setActiveSection(activeId);
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener('scroll', handleScroll);
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center spotlight-bg">
        <div className="text-center">
          <div
            className="font-display text-4xl mb-2"
            style={{
              background: 'linear-gradient(135deg, #a8edea 0%, #c4b5fd 50%, #f9a8d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            STAT PICK
          </div>
          <div className="font-display text-sm mb-4" style={{ color: '#60a5fa' }}>
            PRODUCE 101 JAPAN — SHINSEKAI
          </div>
          <div className="font-jp text-sm" style={{ color: 'rgba(255,255,255,0.40)' }}>
            データを読み込み中...
          </div>
          <div className="mt-4 flex gap-1 justify-center">
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                className="w-2 h-2 rounded-full"
                style={{
                  background: '#38bdf8',
                  animation: `pulseDot 1.4s ease infinite ${i * 0.2}s`,
                }}
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center spotlight-bg">
        <div className="text-center">
          <div className="font-display text-2xl mb-2" style={{ color: '#ef4444' }}>
            DATA LOAD ERROR
          </div>
          <div className="text-sm font-jp" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {error || 'データの読み込みに失敗しました'}
          </div>
          <div className="mt-4">
            <button
              onClick={() => setIsDataModalOpen(true)}
              className="px-4 py-2 rounded-lg text-xs font-display tracking-wider"
              style={{ background: 'rgba(56,189,248,0.12)', border: '1px solid rgba(56,189,248,0.35)', color: '#38bdf8' }}
            >
              データを更新する
            </button>
          </div>
          <DataUpdateModal
            isOpen={isDataModalOpen}
            onClose={() => setIsDataModalOpen(false)}
            onUpdate={updateData}
            onFetchFromGas={fetchFromGas}
            getSavedGasUrl={getSavedGasUrl}
            onReset={resetData}
            meta={meta}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen spotlight-bg flex">
      <Sidebar activeSection={activeSection} onNavigate={handleNavigate} />

      <main className="flex-1" style={{ marginLeft: '220px' }}>
        {/* Header bar */}
        <div
          className="sticky top-0 z-40 px-8 py-3 flex items-center justify-between"
          style={{
            background: 'rgba(8,12,30,0.92)',
            backdropFilter: 'blur(12px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
          }}
        >
          <div className="flex items-center gap-2">
            <span className="font-display text-sm tracking-widest" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {activeSection.toUpperCase()}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-mono-data" style={{ color: 'rgba(255,255,255,0.30)' }}>
              {data.meta.totalVideos} VIDEOS · {data.meta.totalViews.toLocaleString()} VIEWS
            </div>
            <div className="text-xs font-mono-data" style={{ color: 'rgba(255,255,255,0.25)' }}>
              {data.meta.dataRange}
            </div>
            <button
              onClick={() => setIsDataModalOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-display tracking-wider transition-all duration-200 hover:scale-105"
              style={{
                background: meta?.source === 'gas'
                  ? 'rgba(56,189,248,0.08)'
                  : 'rgba(255,255,255,0.05)',
                border: `1px solid ${meta?.source === 'gas' ? 'rgba(56,189,248,0.40)' : 'rgba(255,255,255,0.10)'}`,
                color: meta?.source === 'gas' ? '#38bdf8' : 'rgba(255,255,255,0.45)',
              }}
            >
              <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                <path d="M6 1v6M6 1L3.5 3.5M6 1L8.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M1 9.5h10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.7"/>
              </svg>
              {meta?.source === 'gas' ? 'GAS LIVE' : meta?.source === 'uploaded' ? 'UPLOADED' : 'UPDATE DATA'}
            </button>
          </div>
        </div>

        <DataUpdateModal
          isOpen={isDataModalOpen}
          onClose={() => setIsDataModalOpen(false)}
          onUpdate={updateData}
          onFetchFromGas={fetchFromGas}
          getSavedGasUrl={getSavedGasUrl}
          onReset={resetData}
          meta={meta}
        />

        {/* Sections */}
        <div className="px-8 py-8 space-y-16">
          {SECTIONS.map((id) => (
            <div
              key={id}
              ref={(el) => { sectionRefs.current[id] = el; }}
              id={id}
            >
              {id === 'overview'    && <ExportableSection filename="stat-pick-overview"><OverviewSection data={data} /></ExportableSection>}
              {id === 'playlist'    && <ExportableSection filename="stat-pick-playlist"><PlaylistSection data={data} /></ExportableSection>}
              {id === 'ranking'     && <ExportableSection filename="stat-pick-ranking"><RankingSection data={data} /></ExportableSection>}
              {id === 'trend'       && <ExportableSection filename="stat-pick-trend"><TrendSection data={data} /></ExportableSection>}
              {id === 'engagement'  && <ExportableSection filename="stat-pick-engagement"><EngagementSection data={data} /></ExportableSection>}
            </div>
          ))}

          {/* Footer */}
          <div className="py-8 text-center" style={{ borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <div
              className="font-display text-xl"
              style={{
                background: 'linear-gradient(135deg, #a8edea 0%, #c4b5fd 50%, #f9a8d4 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}
            >
              STAT PICK
            </div>
            <div className="text-xs font-jp mt-2" style={{ color: 'rgba(255,255,255,0.30)' }}>
              PRODUCE 101 JAPAN S4 — YouTube データ分析ダッシュボード
            </div>
            <div className="mt-4 max-w-lg mx-auto p-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div className="text-[10px] font-jp leading-relaxed" style={{ color: 'rgba(255,255,255,0.25)' }}>
                本サイトは非公式のファン制作サイトです。PRODUCE 101 JAPAN の公式サイト・公式コンテンツではありません。
                すべてのデータは YouTube の公開情報に基づいており、番組の公式見解を反映するものではありません。
                練習生の名前・画像等の権利は各権利者に帰属します。
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
