# YT Comment Exporter Batch

YouTubeプレイリストまたは動画のコメントを一括取得し、ZIPファイルとして出力するChrome拡張機能です。

## バージョン履歴

| バージョン | 日付 | 変更内容 |
|---|---|---|
| **v2.1** | 2026-03-05 | `sanitizeFilename()`を強化：ゼロ幅文字除去・連続アンダースコア正規化・先頭末尾アンダースコア除去を追加 |
| **v2.0** | 2026-03-05 | 全角パイプ文字（`｜` U+FF5C）をはじめとする全角禁止文字をファイル名から除去する修正を追加 |

## ファイル名サニタイズ仕様（v2.1）

`sanitizeFilename()` 関数は以下の順序で処理します：

1. **半角禁止文字の除去**：`\ / : * ? " < > |`（Windows/macOS/Linux共通）
2. **全角禁止文字の除去**：`｜ ／ ： ＊ ？ ＂ ＜ ＞`（U+FF5C, FF0F, FF3A, FF1A, FF0A, FF1F, FF02, FF1C, FF1E）
3. **ゼロ幅文字の除去**：U+200B〜200D, U+FEFF
4. **空白をアンダースコアに変換**
5. **連続アンダースコアを1つに正規化**
6. **先頭・末尾のアンダースコアを除去**
7. **80文字でトリミング**

### 変換例

| 入力 | 出力 |
|---|---|
| `推しカメラ｜新世界_(SHINSEKAI)` | `推しカメラ新世界_(SHINSEKAI)` |
| `SELFIE CHALLENGE \| 新世界` | `SELFIE_CHALLENGE_新世界` |
| `1MIN PR：新世界` | `1MIN_PR新世界` |

## 出力ファイル構成

```
{日付}_{プレイリスト名}_bundle.zip
├── video_stats_all.csv          # 動画ごとの統計情報（取得時点の累計）
├── video_metrics_for_ai.csv     # 動画ごとの計算済み指標パック
├── sheet_raw_comments_all.csv   # コメント全件ローデータ（1行1コメント）
├── ai_analysis_ready_all.csv    # AI分析用コメントデータ
└── per_video/                   # 動画別フォルダ（オプション）
    └── {日付}_{動画タイトル}/
        ├── comments_all.csv
        ├── top_liked_comments.csv
        ├── keywords_top100.csv
        └── analysis_ready.csv
```

## インストール方法

1. このリポジトリをクローンまたはZIPダウンロード
2. Chromeで `chrome://extensions/` を開く
3. 「デベロッパーモード」をON
4. 「パッケージ化されていない拡張機能を読み込む」をクリック
5. `chrome-extension/` フォルダを選択

## 使い方

1. YouTubeのプレイリストページまたは動画ページを開く
2. 拡張機能アイコンをクリック
3. YouTube Data API v3 キーを入力
4. 「実行」ボタンをクリック
5. ZIPファイルがダウンロードされる

## 更新方法

GitHubから最新版をpullして、Chromeの拡張機能管理ページで「更新」ボタンをクリックしてください。

## 出力指標一覧

### video_metrics_for_ai.csv

| 指標 | 説明 |
|---|---|
| `commentUU` | ユニークコメンターユーザー数 |
| `commentParticipationRate` | 視聴者のうちコメントした割合（commentUU ÷ views） |
| `avgCommentsPerUser` | 1人あたり平均コメント数（comments ÷ commentUU） |
| `maxCommentsBySingleUser` | 最もコメントした人のコメント数 |
| `commentDispersionRate` | コメント分散率（commentUU ÷ comments） |
| `commentGini` | コメント集中度（ジニ係数） |
| `commitmentRate` | コミットメント率（commentUU ÷ likes） |
| `engagementRate` | エンゲージメント率（(likes + comments) ÷ views） |
| `likeRate` | いいね率（likes ÷ views） |
| `commentRate` | コメント率（comments ÷ views） |
| `lang_ja_rate` | 日本語コメント率 |
| `lang_en_rate` | 英語コメント率 |
| `lang_ko_rate` | 韓国語コメント率 |
| `lang_zh_rate` | 中国語コメント率 |
| `lang_other_rate` | その他言語コメント率 |
| `domestic_rate` | 国内（日本語）率 |
| `overseas_rate` | 海外率 |
