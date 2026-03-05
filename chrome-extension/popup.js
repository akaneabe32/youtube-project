/* ===============================
  YT Comment Exporter (Spec: Sheet raw + AI files)
  - 出力は ZIP 1つ
  - 目的：
    (1) スプシ実績表用ローデータ：1コメント1行（comment日付含む）
    (2) AI分析用：
        - ai_analysis_ready_all.csv（コメント×1行：言語/感情/tokens）
        - video_metrics_for_ai.csv（動画×1行：指標パック）
    (3) video_stats_all.csv（動画×1行：取得時点の累計・条件）
  - per_video は「欲しい時だけ」出力（デフォルトOFF）
================================= */

const $ = (id) => document.getElementById(id);
const statusEl = $("status");
function setStatus(t) {
  statusEl.textContent = t;
}

/* ===============================
  設定保存（URL欄は保存しない）
================================= */
const STORAGE_KEY = "yt_exporter_settings_v10_sheet_ai_split";

async function loadSettings() {
  const d = await chrome.storage.local.get([STORAGE_KEY]);
  const s = d[STORAGE_KEY] || {};

  if (s.apiKey) $("apiKey").value = s.apiKey;
  if (s.sortMode) $("sortMode").value = s.sortMode;
  if (s.maxTop !== undefined) $("maxTop").value = String(s.maxTop);
  if (s.includeReplies !== undefined) $("includeReplies").checked = !!s.includeReplies;
  if (s.includePerVideo !== undefined) $("includePerVideo").checked = !!s.includePerVideo;

  $("urlList").value = "";
}

async function saveSettings() {
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      apiKey: $("apiKey").value.trim(),
      sortMode: $("sortMode").value,
      maxTop: Number($("maxTop").value || 0),
      includeReplies: $("includeReplies").checked,
      includePerVideo: $("includePerVideo").checked,
    },
  });
}

/* ===============================
  アクティブタブURL取得
================================= */
async function getActiveTab() {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  return tabs?.[0] || null;
}

async function getInputUrlsOrActiveTab() {
  const raw = $("urlList").value || "";
  const urls = raw
    .split("\n")
    .map((x) => x.trim())
    .filter(Boolean);
  if (urls.length > 0) return urls;

  const tab = await getActiveTab();
  const activeUrl = tab?.url || "";
  if (!activeUrl) return [];
  return [activeUrl];
}

/* ===============================
  タブ変更時にURL欄クリア
================================= */
let currentTabId = null;
let currentTabUrl = "";

async function initTabWatcher() {
  const tab = await getActiveTab();
  currentTabId = tab?.id ?? null;
  currentTabUrl = tab?.url ?? "";
  $("urlList").value = "";

  chrome.tabs.onActivated.addListener(async (info) => {
    if (!info || typeof info.tabId !== "number") return;
    const t = await chrome.tabs.get(info.tabId).catch(() => null);
    currentTabId = t?.id ?? null;
    currentTabUrl = t?.url ?? "";
    $("urlList").value = "";
  });

  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab2) => {
    if (currentTabId === null) return;
    if (tabId !== currentTabId) return;
    const nextUrl = changeInfo.url || tab2?.url || "";
    if (nextUrl && nextUrl !== currentTabUrl) {
      currentTabUrl = nextUrl;
      $("urlList").value = "";
    }
  });
}

/* ===============================
  YouTube API
================================= */
async function ytFetch(url) {
  const r = await fetch(url);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error?.message || `HTTP ${r.status}`);
  return j;
}

function parseVideoId(u) {
  try {
    const url = new URL(u);
    if (url.searchParams.get("v")) return url.searchParams.get("v");
    if (url.hostname === "youtu.be") return url.pathname.slice(1);
    if (url.pathname.startsWith("/shorts/")) return url.pathname.split("/")[2];
  } catch {}
  return null;
}

function parsePlaylistId(u) {
  try {
    const url = new URL(u);
    return url.searchParams.get("list");
  } catch {}
  return null;
}

async function getPlaylistVideoIds(apiKey, listId) {
  const ids = [];
  let token = "";
  while (true) {
    const url = new URL("https://www.googleapis.com/youtube/v3/playlistItems");
    url.searchParams.set("part", "contentDetails");
    url.searchParams.set("playlistId", listId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (token) url.searchParams.set("pageToken", token);

    const d = await ytFetch(url.toString());
    ids.push(
      ...(d.items || [])
        .map((i) => i.contentDetails?.videoId)
        .filter(Boolean)
    );

    if (!d.nextPageToken) break;
    token = d.nextPageToken;
  }
  return ids;
}

async function getPlaylistTitle(apiKey, playlistId) {
  const url = new URL("https://www.googleapis.com/youtube/v3/playlists");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("id", playlistId);
  url.searchParams.set("key", apiKey);
  const d = await ytFetch(url.toString());
  return d.items?.[0]?.snippet?.title || playlistId;
}

async function getVideoMetaAndStatsBatch(apiKey, videoIds) {
  const out = new Map();
  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const url = new URL("https://www.googleapis.com/youtube/v3/videos");
    url.searchParams.set("part", "snippet,statistics");
    url.searchParams.set("id", chunk.join(","));
    url.searchParams.set("key", apiKey);

    const d = await ytFetch(url.toString());
    for (const item of d.items || []) {
      const id = item?.id;
      if (!id) continue;
      const sn = item?.snippet || {};
      const st = item?.statistics || {};
      out.set(id, {
        videoId: id,
        videoTitle: sn.title || id,
        publishedAt: sn.publishedAt || "",
        viewCount: st.viewCount != null ? Number(st.viewCount) : null,
        likeCount: st.likeCount != null ? Number(st.likeCount) : null,
        commentCount_video: st.commentCount != null ? Number(st.commentCount) : null,
      });
    }
  }
  return out;
}

/* ===============================
  抽出順（APIは time / relevance のみ）
================================= */
function toApiOrder(sortMode) {
  return sortMode === "relevance" ? "relevance" : "time";
}
function sortTopRowsInPlace(topRows, sortMode) {
  if (sortMode === "likes") {
    topRows.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
  } else if (sortMode === "time_old") {
    topRows.sort((a, b) => String(a.publishedAt).localeCompare(String(b.publishedAt)));
  } else if (sortMode === "time_new") {
    topRows.sort((a, b) => String(b.publishedAt).localeCompare(String(a.publishedAt)));
  }
}

/* ===============================
  コメント取得
================================= */
async function getCommentThreads(apiKey, videoId, order, maxTop, onProgress) {
  const items = [];
  let token = "";
  let page = 0;
  while (true) {
    page++;
    const url = new URL("https://www.googleapis.com/youtube/v3/commentThreads");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("videoId", videoId);
    url.searchParams.set("maxResults", "100");
    url.searchParams.set("order", order);
    url.searchParams.set("textFormat", "plainText");
    url.searchParams.set("key", apiKey);
    if (token) url.searchParams.set("pageToken", token);

    onProgress?.({ phase: "top", page, fetched: items.length });

    const d = await ytFetch(url.toString());
    items.push(...(d.items || []));

    if (maxTop && items.length >= maxTop) break;
    if (!d.nextPageToken) break;
    token = d.nextPageToken;
  }
  return maxTop ? items.slice(0, maxTop) : items;
}

async function getRepliesForParent(apiKey, parentId, onProgress) {
  const replies = [];
  let token = "";
  let page = 0;
  while (true) {
    page++;
    const url = new URL("https://www.googleapis.com/youtube/v3/comments");
    url.searchParams.set("part", "snippet");
    url.searchParams.set("parentId", parentId);
    url.searchParams.set("maxResults", "100");
    url.searchParams.set("textFormat", "plainText");
    url.searchParams.set("key", apiKey);
    if (token) url.searchParams.set("pageToken", token);

    onProgress?.({ phase: "reply", page, fetched: replies.length });

    const d = await ytFetch(url.toString());
    replies.push(...(d.items || []));

    if (!d.nextPageToken) break;
    token = d.nextPageToken;
  }
  return replies;
}

/* ===============================
  kuromoji
================================= */
let tokenizerCache = null;
async function getTokenizer() {
  if (tokenizerCache) return tokenizerCache;
  tokenizerCache = await new Promise((resolve, reject) => {
    kuromoji.builder({ dicPath: "dict/" }).build((err, tokenizer) => {
      if (err) reject(err);
      else resolve(tokenizer);
    });
  });
  return tokenizerCache;
}

/* ===============================
  キーワード抽出（1文字もカウント）
================================= */
const STOP_WORDS = new Set([
  "さん", "くん", "ちゃん", "様",
  "これ", "それ", "あれ", "ここ", "そこ", "どこ", "こちら", "そちら",
  "私", "自分", "あなた", "みんな", "皆", "俺", "僕",
  "もの", "こと", "ため", "感じ", "ところ",
  "いる", "ある", "する", "なる",
  "です", "ます", "でした", "だ", "ね", "な",
  "www", "ww", "ｗｗ", "w", "笑", "草",
]);
const BLOCK_SINGLE_CHAR = new Set(["人", "何", "日", "回", "分", "的", "他", "中", "生", "子", "方", "目"]);

function normalizeTerm(term) {
  let t = String(term ?? "").trim();
  if (!t) return "";
  if (/https?:/i.test(t)) return "";
  if (/^[0-9０-９]+$/u.test(t)) return "";
  if (/^[\p{P}\p{S}]+$/u.test(t)) return "";
  return t;
}

function extractTermsFromText(tokenizer, text) {
  const tokens = tokenizer.tokenize(String(text ?? ""));
  const terms = [];
  for (const tok of tokens) {
    if (tok.pos !== "名詞" && tok.pos !== "形容詞") continue;

    const raw =
      tok.basic_form && tok.basic_form !== "*"
        ? tok.basic_form
        : tok.surface_form;

    const term = normalizeTerm(raw);
    if (!term) continue;
    if (STOP_WORDS.has(term)) continue;

    if (term.length === 1) {
      if (BLOCK_SINGLE_CHAR.has(term)) continue;
      terms.push(term);
      continue;
    }
    terms.push(term);
  }
  return terms;
}

/* ===============================
  簡易感情
================================= */
const POSITIVE = new Set(["最高", "神", "すごい", "凄い", "好き", "大好き", "良い", "いい", "可愛い", "かわいい", "かっこいい", "上手い", "天才", "楽しい", "嬉しい"]);
const NEGATIVE = new Set(["嫌い", "無理", "キモい", "きもい", "怖い", "最悪", "微妙", "つまらない", "苦手", "下手"]);

function sentimentLabelFromTerms(terms) {
  const uniq = new Set(terms);
  let p = 0, n = 0;
  for (const t of uniq) {
    if (POSITIVE.has(t)) p++;
    if (NEGATIVE.has(t)) n++;
  }
  if (p > n) return "positive";
  if (n > p) return "negative";
  return "neutral";
}

/* ===============================
  言語推定（外部APIなし）
================================= */
function scriptCounts(text) {
  const t = String(text || "");
  let hira = 0, kata = 0, han = 0, hangul = 0, latin = 0;
  for (const ch of t) {
    const code = ch.charCodeAt(0);
    if (code >= 0x3040 && code <= 0x309F) hira++;
    else if (code >= 0x30A0 && code <= 0x30FF) kata++;
    else if (code >= 0x4E00 && code <= 0x9FFF) han++;
    else if (code >= 0xAC00 && code <= 0xD7AF) hangul++;
    else if ((code >= 65 && code <= 90) || (code >= 97 && code <= 122)) latin++;
  }
  return { hira, kata, han, hangul, latin, total: t.length };
}

const EN_FUNCTION = [" the ", " and ", " you ", " is ", " are ", " to ", " of ", " in ", " it ", " this ", " that ", "for ", "with ", " i ", " we ", " they ", " he ", " she "];
const ZH_FUNCTION = ["的", "了", "是", "我", "你", "他", "她", "在", "有", "不", "这", "那", "们", "吗", "呢", "吧", "啊", "哦"];

function countHits(text, arr) {
  let c = 0;
  for (const w of arr) if (text.includes(w)) c++;
  return c;
}
function normalizeSpacesLower(text) {
  return (" " + String(text || "").toLowerCase().replace(/\s+/g, " ") + " ");
}

function detectLanguageHigh(text) {
  const raw = String(text || "");
  const sc = scriptCounts(raw);

  if (sc.hangul > 0) {
    const conf = Math.min(1, 0.85 + Math.min(0.15, sc.hangul / Math.max(10, raw.length)));
    return { language: "ko", confidence: Number(conf.toFixed(3)) };
  }
  if (sc.hira + sc.kata > 0) {
    const conf = Math.min(1, 0.88 + Math.min(0.12, (sc.hira + sc.kata) / Math.max(10, raw.length)));
    return { language: "ja", confidence: Number(conf.toFixed(3)) };
  }

  const lowerSp = normalizeSpacesLower(raw);
  const enHits = countHits(lowerSp, EN_FUNCTION);
  const zhHits = countHits(raw, ZH_FUNCTION);

  if (sc.latin >= 4 && sc.latin >= sc.han) {
    const base = 0.55 + Math.min(0.30, sc.latin / Math.max(12, raw.length));
    const bonus = Math.min(0.15, enHits * 0.04);
    const conf = Math.min(0.95, base + bonus);
    return { language: "en", confidence: Number(conf.toFixed(3)) };
  }

  if (sc.han > 0) {
    if (zhHits >= 2) {
      const conf = Math.min(0.95, 0.70 + Math.min(0.25, zhHits * 0.06));
      return { language: "zh", confidence: Number(conf.toFixed(3)) };
    }
    const compact = raw.replace(/\s+/g, "");
    const isShortKanjiOnly = compact.length <= 4 && /^[\u4E00-\u9FFF]+$/u.test(compact);
    if (isShortKanjiOnly) return { language: "ja", confidence: 0.72 };
    return { language: "zh", confidence: 0.62 };
  }

  if (sc.latin > 0) {
    const conf = Math.min(0.85, 0.50 + Math.min(0.25, sc.latin / Math.max(10, raw.length)) + Math.min(0.10, enHits * 0.03));
    return { language: "en", confidence: Number(conf.toFixed(3)) };
  }

  return { language: "other", confidence: 0.40 };
}

/* ===============================
  CSV helpers（BOM付き）
================================= */
function escapeCsvCell(v) {
  if (v === null || v === undefined) return "";
  const s = String(v);
  if (/[",\r\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
function jsonToCsv(rows) {
  const arr = Array.isArray(rows) ? rows : [];
  const headersSet = new Set();
  for (const r of arr) {
    if (r && typeof r === "object") Object.keys(r).forEach((k) => headersSet.add(k));
  }
  const headers = [...headersSet];
  const lines = [];
  lines.push(headers.map(escapeCsvCell).join(","));
  for (const r of arr) {
    const line = headers.map((h) => escapeCsvCell(r?.[h]));
    lines.push(line.join(","));
  }
  return "\uFEFF" + lines.join("\r\n");
}

/* ===============================
  Download helpers
================================= */
async function downloadBlob(filename, blob) {
  const url = URL.createObjectURL(blob);
  await new Promise((res, rej) => {
    chrome.downloads.download({ url, filename, saveAs: false }, () => {
      const err = chrome.runtime.lastError;
      if (err) rej(new Error(err.message));
      else res();
    });
  });
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}

/* ===============================
  統計ユーティリティ
================================= */
function safeDiv(a, b) {
  const x = Number(a), y = Number(b);
  if (!isFinite(x) || !isFinite(y) || y === 0) return null;
  return x / y;
}
function toFixedOrNull(x, digits = 6) {
  if (x === null || x === undefined) return null;
  const n = Number(x);
  if (!isFinite(n)) return null;
  return Number(n.toFixed(digits));
}

/* ===============================
  ジニ係数（コメント集中度）
================================= */
function giniFromCounts(counts) {
  const arr = (counts || [])
    .map(Number)
    .filter((n) => isFinite(n) && n >= 0)
    .sort((a, b) => a - b);

  const n = arr.length;
  if (n === 0) return null;
  const sum = arr.reduce((s, x) => s + x, 0);
  if (sum === 0) return 0;

  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * arr[i];
  const g = (2 * cum) / (n * sum) - (n + 1) / n;
  return Math.max(0, Math.min(1, g));
}

/* ===============================
  JST日付文字列
================================= */
function getJstStrings() {
  const now = new Date();
  const dt = new Intl.DateTimeFormat("ja-JP", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);

  const get = (type) => dt.find((p) => p.type === type)?.value || "";
  const y = get("year");
  const mo = get("month");
  const da = get("day");
  const hh = get("hour");
  const mm = get("minute");
  const ss = get("second");

  return {
    run_date_jst: `${y}${mo}${da}`,
    run_datetime_jst: `${y}-${mo}-${da} ${hh}:${mm}:${ss}`,
  };
}

function isoToJstDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const s = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Tokyo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d); // YYYY-MM-DD
  return s;
}

/* ===============================
  analysis_ready（コメント×1行）
================================= */
function buildAnalysisReadyRows({ videoId, videoTitle, allRows, tokenizer }) {
  const out = [];
  for (const r of allRows) {
    const lang = detectLanguageHigh(r.text);
    const terms = extractTermsFromText(tokenizer, r.text);
    const label = sentimentLabelFromTerms(terms);
    out.push({
      videoId,
      videoTitle,
      commentId: r.commentId || "",
      parentId: r.parentId || "",
      isReply: r.parentId ? 1 : 0,
      isTopComment: r.parentId ? 0 : 1,
      author: r.author || "",
      authorChannelId: r.authorChannelId || "",
      commentLikeCount: r.likeCount ?? 0,
      commentPublishedAt: r.publishedAt || "",
      commentPublishedDate_jst: isoToJstDate(r.publishedAt || ""),
      text: r.text || "",
      language: lang.language,
      langConfidence: lang.confidence,
      sentimentLabel: label,
      tokens: terms.join("|"),
      tokenCount: terms.length,
    });
  }
  return out;
}

function languageRatesFromAnalysisReady(analysisReadyRows) {
  const counts = { ja: 0, en: 0, ko: 0, zh: 0, other: 0 };
  for (const r of analysisReadyRows) {
    const k = r.language || "other";
    if (counts[k] === undefined) counts.other++;
    else counts[k]++;
  }
  const total = analysisReadyRows.length || 1;
  const rate = {};
  for (const k of Object.keys(counts)) rate[k] = counts[k] / total;
  return { counts, rate };
}

function commentUserStatsFromAnalysisReady(analysisReadyRows) {
  const m = new Map();
  for (const r of analysisReadyRows) {
    const key = r.authorChannelId || r.author || "";
    if (!key) continue;
    m.set(key, (m.get(key) || 0) + 1);
  }
  const counts = [...m.values()];
  const uu = m.size;
  const total = analysisReadyRows.length;
  const avg = uu > 0 ? total / uu : null;
  const maxByUser = counts.length ? Math.max(...counts) : null;
  const gini = giniFromCounts(counts);
  return { uu, total, avg, maxByUser, gini };
}

function keywordTopRowsFromAnalysisReady(analysisReadyRows, topN = 100) {
  const m = new Map();
  for (const r of analysisReadyRows) {
    const tokens = String(r.tokens || "")
      .split("|")
      .map((x) => x.trim())
      .filter(Boolean);
    for (const t of tokens) m.set(t, (m.get(t) || 0) + 1);
  }
  const sorted = [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, topN);
  return sorted.map(([term, count], idx) => ({ rank: idx + 1, term, count }));
}

/* ===============================
  最新コメント投稿日（参考用）
================================= */
function getLatestCommentPublishedAt(analysisReadyRows) {
  let latest = "";
  for (const r of analysisReadyRows) {
    const p = String(r.commentPublishedAt || "");
    if (!p) continue;
    if (!latest || p > latest) latest = p; // ISO文字列比較
  }
  return latest || "";
}

/* ===============================
  sanitize（ファイル名）
================================= */
function sanitizeFilename(n) {
  return String(n || "")
    .replace(/[\\/:*?"<>|]/g, "")          // 半角禁止文字
    .replace(/[\uFF5C\uFF0F\uFFE5\uFF0A\uFF1F\uFF1C\uFF1E\u300C\u300D\u300E\u300F]/g, "") // 全角禁止文字（｜を含む）
    .replace(/\s+/g, "_")
    .trim()
    .replace(/^[._]+|[._]+$/g, "")         // 先頭・末尾のドット・アンダースコアを除去
    .slice(0, 80);
}

/* ===============================
  メイン処理
================================= */
async function runBatch({ forceAll = false }) {
  await saveSettings();

  const apiKey = $("apiKey").value.trim();
  if (!apiKey) {
    setStatus("APIキーが必要です");
    return;
  }
  if (typeof JSZip === "undefined") {
    setStatus("JSZipが読み込めていません。jszip.min.js を確認してください。");
    return;
  }

  const urls = await getInputUrlsOrActiveTab();
  if (!urls.length) {
    setStatus("URLが取得できませんでした。");
    return;
  }

  const sortMode = $("sortMode").value;
  const apiOrder = toApiOrder(sortMode);

  let maxTop = Number($("maxTop").value || 0);
  if (forceAll) {
    maxTop = 0;
    $("maxTop").value = "0";
    await saveSettings();
  }

  const includeReplies = $("includeReplies").checked;
  const includePerVideo = $("includePerVideo").checked;

  setStatus("辞書読み込み中…");
  const tokenizer = await getTokenizer();

  // 入力が単一プレイリストのみなら、bundle名にタイトルを使う
  const playlistIdsInInput = [];
  let hasVideoUrl = false;
  for (const u of urls) {
    if (parseVideoId(u)) hasVideoUrl = true;
    const pid = parsePlaylistId(u);
    if (pid) playlistIdsInInput.push(pid);
  }
  const isSinglePlaylistOnly = !hasVideoUrl && playlistIdsInInput.length === 1;

  let batchTitle = "batch";
  if (isSinglePlaylistOnly) {
    try {
      batchTitle = await getPlaylistTitle(apiKey, playlistIdsInInput[0]);
    } catch {
      batchTitle = "playlist";
    }
  } else if (!hasVideoUrl && playlistIdsInInput.length >= 2) {
    batchTitle = "multiple_playlists";
  } else if (hasVideoUrl && playlistIdsInInput.length >= 1) {
    batchTitle = "mixed_input";
  } else if (hasVideoUrl && playlistIdsInInput.length === 0) {
    batchTitle = "videos";
  }

  // 動画ID展開
  const videoIdsSet = new Set();
  for (const u of urls) {
    const v = parseVideoId(u);
    if (v) {
      videoIdsSet.add(v);
      continue;
    }
    const p = parsePlaylistId(u);
    if (p) {
      setStatus("プレイリスト展開中…");
      const ids = await getPlaylistVideoIds(apiKey, p);
      ids.forEach((id) => videoIdsSet.add(id));
    }
  }
  const ids = [...videoIdsSet];
  if (!ids.length) {
    setStatus("動画IDが見つかりませんでした");
    return;
  }

  const traineeCount = ids.length;

  setStatus(`動画情報（view/like/comment）取得中…\n${ids.length}本`);
  const metaStatsMap = await getVideoMetaAndStatsBatch(apiKey, ids);

  // ZIP
  const zip = new JSZip();
  const dateLocal = new Date();
  const dateYYYYMMDD =
    dateLocal.getFullYear() +
    String(dateLocal.getMonth() + 1).padStart(2, "0") +
    String(dateLocal.getDate()).padStart(2, "0");

  const { run_date_jst, run_datetime_jst } = getJstStrings();

  // 出力用配列
  const sheetRawCommentsAll = [];      // スプシ用：1コメント1行（派生指標なし）
  const aiAnalysisReadyAll = [];       // AI用：コメント×1行（tokens等）
  const videoStatsAll = [];            // 動画×1行（累計・条件）
  const videoMetricsForAI = [];        // 動画×1行（指標パック）
  const topLikedAll = [];              // per_video用の母集団（任意）
  // per_video
  const perFolder = includePerVideo ? zip.folder("per_video") : null;
  const TOP_LIKED_PER_VIDEO = 50;

  for (let i = 0; i < ids.length; i++) {
    const videoId = ids[i];

    setStatus(`処理中 ${i + 1}/${ids.length}\nvideoId: ${videoId}\nTopコメント取得中…`);
    const threads = await getCommentThreads(apiKey, videoId, apiOrder, maxTop, (p) => {
      if (p.phase === "top") {
        setStatus(
          `処理中 ${i + 1}/${ids.length}\nvideoId: ${videoId}\nTopコメント取得中…\nページ:${p.page}\n取得:${p.fetched}`
        );
      }
    });

    let topRows = threads.map((t) => {
      const top = t?.snippet?.topLevelComment;
      const sn = top?.snippet;
      return {
        commentId: top?.id || "",
        parentId: "",
        author: sn?.authorDisplayName || "",
        authorChannelId: sn?.authorChannelId?.value || "",
        likeCount: sn?.likeCount ?? 0,
        publishedAt: sn?.publishedAt || "",
        updatedAt: sn?.updatedAt || "",
        text: sn?.textOriginal || sn?.textDisplay || "",
        totalReplyCount: t?.snippet?.totalReplyCount ?? 0,
      };
    });

    sortTopRowsInPlace(topRows, sortMode);

    const replyRows = [];
    if (includeReplies) {
      const parents = topRows.filter((r) => (r.totalReplyCount || 0) > 0 && r.commentId);
      for (let p = 0; p < parents.length; p++) {
        setStatus(
          `処理中 ${i + 1}/${ids.length}\nvideoId: ${videoId}\n返信取得 親 ${p + 1}/${parents.length}`
        );
        const parentId = parents[p].commentId;

        const replies = await getRepliesForParent(apiKey, parentId, (pp) => {
          if (pp.phase === "reply") {
            setStatus(
              `処理中 ${i + 1}/${ids.length}\nvideoId: ${videoId}\n返信取得 親 ${p + 1}/${parents.length}\nページ:${pp.page}\n取得:${pp.fetched}`
            );
          }
        });

        for (const rep of replies) {
          const rsn = rep?.snippet;
          replyRows.push({
            commentId: rep?.id || "",
            parentId,
            author: rsn?.authorDisplayName || "",
            authorChannelId: rsn?.authorChannelId?.value || "",
            likeCount: rsn?.likeCount ?? 0,
            publishedAt: rsn?.publishedAt || "",
            updatedAt: rsn?.updatedAt || "",
            text: rsn?.textOriginal || rsn?.textDisplay || "",
          });
        }
      }
    }

    const allRows = [...topRows, ...replyRows];

    const meta = metaStatsMap.get(videoId) || {
      videoId,
      videoTitle: videoId,
      publishedAt: "",
      viewCount: null,
      likeCount: null,
      commentCount_video: null,
    };
    const videoTitle = meta.videoTitle || videoId;

    setStatus(`処理中 ${i + 1}/${ids.length}\nvideoId: ${videoId}\n分析（言語/トークン）中…`);
    const analysisReady = buildAnalysisReadyRows({
      videoId,
      videoTitle,
      allRows,
      tokenizer,
    });

    // ---------- AI用（コメント×1行）----------
    // AIに文脈を持たせたいので、run情報と動画累計を各行に付与
    for (const r of analysisReady) {
      aiAnalysisReadyAll.push({
        run_date_jst,
        run_datetime_jst,
        traineeCount,
        sortMode,
        maxTop: maxTop,
        includeReplies: includeReplies ? 1 : 0,

        videoId: r.videoId,
        videoTitle: r.videoTitle,
        videoPublishedAt: meta.publishedAt || "",
        viewCount: meta.viewCount,
        likeCount_video: meta.likeCount,
        commentCount_video: meta.commentCount_video,

        commentId: r.commentId,
        parentId: r.parentId,
        isReply: r.isReply,
        isTopComment: r.isTopComment,

        author: r.author,
        authorChannelId: r.authorChannelId,
        commentLikeCount: r.commentLikeCount,
        commentPublishedAt: r.commentPublishedAt,
        commentPublishedDate_jst: r.commentPublishedDate_jst,
        language: r.language,
        langConfidence: r.langConfidence,
        sentimentLabel: r.sentimentLabel,
        tokens: r.tokens,
        tokenCount: r.tokenCount,
        text: r.text,
      });
    }

    // ---------- スプシ用（コメント×1行・派生指標なし）----------
    for (const r of analysisReady) {
      sheetRawCommentsAll.push({
        run_date_jst,
        run_datetime_jst,

        videoId: r.videoId,
        videoTitle: r.videoTitle,
        videoPublishedAt: meta.publishedAt || "",
        viewCount: meta.viewCount,
        likeCount_video: meta.likeCount,
        commentCount_video: meta.commentCount_video,

        commentId: r.commentId,
        parentId: r.parentId,
        isReply: r.isReply,
        author: r.author,
        authorChannelId: r.authorChannelId,
        commentLikeCount: r.commentLikeCount,
        commentPublishedAt: r.commentPublishedAt,
        commentPublishedDate_jst: r.commentPublishedDate_jst,
        text: r.text,
      });
    }

    // ---------- 動画統計 ----------
    const lang = languageRatesFromAnalysisReady(analysisReady);
    const userStats = commentUserStatsFromAnalysisReady(analysisReady);

    const viewCount = meta.viewCount;
    const likeCount_video = meta.likeCount;
    const commentCount_video = meta.commentCount_video;

    const commentCount_fetched = analysisReady.length;

    const commentUU = userStats.uu;
    const commentDispersionRate = safeDiv(commentUU, commentCount_fetched);
    const commentParticipationRate = safeDiv(commentUU, viewCount);

    const avgCommentsPerUser = userStats.avg;
    const maxCommentsBySingleUser = userStats.maxByUser;
    const commentGini = userStats.gini;

    const domestic_rate = lang.rate.ja; // ルール：国内=ja
    const overseas_rate = 1 - domestic_rate;

    const engagementRate = safeDiv((likeCount_video ?? 0) + (commentCount_video ?? 0), viewCount ?? 0);
    const likeRate = safeDiv(likeCount_video ?? 0, viewCount ?? 0);
    const commentRate = safeDiv(commentCount_video ?? 0, viewCount ?? 0);

    const commentPublishedAt_latest = getLatestCommentPublishedAt(analysisReady);

    // video_stats_all（取得時点の累計 + 条件）
    videoStatsAll.push({
      run_date_jst,
      run_datetime_jst,
      traineeCount,

      videoId,
      videoTitle,
      videoPublishedAt: meta.publishedAt || "",

      viewCount,
      likeCount_video,
      commentCount_video,
      commentCount_fetched,

      commentPublishedAt_latest,
      includeReplies: includeReplies ? 1 : 0,
      sortMode,
      maxTop: maxTop,
    });

    // video_metrics_for_ai（AI用指標パック）
    videoMetricsForAI.push({
      run_date_jst,
      run_datetime_jst,
      traineeCount,

      videoId,
      videoTitle,
      videoPublishedAt: meta.publishedAt || "",

      viewCount,
      likeCount_video,
      commentCount_video,
      commentCount_fetched,

      commentPublishedAt_latest,

      commentUU,
      commentDispersionRate: toFixedOrNull(commentDispersionRate, 6),
      commentParticipationRate: toFixedOrNull(commentParticipationRate, 6),
      avgCommentsPerUser: toFixedOrNull(avgCommentsPerUser, 6),
      maxCommentsBySingleUser,
      commentGini: toFixedOrNull(commentGini, 6),

      lang_ja_rate: toFixedOrNull(lang.rate.ja, 6),
      lang_en_rate: toFixedOrNull(lang.rate.en, 6),
      lang_ko_rate: toFixedOrNull(lang.rate.ko, 6),
      lang_zh_rate: toFixedOrNull(lang.rate.zh, 6),
      lang_other_rate: toFixedOrNull(lang.rate.other, 6),

      domestic_rate: toFixedOrNull(domestic_rate, 6),
      overseas_rate: toFixedOrNull(overseas_rate, 6),

      engagementRate: toFixedOrNull(engagementRate, 6),
      likeRate: toFixedOrNull(likeRate, 6),
      commentRate: toFixedOrNull(commentRate, 6),
    });

    // ---------- per_video（必要なときだけ）----------
    if (includePerVideo && perFolder) {
      const safeTitle = sanitizeFilename(videoTitle);
      const vFolder = perFolder.folder(`${dateYYYYMMDD}_${safeTitle}`);

      const topLiked = [...analysisReady]
        .sort((a, b) => (Number(b.commentLikeCount) || 0) - (Number(a.commentLikeCount) || 0))
        .slice(0, TOP_LIKED_PER_VIDEO)
        .map((r, idx) => ({
          rank: idx + 1,
          videoId,
          videoTitle,
          commentId: r.commentId,
          isReply: r.isReply,
          parentId: r.parentId,
          commentLikeCount: r.commentLikeCount,
          author: r.author,
          authorChannelId: r.authorChannelId,
          language: r.language,
          commentPublishedAt: r.commentPublishedAt,
          commentPublishedDate_jst: r.commentPublishedDate_jst,
          text: r.text,
        }));

      const keywordsTop100 = keywordTopRowsFromAnalysisReady(analysisReady, 100);

      // コメント一覧（深掘り）
      vFolder.file(
        `${dateYYYYMMDD}_${safeTitle}_comments_all.csv`,
        jsonToCsv(
          analysisReady.map((r) => ({
            videoId,
            videoTitle,
            commentId: r.commentId,
            parentId: r.parentId,
            isReply: r.isReply,
            author: r.author,
            authorChannelId: r.authorChannelId,
            commentLikeCount: r.commentLikeCount,
            commentPublishedAt: r.commentPublishedAt,
            commentPublishedDate_jst: r.commentPublishedDate_jst,
            language: r.language,
            langConfidence: r.langConfidence,
            sentimentLabel: r.sentimentLabel,
            tokens: r.tokens,
            tokenCount: r.tokenCount,
            text: r.text,
          }))
        )
      );

      vFolder.file(`${dateYYYYMMDD}_${safeTitle}_top_liked_comments.csv`, jsonToCsv(topLiked));
      vFolder.file(`${dateYYYYMMDD}_${safeTitle}_keywords_top100.csv`, jsonToCsv(keywordsTop100));
      vFolder.file(`${dateYYYYMMDD}_${safeTitle}_analysis_ready.csv`, jsonToCsv(aiAnalysisReadyAll.filter(x => x.videoId === videoId)));

      // 全体用（任意：もし使いたければ）
      topLikedAll.push(...topLiked);
    }
  }

  // ZIPに書き込み（必須4ファイル）
  zip.file("sheet_raw_comments_all.csv", jsonToCsv(sheetRawCommentsAll));
  zip.file("video_stats_all.csv", jsonToCsv(videoStatsAll));
  zip.file("video_metrics_for_ai.csv", jsonToCsv(videoMetricsForAI));
  zip.file("ai_analysis_ready_all.csv", jsonToCsv(aiAnalysisReadyAll));

  // ZIP生成 → 1ファイルだけダウンロード
  const bundleName = `${dateYYYYMMDD}_${sanitizeFilename(batchTitle)}_bundle.zip`;
  setStatus(`ZIP生成中…\n${bundleName}`);
  const blob = await zip.generateAsync({ type: "blob" });
  await downloadBlob(bundleName, blob);

  setStatus("完了 ✅\nZIP 1ファイルにまとめました");
}

/* ===============================
  ボタン
================================= */
$("runBtn").addEventListener("click", () => runBatch({ forceAll: false }));
$("runAllBtn").addEventListener("click", () => runBatch({ forceAll: true }));

/* ===============================
  初期化
================================= */
loadSettings()
  .then(initTabWatcher)
  .then(() => setStatus("準備完了"))
  .catch((e) => setStatus("準備完了\n" + (e?.message || "")));