import os
import requests
import json
from datetime import datetime

# 環境変数から設定を取得（GitHub Actionsで設定）
NOTION_TOKEN = os.getenv('NOTION_TOKEN')
PAGE_ID = os.getenv('NOTION_PAGE_ID') # YouTube収益化プロジェクトのトップページID

def update_notion_log(category, content, status="確定"):
    """
    Notionの「合意事項・意思決定ログ」テーブルに新しい行を追加する。
    ※ 簡易的な実装例。実際にはNotion APIの `blocks.children.append` を使用してテーブルを更新します。
    """
    if not NOTION_TOKEN or not PAGE_ID:
        print("Notion Token or Page ID is missing.")
        return

    headers = {
        "Authorization": f"Bearer {NOTION_TOKEN}",
        "Content-Type": "application/json",
        "Notion-Version": "2022-06-28"
    }
    
    date_str = datetime.now().strftime("%Y-%m-%d")
    
    # ここでは、合意事項を新しいコールアウトブロックとして追加する例を示します。
    # テーブル自体の更新は、テーブルのblock_idを特定する必要があります。
    
    new_block = {
        "children": [
            {
                "object": "block",
                "type": "callout",
                "callout": {
                    "rich_text": [
                        {
                            "type": "text",
                            "text": {
                                "content": f"【自動連携】{date_str} - {category}: {content} (ステータス: {status})"
                            }
                        }
                    ],
                    "icon": {
                        "type": "emoji",
                        "emoji": "🤖"
                    },
                    "color": "blue_bg"
                }
            }
        ]
    }
    
    url = f"https://api.notion.com/v1/blocks/{PAGE_ID}/children"
    response = requests.patch(url, headers=headers, data=json.dumps(new_block))
    
    if response.status_code == 200:
        print("Successfully updated Notion log.")
    else:
        print(f"Failed to update Notion log: {response.status_code}")
        print(response.text)

if __name__ == "__main__":
    # GitHub Actionsから呼ばれる際のテスト
    update_notion_log("システム連携", "GitHub ActionsによるNotion自動連携の基盤を構築しました。")
