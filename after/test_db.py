"""检查当前 PostgreSQL 连接、数据表和记录数量。"""
from sqlalchemy import func, inspect, select, text

from app.database import SessionLocal, engine
from app.graph_models import GenealogyPerson
from app.models import User


def main():
    """读取数据库状态，不输出连接凭据或修改数据。"""
    with SessionLocal() as session:
        print(session.scalar(text("SELECT version()")))
        print({"tables": inspect(engine).get_table_names(),
               "people": session.scalar(select(func.count()).select_from(GenealogyPerson)),
               "users": session.scalar(select(func.count()).select_from(User))})


if __name__ == "__main__":
    main()
