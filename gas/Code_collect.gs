/**
 * Code_collect.gs
 * YouTube Data API v3 からデータを収集し、Googleスプレッドシートに保存するスクリプト。
 *
 * 対象プレイリスト（SHINSEKAI関連）:
 *   - Theme Song THE FINAL CLOSE-UP 💙
 *   - 推しカメラ｜新世界 (SHINSEKAI)
 *   - SHINSEKAI SELFIE CHALLENGE 📷
 *   - SHINSEKAI 1MIN PR 🌏
 *
 * 日付処理の設計方針:
 *   - トリガーは毎日午前2〜3時に実行されるため、取得データは実質「前日の実績」。
 *   - daily_log の date 列は「前日付け」で記録する（例: 3月5日2時実行 → date = 2026-03-04）。
 *   - recorded_at 列に実際の取得日時を記録し、後から確認・修正できるようにする。
 *
 * スプレッドシート構造:
 *   - 動画マスタ: videoId, videoTitle, trainee_name, stage_type, publishedAt,
 *                 viewCount, likeCount, commentCount, updatedAt, playlist_id
 *   - 生コメント_YYYY-MM: videoId, commentId, authorName, text, likeCount,
 *                         publishedAt, updatedAt, playlist_id
 *   - daily_log: date, videoId, viewCount, likeCount, commentCount, playlist_id, recorded_at
 *
 * トリガー設定:
 *   - collectDailyData: 毎日 午前2〜3時
 *   - backfillPlaylistIds: 初回1回のみ手動実行（既存データへの playlist_id 後付け）
 */

// ============================================================
// 定数定義
// ============================================================

/**
 * 収集対象プレイリスト一覧（優先度順）
 */
const PLAYLISTS = [
  {
    id: 'PL3fCPdnAFT0WqEHbmRCWZVBVpfKVUqUHx',
    name: 'finalCloseUp',
    label: 'Theme Song THE FINAL CLOSE-UP',
    priority: 1
  },
  {
    id: 'PL3fCPdnAFT0YNA-DdjkWikiwcsct0vow0',
    name: 'oshiCamera',
    label: '推しカメラ｜新世界',
    priority: 2
  },
  {
    id: 'PL3fCPdnAFT0ZmfLCdHPPXGwMhEBJKNfwW',
    name: 'selfie',
    label: 'SHINSEKAI SELFIE CHALLENGE',
    priority: 3
  },
  {
    id: 'PL3fCPdnAFT0aCKwqGqJhBXHlLXDjOvQZh',
    name: 'oneminPr',
    label: 'SHINSEKAI 1MIN PR',
    priority: 4
  }
];

// 動画マスタシートのカラム定義（0始まりインデックス）
const MASTER_COLS = {
  videoId:       0,
  videoTitle:    1,
  trainee_name:  2,
  stage_type:    3,
  publishedAt:   4,
  viewCount:     5,
  likeCount:     6,
  commentCount:  7,
  updatedAt:     8,
  playlist_id:   9
};

// 生コメントシートのカラム定義（0始まりインデックス）
const COMMENT_COLS = {
  videoId:     0,
  commentId:   1,
  authorName:  2,
  text:        3,
  likeCount:   4,
  publishedAt: 5,
  updatedAt:   6,
  playlist_id: 7
};

// daily_logシートのカラム定義（0始まりインデックス）
const DAILY_COLS = {
  date:         0,  // 前日付け（実績日）
  videoId:      1,
  viewCount:    2,
  likeCount:    3,
  commentCount: 4,
  playlist_id:  5,
  recorded_at:  6   // 実際の取得日時（監査用）
};

// ============================================================
// メイン関数（トリガー設定対象）
// ============================================================

/**
 * 毎日実行するメイン収集関数。
 * 全プレイリストの動画データ・コメントを取得・更新する。
 * トリガー: 毎日 午前2〜3時
 *
 * 日付処理:
 *   - recordDate: 前日付け（daily_log の date 列に使用）
 *   - recordedAt: 実際の取得日時（daily_log の recorded_at 列に使用）
 */
function collectDailyData() {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('YT_API_KEY');
  const ssId   = props.getProperty('SPREADSHEET_ID');

  if (!apiKey || !ssId) {
    Logger.log('ERROR: YT_API_KEY または SPREADSHEET_ID が設定されていません。');
    return;
  }

  const ss          = SpreadsheetApp.openById(ssId);
  const masterSheet = ss.getSheetByName('動画マスタ');

  // 前日付けを計算（実質的な実績日）
  const now        = new Date();
  const yesterday  = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const recordDate = Utilities.formatDate(yesterday, 'Asia/Tokyo', 'yyyy-MM-dd');
  const recordedAt = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss JST');

  Logger.log(`実行日時: ${recordedAt}`);
  Logger.log(`記録日付（前日付け）: ${recordDate}`);

  // ヘッダー行の確認・追加
  _ensureMasterHeader(masterSheet);

  // 各プレイリストを処理
  for (const playlist of PLAYLISTS) {
    Logger.log(`処理開始: ${playlist.label} (${playlist.id})`);
    try {
      _processPlaylist(ss, masterSheet, apiKey, playlist, recordDate, recordedAt);
      Logger.log(`処理完了: ${playlist.label}`);
    } catch (e) {
      Logger.log(`ERROR [${playlist.label}]: ${e.message}`);
    }
    // API クォータ保護のため少し待機
    Utilities.sleep(500);
  }

  Logger.log(`collectDailyData 完了: recordDate=${recordDate}, recordedAt=${recordedAt}`);
}

/**
 * 既存の動画マスタデータに playlist_id を後付けするパッチ関数。
 * 初回1回のみ手動実行すること。
 * 実行後は再実行不要（playlist_id が既に設定されている行はスキップ）。
 */
function backfillPlaylistIds() {
  const props = PropertiesService.getScriptProperties();
  const apiKey = props.getProperty('YT_API_KEY');
  const ssId   = props.getProperty('SPREADSHEET_ID');

  if (!apiKey || !ssId) {
    Logger.log('ERROR: YT_API_KEY または SPREADSHEET_ID が設定されていません。');
    return;
  }

  const ss          = SpreadsheetApp.openById(ssId);
  const masterSheet = ss.getSheetByName('動画マスタ');

  // playlist_id 列が存在しない場合はヘッダーを追加
  _ensureMasterHeader(masterSheet);

  const data = masterSheet.getDataRange().getValues();
  if (data.length <= 1) {
    Logger.log('動画マスタにデータがありません。');
    return;
  }

  // videoId → playlist_id のマッピングを構築（全プレイリストを走査）
  const videoIdToPlaylistId = {};
  for (const playlist of PLAYLISTS) {
    Logger.log(`プレイリスト走査: ${playlist.label}`);
    const videoIds = _fetchAllVideoIdsFromPlaylist(apiKey, playlist.id);
    for (const vid of videoIds) {
      // 同一動画が複数プレイリストに存在する場合は優先度の高い方を採用
      if (!videoIdToPlaylistId[vid]) {
        videoIdToPlaylistId[vid] = playlist.id;
      }
    }
    Utilities.sleep(300);
  }

  // 既存データに playlist_id を書き込む
  let updatedCount = 0;
  for (let i = 1; i < data.length; i++) {
    const row       = data[i];
    const videoId   = row[MASTER_COLS.videoId];
    const currentPl = row[MASTER_COLS.playlist_id];

    // 既に設定済みの場合はスキップ
    if (currentPl) continue;

    const playlistId = videoIdToPlaylistId[videoId];
    if (playlistId) {
      masterSheet.getRange(i + 1, MASTER_COLS.playlist_id + 1).setValue(playlistId);
      updatedCount++;
    }
  }

  Logger.log(`backfillPlaylistIds 完了: ${updatedCount} 件更新`);
}

// ============================================================
// 内部処理関数
// ============================================================

/**
 * 1つのプレイリストを処理する。
 * 動画マスタの更新、コメント取得、daily_log への記録を行う。
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {SpreadsheetApp.Sheet} masterSheet
 * @param {string} apiKey
 * @param {Object} playlist - { id, name, label, priority }
 * @param {string} recordDate - 前日付け（yyyy-MM-dd）
 * @param {string} recordedAt - 実際の取得日時
 */
function _processPlaylist(ss, masterSheet, apiKey, playlist, recordDate, recordedAt) {
  // プレイリスト内の全動画IDを取得
  const videoIds = _fetchAllVideoIdsFromPlaylist(apiKey, playlist.id);
  Logger.log(`  動画数: ${videoIds.length}`);

  if (videoIds.length === 0) return;

  // 動画の詳細情報を取得（50件ずつバッチ処理）
  const videoDetails = _fetchVideoDetails(apiKey, videoIds);

  // 動画マスタを更新
  _updateMasterSheet(masterSheet, videoDetails, playlist.id, recordedAt);

  // コメントを取得して月別シートに保存
  const commentSheet = _getOrCreateCommentSheet(ss, recordDate);
  _fetchAndSaveComments(apiKey, videoIds, playlist.id, commentSheet);

  // daily_log に記録
  const dailyLogSheet = ss.getSheetByName('daily_log');
  _appendDailyLog(dailyLogSheet, videoDetails, playlist.id, recordDate, recordedAt);
}

/**
 * プレイリスト内の全動画IDを取得する（ページネーション対応）。
 */
function _fetchAllVideoIdsFromPlaylist(apiKey, playlistId) {
  const videoIds = [];
  let pageToken  = '';

  do {
    const url = `https://www.googleapis.com/youtube/v3/playlistItems`
      + `?part=contentDetails`
      + `&playlistId=${encodeURIComponent(playlistId)}`
      + `&maxResults=50`
      + `&key=${apiKey}`
      + (pageToken ? `&pageToken=${pageToken}` : '');

    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json     = JSON.parse(response.getContentText());

    if (json.error) {
      Logger.log(`API Error (playlistItems): ${JSON.stringify(json.error)}`);
      break;
    }

    (json.items || []).forEach(item => {
      const vid = item.contentDetails && item.contentDetails.videoId;
      if (vid) videoIds.push(vid);
    });

    pageToken = json.nextPageToken || '';
  } while (pageToken);

  return videoIds;
}

/**
 * 動画IDリストから動画詳細情報を取得する（50件ずつバッチ）。
 */
function _fetchVideoDetails(apiKey, videoIds) {
  const details   = [];
  const batchSize = 50;

  for (let i = 0; i < videoIds.length; i += batchSize) {
    const batch = videoIds.slice(i, i + batchSize);
    const url   = `https://www.googleapis.com/youtube/v3/videos`
      + `?part=snippet,statistics`
      + `&id=${batch.join(',')}`
      + `&key=${apiKey}`;

    const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
    const json     = JSON.parse(response.getContentText());

    if (json.error) {
      Logger.log(`API Error (videos): ${JSON.stringify(json.error)}`);
      continue;
    }

    (json.items || []).forEach(item => {
      details.push({
        videoId:      item.id,
        videoTitle:   item.snippet.title,
        publishedAt:  item.snippet.publishedAt,
        viewCount:    parseInt(item.statistics.viewCount    || 0, 10),
        likeCount:    parseInt(item.statistics.likeCount    || 0, 10),
        commentCount: parseInt(item.statistics.commentCount || 0, 10)
      });
    });

    Utilities.sleep(200);
  }

  return details;
}

/**
 * 動画マスタシートを更新する。
 * 既存行は統計値を更新、新規行は追加する。
 * playlist_id 列も設定する。
 *
 * @param {SpreadsheetApp.Sheet} masterSheet
 * @param {Array} videoDetails
 * @param {string} playlistId
 * @param {string} recordedAt - 実際の取得日時（updatedAt に使用）
 */
function _updateMasterSheet(masterSheet, videoDetails, playlistId, recordedAt) {
  const data = masterSheet.getDataRange().getValues();

  // 既存 videoId のインデックスマップを構築
  const existingMap = {};
  for (let i = 1; i < data.length; i++) {
    existingMap[data[i][MASTER_COLS.videoId]] = i + 1; // 1始まりの行番号
  }

  const newRows = [];

  for (const v of videoDetails) {
    if (existingMap[v.videoId]) {
      // 既存行の更新
      const rowNum = existingMap[v.videoId];
      masterSheet.getRange(rowNum, MASTER_COLS.viewCount    + 1).setValue(v.viewCount);
      masterSheet.getRange(rowNum, MASTER_COLS.likeCount    + 1).setValue(v.likeCount);
      masterSheet.getRange(rowNum, MASTER_COLS.commentCount + 1).setValue(v.commentCount);
      masterSheet.getRange(rowNum, MASTER_COLS.updatedAt    + 1).setValue(recordedAt);
      // playlist_id が未設定の場合のみ設定
      if (!data[rowNum - 1][MASTER_COLS.playlist_id]) {
        masterSheet.getRange(rowNum, MASTER_COLS.playlist_id + 1).setValue(playlistId);
      }
    } else {
      // 新規行の追加
      // trainee_name と stage_type は後で手動またはスクリプトで設定
      newRows.push([
        v.videoId,
        v.videoTitle,
        '',          // trainee_name
        '',          // stage_type
        v.publishedAt,
        v.viewCount,
        v.likeCount,
        v.commentCount,
        recordedAt,
        playlistId
      ]);
    }
  }

  if (newRows.length > 0) {
    masterSheet.getRange(
      masterSheet.getLastRow() + 1,
      1,
      newRows.length,
      newRows[0].length
    ).setValues(newRows);
    Logger.log(`  動画マスタ: ${newRows.length} 件追加`);
  }
}

/**
 * 動画のコメントを取得して月別シートに保存する。
 * 既存コメントは重複保存しない（commentId で管理）。
 *
 * @param {string} apiKey
 * @param {Array<string>} videoIds
 * @param {string} playlistId
 * @param {SpreadsheetApp.Sheet} commentSheet
 */
function _fetchAndSaveComments(apiKey, videoIds, playlistId, commentSheet) {
  // 既存 commentId のセットを構築
  const existingCommentIds = new Set();
  const existingData = commentSheet.getDataRange().getValues();
  for (let i = 1; i < existingData.length; i++) {
    existingCommentIds.add(existingData[i][COMMENT_COLS.commentId]);
  }

  const newComments = [];

  for (const videoId of videoIds) {
    let pageToken = '';
    do {
      const url = `https://www.googleapis.com/youtube/v3/commentThreads`
        + `?part=snippet`
        + `&videoId=${encodeURIComponent(videoId)}`
        + `&maxResults=100`
        + `&order=time`
        + `&key=${apiKey}`
        + (pageToken ? `&pageToken=${pageToken}` : '');

      let response;
      try {
        response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      } catch (e) {
        Logger.log(`  コメント取得エラー (${videoId}): ${e.message}`);
        break;
      }

      const json = JSON.parse(response.getContentText());

      // コメント無効化されている動画はスキップ
      if (json.error) {
        if (json.error.code === 403) {
          Logger.log(`  コメント無効 (${videoId}): スキップ`);
        } else {
          Logger.log(`  API Error (commentThreads) [${videoId}]: ${JSON.stringify(json.error)}`);
        }
        break;
      }

      (json.items || []).forEach(item => {
        const top = item.snippet.topLevelComment.snippet;
        const cid = item.snippet.topLevelComment.id;

        if (!existingCommentIds.has(cid)) {
          newComments.push([
            videoId,
            cid,
            top.authorDisplayName,
            top.textDisplay,
            parseInt(top.likeCount || 0, 10),
            top.publishedAt,
            top.updatedAt,
            playlistId
          ]);
          existingCommentIds.add(cid);
        }
      });

      pageToken = json.nextPageToken || '';
      Utilities.sleep(100);
    } while (pageToken);
  }

  if (newComments.length > 0) {
    commentSheet.getRange(
      commentSheet.getLastRow() + 1,
      1,
      newComments.length,
      newComments[0].length
    ).setValues(newComments);
    Logger.log(`  コメント: ${newComments.length} 件追加`);
  }
}

/**
 * daily_log シートに日次データを追記する。
 *
 * @param {SpreadsheetApp.Sheet} dailyLogSheet
 * @param {Array} videoDetails
 * @param {string} playlistId
 * @param {string} recordDate - 前日付け（yyyy-MM-dd）
 * @param {string} recordedAt - 実際の取得日時
 */
function _appendDailyLog(dailyLogSheet, videoDetails, playlistId, recordDate, recordedAt) {
  if (!dailyLogSheet) return;

  // ヘッダー確認
  _ensureDailyLogHeader(dailyLogSheet);

  const rows = videoDetails.map(v => [
    recordDate,   // 前日付け（実績日）
    v.videoId,
    v.viewCount,
    v.likeCount,
    v.commentCount,
    playlistId,
    recordedAt    // 実際の取得日時（監査用）
  ]);

  if (rows.length > 0) {
    dailyLogSheet.getRange(
      dailyLogSheet.getLastRow() + 1,
      1,
      rows.length,
      rows[0].length
    ).setValues(rows);
  }
}

// ============================================================
// ユーティリティ関数
// ============================================================

/**
 * 動画マスタシートのヘッダー行を確認・設定する。
 */
function _ensureMasterHeader(sheet) {
  const headers = [
    'videoId', 'videoTitle', 'trainee_name', 'stage_type',
    'publishedAt', 'viewCount', 'likeCount', 'commentCount',
    'updatedAt', 'playlist_id'
  ];
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  // playlist_id 列が未設定の場合のみ追加
  if (firstRow[MASTER_COLS.playlist_id] !== 'playlist_id') {
    sheet.getRange(1, MASTER_COLS.playlist_id + 1).setValue('playlist_id');
  }
  // 初回セットアップ時（全列が空の場合）
  if (!firstRow[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

/**
 * daily_log シートのヘッダー行を確認・設定する。
 */
function _ensureDailyLogHeader(sheet) {
  const headers = [
    'date', 'videoId', 'viewCount', 'likeCount', 'commentCount',
    'playlist_id', 'recorded_at'
  ];
  const firstRow = sheet.getRange(1, 1, 1, headers.length).getValues()[0];
  // recorded_at 列が未設定の場合のみ追加
  if (firstRow[DAILY_COLS.recorded_at] !== 'recorded_at') {
    sheet.getRange(1, DAILY_COLS.recorded_at + 1).setValue('recorded_at');
  }
  // playlist_id 列が未設定の場合のみ追加
  if (firstRow[DAILY_COLS.playlist_id] !== 'playlist_id') {
    sheet.getRange(1, DAILY_COLS.playlist_id + 1).setValue('playlist_id');
  }
  // 初回セットアップ時
  if (!firstRow[0]) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
}

/**
 * 月別コメントシートを取得または新規作成する。
 * シート名は recordDate（前日付け）の年月から生成する。
 *
 * @param {SpreadsheetApp.Spreadsheet} ss
 * @param {string} recordDate - 前日付け（yyyy-MM-dd）
 */
function _getOrCreateCommentSheet(ss, recordDate) {
  const sheetName = `生コメント_${recordDate.substring(0, 7)}`; // 例: 生コメント_2026-03
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    const headers = [
      'videoId', 'commentId', 'authorName', 'text',
      'likeCount', 'publishedAt', 'updatedAt', 'playlist_id'
    ];
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    Logger.log(`  新規シート作成: ${sheetName}`);
  } else {
    // 既存シートに playlist_id 列がない場合は追加
    const firstRow = sheet.getRange(1, 1, 1, 8).getValues()[0];
    if (firstRow[COMMENT_COLS.playlist_id] !== 'playlist_id') {
      sheet.getRange(1, COMMENT_COLS.playlist_id + 1).setValue('playlist_id');
    }
  }

  return sheet;
}
