# 族谱系统部署指南

## 运行方式

账号、人物与亲缘关系统一使用 PostgreSQL 18。推荐使用 Docker Compose；本地开发只启动数据库，前后端在本机运行。`docker-compose.yml` 可启动数据库、后端和 Nginx 前端。

准备 Docker Engine / Docker Desktop 及 Compose v2。当前端口仅绑定本机：数据库 `127.0.0.1:5432`、后端 `127.0.0.1:8000`、完整部署的前端 `127.0.0.1:8080`。服务器公开访问时，在本机反向代理配置域名与 HTTPS，再代理到 `127.0.0.1:8080`。

## 配置凭据

复制 `deploy/.env.example` 为 `deploy/.env`，手动填写账号及自选密码。该文件已被 Git 忽略，模板凭据均留空：

```dotenv
POSTGRES_USER=
POSTGRES_PASSWORD=
FAMILYTREE_ADMIN_USERNAME=
FAMILYTREE_ADMIN_PASSWORD=
FAMILYTREE_ADMIN_EMAIL=
FAMILYTREE_TEST_USERNAME=
FAMILYTREE_TEST_PASSWORD=
FAMILYTREE_TEST_EMAIL=
SERVER_URL=http://localhost:8080
```

`POSTGRES_PASSWORD` 没有默认值；未配置时 Compose 会直接报错。密码包含 `$`、`#` 等字符时使用单引号包住整个值。`FAMILYTREE_TEST_PASSWORD` 仅初始化演示账号时需要；`SERVER_URL` 在服务器上改为浏览器可访问的正式地址，邮件审批链接会使用它。空白示例不能直接用于启动或初始化，使用前必须填写；已有数据库的账号记录不因清空配置而改变。

PostgreSQL 初次启动创建数据库 `familytree` 和用户 `familytree`。密码只在空数据卷首次初始化时生效；之后只改 `.env` 不会更改已有数据库用户的密码。

## 方式一：本地开发

本机单人测试使用免登录模式：`after/.env` 设置 `AUTH_ENABLED=False`，数据库和登录账密均可留空。下面的本地 PostgreSQL Compose 使用免密码连接；打开前端直接进入管理工作区。

在项目根目录执行：

```powershell
docker compose --env-file deploy/.env -f deploy/docker-compose.postgres.yml up -d
docker compose --env-file deploy/.env -f deploy/docker-compose.postgres.yml ps
```

复制 `after/.env.example` 为 `after/.env`，配置：

```dotenv
POSTGRES_HOST=127.0.0.1
POSTGRES_PORT=5432
POSTGRES_DB=familytree
POSTGRES_USER=
POSTGRES_PASSWORD=
FAMILYTREE_ADMIN_USERNAME=
FAMILYTREE_ADMIN_PASSWORD=
FAMILYTREE_ADMIN_EMAIL=
FAMILYTREE_TEST_USERNAME=
FAMILYTREE_TEST_PASSWORD=
FAMILYTREE_TEST_EMAIL=
SERVER_URL=http://localhost:8000
```

免登录测试不需要初始化账号，也不需要填写上面的账号密码字段；应用会使用本地数据库角色。需要验证正式登录流程时再设置 `AUTH_ENABLED=True` 并填写连接和初始化凭据。应用使用 Psycopg 3 驱动。

本项目专用 Conda 环境为 `familytree`。如尚未创建，先执行 `conda create -n familytree python=3.11`。运行后端前必须激活环境：

```powershell
conda activate familytree
cd after
pip install -r requirements.txt
uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
```

另开终端启动前端：

```powershell
cd front
npm ci
npm run dev
```

访问 [本地前端](http://localhost:3000)。

## 方式二：完整 Docker 部署

在项目根目录配置好 `deploy/.env` 后执行：

```powershell
docker compose --env-file deploy/.env -f deploy/docker-compose.yml up -d --build
```

访问 [Docker 前端](http://localhost:8080) 与 [后端 API 文档](http://localhost:8000/docs)。后端通过内部服务名 `postgres` 连接数据库；无需再修改 `after/.env`。前端的 `/api` 和 `/uploads/` 都会由 Nginx 代理给后端。

空数据库可初始化演示数据与账号：

```powershell
conda activate familytree
docker compose --env-file deploy/.env -f deploy/docker-compose.yml exec backend python -m app.init_system
```

项目要求终端执行 Python 命令前先激活 `familytree` 环境；上例实际使用后端容器中的 Python。有真实数据的数据库应先迁移与核对，避免加入演示族谱。

若只需要创建管理员，可在设置 `FAMILYTREE_ADMIN_PASSWORD` 后调用 `POST /api/auth/init-admin`；不要在仓库中保存真实密码。

## 邮件服务

需要注册邮件审批时，在 `deploy/.env` 中补充以下配置；本机运行后端则配置到 `after/.env`：

```dotenv
SMTP_SERVER=smtp.example.com
SMTP_PORT=465
SMTP_SENDER_EMAIL=
SMTP_SENDER_PASSWORD=
SMTP_ADMIN_EMAIL=
```

## 数据持久化与旧数据

- PostgreSQL：保存在 Compose 命名卷 `familytree_postgres_data`。PostgreSQL 18 官方镜像使用版本子目录，卷挂载点为 `/var/lib/postgresql`。
- 头像与照片：`after/uploads/` 绑定到后端 `/app/uploads`，保留现有文件，重建后端容器不会丢失上传内容。
- 历史 SQLite：保留 `after/family_tree.db`。当前应用不会继续写入该文件；切换配置不会自动搬移数据。
- 历史 Neo4j：保留原数据卷。`docker-compose.neo4j.yml` 仅作为历史迁移源，运行 PostgreSQL 版本无需启动它。

迁移前备份 SQLite 文件、Neo4j 数据和 `after/uploads/`。迁移与数据核对完成前不要删除源文件、原容器卷，也不要执行 `docker compose down -v`。历史 Neo4j 应使用原 Compose 项目名与原数据卷启动，避免误连一个新建的空数据库。

在项目根目录打开终端，配置好目标 `after/.env` 后执行：

```powershell
conda activate familytree
cd after
pip install -r requirements-migration.txt
python -m app.migrate_postgres --sqlite-path ./family_tree.db --neo4j-uri bolt://127.0.0.1:7687
```

旧 Neo4j 默认用户为 `neo4j`、数据库为 `neo4j`；需要时通过 `--neo4j-user`、`--neo4j-database` 指定。密码通过 `NEO4J_PASSWORD` 环境变量或 `--source-env <旧配置文件>` 读取。若旧实例只开放 HTTP 端口，可用 `--neo4j-uri http://127.0.0.1:7474`，无需迁移专用 Driver。目标必须为空库；迁移会拒绝覆盖已有记录。使用 `--export-only` 仅保存快照，默认输出 `.runtime/postgres-migration/snapshot.json`（相对项目根目录）；可用 `--export-path` 指定输出，或用 `--from-snapshot <快照路径>` 离线导入。导入过程不修改源数据库。

普通停止使用以下命令，数据库卷会保留：

```powershell
docker compose --env-file deploy/.env -f deploy/docker-compose.yml down
```

## PostgreSQL 备份

仅启动数据库时，备份命令如下。在项目根目录运行：

```powershell
docker compose --env-file deploy/.env -f deploy/docker-compose.postgres.yml exec -T postgres pg_dump -U familytree -d familytree -Fc -f /tmp/familytree.dump
docker compose --env-file deploy/.env -f deploy/docker-compose.postgres.yml cp postgres:/tmp/familytree.dump ./familytree.dump
```

完整部署时将文件参数改为 `deploy/docker-compose.yml`。先在容器内生成备份，再通过 `docker compose cp` 取出，避免 PowerShell 对二进制重定向的编码差异。上传文件需另行备份 `after/uploads/`。

参考：[PostgreSQL 官方镜像](https://hub.docker.com/_/postgres)、[PostgreSQL pg_dump 文档](https://www.postgresql.org/docs/18/app-pgdump.html)。
