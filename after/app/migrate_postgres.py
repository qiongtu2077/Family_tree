"""只读导出旧 SQLite/Neo4j，再原子导入 PostgreSQL；不修改或删除源数据。"""
import argparse
import base64
import json
import os
from pathlib import Path
import sqlite3
from urllib.parse import quote, urlparse
from urllib.request import Request, urlopen

from dotenv import dotenv_values


# --- 源数据库快照 --- #


def read_neo4j(uri: str, user: str, password: str, database: str) -> dict:
    """从已知 Neo4j 图模型只读导出节点和关系。"""
    queries = [
        "MATCH (n) RETURN labels(n) AS labels, properties(n) AS properties",
        "MATCH (a)-[r]->(b) RETURN type(r) AS type, coalesce(a.personId, a.familyUnitId) AS source, coalesce(b.personId, b.familyUnitId) AS target, properties(r) AS properties",
    ]
    if urlparse(uri).scheme in {"http", "https"}:
        auth = base64.b64encode(f"{user}:{password}".encode()).decode()
        body = json.dumps({"statements": [{"statement": query} for query in queries]}).encode()
        request = Request(f"{uri.rstrip('/')}/db/{quote(database, safe='')}/tx/commit", data=body,
                          headers={"Content-Type": "application/json", "Authorization": f"Basic {auth}"})
        with urlopen(request, timeout=30) as response:
            payload = json.load(response)
        if payload["errors"]:
            raise ValueError(f"源数据库读取失败：{payload['errors']}")
        results = [[dict(zip(result["columns"], entry["row"])) for entry in result["data"]]
                   for result in payload["results"]]
    else:
        # Bolt 仅用于一次性旧数据导出，运行应用无需 Neo4j Driver。
        from neo4j import GraphDatabase
        with GraphDatabase.driver(uri, auth=(user, password), connection_timeout=10) as driver:
            with driver.session(database=database, default_access_mode="READ") as session:
                results = [[record.data() for record in session.run(query)] for query in queries]
    graph = {"persons": [], "family_units": [], "relationships": results[1]}
    for node in results[0]:
        if node["labels"] == ["Person"]:
            graph["persons"].append(node["properties"])
        elif node["labels"] == ["FamilyUnit"]:
            graph["family_units"].append(node["properties"])
        else:
            raise ValueError(f"源数据包含未定义节点标签 {node['labels']}，请先确认迁移模型")
    return graph


def read_sqlite(path: Path) -> dict:
    """只读打开旧 SQLite，保留账号 ID、密码哈希和审批信息。"""
    source = path.resolve()
    if not source.is_file():
        raise ValueError(f"旧 SQLite 文件不存在：{source}")
    with sqlite3.connect(source.as_uri() + "?mode=ro", uri=True) as db:
        db.row_factory = sqlite3.Row
        data = {table: [dict(row) for row in db.execute(f"SELECT * FROM {table}")]
                for table in ("persons", "users", "registration_requests")}
    for account in data["users"]:
        account["person_id"] = f"legacy:{account['person_id']}" if account["person_id"] is not None else None
        account["is_admin"] = bool(account["is_admin"])
        account["is_active"] = bool(account["is_active"])
    return data


def build_snapshot(graph: dict, legacy: dict) -> dict:
    """合并两份源快照，保持不同源的稳定 ID，不按姓名推断合并。"""
    persons = list(graph["persons"])
    person_ids = {person["personId"] for person in persons}
    relations = list(graph["relationships"])
    for person in legacy["persons"]:
        person_id = f"legacy:{person['id']}"
        if person_id in person_ids:
            raise ValueError(f"两份源数据同时包含 {person_id}，请先明确应使用哪份人物记录")
        persons.append({"personId": person_id, **{key: value for key, value in person.items()
                       if key not in {"id", "father_id", "mother_id", "created_at", "updated_at"}}})
        for key, side in (("father_id", "father"), ("mother_id", "mother")):
            if person[key] is not None:
                relations.append({"type": "PARENT_OF", "source": f"legacy:{person[key]}", "target": person_id,
                                  "properties": {"side": side, "relationKind": "biological", "certainty": 1.0}})
    return {"format_version": 1, "persons": persons, "family_units": graph["family_units"],
            "relationships": relations, "users": legacy["users"],
            "registration_requests": legacy["registration_requests"]}


# --- 导入入口 --- #


def main():
    """保存可复核的离线快照，然后在空目标库中执行一次事务导入。"""
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--sqlite-path", type=Path)
    parser.add_argument("--neo4j-uri")
    parser.add_argument("--neo4j-user", default="neo4j")
    parser.add_argument("--neo4j-database", default="neo4j")
    parser.add_argument("--source-env", type=Path, help="旧 Neo4j 密码所在的本地 .env 文件")
    parser.add_argument("--export-path", type=Path, default=Path("../.runtime/postgres-migration/snapshot.json"))
    parser.add_argument("--from-snapshot", type=Path, help="直接导入已保存快照，无需旧数据库")
    parser.add_argument("--export-only", action="store_true", help="只备份，不写目标数据库")
    args = parser.parse_args()
    if args.from_snapshot:
        snapshot = json.loads(args.from_snapshot.read_text(encoding="utf-8"))
    else:
        if not args.sqlite_path or not args.neo4j_uri:
            parser.error("完整迁移需同时指定 --sqlite-path 和 --neo4j-uri，或使用 --from-snapshot")
        source_config = dotenv_values(args.source_env) if args.source_env else dotenv_values(".env")
        password = os.getenv("NEO4J_PASSWORD") or source_config.get("NEO4J_PASSWORD")
        if not password:
            parser.error("缺少旧 NEO4J_PASSWORD，请通过环境或 --source-env 提供")
        graph = read_neo4j(args.neo4j_uri, args.neo4j_user, password, args.neo4j_database)
        snapshot = json.loads(json.dumps(build_snapshot(graph, read_sqlite(args.sqlite_path)), default=str))
        args.export_path.parent.mkdir(parents=True, exist_ok=True)
        # 用独立离线文件保留全部源属性，后续无需重新启动 Neo4j。
        args.export_path.write_text(json.dumps(snapshot, ensure_ascii=False, indent=2, default=str), encoding="utf-8")
    if args.export_only:
        print("Source snapshot saved; no target data changed.")
        return
    from .database import Base, SessionLocal, engine
    from .repositories.person_repository import PersonRepository
    from .services.migration_service import MigrationService
    Base.metadata.create_all(bind=engine)
    with SessionLocal.begin() as session:
        result = MigrationService(PersonRepository(session)).import_snapshot(snapshot)
    print(json.dumps(result, ensure_ascii=False))


if __name__ == "__main__":
    main()
