"""保留旧脚本入口；统一人物资料已使用 JSON 保存头像，无需额外加列。"""


def add_avatar_column():
    """说明当前头像存储位置，不再执行旧 MySQL DDL。"""
    print("PostgreSQL 人物头像保存在 genealogy_persons.properties.avatar，无需添加旧 persons.avatar 列。")


if __name__ == "__main__":
    add_avatar_column()
