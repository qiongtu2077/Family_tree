# 族谱系统

基于 FastAPI + Neo4j + Vue 3 + ELK.js + AntV G6 的族谱系统。系统采用 `Person + FamilyUnit` 图模型，普通用户查看本家主线、关系路径和分支图，管理员可进行关系诊断和数据迁移。

## 核心能力

- 本家主线图：以中心人物展示祖先、后代、配偶与家庭单元。
- 关系路径图：查询两个人之间的最短亲缘路径并返回中文解释。
- 后代分支图：从家庭单元向下展开后代。
- 管理员诊断：检测孤立人物、多个生父/生母、祖先循环等异常。
- 旧数据兼容：保留旧 SQLAlchemy 登录/上传接口，并提供旧人物数据迁移到 Neo4j 的入口。

## 技术栈

- 后端：FastAPI、Neo4j Python Driver、SQLAlchemy 兼容旧账号数据。
- 数据库：Neo4j 作为族谱核心图数据库。
- 前端：Vue 3、Vite、ELK.js 布局、AntV G6 渲染交互。
- 测试：pytest、Vitest coverage。
- 部署：Docker Compose、Nginx。

## 目录结构

```text
Family_tree/
├── after/
│   ├── app/
│   │   ├── repositories/     # Neo4j 数据访问层
│   │   ├── services/         # 图谱、关系路径、校验、迁移服务
│   │   ├── routers/          # API 路由
│   │   └── tests/            # 后端单元测试
│   └── requirements.txt
├── front/
│   ├── src/
│   │   ├── api/              # 前端 API
│   │   ├── components/       # 图谱与管理组件
│   │   ├── composables/      # 数据、布局、交互逻辑
│   │   ├── tests/            # 前端单元测试
│   │   └── views/
│   └── package.json
└── deploy/
    └── docker-compose.yml
```

## 环境变量

后端 `.env` 示例：

```text
DATABASE_URL=sqlite:///./family_tree.db
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<ROTATED_NEO4J_PASSWORD>
NEO4J_DATABASE=neo4j
SERVER_URL=http://localhost:8000
```

## 启动

启动 Neo4j：

```bash
docker compose -f deploy/docker-compose.neo4j.yml up -d
```

后端启动前请先激活本项目 Conda 环境，再安装依赖并运行：

```bash
conda activate <项目环境名>
cd after
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

本项目当前 Conda 环境名：

```bash
conda activate familytree
```

前端：

```bash
cd front
npm install
npm run dev
```

## 初始化与迁移

初始化 Neo4j 约束：

```text
POST /api/admin/init-neo4j
```

如果要把旧 SQLAlchemy 人物数据迁移到 Neo4j：

```text
POST /api/admin/migrate-legacy
```

旧人物 ID 会映射为稳定的 `legacy:{id}`，例如旧数据库 `persons.id = 1` 会变为 Neo4j `personId = legacy:1`。

初始化演示账号与示例族谱：

```bash
conda activate familytree
cd after
python -m app.init_system
```

默认账号：

- 管理员：`admin` / `<ROTATED_ADMIN_PASSWORD>`
- 测试用户：`test` / `<ROTATED_TEST_PASSWORD>`

## 主要 API

- `GET /api/graph/focus/{personId}`：中心人物本家主线图。
- `GET /api/graph/branch/{familyUnitId}`：后代分支图。
- `GET /api/graph/relation-path?from={id}&to={id}`：两人关系路径。
- `GET /api/persons`：Neo4j 人物列表。
- `POST /api/persons`：创建人物。
- `POST /api/family-units`：创建家庭单元。
- `POST /api/relationships`：创建伴侣、子女、亲子或配偶关系。
- `GET /api/admin/graph-issues`：管理员图谱异常。

## 测试

前端严格测试：

```bash
cd front
npm run test
npm run build
```

后端测试必须先激活项目 Conda 环境：

```bash
conda activate <项目环境名>
cd after
pytest
```

当前仓库要求：如果项目 Conda 环境名未知，不要直接运行 Python 脚本或 pytest。
