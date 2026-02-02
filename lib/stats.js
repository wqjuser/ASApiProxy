const ENABLE_STATS = process.env.ENABLE_STATS !== 'false'

const stats = {
  startTime: Date.now(),
  totalRequests: 0,
  successRequests: 0,
  failedRequests: 0,
  endpoints: {}
}

function recordRequest(endpoint, statusCode) {
  if (!ENABLE_STATS) return

  stats.totalRequests++

  if (statusCode >= 200 && statusCode < 400) {
    stats.successRequests++
  } else {
    stats.failedRequests++
  }

  if (!stats.endpoints[endpoint]) {
    stats.endpoints[endpoint] = { count: 0, success: 0, failed: 0 }
  }
  stats.endpoints[endpoint].count++

  if (statusCode >= 200 && statusCode < 400) {
    stats.endpoints[endpoint].success++
  } else {
    stats.endpoints[endpoint].failed++
  }
}

function getStats() {
  const uptime = Math.floor((Date.now() - stats.startTime) / 1000)
  return {
    ...stats,
    uptime: `${Math.floor(uptime / 3600)}h ${Math.floor((uptime % 3600) / 60)}m ${uptime % 60}s`
  }
}

function resetStats() {
  stats.totalRequests = 0
  stats.successRequests = 0
  stats.failedRequests = 0
  stats.endpoints = {}
}

module.exports = { recordRequest, getStats, resetStats, isEnabled: ENABLE_STATS }
