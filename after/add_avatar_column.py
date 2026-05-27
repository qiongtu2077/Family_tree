"""
添加 avatar 字段到 persons 表
"""
import os
import sys

# 添加项目路径
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from sqlalchemy import text
from app.database import engine

def add_avatar_column():
    """添加 avatar 字段"""
    with engine.connect() as conn:
        # 检查字段是否已存在
        result = conn.execute(text("""
            SELECT COUNT(*) as cnt FROM information_schema.columns 
            WHERE table_schema = DATABASE() 
            AND table_name = 'persons' 
            AND column_name = 'avatar'
        """))
        row = result.fetchone()
        
        if row[0] == 0:
            # 字段不存在，添加它
            conn.execute(text("""
                ALTER TABLE persons 
                ADD COLUMN avatar VARCHAR(255) NULL COMMENT '头像路径'
                AFTER gender
            """))
            conn.commit()
            print("✅ 成功添加 avatar 字段到 persons 表")
        else:
            print("ℹ️ avatar 字段已存在，无需添加")

if __name__ == "__main__":
    add_avatar_column()
