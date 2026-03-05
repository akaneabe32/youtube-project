/*
 * DataUpdateModal — データ更新UI（2タブ: GAS URL取得 / JSONファイルアップロード）
 * Design: Dark Navy + 3-color system (white/cyan/blue)
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import type { DataMeta } from '@/hooks/useDashboardData';

interface DataUpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpdate: (file: File) => Promise<void>;
  onFetchFromGas: (url: string) => Promise<void>;
  onReset: () => Promise<void>;
  getSavedGasUrl: () => string;
  meta: DataMeta | null;
}

type Tab = 'gas' | 'file';

export default function DataUpdateModal({
  isOpen,
  onClose,
  onUpdate,
  onFetchFromGas,
  onReset,
  getSavedGasUrl,
  meta,
}: DataUpdateModalProps) {
  const [tab, setTab]           = useState<Tab>('gas');
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading]   = useState(false);
  const [gasUrl, setGasUrl]         = useState('');
  const [result, setResult]         = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Restore saved GAS URL when modal opens
  useEffect(() => {
    if (isOpen) {
      const saved = getSavedGasUrl();
      if (saved) setGasUrl(saved);
      setResult(null);
    }
  }, [isOpen, getSavedGasUrl]);

  // ── GAS fetch ──────────────────────────────────────────────────────────────
  const handleGasFetch = useCallback(async () => {
    if (!gasUrl.trim()) {
      setResult({ type: 'error', message: 'GAS WebアプリのURLを入力してください' });
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      await onFetchFromGas(gasUrl.trim());
      setResult({ type: 'success', message: 'GASからデータを取得しました。ダッシュボードを更新しました。' });
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : '取得に失敗しました' });
    } finally {
      setIsLoading(false);
    }
  }, [gasUrl, onFetchFromGas]);

  // ── File upload ────────────────────────────────────────────────────────────
  const handleFile = useCallback(async (file: File) => {
    if (!file.name.endsWith('.json')) {
      setResult({ type: 'error', message: 'JSONファイル（.json）を選択してください' });
      return;
    }
    setIsLoading(true);
    setResult(null);
    try {
      await onUpdate(file);
      setResult({ type: 'success', message: `「${file.name}」を読み込みました。ダッシュボードを更新しました。` });
    } catch (err) {
      setResult({ type: 'error', message: err instanceof Error ? err.message : '読み込みに失敗しました' });
    } finally {
      setIsLoading(false);
    }
  }, [onUpdate]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  // ── Reset ──────────────────────────────────────────────────────────────────
  const handleReset = async () => {
    setIsLoading(true);
    setResult(null);
    try {
      await onReset();
      setResult({ type: 'success', message: 'デフォルトデータにリセットしました。' });
    } catch {
      setResult({ type: 'error', message: 'リセットに失敗しました' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => { setResult(null); onClose(); };

  if (!isOpen) return null;

  const formatDate = (iso: string) => new Date(iso).toLocaleString('ja-JP', {
    year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
  });

  const sourceLabel: Record<string, string> = {
    default: '◈ DEFAULT',
    uploaded: '▲ UPLOADED',
    gas: '⟳ GAS',
  };

  // ── Styles ─────────────────────────────────────────────────────────────────
  const modalBg    = 'rgba(8,12,30,0.98)';
  const borderMuted = 'rgba(255,255,255,0.10)';
  const textMuted  = 'rgba(255,255,255,0.35)';
  const cyan       = '#38bdf8';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)' }}
      onClick={handleClose}
    >
      <div
        className="relative w-full max-w-lg mx-4 rounded-xl overflow-hidden"
        style={{ background: modalBg, border: `1px solid ${borderMuted}`, boxShadow: '0 20px 60px rgba(0,0,0,0.6)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4" style={{ borderBottom: `1px solid ${borderMuted}` }}>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-display text-lg tracking-widest text-white">DATA UPDATE</h2>
              <p className="text-xs font-jp mt-0.5" style={{ color: textMuted }}>ダッシュボードデータの更新</p>
            </div>
            <button
              onClick={handleClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-white/10"
              style={{ color: textMuted }}
            >✕</button>
          </div>
        </div>

        {/* Current data info */}
        {meta && (
          <div className="mx-6 mt-4 px-4 py-3 rounded-lg" style={{ background: 'rgba(255,255,255,0.04)', border: `1px solid ${borderMuted}` }}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-display tracking-widest" style={{ color: meta.source === 'gas' ? cyan : 'rgba(255,255,255,0.70)' }}>
                {sourceLabel[meta.source] ?? '◈ DATA'}
              </span>
            </div>
            <div className="text-xs font-mono-data text-white/70">{meta.gasUrl ?? meta.fileName}</div>
            <div className="text-xs mt-0.5 font-jp" style={{ color: textMuted }}>
              読み込み日時: {formatDate(meta.loadedAt)}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="flex mx-6 mt-5 gap-0" style={{ borderBottom: `1px solid ${borderMuted}` }}>
          {(['gas', 'file'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => { setTab(t); setResult(null); }}
              className="px-4 py-2 text-xs font-display tracking-widest transition-colors"
              style={{
                color: tab === t ? '#ffffff' : textMuted,
                borderBottom: tab === t ? `2px solid ${cyan}` : '2px solid transparent',
                marginBottom: '-1px',
              }}
            >
              {t === 'gas' ? '⟳ GAS URL' : '▲ ファイル'}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className="px-6 pt-4 pb-2">

          {/* ── GAS URL tab ── */}
          {tab === 'gas' && (
            <div className="space-y-3">
              <p className="text-xs font-jp leading-relaxed" style={{ color: textMuted }}>
                GAS WebアプリのURLを入力してください。GASは「全員（匿名を含む）」アクセス可能なWebアプリとしてデプロイし、<code className="text-white/60 bg-white/10 px-1 rounded">doGet()</code> でJSONを返す必要があります。
              </p>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={gasUrl}
                  onChange={e => setGasUrl(e.target.value)}
                  placeholder="https://script.google.com/macros/s/..."
                  className="flex-1 px-3 py-2 rounded-lg text-xs font-mono-data text-white placeholder:text-white/25 outline-none transition-colors"
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: `1px solid ${borderMuted}`,
                  }}
                  onFocus={e => (e.target.style.borderColor = cyan)}
                  onBlur={e => (e.target.style.borderColor = borderMuted)}
                  disabled={isLoading}
                  onKeyDown={e => e.key === 'Enter' && handleGasFetch()}
                />
                <button
                  onClick={handleGasFetch}
                  disabled={isLoading || !gasUrl.trim()}
                  className="px-4 py-2 rounded-lg text-xs font-display tracking-wider transition-all disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110"
                  style={{ background: cyan, color: '#0a0e1f' }}
                >
                  {isLoading ? '取得中...' : '取得'}
                </button>
              </div>
              <div className="text-[11px] font-jp" style={{ color: 'rgba(255,255,255,0.25)' }}>
                ※ URLは次回以降も記憶されます。GAS側でCORSを許可する設定が必要です。
              </div>

              {/* GAS setup guide */}
              <details className="mt-2">
                <summary className="text-xs font-jp cursor-pointer" style={{ color: textMuted }}>
                  GAS設定ガイドを見る
                </summary>
                <div className="mt-2 p-3 rounded-lg text-[11px] font-jp leading-relaxed space-y-1.5" style={{ background: 'rgba(255,255,255,0.03)', color: 'rgba(255,255,255,0.45)' }}>
                  <p>1. Google Apps Scriptを開き、以下のコードを追加：</p>
                  <pre className="bg-white/5 rounded p-2 text-[10px] font-mono-data overflow-x-auto whitespace-pre-wrap" style={{ color: '#38bdf8' }}>{`function doGet() {
  const data = buildDashboardData(); // 既存の集計関数
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}`}</pre>
                  <p>2. 「デプロイ」→「新しいデプロイ」→「ウェブアプリ」</p>
                  <p>3. 実行ユーザー: <strong className="text-white/70">自分</strong> / アクセス権: <strong className="text-white/70">全員（匿名を含む）</strong></p>
                  <p>4. デプロイ後のURLをコピーして上の欄に貼り付け</p>
                </div>
              </details>
            </div>
          )}

          {/* ── File upload tab ── */}
          {tab === 'file' && (
            <div
              onDrop={handleDrop}
              onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onClick={() => fileInputRef.current?.click()}
              className="relative rounded-xl cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-3 py-10"
              style={{
                border: `2px dashed ${isDragging ? '#ffffff' : borderMuted}`,
                background: isDragging ? 'rgba(56,189,248,0.05)' : 'rgba(255,255,255,0.02)',
                transform: isDragging ? 'scale(1.01)' : 'scale(1)',
              }}
            >
              {isLoading ? (
                <>
                  <div className="w-10 h-10 rounded-full border-2 animate-spin" style={{ borderColor: cyan, borderTopColor: 'transparent' }} />
                  <p className="text-sm font-jp" style={{ color: textMuted }}>読み込み中...</p>
                </>
              ) : (
                <>
                  <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                    <circle cx="20" cy="20" r="19" fill="rgba(255,255,255,0.03)" stroke="rgba(255,255,255,0.15)" strokeWidth="1"/>
                    <path d="M20 26V14M20 14L15 19M20 14L25 19" stroke={cyan} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M13 28h14" stroke="rgba(255,255,255,0.5)" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-display tracking-wider text-white/80">クリックまたはドラッグ&ドロップ</p>
                    <p className="text-xs font-jp mt-1" style={{ color: textMuted }}>dashboard_data.json ファイルを選択</p>
                  </div>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".json,application/json" className="hidden" onChange={handleFileInput} />
            </div>
          )}
        </div>

        {/* Result message */}
        {result && (
          <div className="mx-6 mt-3 px-4 py-3 rounded-lg" style={{
            background: result.type === 'success' ? 'rgba(56,189,248,0.08)' : 'rgba(239,68,68,0.10)',
            border: `1px solid ${result.type === 'success' ? 'rgba(56,189,248,0.30)' : 'rgba(239,68,68,0.30)'}`,
          }}>
            <p className="text-xs font-jp" style={{ color: result.type === 'success' ? cyan : '#ef4444' }}>
              {result.type === 'success' ? '✓ ' : '✕ '}{result.message}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="px-6 py-4 mt-2 flex items-center justify-between" style={{ borderTop: `1px solid ${borderMuted}` }}>
          <button
            onClick={handleReset}
            disabled={isLoading || meta?.source === 'default'}
            className="text-xs font-jp px-3 py-1.5 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10"
            style={{ color: textMuted }}
          >
            デフォルトに戻す
          </button>
          <div className="text-xs font-jp" style={{ color: 'rgba(255,255,255,0.20)' }}>
            ※ データはブラウザに保存されます
          </div>
        </div>
      </div>
    </div>
  );
}
