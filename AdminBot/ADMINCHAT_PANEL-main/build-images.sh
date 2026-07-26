#!/bin/bash
# ============================================================
# AdminChat Panel - Docker 镜像构建脚本
# ============================================================
#
# 用法:
#   ./build-images.sh                    # 构建 latest 标签
#   ./build-images.sh --push             # 构建并推送
#   ./build-images.sh --registry xxx     # 指定镜像仓库
#   ./build-images.sh --tag v1.0.0       # 指定版本标签
#
# ============================================================

set -e

# 默认配置
REGISTRY=""
TAG="latest"
PUSH=false
VERSION=""
BUILD_VERSION=""

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --tag)
            TAG="$2"
            shift 2
            ;;
        --push)
            PUSH=true
            shift
            ;;
        --help|-h)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --registry <地址>   镜像仓库地址 (如: myregistry.com/adminchat)"
            echo "  --tag <标签>        镜像标签 (默认: latest)"
            echo "  --push              构建后推送到仓库"
            echo "  --help, -h          显示帮助"
            exit 0
            ;;
        *)
            echo "未知参数: $1"
            exit 1
            ;;
    esac
done

# 获取项目根目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 读取版本号
if [ -f "VERSION" ]; then
    VERSION=$(cat VERSION)
fi
if [ -f "BUILD_VERSION" ]; then
    BUILD_VERSION=$(cat BUILD_VERSION)
fi

echo "============================================"
echo "  AdminChat Panel - Docker 镜像构建"
echo "============================================"
echo "版本: ${VERSION:-unknown} (${BUILD_VERSION:-unknown})"
echo "标签: $TAG"
echo "仓库: ${REGISTRY:-本地}"
echo "推送: $PUSH"
echo "============================================"
echo ""

# 构建镜像名称
BACKEND_IMAGE="adminchat-backend"
FRONTEND_IMAGE="adminchat-frontend"

if [ -n "$REGISTRY" ]; then
    BACKEND_IMAGE="$REGISTRY/backend"
    FRONTEND_IMAGE="$REGISTRY/frontend"
fi

# 构建后端镜像
echo "[1/2] 构建后端镜像..."
docker build \
    --build-arg APP_VERSION="${VERSION:-dev}" \
    --build-arg BUILD_VERSION_ARG="${BUILD_VERSION:-dev}" \
    -t "$BACKEND_IMAGE:$TAG" \
    ${VERSION:+-t "$BACKEND_IMAGE:$VERSION"} \
    ./backend

echo "✓ 后端镜像构建完成: $BACKEND_IMAGE:$TAG"
echo ""

# 构建前端镜像
echo "[2/2] 构建前端镜像..."
docker build \
    --build-arg APP_VERSION="${VERSION:-dev}" \
    --build-arg BUILD_VERSION_ARG="${BUILD_VERSION:-dev}" \
    -t "$FRONTEND_IMAGE:$TAG" \
    ${VERSION:+-t "$FRONTEND_IMAGE:$VERSION"} \
    ./frontend

echo "✓ 前端镜像构建完成: $FRONTEND_IMAGE:$TAG"
echo ""

# 推送镜像
if [ "$PUSH" = true ]; then
    if [ -z "$REGISTRY" ]; then
        echo "错误: 推送需要指定 --registry 参数"
        exit 1
    fi
    
    echo "============================================"
    echo "  推送镜像到 $REGISTRY"
    echo "============================================"
    
    docker push "$BACKEND_IMAGE:$TAG"
    if [ -n "$VERSION" ]; then
        docker push "$BACKEND_IMAGE:$VERSION"
    fi
    
    docker push "$FRONTEND_IMAGE:$TAG"
    if [ -n "$VERSION" ]; then
        docker push "$FRONTEND_IMAGE:$VERSION"
    fi
    
    echo ""
    echo "✓ 镜像推送完成"
fi

echo ""
echo "============================================"
echo "  构建完成"
echo "============================================"
echo ""
echo "后端镜像: $BACKEND_IMAGE:$TAG"
echo "前端镜像: $FRONTEND_IMAGE:$TAG"
echo ""
echo "下一步:"
echo "  1. 修改 docker-compose.full.yml 中的镜像地址"
echo "  2. 运行: docker compose -f docker-compose.full.yml pull"
echo "  3. 运行: docker compose -f docker-compose.full.yml up -d"
echo ""
