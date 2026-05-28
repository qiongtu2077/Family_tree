# 族谱系统

基于 FastAPI、Neo4j、Vue 3 与 AntV G6 的族谱管理与可视化系统。系统以 `Person + FamilyUnit` 图模型组织家族关系，支持登录鉴权、人物管理、家谱图浏览、亲缘路径查询、管理员诊断与旧数据迁移。

## 核心能力

- 登录与角色权限：区分普通用户与管理员访问能力。
- 家谱图展示：围绕中心人物展示祖先、后代、配偶与家庭单元。
- 关系路径查询：查询两个人之间的亲缘路径，并返回可读的中文解释。
- 后代分支浏览：从家庭单元向下展开后代关系。
- 管理员诊断：检测孤立人物、多重生父/生母、祖先循环等异常关系。
- 数据迁移：保留旧 SQLAlchemy 数据入口，并支持迁移到 Neo4j 图数据库。

## 技术栈

- 后端：FastAPI、Neo4j Python Driver、SQLAlchemy。
- 数据库：Neo4j 作为核心图数据库，SQLite 用于兼容本地账号数据。
- 前端：Vue 3、Vite、AntV G6、自定义家谱投影布局。
- 测试：pytest、Vitest coverage。
- 部署：Docker Compose、Nginx。

## 目录结构

```text
Family_tree/
├── after/
│   ├── app/
│   │   ├── repositories/     # Neo4j 数据访问层
│   │   ├── routers/          # API 路由
│   │   ├── services/         # 图谱、关系路径、校验、迁移服务
│   │   └── tests/            # 后端测试
│   └── requirements.txt
├── front/
│   ├── src/
│   │   ├── api/              # 前端 API
│   │   ├── components/       # 图谱与管理组件
│   │   ├── composables/      # 数据、布局、交互逻辑
│   │   ├── tests/            # 前端测试
│   │   └── views/
│   └── package.json
├── deploy/
│   ├── docker-compose.neo4j.yml
│   └── docker-compose.yml
└── 方案/
```

## 环境变量

后端 `.env` 示例：

```text
DATABASE_URL=sqlite:///./family_tree.db
NEO4J_URI=bolt://localhost:7687
NEO4J_USER=neo4j
NEO4J_PASSWORD=<your-neo4j-password>
NEO4J_DATABASE=neo4j
SERVER_URL=http://localhost:8000
```

## 启动方式

启动 Neo4j：

```bash
docker compose -f deploy/docker-compose.neo4j.yml up -d
```

启动后端：

```bash
conda activate familytree
cd after
pip install -r requirements.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

启动前端：

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

迁移旧 SQLAlchemy 人物数据到 Neo4j：

```text
POST /api/admin/migrate-legacy
```

初始化本地演示数据：

```bash
conda activate familytree
cd after
python -m app.init_system
```

账号信息应在本地环境中生成和保存，不应提交到公开仓库。

## 主要 API

- `GET /api/graph/focus/{personId}`：中心人物本家主线图。
- `GET /api/graph/branch/{familyUnitId}`：后代分支图。
- `GET /api/graph/relation-path?from={id}&to={id}`：两人关系路径。
- `GET /api/persons`：Neo4j 人物列表。
- `POST /api/persons`：创建人物。
- `POST /api/family-units`：创建家庭单元。
- `POST /api/relationships`：创建伴侣、子女、亲子或配偶关系。
- `GET /api/admin/graph-issues`：管理员图谱异常诊断。

## 测试

前端测试与构建：

```bash
cd front
npm run test
npm run build
```

后端测试：

```bash
conda activate familytree
cd after
pytest
```
