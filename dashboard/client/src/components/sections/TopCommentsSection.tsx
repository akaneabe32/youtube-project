/*
 * Top Comments Section
 * Design: Card-based comment display with like count and sentiment badge
 */

import SectionHeader from '@/components/SectionHeader';
import { formatNumber, getSentimentColor, getLangLabel } from '@/lib/utils';
import type { DashboardData } from '@/lib/types';

interface Props {
  data: DashboardData;
}

const sentimentLabels: Record<string, string> = {
  positive: 'ポジティブ',
  neutral: 'ニュートラル',
  negative: 'ネガティブ',
};

const langFlags: Record<string, string> = {
  ja: '🇯🇵',
  en: '🌐',
  ko: '🇰🇷',
  zh: '🇨🇳',
  other: '🌍',
};

export default function TopCommentsSection({ data }: Props) {
  const { top_comments } = data;
  
  return (
    <div>
      <SectionHeader
        title="TOP COMMENTS"
        subtitle="最も共感を集めたコメント TOP 20（コメントいいね数順）"
        badge="TOP 20"
      />
      
      <div className="mb-4 p-4 rounded-lg" style={{ background: 'oklch(0.18 0.014 264)', border: '1px solid oklch(1 0 0 / 8%)' }}>
        <div className="text-xs font-jp" style={{ color: 'oklch(0.55 0.012 264)' }}>
          💡 <strong style={{ color: 'oklch(0.75 0.008 264)' }}>コメントいいね分析：</strong>
          最もいいねを集めたコメントは、そのファンダムの「共通認識」や「代弁者」的な意見を反映します。
          高いいいね数のコメントはファンの感情・評価の核心を示す重要な指標です。
        </div>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {top_comments.map((comment, i) => (
          <div
            key={i}
            className="dash-card p-4 transition-all duration-200 hover:border-white/20"
            style={{
              borderLeft: `3px solid ${getSentimentColor(comment.sentimentLabel)}`,
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="font-display text-sm" style={{ color: '#38bdf8' }}>
                  {comment.en_name}
                </span>
                <span className="text-xs px-1.5 py-0.5 rounded" style={{
                  background: `${getSentimentColor(comment.sentimentLabel)}20`,
                  color: getSentimentColor(comment.sentimentLabel),
                  border: `1px solid ${getSentimentColor(comment.sentimentLabel)}40`,
                }}>
                  {sentimentLabels[comment.sentimentLabel] || comment.sentimentLabel}
                </span>
                <span className="text-sm">{langFlags[comment.language] || '🌍'}</span>
              </div>
              <div className="flex items-center gap-1 flex-shrink-0">
                <span style={{ color: '#38bdf8' }}>♥</span>
                <span className="font-mono-data text-sm font-medium" style={{ color: '#38bdf8' }}>
                  {formatNumber(comment.commentLikeCount)}
                </span>
              </div>
            </div>
            
            <p className="text-sm font-jp leading-relaxed" style={{ color: 'oklch(0.75 0.008 264)' }}>
              {comment.short_text}
              {comment.short_text.length >= 100 && (
                <span style={{ color: 'oklch(0.45 0.012 264)' }}>...</span>
              )}
            </p>
            
            <div className="flex items-center gap-2 mt-3">
              <span className="text-xs font-jp" style={{ color: 'oklch(0.40 0.012 264)' }}>
                {getLangLabel(comment.language)}
              </span>
              <span style={{ color: 'oklch(0.30 0.012 264)' }}>·</span>
              <span className="text-xs font-mono-data" style={{ color: 'oklch(0.40 0.012 264)' }}>
                #{i + 1} いいね数ランキング
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
