#!/bin/bash
# 一键构建并推送镜像
set -e

TAG=${1:-latest}

# 检查 Docker Token
if [ -z "$DOCKER_TOKEN" ]; then
    echo "错误: 请先设置 DOCKER_TOKEN 环境变量"
    echo "export DOCKER_TOKEN=你的docker_token"
    exit 1
fi

echo "=== 登录 Docker Hub ==="
echo "$DOCKER_TOKEN" | docker login -u fxcmsvip --password-stdin

echo ""
echo "=== 构建 ADMINCHAT_PANEL 后端 ==="
cd /workspace/projects/AdminBot/ADMINCHAT_PANEL-main
docker build -t fxcmsvip/adminchat-backend:${TAG} ./backend
docker push fxcmsvip/adminchat-backend:${TAG}

echo ""
echo "=== 构建 ADMINCHAT_PANEL 前端 ==="
docker build -t fxcmsvip/adminchat-frontend:${TAG} ./frontend
docker push fxcmsvip/adminchat-frontend:${TAG}

echo ""
echo "=== 构建 ACP_Market 后端 ==="
cd /workspace/projects/AdminBot/ACP_Market-main
docker build -t fxcmsvip/acp-backend:${TAG} ./backend
docker push fxcmsvip/acp-backend:${TAG}

echo ""
echo "=== 构建 ACP_Market 前端 ==="
docker build -t fxcmsvip/acp-frontend:${TAG} -f deploy/Dockerfile.frontend ./frontend
docker push fxcmsvip/acp-frontend:${TAG}

echo ""
echo "=== 全部完成 ==="
echo "镜像列表:"
echo "  fxcmsvip/adminchat-backend:${TAG}"
echo "  fxcmsvip/adminchat-frontend:${TAG}"
echo "  fxcmsvip/acp-backend:${TAG}"
echo "  fxcmsvip/acp-frontend:${TAG}"
