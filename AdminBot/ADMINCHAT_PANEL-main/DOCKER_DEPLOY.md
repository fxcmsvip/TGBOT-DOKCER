# Docker 镜像构建与部署指南

## 概述

本项目使用 Docker 镜像部署，镜像源为 GitHub Container Registry (GHCR)。

**默认镜像地址：**
- 后端：`fxcmsvip/adminchat-backend:latest`
- 前端：`fxcmsvip/adminchat-frontend:latest`

---

## 一、构建新镜像

### 1.1 本地构建

```bash
cd /path/to/AdminBot/ADMINCHAT_PANEL-main

# 构建后端镜像
docker build -t myregistry/adminchat-backend:latest ./backend

# 构建前端镜像
docker build -t myregistry/adminchat-frontend:latest ./frontend
```

### 1.2 带版本标签构建

```bash
# 获取版本号
VERSION=$(cat VERSION)
BUILD_VERSION=$(cat BUILD_VERSION)

# 构建带版本标签的镜像
docker build \
  --build-arg APP_VERSION=$VERSION \
  --build-arg BUILD_VERSION_ARG=$BUILD_VERSION \
  -t myregistry/adminchat-backend:$VERSION \
  -t myregistry/adminchat-backend:latest \
  ./backend

docker build \
  --build-arg APP_VERSION=$VERSION \
  --build-arg BUILD_VERSION_ARG=$BUILD_VERSION \
  -t myregistry/adminchat-frontend:$VERSION \
  -t myregistry/adminchat-frontend:latest \
  ./frontend
```

### 1.3 推送到镜像仓库

```bash
# 登录镜像仓库（以 Docker Hub 为例）
docker login

# 推送镜像
docker push myregistry/adminchat-backend:latest
docker push myregistry/adminchat-backend:$VERSION
docker push myregistry/adminchat-frontend:latest
docker push myregistry/adminchat-frontend:$VERSION
```

---

## 二、更换镜像拉取源

### 2.1 修改 docker-compose.full.yml

将镜像地址从 GHCR 改为你的私有仓库：

```yaml
# 修改前
backend:
  image: fxcmsvip/adminchat-backend:${IMAGE_TAG:-latest}

frontend:
  image: fxcmsvip/adminchat-frontend:${IMAGE_TAG:-latest}

# 修改后（示例：使用私有仓库）
backend:
  image: myregistry.com/adminchat/backend:${IMAGE_TAG:-latest}

frontend:
  image: myregistry.com/adminchat/frontend:${IMAGE_TAG:-latest}
```

### 2.2 通过环境变量指定

在 `.env` 文件中添加：

```bash
# 镜像仓库地址
IMAGE_REGISTRY=myregistry.com/adminchat
IMAGE_TAG=v1.0.0
```

然后修改 `docker-compose.full.yml`：

```yaml
backend:
  image: ${IMAGE_REGISTRY}/backend:${IMAGE_TAG:-latest}

frontend:
  image: ${IMAGE_REGISTRY}/frontend:${IMAGE_TAG:-latest}
```

---

## 三、部署新镜像

### 3.1 完整部署流程

```bash
# 1. 进入部署目录
cd /path/to/deploy

# 2. 拉取新镜像
docker compose -f docker-compose.full.yml pull

# 3. 重启服务（保留数据）
docker compose -f docker-compose.full.yml up -d

# 4. 运行数据库迁移（如有）
docker compose -f docker-compose.full.yml exec backend alembic upgrade head
```

### 3.2 仅更新应用（保留数据库）

```bash
# 拉取新镜像
docker compose -f docker-compose.full.yml pull backend frontend

# 重启应用服务
docker compose -f docker-compose.full.yml up -d backend frontend

# 运行数据库迁移
docker compose -f docker-compose.full.yml exec backend alembic upgrade head
```

### 3.3 滚动更新（零停机）

```bash
# 逐个更新服务
docker compose -f docker-compose.full.yml pull backend
docker compose -f docker-compose.full.yml up -d --no-deps backend

# 等待后端健康检查通过
sleep 10

docker compose -f docker-compose.full.yml pull frontend
docker compose -f docker-compose.full.yml up -d --no-deps frontend
```

---

## 四、一键构建部署脚本

创建 `build-and-deploy.sh`：

```bash
#!/bin/bash
set -e

# 配置
REGISTRY="myregistry.com/adminchat"
VERSION=$(cat VERSION)
BUILD_VERSION=$(cat BUILD_VERSION)

echo "=== 构建镜像 ==="
echo "版本: $VERSION ($BUILD_VERSION)"

# 构建后端
docker build \
  --build-arg APP_VERSION=$VERSION \
  --build-arg BUILD_VERSION_ARG=$BUILD_VERSION \
  -t $REGISTRY/backend:$VERSION \
  -t $REGISTRY/backend:latest \
  ./backend

# 构建前端
docker build \
  --build-arg APP_VERSION=$VERSION \
  --build-arg BUILD_VERSION_ARG=$BUILD_VERSION \
  -t $REGISTRY/frontend:$VERSION \
  -t $REGISTRY/frontend:latest \
  ./frontend

echo "=== 推送镜像 ==="
docker push $REGISTRY/backend:$VERSION
docker push $REGISTRY/backend:latest
docker push $REGISTRY/frontend:$VERSION
docker push $REGISTRY/frontend:latest

echo "=== 部署完成 ==="
echo "镜像已推送到: $REGISTRY"
echo "后端: $REGISTRY/backend:$VERSION"
echo "前端: $REGISTRY/frontend:$VERSION"
```

使用方法：

```bash
chmod +x build-and-deploy.sh
./build-and-deploy.sh
```

---

## 五、私有仓库配置

### 5.1 Docker Hub

```bash
docker login
docker push username/adminchat-backend:latest
```

### 5.2 阿里云容器镜像服务

```bash
# 登录
docker login --username=your_username registry.cn-hangzhou.aliyuncs.com

# 打标签
docker tag adminchat-backend:latest registry.cn-hangzhou.aliyuncs.com/your_namespace/adminchat-backend:latest

# 推送
docker push registry.cn-hangzhou.aliyuncs.com/your_namespace/adminchat-backend:latest
```

### 5.3 腾讯云容器镜像服务

```bash
# 登录
docker login --username=your_username ccr.ccs.tencentyun.com

# 打标签
docker tag adminchat-backend:latest ccr.ccs.tencentyun.com/your_namespace/adminchat-backend:latest

# 推送
docker push ccr.ccs.tencentyun.com/your_namespace/adminchat-backend:latest
```

### 5.4 自建 Harbor

```bash
# 登录
docker login harbor.yourdomain.com

# 打标签
docker tag adminchat-backend:latest harbor.yourdomain.com/adminchat/backend:latest

# 推送
docker push harbor.yourdomain.com/adminchat/backend:latest
```

---

## 六、常见问题

### Q1: 如何查看当前运行的镜像版本？

```bash
docker inspect adminchat-backend --format='{{.Config.Image}}'
docker inspect adminchat-frontend --format='{{.Config.Image}}'
```

### Q2: 如何回滚到旧版本？

```bash
# 指定旧版本标签
IMAGE_TAG=v1.0.0 docker compose -f docker-compose.full.yml up -d
```

### Q3: 构建时如何使用国内镜像加速？

**后端 Dockerfile 修改：**

```dockerfile
FROM python:3.12-slim

# 使用阿里云镜像
RUN sed -i 's/deb.debian.org/mirrors.aliyun.com/g' /etc/apt/sources.list.d/debian.sources

WORKDIR /app

COPY requirements.txt .
# 使用清华源安装 Python 包
RUN pip install --no-cache-dir -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple
```

**前端 Dockerfile 修改：**

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app

# 使用淘宝镜像
RUN npm config set registry https://registry.npmmirror.com

COPY package.json package-lock.json ./
RUN npm ci
```

### Q4: 如何清理旧镜像？

```bash
# 清理悬空镜像
docker image prune -f

# 清理指定仓库的旧镜像（保留 latest 和当前版本）
docker images | grep adminchat | grep -v latest | grep -v v1.0.0 | awk '{print $3}' | xargs docker rmi -f
```

---

## 七、CI/CD 集成示例

### GitHub Actions

```yaml
name: Build and Push

on:
  push:
    tags:
      - 'v*'

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      
      - name: Build and push backend
        uses: docker/build-push-action@v5
        with:
          context: ./backend
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/backend:${{ github.ref_name }}
            ghcr.io/${{ github.repository }}/backend:latest
      
      - name: Build and push frontend
        uses: docker/build-push-action@v5
        with:
          context: ./frontend
          push: true
          tags: |
            ghcr.io/${{ github.repository }}/frontend:${{ github.ref_name }}
            ghcr.io/${{ github.repository }}/frontend:latest
```

---

## 八、快速命令参考

| 操作 | 命令 |
|------|------|
| 构建后端 | `docker build -t adminchat-backend ./backend` |
| 构建前端 | `docker build -t adminchat-frontend ./frontend` |
| 推送镜像 | `docker push myregistry/adminchat-backend:latest` |
| 拉取镜像 | `docker compose pull` |
| 重启服务 | `docker compose up -d` |
| 查看日志 | `docker compose logs -f backend` |
| 进入容器 | `docker compose exec backend bash` |
| 运行迁移 | `docker compose exec backend alembic upgrade head` |
| 查看版本 | `docker compose exec backend cat /app/VERSION` |
