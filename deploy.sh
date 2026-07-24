#!/bin/bash
#
# AdminBot 一键部署脚本
# 支持 CentOS 9 / Ubuntu 22.04+ / Debian 12+
#
# 用法:
#   chmod +x deploy.sh
#   ./deploy.sh [选项]
#
# 选项:
#   --admin-only    仅部署 ADMINCHAT_PANEL
#   --acp-only      仅部署 ACP_Market
#   --all           部署所有项目 (默认)
#   --skip-deps     跳过依赖安装
#   --help          显示帮助
#

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }

# 默认配置
DEPLOY_ADMIN=true
DEPLOY_ACP=true
SKIP_DEPS=false
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 解析参数
while [[ $# -gt 0 ]]; do
    case $1 in
        --admin-only)
            DEPLOY_ACP=false
            shift
            ;;
        --acp-only)
            DEPLOY_ADMIN=false
            shift
            ;;
        --all)
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --help)
            head -20 "$0" | tail -15
            exit 0
            ;;
        *)
            log_error "未知选项: $1"
            exit 1
            ;;
    esac
done

# 检测操作系统
detect_os() {
    if [ -f /etc/os-release ]; then
        . /etc/os-release
        OS=$ID
        OS_VERSION=$VERSION_ID
    else
        log_error "无法检测操作系统"
        exit 1
    fi
    
    log_info "检测到操作系统: $OS $OS_VERSION"
    
    case $OS in
        centos|rhel|rocky|alma)
            PKG_MANAGER="dnf"
            ;;
        ubuntu|debian)
            PKG_MANAGER="apt-get"
            ;;
        *)
            log_warn "未测试的操作系统: $OS，尝试继续..."
            PKG_MANAGER="apt-get"
            ;;
    esac
}

# 检查端口是否被占用
check_port() {
    local port=$1
    local name=$2
    if ss -tlnp | grep -q ":${port} "; then
        log_error "端口 $port ($name) 已被占用"
        return 1
    fi
    log_info "端口 $port ($name) 可用"
    return 0
}

# 检查所有必需端口
check_ports() {
    log_info "检查端口占用..."
    
    local ports_ok=true
    
    # ADMINCHAT_PANEL 端口
    if [ "$DEPLOY_ADMIN" = true ]; then
        check_port 5432 "PostgreSQL" || ports_ok=false
        check_port 6379 "Redis" || ports_ok=false
        check_port 8000 "Backend API" || ports_ok=false
        check_port 3000 "Frontend" || ports_ok=false
    fi
    
    # ACP_Market 端口
    if [ "$DEPLOY_ACP" = true ]; then
        check_port 5433 "ACP PostgreSQL" || ports_ok=false
        check_port 6380 "ACP Redis" || ports_ok=false
        check_port 8001 "ACP Backend API" || ports_ok=false
        check_port 3001 "ACP Frontend" || ports_ok=false
    fi
    
    if [ "$ports_ok" = false ]; then
        log_error "部分端口被占用，请停止相关服务后重试"
        log_info "提示: 使用 'ss -tlnp' 查看端口占用情况"
        exit 1
    fi
    
    log_success "所有端口检查通过"
}

# 安装依赖
install_dependencies() {
    if [ "$SKIP_DEPS" = true ]; then
        log_warn "跳过依赖安装"
        return
    fi
    
    log_info "安装系统依赖..."
    
    case $PKG_MANAGER in
        dnf)
            # CentOS/RHEL/Rocky/Alma
            sudo $PKG_MANAGER install -y epel-release
            sudo $PKG_MANAGER install -y \
                curl \
                wget \
                git \
                ca-certificates \
                gnupg \
                lsb_release \
                python3 \
                python3-pip
            ;;
        apt-get)
            # Ubuntu/Debian
            sudo $PKG_MANAGER update
            sudo $PKG_MANAGER install -y \
                curl \
                wget \
                git \
                ca-certificates \
                gnupg \
                lsb-release \
                python3 \
                python3-pip
            ;;
    esac
    
    log_success "系统依赖安装完成"
}

# 安装 Docker
install_docker() {
    if command -v docker &> /dev/null; then
        log_info "Docker 已安装: $(docker --version)"
        return
    fi
    
    log_info "安装 Docker..."
    
    case $OS in
        centos|rhel|rocky|alma)
            # 移除旧版本
            sudo $PKG_MANAGER remove -y docker \
                docker-client \
                docker-client-latest \
                docker-common \
                docker-latest \
                docker-latest-logrotate \
                docker-logrotate \
                docker-engine 2>/dev/null || true
            
            # 添加 Docker 仓库
            sudo $PKG_MANAGER install -y dnf-plugins-core
            sudo $PKG_MANAGER config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            
            # 安装 Docker
            sudo $PKG_MANAGER install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            
            # 启动并启用 Docker
            sudo systemctl start docker
            sudo systemctl enable docker
            ;;
            
        ubuntu|debian)
            # 移除旧版本
            sudo $PKG_MANAGER remove -y docker docker-engine docker.io containerd runc 2>/dev/null || true
            
            # 添加 Docker 官方 GPG key
            sudo install -m 0755 -d /etc/apt/keyrings
            curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
            sudo chmod a+r /etc/apt/keyrings/docker.gpg
            
            # 添加 Docker 仓库
            echo \
              "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS \
              $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
              sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            
            # 安装 Docker
            sudo $PKG_MANAGER update
            sudo $PKG_MANAGER install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
    esac
    
    # 将当前用户添加到 docker 组
    sudo usermod -aG docker $USER 2>/dev/null || true
    
    log_success "Docker 安装完成"
}

# 安装 Docker Compose (如果未通过插件安装)
install_docker_compose() {
    if docker compose version &> /dev/null; then
        log_info "Docker Compose 已安装: $(docker compose version)"
        return
    fi
    
    if command -v docker-compose &> /dev/null; then
        log_info "docker-compose 已安装: $(docker-compose --version)"
        return
    fi
    
    log_info "安装 Docker Compose..."
    
    # 下载最新版本的 Docker Compose
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
    
    log_success "Docker Compose 安装完成"
}

# 部署 ADMINCHAT_PANEL
deploy_admin() {
    log_info "部署 ADMINCHAT_PANEL..."
    
    cd "$SCRIPT_DIR/AdminBot/ADMINCHAT_PANEL-main"
    
    # 检查 .env 文件
    if [ ! -f .env ]; then
        log_warn ".env 文件不存在，从 .env.example 创建..."
        cp .env.example .env
        log_warn "请编辑 .env 文件配置数据库密码和 JWT 密钥"
    fi
    
    # 构建并启动
    log_info "构建 Docker 镜像..."
    docker compose build
    
    log_info "启动服务..."
    docker compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if docker compose ps | grep -q "Up"; then
        log_success "ADMINCHAT_PANEL 部署成功"
        log_info "前端地址: http://localhost:3000"
        log_info "后端地址: http://localhost:8000"
        log_info "默认账户: admin / admin123"
    else
        log_error "ADMINCHAT_PANEL 启动失败，请检查日志"
        docker compose logs --tail=50
    fi
}

# 部署 ACP_Market
deploy_acp() {
    log_info "部署 ACP_Market..."
    
    cd "$SCRIPT_DIR/AdminBot/ACP_Market-main"
    
    # 检查 .env 文件
    if [ ! -f .env ]; then
        log_warn ".env 文件不存在，从 .env.example 创建..."
        cp .env.example .env
        log_warn "请编辑 .env 文件配置数据库密码和 Stripe 密钥"
    fi
    
    # 构建并启动
    log_info "构建 Docker 镜像..."
    docker compose build
    
    log_info "启动服务..."
    docker compose up -d
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if docker compose ps | grep -q "Up"; then
        log_success "ACP_Market 部署成功"
        log_info "前端地址: http://localhost:3001"
        log_info "后端地址: http://localhost:8001"
    else
        log_error "ACP_Market 启动失败，请检查日志"
        docker compose logs --tail=50
    fi
}

# 主函数
main() {
    echo ""
    echo "========================================"
    echo "    AdminBot 一键部署脚本"
    echo "========================================"
    echo ""
    
    # 检测操作系统
    detect_os
    
    # 检查端口
    check_ports
    
    # 安装依赖
    install_dependencies
    
    # 安装 Docker
    install_docker
    install_docker_compose
    
    # 部署项目
    if [ "$DEPLOY_ADMIN" = true ]; then
        deploy_admin
    fi
    
    if [ "$DEPLOY_ACP" = true ]; then
        deploy_acp
    fi
    
    echo ""
    echo "========================================"
    log_success "部署完成!"
    echo "========================================"
    echo ""
    
    if [ "$DEPLOY_ADMIN" = true ]; then
        echo "ADMINCHAT_PANEL:"
        echo "  前端: http://localhost:3000"
        echo "  后端: http://localhost:8000"
        echo "  账户: admin / admin123"
        echo ""
    fi
    
    if [ "$DEPLOY_ACP" = true ]; then
        echo "ACP_Market:"
        echo "  前端: http://localhost:3001"
        echo "  后端: http://localhost:8001"
        echo ""
    fi
    
    echo "查看日志:"
    echo "  ADMIN: cd AdminBot/ADMINCHAT_PANEL-main && docker compose logs -f"
    echo "  ACP:   cd AdminBot/ACP_Market-main && docker compose logs -f"
    echo ""
}

main "$@"
