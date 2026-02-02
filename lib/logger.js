const fs = require('fs')
const path = require('path')

const ENABLE_LOG = process.env.ENABLE_LOG !== 'false'
const LOG_LEVEL = process.env.LOG_LEVEL || 'info'
const LOG_FILE = process.env.LOG_FILE

const LEVELS = { error: 0, warn: 1, info: 2, debug: 3 }
const currentLevel = LEVELS[LOG_LEVEL] ?? 2

let logStream = null

if (ENABLE_LOG && LOG_FILE) {
  const logDir = path.dirname(LOG_FILE)
  if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true })
  }
  logStream = fs.createWriteStream(LOG_FILE, { flags: 'a' })
}

function formatTime() {
  return new Date().toISOString()
}

function log(level, message, meta = {}) {
  if (!ENABLE_LOG || LEVELS[level] > currentLevel) return

  const logEntry = {
    time: formatTime(),
    level: level.toUpperCase(),
    message,
    ...meta
  }

  const logLine = JSON.stringify(logEntry)

  if (logStream) {
    logStream.write(logLine + '\n')
  }

  const color = { error: '\x1b[31m', warn: '\x1b[33m', info: '\x1b[36m', debug: '\x1b[90m' }
  const reset = '\x1b[0m'
  console.log(`${color[level]}[${logEntry.time}] [${logEntry.level}]${reset} ${message}`)
}

module.exports = {
  error: (msg, meta) => log('error', msg, meta),
  warn: (msg, meta) => log('warn', msg, meta),
  info: (msg, meta) => log('info', msg, meta),
  debug: (msg, meta) => log('debug', msg, meta)
}
