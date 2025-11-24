# Radar Devices 接口

基路径：`/api/radar/devices`、`/api/device-status`、`/api/radar`

通用模型 RadarDevice
- `deviceId`: string
- `deviceName`: string
- `modelType`: string（如 `R60ABD1`、`R77ABH1`、`TI6843_VITAL`、`TI6843_POSTURE`）
- `model`: string
- `location`: string
- `type`: string
- `status`: string（online/offline/active 等）
- `createdAt`: string
- `updatedAt`: string

## 设备 CRUD（/api/radar/devices）

### GET /api/radar/devices
- 功能：分页获取设备列表，支持搜索/条件
- 查询参数：
  - `page` number=0, `size` number=10
  - `sortBy` string=deviceId, `sortDir` string=asc|desc
  - `search` string（可选，模糊）
  - `modelType` string（可选）
  - `status` string（可选）
- 响应：
  - `devices`: `RadarDevice[]`
  - `currentPage`, `totalItems`, `totalPages`, `pageSize`, `hasNext`, `hasPrevious`

### GET /api/radar/devices/list
- 功能：不分页列表
- 响应：`RadarDevice[]`

### GET /api/radar/devices/{deviceId}
- 功能：查询设备
- 路径参数：`deviceId`: string
- 响应：`RadarDevice`

### POST /api/radar/devices
- 功能：新增设备
- 请求体：`RadarDevice`（未给定 `status` 默认 `offline`）
- 响应：`{"success": boolean, "message": string}` 或 `RadarDevice`（视实现分支）

### PUT /api/radar/devices/{deviceId}
- 功能：更新设备
- 请求体：`RadarDevice`
- 响应：`RadarDevice`

### DELETE /api/radar/devices/{deviceId}
- 功能：删除设备
- 响应：204 无内容

## 设备状态/映射汇总（/api/device-status）

### GET /api/device-status/overview
- 功能：设备状态总览（含心跳在线、绑定人员信息）
- 响应：
  - `devices`: `[{ deviceId, deviceName, modelType, location, type, status, updatedAt, realTimeOnline, lastHeartbeat, hasBinding, personId?, personName?, mappingName?, bindingCreatedAt? }]`
  - `summary`: `{ total, online, offline, bound, unbound }`

### GET /api/device-status/unbound
- 功能：未绑定设备列表
- 响应：`[{ deviceId, deviceName, modelType, location, type, status, realTimeOnline }]`

### GET /api/device-status/all-for-mapping
- 功能：用于创建映射时的设备清单（含是否已绑定）
- 响应：`[{ deviceId, deviceName, modelType, location, type, status, realTimeOnline, isBound, boundPersonId?, boundPersonName?, mappingName?, mappingId? }]`

## 系统枚举（/api/radar）

### GET /api/radar/systems
- 功能：返回当前后端支持的雷达系统元信息
- 响应：
  - `systems`: `[{ code, name, description, apiBasePath, websocketEndpoint, nativeWebsocketEndpoint? }]`
  - `count`: number

