require('dotenv').config()

const express = require('express')
const https = require('https')
const { URL } = require('url')
const logger = require('./lib/logger')
const stats = require('./lib/stats')

const fs = require('fs')
const path = require('path')

const app = express()

app.use(express.json({ limit: '10mb' }))

const TARGET_API = process.env.TARGET_API
const API_KEY = process.env.API_KEY
const PORT = process.env.PORT || 3000

// 动态获取模型过滤配置（实时读取 .env 文件）
function getModelFilter() {
  try {
    const envPath = path.join(__dirname, '.env')
    const envContent = fs.readFileSync(envPath, 'utf8')
    const match = envContent.match(/^MODEL_FILTER=(.*)$/m)
    if (match && match[1]) {
      return match[1].split(',').map(m => m.trim()).filter(Boolean)
    }
  } catch {
    // 读取失败时使用环境变量
  }
  const filter = process.env.MODEL_FILTER
  if (!filter) return []
  return filter.split(',').map(m => m.trim()).filter(Boolean)
}

if (!TARGET_API) {
  logger.error('请在 .env 文件中配置 TARGET_API')
  process.exit(1)
}

if (!API_KEY) {
  logger.error('请在 .env 文件中配置 API_KEY')
  process.exit(1)
}

// 转换不支持的 role 角色
function transformMessages(body) {
  if (!body || !Array.isArray(body.messages)) {
    return body
  }

  const transformedMessages = body.messages.map(msg => {
    if (msg.role === 'developer') {
      return { ...msg, role: 'user' }
    }
    return msg
  })

  return { ...body, messages: transformedMessages }
}

// 过滤模型列表（模糊匹配）
function filterModels(data) {
  const modelFilter = getModelFilter()
  if (modelFilter.length === 0 || !data || !Array.isArray(data.data)) {
    return data
  }

  const filteredData = data.data.filter(model =>
    modelFilter.some(keyword => model.id.toLowerCase().includes(keyword.toLowerCase()))
  )

  return { ...data, data: filteredData }
}

// 统计接口
app.get('/stats', (req, res) => {
  if (!stats.isEnabled) {
    return res.status(404).json({ error: '统计功能未启用' })
  }
  res.json(stats.getStats())
})

// 重置统计
app.post('/stats/reset', (req, res) => {
  stats.resetStats()
  res.json({ message: '统计已重置' })
})

// 健康检查
app.get('/health', (req, res) => {
  res.json({ status: 'ok', uptime: process.uptime() })
})

// /v1/models 接口 - 支持模型过滤
app.get('/v1/models', (req, res) => {
  const targetUrl = new URL('/v1/models', TARGET_API)
  const startTime = Date.now()

  const options = {
    hostname: targetUrl.hostname,
    port: 443,
    path: targetUrl.pathname,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${API_KEY}`,
      'Accept': 'application/json',
      'Host': targetUrl.hostname
    }
  }

  const proxyReq = https.request(options, (proxyRes) => {
    let body = ''
    proxyRes.on('data', chunk => { body += chunk })
    proxyRes.on('end', () => {
      const duration = Date.now() - startTime
      logger.info(`GET /v1/models`, { status: proxyRes.statusCode, duration: `${duration}ms` })
      stats.recordRequest('/v1/models', proxyRes.statusCode)

      try {
        const data = JSON.parse(body)
        const filtered = filterModels(data)
        logger.debug(`模型过滤: ${data.data?.length || 0} -> ${filtered.data?.length || 0}`)
        res.status(proxyRes.statusCode).json(filtered)
      } catch {
        res.status(proxyRes.statusCode).send(body)
      }
    })
  })

  proxyReq.on('error', (err) => {
    logger.error('请求失败: /v1/models', { error: err.message })
    stats.recordRequest('/v1/models', 500)
    res.status(500).json({ error: err.message })
  })

  proxyReq.end()
})

// 所有 /v1/* 接口 - 自动添加 Authorization
app.use('/v1', (req, res) => {
  const targetUrl = new URL(req.originalUrl, TARGET_API)
  const startTime = Date.now()

  const headers = {
    'Authorization': `Bearer ${API_KEY}`,
    'Accept': 'application/json',
    'Content-Type': req.get('Content-Type') || 'application/json',
    'Host': targetUrl.hostname
  }

  const options = {
    hostname: targetUrl.hostname,
    port: 443,
    path: targetUrl.pathname + targetUrl.search,
    method: req.method,
    headers
  }

  const proxyReq = https.request(options, (proxyRes) => {
    const duration = Date.now() - startTime
    logger.info(`${req.method} ${req.originalUrl}`, {
      status: proxyRes.statusCode,
      duration: `${duration}ms`
    })
    stats.recordRequest(req.originalUrl, proxyRes.statusCode)

    res.status(proxyRes.statusCode)
    Object.entries(proxyRes.headers).forEach(([key, value]) => {
      res.setHeader(key, value)
    })
    proxyRes.pipe(res)
  })

  proxyReq.on('error', (err) => {
    logger.error(`请求失败: ${req.originalUrl}`, { error: err.message })
    stats.recordRequest(req.originalUrl, 500)
    res.status(500).json({ error: err.message })
  })

  if (req.body && Object.keys(req.body).length > 0) {
    const transformedBody = transformMessages(req.body)
    proxyReq.write(JSON.stringify(transformedBody))
  }
  proxyReq.end()
})

// 启动服务
const server = app.listen(PORT, () => {
  const modelFilter = getModelFilter()
  logger.info(`API 代理服务已启动: http://localhost:${PORT}`)
  logger.info(`目标 API: ${TARGET_API}`)
  logger.info(`统计功能: ${stats.isEnabled ? '已启用' : '已禁用'}`)
  logger.info(`模型过滤: ${modelFilter.length > 0 ? modelFilter.join(', ') : '未启用'}（支持实时更新）`)
})

// 优雅关闭
process.on('SIGTERM', () => {
  logger.info('收到 SIGTERM 信号，正在关闭服务...')
  server.close(() => {
    logger.info('服务已关闭')
    process.exit(0)
  })
})

process.on('SIGINT', () => {
  logger.info('收到 SIGINT 信号，正在关闭服务...')
  server.close(() => {
    logger.info('服务已关闭')
    process.exit(0)
  })
})
