/*
 * KPI Card Component
 * Design: STAT PICK — Dark Navy + 3-color system
 * WHITE (#ffffff) = all data numbers (primary)
 * CYAN (#38bdf8) = key highlight accent (1 or 2 cards max)
 * MUTED (rgba white 0.35) = secondary/label text
 * Brand gradient: ONLY for logo/STAT PICK text, NOT here
 */

import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  accent?: 'default' | 'cyan';
  icon?: string;
  change?: string;
  changePositive?: boolean;
  delay?: number;
}

// 3-color system: white (all data), cyan (key highlight only), muted-white (labels)
const accentColors = {
  default: { bg: 'rgba(255,255,255,0.03)', border: 'rgba(255,255,255,0.08)', text: '#ffffff', glow: 'none' },
  cyan:    { bg: 'rgba(56,189,248,0.05)',  border: 'rgba(56,189,248,0.15)',  text: '#38bdf8', glow: '0 0 20px rgba(56,189,248,0.06)' },
};

export default function KpiCard({ title, value, subtitle, accent = 'default', icon, change, changePositive, delay = 0 }: KpiCardProps) {
  const [visible, setVisible] = useState(false);
  const colors = accentColors[accent];

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay);
    return () => clearTimeout(timer);
  }, [delay]);

  return (
    <div
      className={cn('dash-card p-5 transition-all duration-500', visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4')}
      style={{
        background: colors.bg,
        borderColor: colors.border,
        boxShadow: colors.glow,
      }}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="text-xs font-display tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>
          {title}
        </div>
        {icon && (
          <span className="text-lg" style={{ color: colors.text }}>
            {icon}
          </span>
        )}
      </div>

      <div className="font-display text-3xl leading-none" style={{ color: colors.text }}>
        {value}
      </div>

      {subtitle && (
        <div className="text-xs font-jp mt-2" style={{ color: 'rgba(255,255,255,0.30)' }}>
          {subtitle}
        </div>
      )}

      {change && (
        <div
          className={cn('text-xs font-mono-data mt-2 flex items-center gap-1')}
          style={{ color: changePositive ? '#4ade80' : '#f87171' }}
        >
          <span>{changePositive ? '▲' : '▼'}</span>
          <span>{change}</span>
        </div>
      )}
    </div>
  );
}
