#!/bin/bash
# ============================================================
# 综合能源驾驶舱 - 生产环境启动脚本 (Node.js)
# 功能：
#   1. 生产环境：先 build 再 start（next start）
#   2. 幂等启动：重复启动会先停止旧进程再启动
#   3. 端口复用：自动释放指定端口
#   4. 后台运行：SSH 断开后服务继续运行（nohup + disown）
#   5. 自定义端口：./start-prod.sh -p 8888
#   6. 自动构建：首次启动或代码更新后自动 build
# ============================================================

# 默认配置
DEFAULT_PORT=3000
PORT=$DEFAULT_PORT

# 获取脚本所在目录（自动定位项目目录，不依赖运行位置）
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
LOG_FILE="/tmp/energy-cockpit-prod.log"
PID_FILE="/tmp/energy-cockpit-prod.pid"
BUILD_FLAG="/tmp/energy-cockpit-prod.built"

# === 解析命令行参数 ===
FORCE_BUILD=false
while getopts "p:bh" opt; do
  case $opt in
    p) PORT="$OPTARG" ;;
    b) FORCE_BUILD=true ;;  # 强制重新构建
    h)
      echo "用法: ./start-prod.sh [-p 端口号] [-b] [-h]"
      echo "  -p  指定端口号（默认: $DEFAULT_PORT）"
      echo "  -b  强制重新构建（next build）"
      echo "  -h  显示帮助"
      echo ""
      echo "示例:"
      echo "  ./start-prod.sh              # 使用默认端口 $DEFAULT_PORT 启动生产环境"
      echo "  ./start-prod.sh -p 8888      # 使用端口 8888"
      echo "  ./start-prod.sh -b           # 强制重新构建后启动"
      echo "  ./start-prod.sh -p 8888 -b   # 端口 8888 + 强制构建"
      exit 0
      ;;
    \?)
      echo "无效选项: -$OPTARG" >&2
      echo "使用 ./start-prod.sh -h 查看帮助"
      exit 1
      ;;
    :)
      echo "选项 -$OPTARG 需要参数。" >&2
      exit 1
      ;;
  esac
done

# 切换到项目目录
cd "$PROJECT_DIR"

# 验证 package.json 存在
if [ ! -f "package.json" ]; then
  echo "❌ 错误：未找到 package.json"
  echo "  当前目录: $PROJECT_DIR"
  echo "  请确保脚本位于项目根目录"
  exit 1
fi

echo "============================================================"
echo "  综合能源驾驶舱 · 生产环境启动 (Node.js + Next.js)"
echo "============================================================"
echo "项目目录: $PROJECT_DIR"
echo "服务端口: $PORT"
echo "日志文件: $LOG_FILE"
echo ""

# === 1. 停止旧进程（幂等启动） ===
echo "[1/4] 检查并停止本端口旧进程..."

# 方法1：通过 PID 文件停止（只停止本项目的进程）
if [ -f "$PID_FILE" ]; then
  OLD_PID=$(cat "$PID_FILE")
  if [ -n "$OLD_PID" ] && kill -0 "$OLD_PID" 2>/dev/null; then
    echo "  - 发现旧进程 PID=$OLD_PID，正在停止..."
    kill -9 "$OLD_PID" 2>/dev/null || true
    sleep 2
    echo "  - 旧进程已停止"
  fi
  rm -f "$PID_FILE"
fi

# 方法2：通过端口查找进程（只停止占用本端口的进程，不影响其他程序）
if command -v lsof >/dev/null 2>&1; then
  PORT_PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PORT_PIDS" ]; then
    echo "  - 发现端口 $PORT 被占用 (PID: $PORT_PIDS)，正在停止..."
    echo "$PORT_PIDS" | xargs kill -9 2>/dev/null || true
    sleep 2
    echo "  - 端口占用进程已停止"
  fi
elif command -v fuser >/dev/null 2>&1; then
  if fuser -k ${PORT}/tcp 2>/dev/null; then
    echo "  - 通过 fuser 停止端口 $PORT 占用进程"
    sleep 2
  fi
fi

echo "  ✓ 本端口旧进程清理完成"

# === 2. 检查依赖 ===
echo "[2/4] 检查依赖..."
cd "$PROJECT_DIR"

if [ ! -f "package.json" ]; then
  echo "  ❌ 未找到 package.json，无法安装依赖"
  exit 1
fi

if [ ! -d "node_modules" ]; then
  echo "  - node_modules 不存在，执行 npm install..."
  echo "  - 当前目录: $(pwd)"
  npm install
  echo "  ✓ 依赖安装完成"
else
  echo "  ✓ node_modules 已存在"
fi
echo "  ✓ 依赖检查完成"

# === 3. 构建生产版本 ===
echo "[3/4] 构建生产版本..."

# 检查是否需要构建（.next 目录存在且未强制重建）
if [ -d ".next" ] && [ "$FORCE_BUILD" = false ] && [ -f "$BUILD_FLAG" ]; then
  echo "  - 检测到已有构建产物（.next 目录）"
  echo "  - 跳过构建（如需重新构建请使用 -b 参数）"
  echo "  ✓ 构建跳过"
else
  echo "  - 执行 next build（生产构建）..."
  echo "  - 这可能需要几分钟时间..."
  cd "$PROJECT_DIR"

  if npm run build; then
    # 标记构建完成
    date > "$BUILD_FLAG"
    echo "  ✓ 构建完成"
  else
    echo "  ❌ 构建失败"
    exit 1
  fi
fi

# === 4. 后台启动生产服务（SSH 断开不关闭） ===
echo "[4/4] 后台启动生产服务（端口 $PORT）..."
cd "$PROJECT_DIR"

# 清空旧日志
> "$LOG_FILE"

# 使用 nohup + setsid 启动，确保 SSH 断开后服务继续运行
# 生产环境用 next start，性能更好
setsid nohup npm run start -- -p $PORT > "$LOG_FILE" 2>&1 < /dev/null &
SERVER_PID=$!
disown $SERVER_PID 2>/dev/null || true

# 等待子进程启动，获取实际 next-server PID
sleep 3

# 查找实际的 next-server 进程 PID
ACTUAL_PID=$(pgrep -f "next-server" 2>/dev/null | head -1 || echo "$SERVER_PID")
if [ -n "$ACTUAL_PID" ]; then
  echo $ACTUAL_PID > "$PID_FILE"
  echo "  - 服务进程 PID: $ACTUAL_PID (父进程: $SERVER_PID)"
else
  echo $SERVER_PID > "$PID_FILE"
  echo "  - 服务进程 PID: $SERVER_PID"
fi
echo "  - 已写入 PID 文件: $PID_FILE"
echo "  ✓ 服务已后台启动"

echo ""
echo "============================================================"
echo "  ✅ 综合能源驾驶舱生产环境已后台启动"
echo "============================================================"
echo "访问地址: http://localhost:$PORT/"
echo "进程 PID: $(cat $PID_FILE)"
echo "日志文件: $LOG_FILE"
echo ""
echo "停止服务: ./stop-prod.sh  或  kill \$(cat $PID_FILE)"
echo "查看日志: tail -f $LOG_FILE"
echo "查看状态: ./status-prod.sh -p $PORT"
echo "============================================================"
