# API Proxy

Android Studio 使用 NewApi 代理服务，自动添加认证并转换请求参数。

## 功能

- 自动添加 Authorization 请求头
- 将 `developer` 角色自动转换为 `user`
- 请求日志记录（可配置）
- 请求统计功能
- 优雅的启停管理

## 安装

```bash
npm install
```

## 配置

复制配置文件并修改：

```bash
cp .env.example .env
```

配置项说明：

| 参数 | 说明 | 默认值 |
|------|------|--------|
| TARGET_API | 目标 API 地址 | - |
| API_KEY | API 密钥 | - |
| PORT | 服务端口 | 3000 |
| ENABLE_LOG | 启用日志 | true |
| LOG_LEVEL | 日志级别 | info |
| LOG_FILE | 日志文件 | logs/proxy.log |
| ENABLE_STATS | 启用统计 | true |
| MODEL_FILTER | 模型过滤（模糊匹配，逗号分隔，支持实时更新） | - |

## 运行

**前台运行：**

```bash
npm start
```

**后台运行（跨平台）：**

```bash
npm run server         # 启动
npm run server:stop    # 停止
npm run server:restart # 重启
npm run server:status  # 状态
npm run server:logs    # 查看日志
```

**平台专用脚本：**

```bash
# macOS/Linux
./server.sh start|stop|restart|status|logs

# Windows
server.bat start|stop|restart|status|logs
```

## API 接口

### 代理接口

所有 `/v1/*` 请求会自动转发到目标 API，并添加 Authorization 请求头。

### 管理接口

| 接口 | 方法 | 说明 |
|------|------|------|
| /health | GET | 健康检查 |
| /stats | GET | 查看统计 |
| /stats/reset | POST | 重置统计 |

## License

ISC
