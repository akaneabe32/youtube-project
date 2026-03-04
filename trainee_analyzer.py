import pandas as pd
import numpy as np

class TraineeAnalyzer:
    """
    サバイバルオーディション番組の練習生を、YouTubeの公開データに基づいて8タイプに分類するクラス。
    """
    
    TYPES = {
        'RAS': {'name': '全方位型', 'en': 'Viral Flow', 'catchphrase': '広さも熱さも、全部持っている。'},
        'RAB': {'name': '引力型', 'en': 'Fandom Drive', 'catchphrase': 'コアの熱量が、全体を動かす。'},
        'RWS': {'name': '親しみ型', 'en': 'Wide Attention', 'catchphrase': '気づいたら、好きになっていた。'},
        'RWB': {'name': '信頼型', 'en': 'Quiet Support', 'catchphrase': '静かに、でも確かに、信頼されている。'},
        'DAS': {'name': 'ダークホース型', 'en': 'Heat Wave', 'catchphrase': '知っている人は、もう熱狂している。'},
        'DAB': {'name': 'コア型', 'en': 'Solid Fandom', 'catchphrase': '少数でも、誰より深く推されている。'},
        'DWS': {'name': '原石型', 'en': 'Hidden Gem', 'catchphrase': 'まだ知られていない。だから、今が一番おもしろい。'},
        'DWB': {'name': '深推し型', 'en': 'Inner Circle', 'catchphrase': '深く推すほど、好きが増していく。'}
    }

    def __init__(self, data):
        """
        data: list of dicts or pandas DataFrame
            required columns: ['name', 'comment_count', 'unique_users', 'likes', 'views']
        """
        if isinstance(data, pd.DataFrame):
            self.df = data
        else:
            self.df = pd.DataFrame(data)
        
        # 指標の算出
        self.df['avg_comments_per_user'] = self.df['comment_count'] / self.df['unique_users']
        self.df['uu_rate'] = (self.df['unique_users'] / self.df['comment_count']) * 100
        
    def analyze(self):
        """
        中央値ベースで3軸を判定し、タイプを決定する。
        """
        # 閾値（中央値）の算出
        median_comments = self.df['comment_count'].median()
        median_avg_comments = self.df['avg_comments_per_user'].median()
        median_uu_rate = self.df['uu_rate'].median()
        
        results = []
        for _, row in self.df.iterrows():
            # 第1軸：リーチ (R/D)
            axis1 = 'R' if row['comment_count'] >= median_comments else 'D'
            # 第2軸：動き (A/W)
            axis2 = 'A' if row['avg_comments_per_user'] >= median_avg_comments else 'W'
            # 第3軸：構造 (S/B)
            axis3 = 'S' if row['uu_rate'] >= median_uu_rate else 'B'
            
            code = axis1 + axis2 + axis3
            type_info = self.TYPES.get(code, {})
            
            results.append({
                'name': row['name'],
                'code': code,
                'type_name': type_info.get('name'),
                'english_name': type_info.get('en'),
                'catchphrase': type_info.get('catchphrase'),
                'metrics': {
                    'comment_count': row['comment_count'],
                    'avg_comments_per_user': round(row['avg_comments_per_user'], 2),
                    'uu_rate': round(row['uu_rate'], 2)
                }
            })
            
        return results

# 使用例
if __name__ == "__main__":
    # サンプルデータ
    sample_data = [
        {'name': '練習生A', 'comment_count': 1200, 'unique_users': 800, 'likes': 5000, 'views': 50000},
        {'name': '練習生B', 'comment_count': 800, 'unique_users': 300, 'likes': 3000, 'views': 30000},
        {'name': '練習生C', 'comment_count': 500, 'unique_users': 400, 'likes': 2000, 'views': 20000},
        {'name': '練習生D', 'comment_count': 300, 'unique_users': 100, 'likes': 1000, 'views': 10000},
    ]
    
    analyzer = TraineeAnalyzer(sample_data)
    results = analyzer.analyze()
    
    for res in results:
        print(f"{res['name']}: {res['code']} ({res['type_name']}) - {res['catchphrase']}")
