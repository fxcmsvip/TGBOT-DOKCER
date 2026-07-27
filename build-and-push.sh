#!/bin/bash
# AdminBot 镜像构建和推送脚本
# 用法: ./build-and-push.sh [tag]
#
# 环境变量:
#   DOCKER_TOKEN    - Docker Hub 个人访问令牌
#   GITHUB_TOKEN    - GitHub 个人访问令牌 (可选，用于推送到 GHCR)

set -e

# 配置
TAG=${1:-latest}
REGISTRY="docker.io/fxcmsvip"
GITHUB_REGISTRY="ghcr.io/fxcmsvip"

# 颜色输出
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 检查 Docker
if ! command -v docker &> /dev/null; then
    log_error "Docker 未安装"
    exit 1
fi

# 检查 Docker Token
if [ -z "$DOCKER_TOKEN" ]; then
    log_error "请设置 DOCKER_TOKEN 环境变量"
    echo "用法: DOCKER_TOKEN=your_token ./build-and-push.sh"
    exit 1
fi

# 登录 Docker Hub
log_info "登录 Docker Hub..."
echo "$DOCKER_TOKEN" | docker login -u fxcmsvip --password-stdin

# 构建 ADMINCHAT_PANEL 镜像
log_info "构建 ADMINCHAT_PANEL 后端镜像..."
cd /workspace/projects/AdminBot/ADMINCHAT_PANEL-main
docker build \
    --build-arg APP_VERSION=1.1.8 \
    --build-arg BUILD_VERSION_ARG=20260410.0098 \
    -t ${REGISTRY}/adminchat-backend:${TAG} \
    -t ${GITHUB_REGISTRY}/adminchat-backend:${TAG} \
    ./backend

log_info "构建 ADMINCHAT_PANEL 前端镜像..."
docker build \
    --build-arg APP_VERSION=1.1.8 \
    --build-arg BUILD_VERSION_ARG=20260410.0098 \
    -t ${REGISTRY}/adminchat-frontend:${TAG} \
    -t ${GITHUB_REGISTRY}/adminchat-frontend:${TAG} \
    ./frontend

# 构建 ACP_Market 镜像
log_info "构建 ACP_Market 后端镜像..."
cd /workspace/projects/AdminBot/ACP_Market-main
docker build \
    -f deploy/Dockerfile.backend \
    -t ${REGISTRY}/acp-market-backend:${TAG} \
    -t ${GITHUB_REGISTRY}/acp-market-backend:${TAG} \
    .

log_info "构建 ACP_Market 前端镜像..."
docker build \
    -f deploy/Dockerfile.frontend \
    -t ${REGISTRY}/acp-market-frontend:${TAG} \
    -t ${GITHUB_REGISTRY}/acp-market-frontend:${TAG} \
    .

# 推送镜像
log_info "推送镜像到 Docker Hub..."
docker push ${REGISTRY}/adminchat-backend:${TAG}
docker push ${REGISTRY}/adminchat-frontend:${TAG}
docker push ${REGISTRY}/acp-market-backend:${TAG}
docker push ${REGISTRY}/acp-market-frontend:${TAG}

# 可选：推送到 GHCR
if [ -n "$GITHUB_TOKEN" ]; then
    log_info "登录 GitHub Container Registry..."
    echo "$GITHUB_TOKEN" | docker login ghcr.io -u fxcmsvip --password-stdin
    
    log_info "推送镜像到 GHCR..."
    docker push ${GITHUB_REGISTRY}/adminchat-backend:${TAG}
    docker push ${GITHUB_REGISTRY}/adminchat-frontend:${TAG}
    docker push ${GITHUB_REGISTRY}/acp-market-backend:${TAG}
    docker push ${GITHUB_REGISTRY}/acp-market-frontend:${TAG}
fi

log_info "构建和推送完成！"
echo ""
echo "镜像列表:"
echo "  - ${REGISTRY}/adminchat-backend:${TAG}"
echo "  - ${REGISTRY}/adminchat-frontend:${TAG}"
echo "  - ${REGISTRY}/acp-market-backend:${TAG}"
echo "  - ${REGISTRY}/acp-market-frontend:${TAG}"
