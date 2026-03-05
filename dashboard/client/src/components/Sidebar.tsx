/*
 * Sidebar Navigation v2.0 — 5セクション構成
 * Design: STAT PICK Brand — Dark Navy + Brand Gradient (logo only)
 * セクション: Overview / Playlist / Ranking / Trend / Engagement
 */

import { cn } from '@/lib/utils';

interface NavItem {
  id: string;
  label: string;
  icon: string;
  description: string;
}

const navItems: NavItem[] = [
  { id: 'overview',    label: 'OVERVIEW',    icon: '◈', description: '全体サマリー' },
  { id: 'playlist',   label: 'PLAYLIST',    icon: '◉', description: 'プレイリスト比較' },
  { id: 'ranking',    label: 'RANKING',     icon: '▲', description: '動画ランキング' },
  { id: 'trend',      label: 'TREND',       icon: '◇', description: '日次トレンド' },
  { id: 'engagement', label: 'ENGAGEMENT',  icon: '◆', description: 'エンゲージメント' },
];

interface SidebarProps {
  activeSection: string;
  onNavigate: (id: string) => void;
}

export default function Sidebar({ activeSection, onNavigate }: SidebarProps) {
  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[220px] flex flex-col z-50"
      style={{
        background: '#080c1e',
        borderRight: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Logo — STAT PICK brand gradient */}
      <div className="px-5 pt-5 pb-4" style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center gap-3">
          <svg width="34" height="34" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <linearGradient id="barGrad1" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f9a8d4"/>
                <stop offset="100%" stopColor="#c4b5fd"/>
              </linearGradient>
              <linearGradient id="barGrad2" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#c4b5fd"/>
                <stop offset="100%" stopColor="#93c5fd"/>
              </linearGradient>
              <linearGradient id="barGrad3" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd"/>
                <stop offset="100%" stopColor="#a8edea"/>
              </linearGradient>
              <linearGradient id="trendGrad" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#a8edea"/>
                <stop offset="50%" stopColor="#c4b5fd"/>
                <stop offset="100%" stopColor="#f9a8d4"/>
              </linearGradient>
            </defs>
            <rect x="4"  y="20" width="5" height="8"  rx="1" fill="url(#barGrad1)" opacity="0.7"/>
            <rect x="11" y="14" width="5" height="14" rx="1" fill="url(#barGrad2)" opacity="0.85"/>
            <rect x="18" y="17" width="5" height="11" rx="1" fill="url(#barGrad3)" opacity="0.75"/>
            <rect x="25" y="10" width="4" height="18" rx="1" fill="url(#barGrad2)" opacity="0.9"/>
            <polyline points="6.5,19 13.5,13 20.5,16 27,9" stroke="url(#trendGrad)" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <circle cx="27" cy="9" r="2"   fill="#f9a8d4" opacity="0.9"/>
            <circle cx="27" cy="9" r="3.5" fill="#f9a8d4" opacity="0.2"/>
          </svg>
          <div
            className="font-display text-xl leading-none tracking-widest"
            style={{
              background: 'linear-gradient(135deg, #a8edea 0%, #c4b5fd 50%, #f9a8d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}
          >
            STAT PICK
          </div>
        </div>
        <div className="mt-2 text-[10px] font-jp" style={{ color: 'rgba(255,255,255,0.25)' }}>
          PRODUCE 101 JAPAN S4
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3">
        {navItems.map((item) => {
          const isActive = activeSection === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={cn(
                'w-full text-left px-5 py-2.5 transition-all duration-200 group relative',
                !isActive && 'hover:bg-white/4'
              )}
              style={isActive ? {
                background: 'rgba(56,189,248,0.08)',
                borderLeft: '2px solid #38bdf8',
              } : {
                borderLeft: '2px solid transparent',
              }}
            >
              <div className="flex items-center gap-3">
                <span
                  className="text-sm w-4 text-center flex-shrink-0"
                  style={{ color: isActive ? '#38bdf8' : 'rgba(255,255,255,0.25)' }}
                >
                  {item.icon}
                </span>
                <div>
                  <div
                    className="font-display text-xs tracking-widest"
                    style={{ color: isActive ? '#ffffff' : 'rgba(255,255,255,0.50)' }}
                  >
                    {item.label}
                  </div>
                  <div
                    className="text-xs font-jp mt-0.5"
                    style={{ color: isActive ? 'rgba(255,255,255,0.50)' : 'rgba(255,255,255,0.25)' }}
                  >
                    {item.description}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="mt-2" >
          <div className="text-[9px] font-jp leading-relaxed" style={{ color: 'rgba(255,255,255,0.20)' }}>
            本サイトは非公式のファン制作サイトです。
            PRODUCE 101 JAPAN の公式コンテンツではありません。
            データは YouTube 公開情報に基づきます。
          </div>
        </div>
      </div>
    </aside>
  );
}
