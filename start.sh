#!/bin/bash
# ============================================================
# 综合能源驾驶舱 - 启动脚本
# 功能：
#   1. 幂等启动：重复启动会先停止旧进程再启动
#   2. 端口复用：自动释放 3000 端口
#   3. 后台运行：SSH 断开后服务继续运行（nohup + disown）
# ============================================================

set -e

# 配置
PORT=3000
PROJECT_DIR="/home/z/my-project"
LOG_FILE="/tmp/energy-cockpit.log"
PID_FILE="/tmp/energy-cockpit.pid"

cd "$PROJECT_DIR"

echo "============================================================"
echo "  综合能源驾驶舱 · Energy Cockpit 启动脚本"
echo "============================================================"
echo "项目目录: $PROJECT_DIR"
echo "服务端口: $PORT"
echo "日志文件: $LOG_FILE"
echo ""

# === 1. 停止旧进程（幂等启动） ===
stop_existing() {
  echo "[1/4] 检查并停止旧进程..."

  # 方法1：通过 PID 文件停止
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

  # 方法2：通过 lsof/fuser 查找占用端口的进程
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

  # 方法3：通过 pgrep 查找 next dev 进程
  NEXT_PIDS=$(pgrep -f "next dev" 2>/dev/null || true)
  if [ -n "$NEXT_PIDS" ]; then
    echo "  - 发现 next dev 进程 (PID: $NEXT_PIDS)，正在停止..."
    echo "$NEXT_PIDS" | xargs kill -9 2>/dev/null || true
    sleep 1
    echo "  - next dev 进程已停止"
  fi

  echo "  ✓ 旧进程清理完成"
}

# === 2. 检查依赖 ===
check_deps() {
  echo "[2/4] 检查依赖..."
  if [ ! -d "node_modules" ]; then
    echo "  - node_modules 不存在，执行 bun install..."
    bun install
  fi
  echo "  ✓ 依赖检查完成"
}

# === 3. 启动服务（后台运行，SSH 断开不关闭） ===
start_service() {
  echo "[3/4] 启动服务..."

  # 清空旧日志
  > "$LOG_FILE"

  # 使用 nohup + setsid 启动，确保 SSH 断开后服务继续运行
  # setsid 创建新会话，脱离当前终端
  # nohup 忽略 SIGHUP 信号
  # disown 从 shell 作业列表移除
  setsid nohup bun run dev > "$LOG_FILE" 2>&1 < /dev/null &
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
}

# === 4. 等待服务就绪 ===
wait_ready() {
  echo "[4/4] 等待服务就绪..."
  MAX_WAIT=60
  WAITED=0
  while [ $WAITED -lt $MAX_WAIT ]; do
    if curl -s -o /dev/null -w "%{http_code}" http://localhost:$PORT/ 2>/dev/null | grep -q "200\|304"; then
      echo "  ✓ 服务已就绪 (等待 ${WAITED}s)"
      return 0
    fi
    sleep 2
    WAITED=$((WAITED + 2))
    if [ $((WAITED % 10)) -eq 0 ]; then
      echo "  - 等待中... (${WAITED}s)"
    fi
  done
  echo "  ✗ 服务启动超时（${MAX_WAIT}s）"
  echo "  - 查看日志: tail -f $LOG_FILE"
  return 1
}

# === 主流程 ===
stop_existing
check_deps
start_service
wait_ready

if [ $? -eq 0 ]; then
  echo ""
  echo "============================================================"
  echo "  ✅ 综合能源驾驶舱启动成功！"
  echo "============================================================"
  echo "访问地址: http://localhost:$PORT/"
  echo "进程 PID: $(cat $PID_FILE)"
  echo "日志文件: $LOG_FILE"
  echo ""
  echo "停止服务: ./stop.sh  或  kill \$(cat $PID_FILE)"
  echo "查看日志: tail -f $LOG_FILE"
  echo "============================================================"
else
  echo ""
  echo "============================================================"
  echo "  ❌ 服务启动失败"
  echo "============================================================"
  echo "查看日志: tail -50 $LOG_FILE"
  echo "============================================================"
  exit 1
fi
