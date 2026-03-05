/**
 * useDashboardData.ts — ダッシュボードデータ取得フック v2.0
 * GAS Code_export.gs の新スキーマ（meta/trainees/dailyTrend/playlistSummary/playlistDailyTrend）に対応
 */
import { useState, useEffect, useCallback } from 'react';
import type { DashboardData } from '@/lib/types';

const STORAGE_KEY      = 'stat_pick_dashboard_data_v2';
const STORAGE_META_KEY = 'stat_pick_dashboard_meta_v2';
const STORAGE_GAS_URL  = 'stat_pick_gas_url_v2';

const DEFAULT_GAS_URL = import.meta.env.VITE_GAS_URL
  || 'https://script.google.com/macros/s/AKfycbzKNUIKBEa9QkIVB5xMeSvtpWdvDVUg1SwhIG8Fr0C-fEJemSGdcdtZIEYESYb2-B5CIg/exec';

export interface DataMeta {
  fileName: string;
  loadedAt: string;
  source: 'default' | 'uploaded' | 'gas';
  gasUrl?: string;
}

/**
 * GAS新スキーマのバリデーション
 * 必須フィールド: meta, trainees, dailyTrend, playlistSummary, playlistDailyTrend
 */
function validate(parsed: unknown): DashboardData {
  const required: string[] = ['meta', 'trainees', 'dailyTrend', 'playlistSummary', 'playlistDailyTrend'];
  const obj = parsed as Record<string, unknown>;
  const missing = required.filter(k => !(k in obj));
  if (missing.length > 0) {
    throw new Error(`必須フィールドが不足しています: ${missing.join(', ')}`);
  }
  // metaの必須フィールドチェック
  const meta = obj['meta'] as Record<string, unknown>;
  const metaRequired = ['generatedAt', 'totalVideos', 'totalComments', 'totalViews', 'totalLikes'];
  const metaMissing = metaRequired.filter(k => !(k in meta));
  if (metaMissing.length > 0) {
    throw new Error(`meta フィールドが不足しています: ${metaMissing.join(', ')}`);
  }
  return parsed as DashboardData;
}

export function useDashboardData() {
  const [data, setData]       = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [meta, setMeta]       = useState<DataMeta | null>(null);

  // 初回ロード: LocalStorage優先 → GASエンドポイント → フォールバック
  useEffect(() => {
    const stored     = localStorage.getItem(STORAGE_KEY);
    const storedMeta = localStorage.getItem(STORAGE_META_KEY);

    if (stored) {
      try {
        const parsed = validate(JSON.parse(stored));
        setData(parsed);
        if (storedMeta) setMeta(JSON.parse(storedMeta) as DataMeta);
        setLoading(false);
        return;
      } catch {
        // 旧データが残っている場合はクリア
        localStorage.removeItem(STORAGE_KEY);
        localStorage.removeItem(STORAGE_META_KEY);
      }
    }

    // GASエンドポイントから取得
    const gasUrl = localStorage.getItem(STORAGE_GAS_URL) || DEFAULT_GAS_URL;
    fetch(gasUrl, { redirect: 'follow', headers: { 'Accept': 'application/json' } })
      .then(res => {
        if (!res.ok) throw new Error(`GASからの取得失敗: HTTP ${res.status}`);
        return res.json();
      })
      .then(json => {
        const parsed = validate(json);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
        const newMeta: DataMeta = {
          fileName: 'GAS取得データ',
          loadedAt: new Date().toISOString(),
          source: 'gas',
          gasUrl,
        };
        localStorage.setItem(STORAGE_META_KEY, JSON.stringify(newMeta));
        setData(parsed);
        setMeta(newMeta);
        setLoading(false);
      })
      .catch(err => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  /** JSONファイルをアップロードしてデータを更新する */
  const updateData = useCallback((file: File): Promise<void> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const text   = e.target?.result as string;
          const parsed = validate(JSON.parse(text));
          localStorage.setItem(STORAGE_KEY, text);
          const newMeta: DataMeta = {
            fileName: file.name,
            loadedAt: new Date().toISOString(),
            source: 'uploaded',
          };
          localStorage.setItem(STORAGE_META_KEY, JSON.stringify(newMeta));
          setData(parsed);
          setMeta(newMeta);
          setError(null);
          resolve();
        } catch (err) {
          reject(err instanceof Error ? err : new Error('JSONの解析に失敗しました'));
        }
      };
      reader.onerror = () => reject(new Error('ファイルの読み込みに失敗しました'));
      reader.readAsText(file, 'utf-8');
    });
  }, []);

  /**
   * GAS WebアプリURLからJSONを取得してダッシュボードを更新する
   *
   * GAS側の要件:
   *   - スクリプトを「ウェブアプリ」としてデプロイ
   *   - 実行ユーザー: 自分 / アクセス権: 全員（匿名を含む）
   *   - doGet() で ContentService.createTextOutput(JSON.stringify(data))
   *              .setMimeType(ContentService.MimeType.JSON) を返す
   */
  const fetchFromGas = useCallback(async (url: string): Promise<void> => {
    const fetchUrl = url.trim();
    if (!fetchUrl.startsWith('https://script.google.com/')) {
      throw new Error('GAS WebアプリのURLを入力してください（https://script.google.com/... で始まるURL）');
    }

    const res = await fetch(fetchUrl, {
      redirect: 'follow',
      headers: { 'Accept': 'application/json' },
    });
    if (!res.ok) throw new Error(`取得失敗: HTTP ${res.status}`);

    const json = await res.json();
    if (json.error) throw new Error(`GASエラー: ${json.message}`);

    const parsed = validate(json);
    const text = JSON.stringify(json);
    localStorage.setItem(STORAGE_KEY, text);
    localStorage.setItem(STORAGE_GAS_URL, fetchUrl);
    const newMeta: DataMeta = {
      fileName: 'GAS取得データ',
      loadedAt: new Date().toISOString(),
      source: 'gas',
      gasUrl: fetchUrl,
    };
    localStorage.setItem(STORAGE_META_KEY, JSON.stringify(newMeta));
    setData(parsed);
    setMeta(newMeta);
    setError(null);
  }, []);

  /** 保存済みGAS URLを返す（LocalStorage優先、なければデフォルト） */
  const getSavedGasUrl = useCallback((): string => {
    return localStorage.getItem(STORAGE_GAS_URL) ?? DEFAULT_GAS_URL;
  }, []);

  /** LocalStorageをクリアしてGASから再取得する */
  const resetData = useCallback((): Promise<void> => {
    return new Promise((resolve, reject) => {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_META_KEY);
      setLoading(true);

      const gasUrl = localStorage.getItem(STORAGE_GAS_URL) || DEFAULT_GAS_URL;
      fetch(gasUrl, { redirect: 'follow', headers: { 'Accept': 'application/json' } })
        .then(res => {
          if (!res.ok) throw new Error(`GASからの取得失敗: HTTP ${res.status}`);
          return res.json();
        })
        .then(json => {
          const parsed = validate(json);
          localStorage.setItem(STORAGE_KEY, JSON.stringify(json));
          const newMeta: DataMeta = {
            fileName: 'GAS取得データ',
            loadedAt: new Date().toISOString(),
            source: 'gas',
            gasUrl,
          };
          localStorage.setItem(STORAGE_META_KEY, JSON.stringify(newMeta));
          setData(parsed);
          setMeta(newMeta);
          setLoading(false);
          resolve();
        })
        .catch(err => {
          setError(err.message);
          setLoading(false);
          reject(err);
        });
    });
  }, []);

  return { data, loading, error, meta, updateData, fetchFromGas, getSavedGasUrl, resetData };
}
