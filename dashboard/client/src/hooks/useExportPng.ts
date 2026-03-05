/*
 * PNG Export Hook
 * Uses html2canvas to capture DOM elements as PNG images
 * Design: Minimal export button with download functionality
 */

import { useCallback, useRef } from 'react';
import html2canvas from 'html2canvas';

export function useExportPng(filename: string = 'stat-pick-export') {
  const targetRef = useRef<HTMLDivElement>(null);

  const exportPng = useCallback(async () => {
    if (!targetRef.current) return;

    try {
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: '#0f0f1a', // Match dark background
        scale: 2, // High resolution
        useCORS: true,
        logging: false,
        windowWidth: targetRef.current.scrollWidth,
        windowHeight: targetRef.current.scrollHeight,
      });

      const link = document.createElement('a');
      link.download = `${filename}_${new Date().toISOString().slice(0, 10)}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch (err) {
      console.error('PNG export failed:', err);
    }
  }, [filename]);

  return { targetRef, exportPng };
}
