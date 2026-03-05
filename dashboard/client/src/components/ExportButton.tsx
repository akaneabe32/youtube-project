/*
 * Export PNG Button Component
 * Design: Subtle icon button, dark theme, amber accent on hover
 */

interface ExportButtonProps {
  onClick: () => void;
  label?: string;
}

export default function ExportButton({ onClick, label = 'PNG保存' }: ExportButtonProps) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono-data transition-all hover:scale-105 active:scale-95"
      style={{
        background: 'oklch(0.20 0.013 264)',
        color: 'oklch(0.55 0.012 264)',
        border: '1px solid oklch(1 0 0 / 10%)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.color = 'oklch(0.78 0.17 75)';
        e.currentTarget.style.borderColor = 'oklch(0.78 0.17 75 / 30%)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.color = 'oklch(0.55 0.012 264)';
        e.currentTarget.style.borderColor = 'oklch(1 0 0 / 10%)';
      }}
      title={label}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
        <polyline points="7 10 12 15 17 10" />
        <line x1="12" y1="15" x2="12" y2="3" />
      </svg>
      {label}
    </button>
  );
}
