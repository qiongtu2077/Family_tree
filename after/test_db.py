"""测试数据库连接"""
import os

import pymysql

try:
    conn = pymysql.connect(
        host=os.getenv("MYSQL_HOST", "localhost"),
        user=os.getenv("MYSQL_USER", "root"),
        password=os.getenv("MYSQL_PASSWORD", ""),
        database=os.getenv("MYSQL_DATABASE", "familytree"),
        charset="utf8mb4",
    )
    print("✅ 数据库连接成功！")
    
    cur = conn.cursor()
    cur.execute('SHOW TABLES')
    tables = cur.fetchall()
    print(f"数据库中的表: {tables}")
    
    # 检查 users 表
    cur.execute('SELECT COUNT(*) FROM users')
    user_count = cur.fetchone()[0]
    print(f"用户数量: {user_count}")
    
    if user_count > 0:
        cur.execute('SELECT id, username, is_admin FROM users')
        users = cur.fetchall()
        print("用户列表:")
        for u in users:
            print(f"  - ID:{u[0]}, 用户名:{u[1]}, 管理员:{u[2]}")
    else:
        print("⚠️ 没有用户，需要初始化管理员账号")
        print("请访问: POST http://localhost:8000/api/auth/init-admin")
    
    conn.close()
except Exception as e:
    print(f"❌ 连接失败: {e}")
