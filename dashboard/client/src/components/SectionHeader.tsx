/*
 * Section Header Component
 * Design: STAT PICK Brand — Pastel gradient accent bar + white title
 */

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
}

export default function SectionHeader({ title, subtitle, badge }: SectionHeaderProps) {
  return (
    <div className="mb-6">
      <div className="flex items-center gap-3 mb-1">
        {/* Pastel gradient accent bar */}
        <div
          className="w-1 h-8 rounded-full flex-shrink-0"
          style={{ background: 'linear-gradient(180deg, #a8edea 0%, #c4b5fd 50%, #f9a8d4 100%)' }}
        />
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-3xl leading-none" style={{ color: '#ffffff' }}>
              {title}
            </h2>
            {badge && (
              <span
                className="text-xs font-mono-data px-2 py-0.5 rounded"
                style={{
                  background: 'rgba(196,181,253,0.12)',
                  color: '#c4b5fd',
                  border: '1px solid rgba(196,181,253,0.25)',
                }}
              >
                {badge}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-sm font-jp mt-1" style={{ color: 'rgba(240,244,255,0.40)' }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
