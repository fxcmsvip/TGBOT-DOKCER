#!/bin/bash
# =============================================================================
# AdminBot 本地一键部署脚本
# 部署本地代码（非 Docker 镜像）
# =============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# 日志函数
log_info() { echo -e "${GREEN}[INFO]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[ERROR]${NC} $1"; }
log_step() { echo -e "${BLUE}[STEP]${NC} $1"; }

# 默认配置
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR/AdminBot"
ADMIN_DIR="$PROJECT_DIR/ADMINCHAT_PANEL-main"
ACP_DIR="$PROJECT_DIR/ACP_Market-main"

# 统一账户配置
ADMIN_USER="adminchat"
ADMIN_PASS="adminchat"
DB_USER="adminchat"
DB_PASS="adminchat"

# 端口配置
ADMIN_BACKEND_PORT=8000
ADMIN_FRONTEND_PORT=3000
ACP_BACKEND_PORT=8001
ACP_FRONTEND_PORT=3001
POSTGRES_PORT=5432
REDIS_PORT=6379

# 参数解析
SKIP_DEPS=false
ADMIN_ONLY=false
ACP_ONLY=false

for arg in "$@"; do
    case $arg in
        --skip-deps) SKIP_DEPS=true ;;
        --admin-only) ADMIN_ONLY=true ;;
        --acp-only) ACP_ONLY=true ;;
        --help)
            echo "用法: $0 [选项]"
            echo ""
            echo "选项:"
            echo "  --skip-deps    跳过依赖安装"
            echo "  --admin-only   仅部署 ADMINCHAT_PANEL"
            echo "  --acp-only     仅部署 ACP_Market"
            echo "  --help         显示帮助"
            exit 0
            ;;
    esac
done

# =============================================================================
# 1. 环境检测
# =============================================================================
log_step "检测环境..."

# 检测操作系统
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
    OS_VERSION=$VERSION_ID
    log_info "操作系统: $OS $OS_VERSION"
else
    log_error "无法检测操作系统"
    exit 1
fi

# 检测并安装 Python
if ! command -v python3 &> /dev/null; then
    log_warn "Python3 未安装，正在安装..."
    if [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "rocky" || "$OS" == "almalinux" ]]; then
        sudo dnf install -y python3 python3-pip python3-devel
    elif [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        sudo apt-get update && sudo apt-get install -y python3 python3-pip python3-venv
    fi
fi
PYTHON_VERSION=$(python3 --version 2>&1 | awk '{print $2}')
log_info "Python: $PYTHON_VERSION"

# 检测并安装 Node.js
if ! command -v node &> /dev/null; then
    log_warn "Node.js 未安装，正在安装..."
    if [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "rocky" || "$OS" == "almalinux" ]]; then
        curl -fsSL https://rpm.nodesource.com/setup_20.x | sudo bash -
        sudo dnf install -y nodejs
    elif [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
        sudo apt-get install -y nodejs
    fi
fi
NODE_VERSION=$(node --version 2>&1)
log_info "Node.js: $NODE_VERSION"

# 检测并安装 pnpm
if ! command -v pnpm &> /dev/null; then
    log_warn "pnpm 未安装，正在安装..."
    sudo npm install -g pnpm
fi
PNPM_VERSION=$(pnpm --version 2>&1)
log_info "pnpm: $PNPM_VERSION"

# 检测并安装 uv
if ! command -v uv &> /dev/null; then
    log_warn "uv 未安装，正在安装..."
    curl -Ls https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.cargo/bin:$PATH"
fi
log_info "uv: $(uv --version 2>&1)"

# 检测 PostgreSQL
if ! command -v psql &> /dev/null; then
    log_warn "PostgreSQL 客户端未安装，正在安装..."
    if [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "rocky" || "$OS" == "almalinux" ]]; then
        sudo dnf install -y postgresql
    elif [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        sudo apt-get install -y postgresql-client
    fi
fi

# =============================================================================
# 2. 数据库检测
# =============================================================================
log_step "检测数据库..."

# 检测 PostgreSQL 服务
check_postgres() {
    if pg_isready -h localhost -p $POSTGRES_PORT &> /dev/null; then
        return 0
    elif pg_isready -h 127.0.0.1 -p $POSTGRES_PORT &> /dev/null; then
        return 0
    else
        return 1
    fi
}

if check_postgres; then
    log_info "PostgreSQL 已运行 (端口 $POSTGRES_PORT)"
    
    # 检测用户是否存在
    if PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d postgres -c '\q' 2>/dev/null; then
        log_info "数据库用户 $DB_USER 已存在"
    else
        log_warn "数据库用户 $DB_USER 不存在，尝试使用默认用户..."
        # 尝试使用 postgres 用户
        if sudo -u postgres psql -c "SELECT 1 FROM pg_user WHERE usename='$DB_USER'" 2>/dev/null | grep -q 1; then
            log_info "用户 $DB_USER 已存在"
        else
            log_warn "请手动创建数据库用户: $DB_USER / $DB_PASS"
        fi
    fi
else
    log_error "PostgreSQL 未运行！"
    log_error "请先启动 PostgreSQL 服务："
    if [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "rocky" || "$OS" == "almalinux" ]]; then
        echo "  sudo systemctl start postgresql"
        echo "  sudo systemctl enable postgresql"
    elif [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        echo "  sudo systemctl start postgresql"
        echo "  sudo systemctl enable postgresql"
    fi
    exit 1
fi

# 检测 Redis
if redis-cli -h localhost -p $REDIS_PORT ping &> /dev/null; then
    log_info "Redis 已运行 (端口 $REDIS_PORT)"
else
    log_error "Redis 未运行！"
    log_error "请先启动 Redis 服务："
    if [[ "$OS" == "centos" || "$OS" == "rhel" || "$OS" == "rocky" || "$OS" == "almalinux" ]]; then
        echo "  sudo systemctl start redis"
        echo "  sudo systemctl enable redis"
    elif [[ "$OS" == "ubuntu" || "$OS" == "debian" ]]; then
        echo "  sudo systemctl start redis-server"
        echo "  sudo systemctl enable redis-server"
    fi
    exit 1
fi

# =============================================================================
# 3. 部署 ADMINCHAT_PANEL
# =============================================================================
deploy_admin_panel() {
    log_step "部署 ADMINCHAT_PANEL..."
    
    cd "$ADMIN_DIR"
    
    # 创建后端 .env 文件
    log_info "创建后端配置..."
    cat > backend/.env << EOF
# 数据库配置
DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASS}@localhost:${POSTGRES_PORT}/adminchat_panel
POSTGRES_HOST=localhost
POSTGRES_PORT=${POSTGRES_PORT}
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=adminchat_panel

# Redis 配置
REDIS_URL=redis://localhost:${REDIS_PORT}/0

# 管理员账户
INIT_ADMIN_USERNAME=${ADMIN_USER}
INIT_ADMIN_PASSWORD=${ADMIN_PASS}

# JWT 密钥（请修改为随机字符串）
JWT_SECRET_KEY=change-this-to-a-random-secret-key-in-production

# 加密密钥（请修改为随机字符串）
OAUTH_ENCRYPTION_KEY=

# CORS 配置
CORS_ORIGINS=["http://localhost:${ADMIN_FRONTEND_PORT}", "http://127.0.0.1:${ADMIN_FRONTEND_PORT}"]

# AI 配置
AI_PROVIDER=openai
EOF
    
    # 创建前端 .env 文件
    log_info "创建前端配置..."
    cat > frontend/.env << EOF
# API 配置
VITE_API_BASE_URL=http://localhost:${ADMIN_BACKEND_PORT}/api/v1
VITE_WS_BASE_URL=ws://localhost:${ADMIN_BACKEND_PORT}/ws
EOF
    
    # 安装后端依赖
    if [ "$SKIP_DEPS" = false ]; then
        log_info "安装后端依赖..."
        cd backend
        uv sync
        cd ..
    fi
    
    # 安装前端依赖
    if [ "$SKIP_DEPS" = false ]; then
        log_info "安装前端依赖..."
        cd frontend
        pnpm install
        cd ..
    fi
    
    # 创建数据库
    log_info "创建数据库..."
    if ! PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname='adminchat_panel'" 2>/dev/null | grep -q 1; then
        PGPASSWORD=$DB_PASS createdb -h localhost -U $DB_USER adminchat_panel 2>/dev/null || \
        log_warn "数据库创建失败，可能已存在或权限不足"
    fi
    
    # 运行数据库迁移
    log_info "运行数据库迁移..."
    cd backend
    uv run alembic upgrade head 2>/dev/null || log_warn "数据库迁移失败，可能已是最新"
    cd ..
    
    # 启动后端服务
    log_info "启动后端服务 (端口 $ADMIN_BACKEND_PORT)..."
    cd backend
    nohup uv run uvicorn app.main:app --host 0.0.0.0 --port $ADMIN_BACKEND_PORT > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # 等待后端启动
    sleep 3
    if curl -s http://localhost:$ADMIN_BACKEND_PORT/health > /dev/null; then
        log_info "后端服务启动成功 (PID: $BACKEND_PID)"
    else
        log_warn "后端服务可能启动失败，请检查日志: logs/backend.log"
    fi
    
    # 启动前端服务
    log_info "启动前端服务 (端口 $ADMIN_FRONTEND_PORT)..."
    mkdir -p logs
    cd frontend
    nohup pnpm exec vite --host 0.0.0.0 --port $ADMIN_FRONTEND_PORT > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    
    # 等待前端启动
    sleep 2
    if curl -s http://localhost:$ADMIN_FRONTEND_PORT > /dev/null; then
        log_info "前端服务启动成功 (PID: $FRONTEND_PID)"
    else
        log_warn "前端服务可能启动失败，请检查日志: logs/frontend.log"
    fi
    
    log_info "ADMINCHAT_PANEL 部署完成!"
    echo ""
    echo "  前端: http://localhost:$ADMIN_FRONTEND_PORT"
    echo "  后端: http://localhost:$ADMIN_BACKEND_PORT"
    echo "  账户: $ADMIN_USER / $ADMIN_PASS"
    echo ""
}

# =============================================================================
# 4. 部署 ACP_Market
# =============================================================================
deploy_acp_market() {
    log_step "部署 ACP_Market..."
    
    cd "$ACP_DIR"
    
    # 创建后端 .env 文件
    log_info "创建后端配置..."
    cat > backend/.env << EOF
# 数据库配置
DATABASE_URL=postgresql+asyncpg://${DB_USER}:${DB_PASS}@localhost:${POSTGRES_PORT}/acp_market
POSTGRES_HOST=localhost
POSTGRES_PORT=${POSTGRES_PORT}
POSTGRES_USER=${DB_USER}
POSTGRES_PASSWORD=${DB_PASS}
POSTGRES_DB=acp_market

# Redis 配置
REDIS_URL=redis://localhost:${REDIS_PORT}/1

# 管理员账户
INIT_ADMIN_EMAIL=${ADMIN_USER}@adminchat.local
INIT_ADMIN_PASSWORD=${ADMIN_PASS}

# JWT 密钥
JWT_SECRET_KEY=change-this-to-a-random-secret-key-in-production

# CORS 配置
CORS_ORIGINS=["http://localhost:${ACP_FRONTEND_PORT}", "http://127.0.0.1:${ACP_FRONTEND_PORT}"]
EOF
    
    # 创建前端 .env 文件
    log_info "创建前端配置..."
    cat > frontend/.env << EOF
# API 配置
VITE_API_BASE_URL=http://localhost:${ACP_BACKEND_PORT}
EOF
    
    # 安装后端依赖
    if [ "$SKIP_DEPS" = false ]; then
        log_info "安装后端依赖..."
        cd backend
        uv sync
        cd ..
    fi
    
    # 安装前端依赖
    if [ "$SKIP_DEPS" = false ]; then
        log_info "安装前端依赖..."
        cd frontend
        pnpm install
        cd ..
    fi
    
    # 创建数据库
    log_info "创建数据库..."
    if ! PGPASSWORD=$DB_PASS psql -h localhost -U $DB_USER -d postgres -c "SELECT 1 FROM pg_database WHERE datname='acp_market'" 2>/dev/null | grep -q 1; then
        PGPASSWORD=$DB_PASS createdb -h localhost -U $DB_USER acp_market 2>/dev/null || \
        log_warn "数据库创建失败，可能已存在或权限不足"
    fi
    
    # 运行数据库迁移
    log_info "运行数据库迁移..."
    cd backend
    uv run alembic upgrade head 2>/dev/null || log_warn "数据库迁移失败，可能已是最新"
    cd ..
    
    # 启动后端服务
    log_info "启动后端服务 (端口 $ACP_BACKEND_PORT)..."
    cd backend
    nohup uv run uvicorn app.main:app --host 0.0.0.0 --port $ACP_BACKEND_PORT > ../logs/backend.log 2>&1 &
    BACKEND_PID=$!
    cd ..
    
    # 等待后端启动
    sleep 3
    if curl -s http://localhost:$ACP_BACKEND_PORT/health > /dev/null; then
        log_info "后端服务启动成功 (PID: $BACKEND_PID)"
    else
        log_warn "后端服务可能启动失败，请检查日志: logs/backend.log"
    fi
    
    # 启动前端服务
    log_info "启动前端服务 (端口 $ACP_FRONTEND_PORT)..."
    mkdir -p logs
    cd frontend
    nohup pnpm exec vite --host 0.0.0.0 --port $ACP_FRONTEND_PORT > ../logs/frontend.log 2>&1 &
    FRONTEND_PID=$!
    cd ..
    
    # 等待前端启动
    sleep 2
    if curl -s http://localhost:$ACP_FRONTEND_PORT > /dev/null; then
        log_info "前端服务启动成功 (PID: $FRONTEND_PID)"
    else
        log_warn "前端服务可能启动失败，请检查日志: logs/frontend.log"
    fi
    
    log_info "ACP_Market 部署完成!"
    echo ""
    echo "  前端: http://localhost:$ACP_FRONTEND_PORT"
    echo "  后端: http://localhost:$ACP_BACKEND_PORT"
    echo "  账户: $ADMIN_USER@adminchat.local / $ADMIN_PASS"
    echo ""
}

# =============================================================================
# 5. 主流程
# =============================================================================
log_step "开始部署..."

# 创建日志目录
mkdir -p "$ADMIN_DIR/logs"
mkdir -p "$ACP_DIR/logs"

if [ "$ACP_ONLY" = true ]; then
    deploy_acp_market
elif [ "$ADMIN_ONLY" = true ]; then
    deploy_admin_panel
else
    deploy_admin_panel
    echo ""
    deploy_acp_market
fi

echo ""
log_info "=========================================="
log_info "部署完成!"
log_info "=========================================="
echo ""
echo "访问地址:"
echo ""
if [ "$ACP_ONLY" != true ]; then
    echo "  ADMINCHAT Panel:"
    echo "    前端: http://localhost:$ADMIN_FRONTEND_PORT"
    echo "    后端: http://localhost:$ADMIN_BACKEND_PORT"
    echo "    账户: $ADMIN_USER / $ADMIN_PASS"
    echo ""
fi
if [ "$ADMIN_ONLY" != true ]; then
    echo "  ACP Market:"
    echo "    前端: http://localhost:$ACP_FRONTEND_PORT"
    echo "    后端: http://localhost:$ACP_BACKEND_PORT"
    echo "    账户: $ADMIN_USER@adminchat.local / $ADMIN_PASS"
    echo ""
fi
echo "日志文件:"
echo "  ADMINCHAT: $ADMIN_DIR/logs/"
echo "  ACP:       $ACP_DIR/logs/"
echo ""
echo "停止服务:"
echo "  pkill -f 'uvicorn app.main:app'"
echo "  pkill -f 'vite'"
echo ""
