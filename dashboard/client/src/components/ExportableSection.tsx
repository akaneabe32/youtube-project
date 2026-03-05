/*
 * Exportable Section Wrapper
 * Wraps any section with a ref for PNG export + export button
 */

import { ReactNode } from 'react';
import { useExportPng } from '@/hooks/useExportPng';
import ExportButton from '@/components/ExportButton';

interface ExportableSectionProps {
  children: ReactNode;
  filename: string;
  className?: string;
}

export default function ExportableSection({ children, filename, className = '' }: ExportableSectionProps) {
  const { targetRef, exportPng } = useExportPng(filename);

  return (
    <div className={`relative group ${className}`}>
      {/* Export button - appears on hover */}
      <div className="absolute top-0 right-0 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
        <ExportButton onClick={exportPng} />
      </div>
      <div ref={targetRef}>
        {children}
      </div>
    </div>
  );
}
