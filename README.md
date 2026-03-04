# YouTube収益化プロジェクト

サバイバルオーディション番組を題材にした、YouTubeデータ分析とアイドル強みの可視化プロジェクトです。

## プロジェクト概要

PRODUCE 101 JAPAN 新世界 (SHINSEKAI) のYouTubeチャンネルを対象に、YouTube Data API v3 から取得できる公開データを活用して、アイドルの強みとファンダムの構造を可視化します。

## リポジトリ構成

```
youtube-project/
├── README.md                    # このファイル
├── docs/
│   ├── gas_architecture.md      # GASアーキテクチャ設計
│   ├── setup_guide.md           # セットアップガイド
│   └── analysis_metrics.md      # 分析指標設計
├── gas/
│   ├── Code_collect.gs          # データ収集スクリプト（GAS）
│   └── Code_export.gs           # データ集計・出力スクリプト（GAS）
├── sync_to_notion.py            # NotionへのデータSync スクリプト
└── trainee_analyzer.py          # 練習生データ分析スクリプト
```

> **注意**: `gas/` ディレクトリのコードは参照用です。実際の実行環境は Google Apps Script（スプレッドシートに紐付け）です。

## 収集対象プレイリスト

| 優先度 | プレイリスト名 | プレイリストID |
|---|---|---|
| 1 | Theme Song THE FINAL CLOSE-UP 💙 | `PL3fCPdnAFT0WqEHbmRCWZVBVpfKVUqUHx` |
| 2 | 推しカメラ｜新世界 (SHINSEKAI) | `PL3fCPdnAFT0YNA-DdjkWikiwcsct0vow0` |
| 3 | SHINSEKAI SELFIE CHALLENGE 📷 | `PL3fCPdnAFT0ZmfLCdHPPXGwMhEBJKNfwW` |
| 4 | SHINSEKAI 1MIN PR 🌏 | `PL3fCPdnAFT0aCKwqGqJhBXHlLXDjOvQZh` |

## クイックスタート

1. [セットアップガイド](docs/setup_guide.md) に従って環境を構築します。
2. GASスクリプトエディタで `backfillPlaylistIds()` を1回実行して既存データに `playlist_id` を付与します。
3. トリガーが自動実行されるのを待つか、手動で `collectDailyData()` を実行します。

## 関連リンク

- [Googleスプレッドシート（データストア）](https://docs.google.com/spreadsheets/d/1AlYN-fBfEWULtXwoaMSv6jmX40rtVyAH65j1li6HGFM/)
- [PRODUCE 101 JAPAN YouTubeチャンネル](https://www.youtube.com/@PRODUCE101JAPAN)
