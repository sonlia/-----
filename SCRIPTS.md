# 综合能源驾驶舱 - 脚本说明

## 脚本列表

### 开发环境（bun + next dev）
- `start.sh` - 启动开发服务器
- `stop.sh` - 停止开发服务器
- `status.sh` - 查看开发服务器状态

### 生产环境（Node.js + next start）
- `start-prod.sh` - 启动生产服务器（自动构建）
- `stop-prod.sh` - 停止生产服务器
- `status-prod.sh` - 查看生产服务器状态

## 使用方法

### 开发环境

```bash
# 启动（默认端口 3000）
./start.sh

# 指定端口
./start.sh -p 8888

# 停止
./stop.sh
./stop.sh -p 8888

# 查看状态
./status.sh
./status.sh -p 8888

# 查看帮助
./start.sh -h
```

### 生产环境

```bash
# 首次启动（自动构建 + 启动）
./start-prod.sh

# 指定端口
./start-prod.sh -p 8888

# 强制重新构建后启动
./start-prod.sh -b
./start-prod.sh -p 8888 -b

# 停止
./stop-prod.sh
./stop-prod.sh -p 8888

# 查看状态
./status-prod.sh
./status-prod.sh -p 8888
```

## 特性

### 1. 幂等启动
重复执行启动脚本会自动停止旧进程，不会出现端口冲突。

### 2. SSH 断开保持运行
使用 `setsid + nohup + disown` 启动，SSH 断开后服务继续运行。

### 3. 自定义端口
通过 `-p` 参数指定任意端口，默认 3000。

### 4. 自动依赖检查
启动时自动检查 `node_modules`，不存在则自动安装。

### 5. 生产环境自动构建
`start-prod.sh` 会自动执行 `next build`，构建产物存在时跳过（用 `-b` 强制重建）。

### 6. 日志记录
- 开发环境日志：`/tmp/energy-cockpit.log`
- 生产环境日志：`/tmp/energy-cockpit-prod.log`

### 7. 从任意目录运行
脚本会自动定位到脚本所在目录，不依赖运行位置。

```bash
# 绝对路径运行
/home/z/my-project/start.sh -p 8888
/home/z/my-project/start-prod.sh -p 8888

# 或 cd 到项目目录运行
cd /home/z/my-project
./start.sh -p 8888
```

## 文件位置

| 文件 | 说明 |
|------|------|
| `/tmp/energy-cockpit.pid` | 开发环境进程 PID |
| `/tmp/energy-cockpit.log` | 开发环境日志 |
| `/tmp/energy-cockpit-prod.pid` | 生产环境进程 PID |
| `/tmp/energy-cockpit-prod.log` | 生产环境日志 |
| `/tmp/energy-cockpit-prod.built` | 生产构建标记 |

## 开发环境 vs 生产环境

| 特性 | 开发环境 (start.sh) | 生产环境 (start-prod.sh) |
|------|---------------------|-------------------------|
| 运行命令 | `bun run dev` | `npm run start` |
| 构建 | 不需要 | 自动 `next build` |
| 性能 | 较慢（热重载） | 最优（预编译） |
| 适用场景 | 开发调试 | 正式部署 |
| 包管理器 | bun | npm (Node.js) |
