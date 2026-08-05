#!/bin/bash
# ============================================================
# 综合能源驾驶舱 - 启动脚本
# 功能：
#   1. 幂等启动：重复启动会先停止旧进程再启动
#   2. 端口复用：自动释放指定端口
#   3. 后台运行：SSH 断开后服务继续运行（nohup + disown）
#   4. 自定义端口：./start.sh 8888 或 ./start.sh -p 8888
# ============================================================

# 默认配置
DEFAULT_PORT=3000
PORT=$DEFAULT_PORT

# 获取脚本所在目录（兼容 bash 和 sh，用 $0 代替 BASH_SOURCE）
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_DIR="$SCRIPT_DIR"
LOG_FILE="/tmp/energy-cockpit.log"
PID_FILE="/tmp/energy-cockpit.pid"

# === 解析命令行参数 ===
# 支持两种用法：
#   ./start.sh -p 8888   (标准用法)
#   ./start.sh 8888      (简写用法，直接跟端口号)
for arg in "$@"; do
  case "$arg" in
    -p)
      # -p 后面跟端口号，下一个参数是端口
      ;;
    -h|--help)
      echo "用法: ./start.sh [端口号] 或 ./start.sh -p [端口号]"
      echo "  -p  指定端口号（可省略，直接写端口号）"
      echo ""
      echo "示例:"
      echo "  ./start.sh              # 使用默认端口 $DEFAULT_PORT"
      echo "  ./start.sh 8888         # 使用端口 8888（简写）"
      echo "  ./start.sh -p 8888      # 使用端口 8888（标准）"
      echo "  ./start.sh -p 8080      # 使用端口 8080"
      exit 0
      ;;
    [0-9]*)
      # 纯数字 = 端口号
      PORT="$arg"
      ;;
  esac
done

# 兼容 -p 端口号 的标准用法（遍历参数找 -p 后的数字）
PREV_ARG=""
for arg in "$@"; do
  if [ "$PREV_ARG" = "-p" ]; then
    PORT="$arg"
  fi
  PREV_ARG="$arg"
done

# 切换到项目目录（脚本所在目录）
cd "$PROJECT_DIR"

# 验证 package.json 存在
if [ ! -f "package.json" ]; then
  echo "❌ 错误：未找到 package.json"
  echo "  当前目录: $PROJECT_DIR"
  echo "  请确保脚本位于项目根目录"
  exit 1
fi

echo "============================================================"
echo "  综合能源驾驶舱 · Energy Cockpit 启动脚本"
echo "============================================================"
echo "项目目录: $PROJECT_DIR"
echo "服务端口: $PORT"
echo "日志文件: $LOG_FILE"
echo ""

# === 1. 停止旧进程（幂等启动，只停止本端口的进程，不影响其他程序） ===
echo "[1/3] 检查并停止本端口旧进程..."

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

# 方法2：通过端口查找进程并 kill（多种工具备选，确保能 kill 指定端口）
KILLED_BY_PORT=false
if command -v lsof >/dev/null 2>&1; then
  # lsof 方式（最常用）
  PORT_PIDS=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$PORT_PIDS" ]; then
    echo "  - [lsof] 发现端口 $PORT 被占用 (PID: $PORT_PIDS)，正在停止..."
    echo "$PORT_PIDS" | xargs kill -9 2>/dev/null || true
    sleep 2
    KILLED_BY_PORT=true
    echo "  - [lsof] 端口占用进程已停止"
  fi
elif command -v ss >/dev/null 2>&1; then
  # ss 方式（lsof 没装时用 ss）
  PORT_PIDS=$(ss -tlnp 2>/dev/null | grep ":$PORT " | grep -oP 'pid=\K[0-9]+' | sort -u || true)
  if [ -n "$PORT_PIDS" ]; then
    echo "  - [ss] 发现端口 $PORT 被占用 (PID: $PORT_PIDS)，正在停止..."
    echo "$PORT_PIDS" | xargs kill -9 2>/dev/null || true
    sleep 2
    KILLED_BY_PORT=true
    echo "  - [ss] 端口占用进程已停止"
  fi
elif command -v fuser >/dev/null 2>&1; then
  # fuser 方式（最后备选）
  if fuser -k ${PORT}/tcp 2>/dev/null; then
    KILLED_BY_PORT=true
    echo "  - [fuser] 停止端口 $PORT 占用进程"
    sleep 2
  fi
fi

# 方法3：再次确认端口已释放（如果还被占用，用 killall 兜底）
if command -v lsof >/dev/null 2>&1; then
  STILL_OCCUPIED=$(lsof -ti :$PORT 2>/dev/null || true)
  if [ -n "$STILL_OCCUPIED" ]; then
    echo "  - ⚠ 端口 $PORT 仍被占用 (PID: $STILL_OCCUPIED)，强制 kill..."
    echo "$STILL_OCCUPIED" | xargs kill -9 2>/dev/null || true
    sleep 2
  fi
fi

echo "  ✓ 本端口旧进程清理完成（端口 $PORT 已释放）"

# === 2. 检查依赖 ===
echo "[2/3] 检查依赖..."
if [ ! -d "node_modules" ]; then
  echo "  - node_modules 不存在，执行 bun install..."
  echo "  - 当前目录: $(pwd)"
  bun install
  echo "  ✓ 依赖安装完成"
else
  echo "  ✓ node_modules 已存在"
fi
echo "  ✓ 依赖检查完成"

# === 3. 后台启动服务（SSH 断开不关闭） ===
echo "[3/3] 后台启动服务（端口 $PORT）..."

# 清空旧日志
> "$LOG_FILE"

# 使用 nohup + setsid 启动，确保 SSH 断开后服务继续运行
# setsid 创建新会话，脱离当前终端
# nohup 忽略 SIGHUP 信号
# disown 从 shell 作业列表移除
# 通过 bun run dev -- -p $PORT 覆盖 package.json 中的端口
setsid nohup bun run dev -- -p $PORT > "$LOG_FILE" 2>&1 < /dev/null &
SERVER_PID=$!
disown $SERVER_PID 2>/dev/null || true

# 等待子进程启动，获取实际 next-server PID
sleep 3

# 查找实际的 next-server 进程 PID（更准确）
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
echo "  ✅ 综合能源驾驶舱已后台启动"
echo "============================================================"
echo "访问地址: http://localhost:$PORT/"
echo "进程 PID: $(cat $PID_FILE)"
echo "日志文件: $LOG_FILE"
echo ""
echo "停止服务: ./stop.sh  或  kill \$(cat $PID_FILE)"
echo "查看日志: tail -f $LOG_FILE"
echo "查看状态: ./status.sh -p $PORT"
echo "============================================================"
