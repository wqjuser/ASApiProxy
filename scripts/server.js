const { spawn, execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

const PID_FILE = path.join(__dirname, '..', '.pid')
const LOG_DIR = path.join(__dirname, '..', 'logs')
const LOG_FILE = path.join(LOG_DIR, 'output.log')
const isWindows = process.platform === 'win32'

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR, { recursive: true })
}

const command = process.argv[2]

function getPid() {
  if (fs.existsSync(PID_FILE)) {
    return parseInt(fs.readFileSync(PID_FILE, 'utf8').trim(), 10)
  }
  return null
}

function isRunning(pid) {
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

function start() {
  const pid = getPid()
  if (pid && isRunning(pid)) {
    console.log(`服务已在运行 (PID: ${pid})`)
    return
  }

  console.log('正在启动服务...')
  const logStream = fs.openSync(LOG_FILE, 'a')

  const child = spawn('node', ['index.js'], {
    cwd: path.join(__dirname, '..'),
    detached: true,
    stdio: ['ignore', logStream, logStream]
  })

  fs.writeFileSync(PID_FILE, String(child.pid))
  child.unref()

  console.log(`服务已启动 (PID: ${child.pid})`)
}

function stop() {
  const pid = getPid()
  if (!pid) {
    console.log('PID 文件不存在，服务未运行')
    return
  }

  if (!isRunning(pid)) {
    console.log('服务未运行')
    fs.unlinkSync(PID_FILE)
    return
  }

  console.log(`正在停止服务 (PID: ${pid})...`)
  try {
    process.kill(pid, 'SIGTERM')
    setTimeout(() => {
      if (isRunning(pid)) {
        process.kill(pid, 'SIGKILL')
      }
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE)
      }
      console.log('服务已停止')
    }, 2000)
  } catch (err) {
    console.log('停止失败:', err.message)
  }
}

function restart() {
  const pid = getPid()
  if (pid && isRunning(pid)) {
    process.kill(pid, 'SIGTERM')
    console.log('正在重启服务...')
    setTimeout(() => {
      if (fs.existsSync(PID_FILE)) {
        fs.unlinkSync(PID_FILE)
      }
      start()
    }, 2000)
  } else {
    start()
  }
}

function status() {
  const pid = getPid()
  if (pid && isRunning(pid)) {
    console.log(`服务运行中 (PID: ${pid})`)
  } else {
    console.log('服务未运行')
  }
}

function logs() {
  if (!fs.existsSync(LOG_FILE)) {
    console.log('日志文件不存在')
    return
  }
  const content = fs.readFileSync(LOG_FILE, 'utf8')
  const lines = content.split('\n').slice(-50)
  console.log(lines.join('\n'))
}

switch (command) {
  case 'start':
    start()
    break
  case 'stop':
    stop()
    break
  case 'restart':
    restart()
    break
  case 'status':
    status()
    break
  case 'logs':
    logs()
    break
  default:
    console.log('用法: node scripts/server.js {start|stop|restart|status|logs}')
}
