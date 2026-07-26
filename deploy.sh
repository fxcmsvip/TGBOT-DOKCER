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

# 统一账户密码配置
ADMIN_USERNAME="adminchat"
ADMIN_PASSWORD="adminchat"
ADMIN_EMAIL="adminchat@adminchat.local"

# 数据库配置（共用）
DB_HOST="localhost"
DB_PORT="5432"
DB_USER="adminchat"
DB_PASSWORD="adminchat"
REDIS_HOST="localhost"
REDIS_PORT="6379"
REDIS_PASSWORD=""

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

# 检查服务是否可用
check_service() {
    local host=$1
    local port=$2
    local name=$3
    
    if nc -z "$host" "$port" 2>/dev/null; then
        log_info "$name 已在运行 ($host:$port)"
        return 0
    else
        log_warn "$name 未运行 ($host:$port)"
        return 1
    fi
}

# 检查端口是否被占用（用于应用端口）
check_app_port() {
    local port=$1
    local name=$2
    if ss -tlnp 2>/dev/null | grep -q ":${port} "; then
        log_warn "端口 $port ($name) 已被占用"
        return 1
    fi
    log_info "端口 $port ($name) 可用"
    return 0
}

# 检查数据库和 Redis
check_databases() {
    log_info "检查数据库服务..."
    
    DB_AVAILABLE=true
    REDIS_AVAILABLE=true
    
    # 检查 PostgreSQL
    if check_service "$DB_HOST" "$DB_PORT" "PostgreSQL"; then
        log_success "PostgreSQL 可用，将使用现有数据库"
        USE_EXISTING_DB=true
    else
        log_warn "PostgreSQL 不可用，将启动容器数据库"
        USE_EXISTING_DB=false
        # 检查端口是否可以被容器使用
        if check_app_port "$DB_PORT" "PostgreSQL Container"; then
            log_info "端口 $DB_PORT 可用于启动 PostgreSQL 容器"
        else
            log_error "端口 $DB_PORT 被占用但 PostgreSQL 不可用，请检查"
            DB_AVAILABLE=false
        fi
    fi
    
    # 检查 Redis
    if check_service "$REDIS_HOST" "$REDIS_PORT" "Redis"; then
        log_success "Redis 可用，将使用现有 Redis"
        USE_EXISTING_REDIS=true
    else
        log_warn "Redis 不可用，将启动容器 Redis"
        USE_EXISTING_REDIS=false
        if check_app_port "$REDIS_PORT" "Redis Container"; then
            log_info "端口 $REDIS_PORT 可用于启动 Redis 容器"
        else
            log_error "端口 $REDIS_PORT 被占用但 Redis 不可用，请检查"
            REDIS_AVAILABLE=false
        fi
    fi
    
    if [ "$DB_AVAILABLE" = false ] || [ "$REDIS_AVAILABLE" = false ]; then
        log_error "数据库检查失败，请手动解决端口冲突"
        exit 1
    fi
}

# 检查应用端口
check_app_ports() {
    log_info "检查应用端口..."
    
    local ports_ok=true
    
    # ADMINCHAT_PANEL 应用端口（不检查数据库端口，因为可能共用）
    if [ "$DEPLOY_ADMIN" = true ]; then
        check_app_port 8000 "Backend API" || ports_ok=false
        check_app_port 3000 "Frontend" || ports_ok=false
    fi
    
    # ACP_Market 应用端口
    if [ "$DEPLOY_ACP" = true ]; then
        check_app_port 8001 "ACP Backend API" || ports_ok=false
        check_app_port 3001 "ACP Frontend" || ports_ok=false
    fi
    
    if [ "$ports_ok" = false ]; then
        log_error "部分应用端口被占用，请停止相关服务后重试"
        log_info "提示: 使用 'ss -tlnp' 查看端口占用情况"
        exit 1
    fi
    
    log_success "应用端口检查通过"
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
            sudo $PKG_MANAGER install -y epel-release 2>/dev/null || true
            sudo $PKG_MANAGER install -y \
                curl \
                wget \
                git \
                ca-certificates \
                gnupg \
                netcat \
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
                netcat-openbsd \
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
            sudo $PKG_MANAGER remove -y docker \
                docker-client \
                docker-client-latest \
                docker-common \
                docker-latest \
                docker-latest-logrotate \
                docker-logrotate \
                docker-engine 2>/dev/null || true
            
            sudo $PKG_MANAGER install -y dnf-plugins-core
            sudo $PKG_MANAGER config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo
            sudo $PKG_MANAGER install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
        ubuntu|debian)
            curl -fsSL https://download.docker.com/linux/$OS/gpg | sudo gpg --dearmor -o /usr/share/keyrings/docker-archive-keyring.gpg
            echo "deb [arch=$(dpkg --print-architecture) signed-by=/usr/share/keyrings/docker-archive-keyring.gpg] https://download.docker.com/linux/$OS $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
            sudo $PKG_MANAGER update
            sudo $PKG_MANAGER install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
            ;;
    esac
    
    sudo systemctl start docker
    sudo systemctl enable docker
    sudo usermod -aG docker $USER 2>/dev/null || true
    
    log_success "Docker 安装完成"
}

# 生成 .env 文件
generate_env() {
    local project_dir=$1
    local project_name=$2
    
    log_info "生成 $project_name 的 .env 文件..."
    
    # 确定数据库连接配置
    if [ "$USE_EXISTING_DB" = true ]; then
        # 使用现有数据库
        DB_CONFIG="POSTGRES_HOST=host.docker.internal
POSTGRES_PORT=$DB_PORT
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD"
        REDIS_CONFIG="REDIS_HOST=host.docker.internal
REDIS_PORT=$REDIS_PORT"
        if [ -n "$REDIS_PASSWORD" ]; then
            REDIS_CONFIG="$REDIS_CONFIG
REDIS_PASSWORD=$REDIS_PASSWORD"
        fi
    else
        # 使用容器数据库
        DB_CONFIG="POSTGRES_HOST=db
POSTGRES_PORT=5432
POSTGRES_USER=$DB_USER
POSTGRES_PASSWORD=$DB_PASSWORD"
        REDIS_CONFIG="REDIS_HOST=redis
REDIS_PORT=6379"
    fi
    
    cat > "$project_dir/.env" << EOF
# ============================================
# $project_name 环境配置
# 生成时间: $(date)
# ============================================

# 管理员账户（统一配置）
INIT_ADMIN_USERNAME=$ADMIN_USERNAME
INIT_ADMIN_PASSWORD=$ADMIN_PASSWORD
INIT_ADMIN_EMAIL=$ADMIN_EMAIL

# 数据库配置
$DB_CONFIG
POSTGRES_DB=${project_name,,}_db

# Redis 配置
$REDIS_CONFIG

# 安全配置
JWT_SECRET_KEY=$(openssl rand -hex 32)
OAUTH_ENCRYPTION_KEY=$(openssl rand -hex 32)

# CORS 配置（根据实际域名修改）
CORS_ORIGINS=["http://localhost:3000","http://localhost:3001"]

# AI 配置
AI_PROVIDER=openai
OPENAI_API_KEY=your_api_key_here
OPENAI_BASE_URL=https://api.openai.com/v1
OPENAI_MODEL=gpt-4o-mini

# Ollama (本地 AI)
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1

# Coze (扣子)
COZE_API_KEY=your_coze_api_key
COZE_BOT_ID=your_coze_bot_id

# 智能体系统
AGENT_DEFAULT_MODEL=gpt-4o-mini
AGENT_MAX_HISTORY=20

# Bot 源码管理
BOT_SOURCE_DIR=/app/bot_sources
BOT_LOCAL_EXECUTION=false

# 定时任务
TASK_SCHEDULER_ENABLED=true
TASK_SCHEDULER_TIMEZONE=UTC
EOF
    
    log_success "$project_name .env 文件已生成"
}

# 部署 ADMINCHAT_PANEL
deploy_admin() {
    if [ "$DEPLOY_ADMIN" != true ]; then
        return
    fi
    
    log_info "部署 ADMINCHAT_PANEL..."
    
    local project_dir="$SCRIPT_DIR/AdminBot/ADMINCHAT_PANEL-main"
    
    if [ ! -d "$project_dir" ]; then
        log_error "ADMINCHAT_PANEL 目录不存在: $project_dir"
        exit 1
    fi
    
    # 生成 .env
    generate_env "$project_dir" "ADMINCHAT_PANEL"
    
    # 进入项目目录
    cd "$project_dir"
    
    # 构建并启动
    if [ "$USE_EXISTING_DB" = true ] && [ "$USE_EXISTING_REDIS" = true ]; then
        # 使用现有数据库，只启动应用
        log_info "使用现有数据库，启动应用容器..."
        docker compose up -d backend frontend
    else
        # 启动所有服务（包括数据库）
        log_info "启动所有服务..."
        docker compose up -d
    fi
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if curl -s http://localhost:8000/health > /dev/null 2>&1; then
        log_success "ADMINCHAT_PANEL 后端启动成功"
    else
        log_warn "ADMINCHAT_PANEL 后端可能未完全启动，请检查日志"
    fi
    
    if curl -s http://localhost:3000 > /dev/null 2>&1; then
        log_success "ADMINCHAT_PANEL 前端启动成功"
    else
        log_warn "ADMINCHAT_PANEL 前端可能未完全启动，请检查日志"
    fi
}

# 部署 ACP_Market
deploy_acp() {
    if [ "$DEPLOY_ACP" != true ]; then
        return
    fi
    
    log_info "部署 ACP_Market..."
    
    local project_dir="$SCRIPT_DIR/AdminBot/ACP_Market-main"
    
    if [ ! -d "$project_dir" ]; then
        log_error "ACP_Market 目录不存在: $project_dir"
        exit 1
    fi
    
    # 生成 .env
    generate_env "$project_dir" "ACP_Market"
    
    # 进入项目目录
    cd "$project_dir"
    
    # 构建并启动
    if [ "$USE_EXISTING_DB" = true ] && [ "$USE_EXISTING_REDIS" = true ]; then
        log_info "使用现有数据库，启动应用容器..."
        docker compose up -d backend frontend
    else
        log_info "启动所有服务..."
        docker compose up -d
    fi
    
    # 等待服务启动
    log_info "等待服务启动..."
    sleep 10
    
    # 检查服务状态
    if curl -s http://localhost:8001/health > /dev/null 2>&1; then
        log_success "ACP_Market 后端启动成功"
    else
        log_warn "ACP_Market 后端可能未完全启动，请检查日志"
    fi
}

# 显示部署信息
show_info() {
    echo ""
    echo "============================================"
    echo -e "${GREEN}部署完成！${NC}"
    echo "============================================"
    echo ""
    echo "统一账户信息:"
    echo "  用户名: $ADMIN_USERNAME"
    echo "  密码: $ADMIN_PASSWORD"
    echo ""
    
    if [ "$DEPLOY_ADMIN" = true ]; then
        echo "ADMINCHAT_PANEL:"
        echo "  前端: http://localhost:3000"
        echo "  后端 API: http://localhost:8000"
        echo "  API 文档: http://localhost:8000/docs"
        echo ""
    fi
    
    if [ "$DEPLOY_ACP" = true ]; then
        echo "ACP_Market:"
        echo "  前端: http://localhost:3001"
        echo "  后端 API: http://localhost:8001"
        echo ""
    fi
    
    if [ "$USE_EXISTING_DB" = true ]; then
        echo "数据库: 使用现有 PostgreSQL ($DB_HOST:$DB_PORT)"
    else
        echo "数据库: 容器内 PostgreSQL"
    fi
    
    if [ "$USE_EXISTING_REDIS" = true ]; then
        echo "Redis: 使用现有 Redis ($REDIS_HOST:$REDIS_PORT)"
    else
        echo "Redis: 容器内 Redis"
    fi
    
    echo ""
    echo "查看日志:"
    echo "  cd AdminBot/ADMINCHAT_PANEL-main && docker compose logs -f"
    echo ""
    echo "============================================"
}

# 主流程
main() {
    echo ""
    echo "============================================"
    echo "  AdminBot 一键部署脚本"
    echo "============================================"
    echo ""
    
    detect_os
    install_dependencies
    install_docker
    check_databases
    check_app_ports
    deploy_admin
    deploy_acp
    show_info
}

main
