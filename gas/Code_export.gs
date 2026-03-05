/**
 * Code_export.gs
 * スプレッドシートのデータを集計し、dashboard_data.json を生成してダッシュボードに返す。
 *
 * 機能:
 *   - doGet(): ダッシュボードからのHTTPリクエストに応答してJSONを返す（Webアプリ）
 *   - buildAndCacheJson(): スプシを集計してPropertiesServiceにキャッシュ保存（毎日トリガー）
 *
 * データフロー:
 *   スプレッドシート（動画マスタ + daily_log）
 *     → buildAndCacheJson() で集計
 *     → PropertiesService に JSON 保存
 *     → doGet() でダッシュボードに返す
 *
 * トリガー設定:
 *   - buildAndCacheJson: 毎日 午前3〜4時（collectDailyData の後）
 *
 * スクリプトプロパティ:
 *   - SPREADSHEET_ID: スプレッドシートA のID
 *   - ALERT_EMAIL: エラー通知先メールアドレス（任意）
 *
 * 出力 JSON スキーマ:
 *   {
 *     meta: { generatedAt, dataRange, totalVideos, totalComments, totalViews, totalLikes },
 *     trainees: [{ videoId, videoTitle, trainee_name, stage_type, playlist_id,
 *                  viewCount, likeCount, commentCount, publishedAt,
 *                  likeRate, commentRate, engagementRate }],
 *     dailyTrend: [{ date, totalViews, totalLikes, totalComments }],
 *     playlistSummary: [{ playlist_id, label, videoCount, totalViews, totalLikes, totalComments,
 *                         avgLikeRate, avgCommentRate, avgEngagementRate }],
 *     playlistDailyTrend: {
 *       [playlist_id]: [{ date, totalViews, totalLikes, totalComments }]
 *     }
 *   }
 *
 * プレイリストメタ情報:
 *   PLAYLIST_META 定数でプレイリストID→表示名のマッピングを管理する
 */

// ============================================================
// 定数
// ============================================================

/** PropertiesService に保存するキー名 */
const CACHE_KEY = 'dashboard_data_json';

/** 最大保存サイズ（PropertiesService の上限は 9KB/プロパティ） */
const MAX_PROP_SIZE = 8500;

/**
 * プレイリストID → 表示名・優先度のマッピング
 * 新しいプレイリストが追加された場合はここに追加すること
 */
const PLAYLIST_META = {
  'PL3fCPdnAFT0YNA-DdjkWikiwcsct0vow0': {
    label:    '推しカメラ｜新世界',
    priority: 1,
    color:    '#FF6B9D',  // ダッシュボード表示用カラー
  },
  'PL3fCPdnAFT0aogIr7kkuJS1mZnEZvpebm': {
    label:    'Theme Song THE FINAL CLOSE-UP',
    priority: 2,
    color:    '#4FC3F7',
  },
  'PL3fCPdnAFT0aLb85MxO107J-_vagdf3H_': {
    label:    'SHINSEKAI SELFIE CHALLENGE',
    priority: 3,
    color:    '#81C784',
  },
  'PL3fCPdnAFT0bkU6FmQplcjNJXKw7M5ROC': {
    label:    'SHINSEKAI 1MIN PR',
    priority: 4,
    color:    '#FFB74D',
  },
};

// ============================================================
// Webアプリ エントリーポイント
// ============================================================

/**
 * GAS Webアプリとして公開されたエンドポイント。
 * ダッシュボードからの GET リクエストに JSON を返す。
 *
 * デプロイ設定:
 *   - 次のユーザーとして実行: 自分（オーナー）
 *   - アクセスできるユーザー: 全員（匿名を含む）
 *
 * @param {Object} e - リクエストオブジェクト
 * @returns {TextOutput} JSON レスポンス（CORS対応）
 */
function doGet(e) {
  try {
    // キャッシュから取得
    const props = PropertiesService.getScriptProperties();
    let jsonStr = props.getProperty(CACHE_KEY);

    // キャッシュが空の場合はリアルタイム生成
    if (!jsonStr) {
      Logger.log('キャッシュなし: リアルタイム生成します');
      const data = _buildDashboardData();
      jsonStr = JSON.stringify(data);
    }

    // CORS ヘッダー付きで返す
    return ContentService
      .createTextOutput(jsonStr)
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    Logger.log(`doGet エラー: ${err.message}`);
    _sendExportAlert('doGet エラー', err.message + '\n' + err.stack);

    const errorJson = JSON.stringify({
      error: true,
      message: err.message,
      generatedAt: new Date().toISOString()
    });
    return ContentService
      .createTextOutput(errorJson)
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================
// メイン集計関数（トリガー設定対象）
// ============================================================

/**
 * スプレッドシートを集計して dashboard_data.json を生成・キャッシュ保存する。
 * トリガー: 毎日 午前3〜4時（collectDailyData の後）
 */
function buildAndCacheJson() {
  try {
    Logger.log('buildAndCacheJson: 開始');
    const data = _buildDashboardData();
    const jsonStr = JSON.stringify(data);

    Logger.log(`生成完了: ${jsonStr.length} bytes`);

    // PropertiesService に保存（9KB制限あり）
    const props = PropertiesService.getScriptProperties();

    if (jsonStr.length > MAX_PROP_SIZE * 20) {
      // 17万文字超の場合は圧縮版を保存（PropertiesService合計500KB制限）
      Logger.log('警告: JSONが大きすぎます。サマリーのみ保存します。');
      const summary = _buildSummaryOnly(data);
      props.setProperty(CACHE_KEY, JSON.stringify(summary));
    } else if (jsonStr.length > MAX_PROP_SIZE) {
      // 複数プロパティに分割保存
      _saveChunked(props, jsonStr);
    } else {
      props.setProperty(CACHE_KEY, jsonStr);
    }

    Logger.log('buildAndCacheJson: 完了');

  } catch (err) {
    Logger.log(`buildAndCacheJson エラー: ${err.message}`);
    _sendExportAlert('buildAndCacheJson エラー', err.message + '\n' + err.stack);
    throw err;
  }
}

// ============================================================
// データ集計ロジック
// ============================================================

/**
 * スプレッドシートから全データを読み込み、ダッシュボード用JSONを構築する。
 *
 * @returns {Object} ダッシュボード用データオブジェクト
 */
function _buildDashboardData() {
  const props = PropertiesService.getScriptProperties();
  const ssId  = props.getProperty('SPREADSHEET_ID');
  if (!ssId) throw new Error('スクリプトプロパティ SPREADSHEET_ID が未設定です');

  const ss = SpreadsheetApp.openById(ssId);

  // --- 動画マスタ読み込み ---
  const masterSheet = ss.getSheetByName('動画マスタ');
  if (!masterSheet) throw new Error('シート「動画マスタ」が見つかりません');

  const masterData = masterSheet.getDataRange().getValues();
  const masterHeader = masterData[0];
  const masterRows   = masterData.slice(1).filter(r => r[0]); // videoId が空の行を除外

  // --- daily_log 読み込み ---
  const dailySheet = ss.getSheetByName('daily_log');
  const dailyData  = dailySheet ? dailySheet.getDataRange().getValues() : [];
  const dailyHeader = dailyData.length > 0 ? dailyData[0] : [];
  const dailyRows   = dailyData.slice(1).filter(r => r[0]); // date が空の行を除外

  // --- 動画マスタ → trainees 配列を構築 ---
  const trainees = masterRows.map(row => {
    const views    = Number(row[5]) || 0;
    const likes    = Number(row[6]) || 0;
    const comments = Number(row[7]) || 0;

    return {
      videoId:      String(row[0] || ''),
      videoTitle:   String(row[1] || ''),
      trainee_name: String(row[2] || ''),
      stage_type:   String(row[3] || ''),
      publishedAt:  row[4] ? String(row[4]).substring(0, 10) : '',
      viewCount:    views,
      likeCount:    likes,
      commentCount: comments,
      updatedAt:    row[8] ? String(row[8]).substring(0, 10) : '',
      playlist_id:  String(row[9] || ''),
      // 計算指標
      likeRate:         views > 0 ? Math.round((likes    / views) * 10000) / 10000 : 0,
      commentRate:      views > 0 ? Math.round((comments / views) * 10000) / 10000 : 0,
      engagementRate:   views > 0 ? Math.round(((likes + comments) / views) * 10000) / 10000 : 0,
    };
  });

  // --- daily_log → 日次トレンド集計 ---
  const dailyMap = {}; // date → { totalViews, totalLikes, totalComments }
  const dateColIdx    = dailyHeader.indexOf('date');
  const viewColIdx    = dailyHeader.indexOf('viewCount');
  const likeColIdx    = dailyHeader.indexOf('likeCount');
  const commentColIdx = dailyHeader.indexOf('commentCount');

  if (dateColIdx >= 0) {
    dailyRows.forEach(row => {
      const dateStr = row[dateColIdx] ? String(row[dateColIdx]).substring(0, 10) : '';
      if (!dateStr) return;
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, totalViews: 0, totalLikes: 0, totalComments: 0 };
      }
      dailyMap[dateStr].totalViews    += Number(row[viewColIdx])    || 0;
      dailyMap[dateStr].totalLikes    += Number(row[likeColIdx])    || 0;
      dailyMap[dateStr].totalComments += Number(row[commentColIdx]) || 0;
    });
  }

  const dailyTrend = Object.values(dailyMap)
    .sort((a, b) => a.date.localeCompare(b.date));

  // --- プレイリスト別サマリー ---
  const playlistMap = {};
  trainees.forEach(t => {
    const pid = t.playlist_id || 'unknown';
    if (!playlistMap[pid]) {
      const meta = PLAYLIST_META[pid] || { label: pid, priority: 99, color: '#888888' };
      playlistMap[pid] = {
        playlist_id: pid,
        label:       meta.label,
        priority:    meta.priority,
        color:       meta.color,
        videoCount:  0,
        totalViews:  0,
        totalLikes:  0,
        totalComments: 0,
        // 平均エンゲージメント率計算用
        _sumLikeRate:       0,
        _sumCommentRate:    0,
        _sumEngagementRate: 0,
      };
    }
    playlistMap[pid].videoCount++;
    playlistMap[pid].totalViews    += t.viewCount;
    playlistMap[pid].totalLikes    += t.likeCount;
    playlistMap[pid].totalComments += t.commentCount;
    playlistMap[pid]._sumLikeRate       += t.likeRate;
    playlistMap[pid]._sumCommentRate    += t.commentRate;
    playlistMap[pid]._sumEngagementRate += t.engagementRate;
  });

  const playlistSummary = Object.values(playlistMap)
    .sort((a, b) => a.priority - b.priority)
    .map(p => ({
      playlist_id:        p.playlist_id,
      label:              p.label,
      priority:           p.priority,
      color:              p.color,
      videoCount:         p.videoCount,
      totalViews:         p.totalViews,
      totalLikes:         p.totalLikes,
      totalComments:      p.totalComments,
      avgLikeRate:        p.videoCount > 0 ? Math.round((p._sumLikeRate       / p.videoCount) * 10000) / 10000 : 0,
      avgCommentRate:     p.videoCount > 0 ? Math.round((p._sumCommentRate    / p.videoCount) * 10000) / 10000 : 0,
      avgEngagementRate:  p.videoCount > 0 ? Math.round((p._sumEngagementRate / p.videoCount) * 10000) / 10000 : 0,
    }));

  // --- プレイリスト別日次トレンド ---
  // daily_logの playlist_id 列を使ってプレイリスト別に集計
  const playlistIdColIdx = dailyHeader.indexOf('playlist_id');
  const playlistDailyMap = {}; // playlist_id → { date → { totalViews, ... } }

  if (dateColIdx >= 0 && playlistIdColIdx >= 0) {
    dailyRows.forEach(row => {
      const dateStr = row[dateColIdx] ? String(row[dateColIdx]).substring(0, 10) : '';
      const pid     = row[playlistIdColIdx] ? String(row[playlistIdColIdx]) : 'unknown';
      if (!dateStr || !pid) return;

      if (!playlistDailyMap[pid]) playlistDailyMap[pid] = {};
      if (!playlistDailyMap[pid][dateStr]) {
        playlistDailyMap[pid][dateStr] = { date: dateStr, totalViews: 0, totalLikes: 0, totalComments: 0 };
      }
      playlistDailyMap[pid][dateStr].totalViews    += Number(row[viewColIdx])    || 0;
      playlistDailyMap[pid][dateStr].totalLikes    += Number(row[likeColIdx])    || 0;
      playlistDailyMap[pid][dateStr].totalComments += Number(row[commentColIdx]) || 0;
    });
  }

  // 各プレイリストの日次トレンドを日付順にソート
  const playlistDailyTrend = {};
  for (const [pid, dateMap] of Object.entries(playlistDailyMap)) {
    playlistDailyTrend[pid] = Object.values(dateMap)
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  // --- メタ情報 ---
  const totalViews    = trainees.reduce((s, t) => s + t.viewCount,    0);
  const totalLikes    = trainees.reduce((s, t) => s + t.likeCount,    0);
  const totalComments = trainees.reduce((s, t) => s + t.commentCount, 0);

  const dates = dailyTrend.map(d => d.date);
  const dataRange = dates.length > 0
    ? `${dates[0]} 〜 ${dates[dates.length - 1]}`
    : '（データなし）';

  return {
    meta: {
      generatedAt:   new Date().toISOString(),
      dataRange:     dataRange,
      totalVideos:   trainees.length,
      totalComments: totalComments,
      totalViews:    totalViews,
      totalLikes:    totalLikes,
    },
    trainees:            trainees,
    dailyTrend:          dailyTrend,
    playlistSummary:     playlistSummary,
    playlistDailyTrend:  playlistDailyTrend,
  };
}

/**
 * データが大きすぎる場合のサマリーのみ版を生成する。
 *
 * @param {Object} data - フルデータ
 * @returns {Object} サマリーのみのデータ
 */
function _buildSummaryOnly(data) {
  return {
    meta:            data.meta,
    trainees:        data.trainees.slice(0, 100), // 上位100件のみ
    dailyTrend:      data.dailyTrend.slice(-30),  // 直近30日のみ
    playlistSummary: data.playlistSummary,
    truncated:       true,
  };
}

/**
 * 大きなJSONを複数のPropertiesServiceキーに分割保存する。
 *
 * @param {PropertiesService.Properties} props
 * @param {string} jsonStr
 */
function _saveChunked(props, jsonStr) {
  const chunkSize = MAX_PROP_SIZE;
  const chunks    = Math.ceil(jsonStr.length / chunkSize);

  props.setProperty(`${CACHE_KEY}_chunks`, String(chunks));
  for (let i = 0; i < chunks; i++) {
    const chunk = jsonStr.substring(i * chunkSize, (i + 1) * chunkSize);
    props.setProperty(`${CACHE_KEY}_${i}`, chunk);
  }

  // 旧形式のキーを削除
  props.deleteProperty(CACHE_KEY);
  Logger.log(`分割保存: ${chunks} チャンク`);
}

/**
 * 分割保存されたJSONを結合して返す。
 *
 * @param {PropertiesService.Properties} props
 * @returns {string|null} 結合されたJSON文字列、またはnull
 */
function _loadChunked(props) {
  const chunksStr = props.getProperty(`${CACHE_KEY}_chunks`);
  if (!chunksStr) return null;

  const chunks = Number(chunksStr);
  let result   = '';
  for (let i = 0; i < chunks; i++) {
    const chunk = props.getProperty(`${CACHE_KEY}_${i}`);
    if (chunk === null) return null; // 欠損チャンクがある場合は失敗
    result += chunk;
  }
  return result;
}

// ============================================================
// アラート機能
// ============================================================

/**
 * Code_export.gs 専用のエラーアラートメールを送信する。
 *
 * @param {string} subject - メール件名
 * @param {string} body    - メール本文
 */
function _sendExportAlert(subject, body) {
  try {
    const props      = PropertiesService.getScriptProperties();
    const alertEmail = props.getProperty('ALERT_EMAIL') || Session.getActiveUser().getEmail();
    if (!alertEmail) return;

    MailApp.sendEmail({
      to:      alertEmail,
      subject: `[STAT PICK Export] ${subject}`,
      body:    `Code_export.gs でエラーが発生しました。\n\n${body}`
    });
  } catch (e) {
    Logger.log(`アラートメール送信失敗: ${e.message}`);
  }
}

// ============================================================
// デバッグ・テスト用関数
// ============================================================

/**
 * buildAndCacheJson を手動実行してログで確認するためのテスト関数。
 * GASエディタから手動実行する。
 */
function testBuildAndCache() {
  buildAndCacheJson();
  const props   = PropertiesService.getScriptProperties();
  const jsonStr = props.getProperty(CACHE_KEY) || _loadChunked(props);
  if (!jsonStr) {
    Logger.log('キャッシュが空です');
    return;
  }
  const data = JSON.parse(jsonStr);
  Logger.log(`=== テスト結果 ===`);
  Logger.log(`generatedAt: ${data.meta.generatedAt}`);
  Logger.log(`totalVideos: ${data.meta.totalVideos}`);
  Logger.log(`totalComments: ${data.meta.totalComments}`);
  Logger.log(`totalViews: ${data.meta.totalViews}`);
  Logger.log(`dataRange: ${data.meta.dataRange}`);
  Logger.log(`trainees[0]: ${JSON.stringify(data.trainees[0])}`);
  Logger.log(`dailyTrend.length: ${data.dailyTrend.length}`);
  Logger.log(`playlistSummary: ${JSON.stringify(data.playlistSummary)}`);
}

/**
 * doGet をシミュレートしてレスポンスを確認するためのテスト関数。
 * GASエディタから手動実行する。
 */
function testDoGet() {
  const result = doGet({});
  const content = result.getContent();
  Logger.log(`レスポンス長: ${content.length} bytes`);
  const data = JSON.parse(content);
  Logger.log(`error: ${data.error}`);
  Logger.log(`meta: ${JSON.stringify(data.meta)}`);
}
