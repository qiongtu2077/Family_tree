# 族谱查询系统 - 部署指南

## 一、服务器要求

- Linux 服务器（推荐 Ubuntu 20.04+）
- Docker 和 Docker Compose
- 至少 1GB 内存
- 开放端口：80（前端）、8000（后端API）

## 二、快速部署（Docker）

### 1. 上传项目到服务器

```bash
# 将整个项目上传到服务器
scp -r Family_tree user@your-server:/home/user/
```

### 2. 配置邮件服务

编辑 `after/app/services/email_service.py`，配置邮件发送：

```python
EMAIL_CONFIG = {
    "smtp_server": "smtp.163.com",
    "smtp_port": 465,
    "sender_email": "your-email@163.com",  # 你的163邮箱
    "sender_password": "<MAIL_APP_PASSWORD>",    # 163邮箱授权码（不是登录密码）
    "admin_email": "<ADMIN_EMAIL>"     # 管理员邮箱
}
```

### 3. 配置服务器地址

编辑 `after/app/routers/auth.py`，修改 SERVER_URL：

```python
SERVER_URL = "http://your-domain.com:8000"  # 改成你的服务器地址
```

### 4. 启动服务

```bash
cd Family_tree/deploy
docker-compose up -d --build
```

### 5. 初始化管理员账号

```bash
curl -X POST http://localhost:8000/api/auth/init-admin
```

这会创建默认管理员账号：
- 用户名：admin
- 密码：<ROTATED_ADMIN_PASSWORD>

## 三、手动部署（不使用Docker）

### 后端部署

```bash
cd after

# 创建虚拟环境
python -m venv venv
source venv/bin/activate  # Linux
# .\venv\Scripts\activate  # Windows

# 安装依赖
pip install -r requirements.txt

# 启动服务
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

### 前端部署

```bash
cd front

# 安装依赖
npm install

# 构建
npm run build

# 将 dist 目录部署到 Nginx
```

### Nginx 配置

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        root /var/www/family-tree/dist;
        index index.html;
        try_files $uri $uri/ /index.html;
    }

    location /api {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

## 四、邮件审批流程

1. 用户在前端点击"注册新账号"
2. 填写用户名、邮箱、密码
3. 系统发送审批邮件到管理员邮箱
4. 管理员点击邮件中的"同意"或"拒绝"链接
5. 系统自动创建用户账号（如果同意）
6. 用户收到结果通知邮件

## 五、账号说明

| 类型 | 权限 |
|------|------|
| 管理员 | 增删改查人员、审批注册 |
| 普通用户 | 查看族谱、搜索 |
| 游客 | 查看族谱、搜索（无需登录） |

## 六、常见问题

### Q: 邮件发送失败？

1. 确保163邮箱开启了SMTP服务
2. 使用授权码而不是登录密码
3. 检查服务器能否访问 smtp.163.com:465

### Q: 如何修改管理员密码？

直接在数据库中修改，或通过API更新。

### Q: 如何备份数据？

备份 `after/family_tree.db` 文件即可。

