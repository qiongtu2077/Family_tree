"""为人物搜索和响应模型提供同一套姓名、全拼与首拼检索键。"""
from functools import lru_cache

from pypinyin import Style, lazy_pinyin


def normalize_search_text(value: str) -> str:
    """忽略大小写和所有空白，并统一键盘输入中的 ü/v。"""
    return "".join(value.lower().split()).replace("ü", "v")


@lru_cache(maxsize=16384)
def name_search_keys(name: str) -> tuple[str, str, str]:
    """按姓名缓存原文、无声调全拼与首字母，改名后自然使用新缓存键。"""
    normalized = normalize_search_text(name)
    return (
        normalized,
        "".join(lazy_pinyin(normalized, style=Style.NORMAL)),
        "".join(lazy_pinyin(normalized, style=Style.FIRST_LETTER)),
    )


def matches_person_name(name: str, keyword: str) -> bool:
    """按字面子串匹配姓名、全拼或首拼，空关键词不返回人物。"""
    query = normalize_search_text(keyword)
    return bool(query) and any(query in key for key in name_search_keys(name))
