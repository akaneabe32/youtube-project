import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// デフォルト: カンマ区切り表示（将来的にK/M表示と切替可能にする想定）
export function formatNumber(n: number): string {
  return Math.round(n).toLocaleString('ja-JP');
}

// 短縮表示（将来の切替機能用: 36,000 ↔ 3.6万 / 3.6K）
export function formatNumberShort(n: number): string {
  if (n >= 10_000) return (n / 10_000).toFixed(1) + '万';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return n.toLocaleString('ja-JP');
}

export function formatPct(n: number, digits = 1): string {
  return n.toFixed(digits) + '%';
}

export function getRankBadgeClass(rank: number): string {
  if (rank === 1) return 'rank-badge-1';
  if (rank === 2) return 'rank-badge-2';
  if (rank === 3) return 'rank-badge-3';
  return 'rank-badge-other';
}

export function getSentimentColor(label: string): string {
  if (label === 'positive') return '#10b981';
  if (label === 'negative') return '#ef4444';
  return '#6366f1';
}

export function getLangColor(lang: string): string {
  const colors: Record<string, string> = {
    ja: '#6366f1',
    en: '#f59e0b',
    ko: '#10b981',
    zh: '#ec4899',
    other: '#6b7280',
  };
  return colors[lang] || '#6b7280';
}

export function getLangLabel(lang: string): string {
  const labels: Record<string, string> = {
    ja: '日本語',
    en: '英語',
    ko: '韓国語',
    zh: '中国語',
    other: 'その他',
  };
  return labels[lang] || lang;
}
