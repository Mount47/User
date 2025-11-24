# Radar Data 接口

覆盖 R60ABD1、R77ABH1、TI6843（Vital/Posture）设备与数据相关接口。

时间格式：
- 常规：`yyyy-MM-dd'T'HH:mm:ss`
- 微秒：`yyyy-MM-dd'T'HH:mm:ss.SSSSSS`

---

## R60ABD1 设备（/api/r60abd1）

### GET /api/r60abd1/devices
### GET /api/r60abd1/devices/{deviceId}
### POST /api/r60abd1/devices
### PUT /api/r60abd1/devices/{deviceId}
### DELETE /api/r60abd1/devices/{deviceId}
### GET /api/r60abd1/devices/type/{type}
### GET /api/r60abd1/devices/status/{status}
### GET /api/r60abd1/devices/location/{location}
- 模型：`RadarDevice`

## R60ABD1 数据（/api/r60abd1/data）

实时与历史查询：
- 模型 Realtime `R60ABD1Data`
  - `id`: number
  - `deviceId`: string
  - `personId`: string
  - `presence`: number (0|1)
  - `motion`: number (0|1)
  - `bodyMovement`: number (0-100)
  - `heartRate`: number (0-120)
  - `heartRateWave`: number[]
  - `respiration`: number (0-35)
  - `respirationWave`: number[]
  - `sleep`: number (0:清醒,1:浅睡,2:深睡)
  - `timestamp`: string
  - `status`: string
  - `createdAt`: string
- 模型 HistoricalDTO `R60ABD1HistoricalDTO`（无波形）
  - 字段与实时相同但不含波形

接口：
- POST `/api/r60abd1/data/data` 接收数据（body 为 JSON 字符串）
- GET `/api/r60abd1/data/realtime/{deviceId}` 最新实时数据列表
- GET `/api/r60abd1/data/data/device/{deviceId}` 设备全部实时数据
- GET `/api/r60abd1/data/data/timerange?start&end` 按时间范围查实时
- GET `/api/r60abd1/data/data/device/{deviceId}/timerange?start&end` 设备+时间范围
- GET `/api/r60abd1/data/historical/device/{deviceId}/timerange?start&end` 历史(分页外)
- GET `/api/r60abd1/data/historical/list?page&size&sort` 历史分页（返回 Page）
- GET `/api/r60abd1/data/historical` 历史汇总（实现返回见代码）
- GET `/api/r60abd1/data/historical/summary` 历史统计汇总
- GET `/api/r60abd1/data/person/{personId}/realtime` 人员实时
- GET `/api/r60abd1/data/person/{personId}/data` 人员所有实时
- GET `/api/r60abd1/data/person/{personId}/data/timerange?start&end` 人员实时范围
- GET `/api/r60abd1/data/person/{personId}/historical/timerange?start&end` 人员历史范围
- GET `/api/r60abd1/data/person/{personId}/historical` 人员历史分页/列表
- GET `/api/r60abd1/data/person/{personId}/historical/summary` 人员历史汇总

---

## R77ABH1 数据（/api/r77abh1）

模型 Realtime `R77ABH1Data`
- `id`, `deviceId`, `personId`, `presence`(0|1), `motion`(0|1),
  `bodyMovement`(0-255), `heartRate`(0-200), `heartRateWave`[], `respiration`(0-40),
  `respirationWave`[], `timestamp`, `status`, `createdAt`

接口：
- POST `/api/r77abh1/data` 接收数据（JSON）
- GET `/api/r77abh1/realtime/{deviceId}` 最新实时数据
- GET `/api/r77abh1/realtime/{deviceId}/range?start&end` 实时时间范围
- GET `/api/r77abh1/historical/{deviceId}?page&size` 历史分页（按 timestamp 降序）
- GET `/api/r77abh1/historical/{deviceId}/range?start&end` 历史时间范围
- POST `/api/r77abh1/archive` 触发归档

---

## TI6843 Vital 设备与数据

### 设备（/api/ti6843/vital）
- GET `/devices` 列表（modelType 固定 `TI6843_VITAL`）
- GET `/devices/{deviceId}` 单个
- POST `/devices` 新增（默认 `status=active`,`type=vital_sensor`）
- PUT `/devices/{deviceId}` 更新
- DELETE `/devices/{deviceId}` 删除
- GET `/devices/type/{type}` 按类型
- GET `/devices/status/{status}` 按状态
- GET `/devices/location/{location}` 按位置
- GET `/device/{deviceId}/person` 查询绑定人员
- POST `/device/{deviceId}/bind` 绑定人员（请求体包含 `person_id` 等）
- DELETE `/device/{deviceId}/unbind` 解绑
- GET `/health` 健康检查

### 数据（/api/ti6843/vital/data）
- 模型 Realtime `TI6843VitalData`
  - `id`, `deviceId`, `personId`, `time`(秒), `breathRate`, `heartRate`, `status`, `timestamp`, `createdAt`
- 模型 HistoricalDTO `TI6843VitalHistoricalDTO`
  - `id`, `deviceId`, `personId`, `time`, `breathRate`, `heartRate`, `status`, `breathStatus`, `heartRateStatus`, `timestamp`, `createdAt`, `archivedAt`

接口：
- POST `/data` 接收数据（body 为 JSON 字符串）
- GET `/realtime/{deviceId}` 最新实时
- GET `/data/device/{deviceId}` 设备所有实时
- GET `/data/device/{deviceId}/timerange?start&end` 设备实时范围
- GET `/historical/device/{deviceId}/timerange?start&end` 历史范围
- GET `/historical?page&size&sort` 历史分页/列表
- GET `/historical/summary` 历史汇总统计
- GET `/person/{personId}/realtime` 人员实时
- GET `/person/{personId}/data` 人员所有实时
- GET `/person/{personId}/data/timerange?start&end` 人员实时范围
- GET `/person/{personId}/historical/timerange?start&end` 人员历史范围
- GET `/person/{personId}/historical` 人员历史分页/列表
- GET `/person/{personId}/historical/summary` 人员历史汇总

---

## TI6843 Posture 设备与数据

### 设备（/api/ti6843/posture）
- 与 Vital 类似，`modelType` 固定 `TI6843_POSTURE`；提供设备 CRUD、按类型/状态/位置过滤、`/health`

### 数据（/api/ti6843/posture/data）
- 模型 Realtime `TI6843PostureData`
  - `id`, `device_id`, `personId`, `timestamp`(微秒格式),
    `pointclouds`(帧->点->[x,y,z])，`keypoints`(点->[x,y,z])，`posture_state`
- 模型 HistoricalDTO `TI6843PostureHistoricalDTO`
  - `id`, `deviceId`, `personId`, `postureState`, `timestamp`, `createdAt`, `archivedAt`

接口：
- POST `/data` 接收位姿数据（raw JSON 字符串）
- GET `/realtime/{deviceId}` 最新实时（单条）
- GET `/data/device/{deviceId}` 设备所有实时
- GET `/data/timerange?start&end` 实时时间范围
- GET `/data/device/{deviceId}/timerange?start&end` 设备+时间范围
- GET `/person/{personId}/realtime` 人员实时
- GET `/person/{personId}/data` 人员所有实时
- GET `/person/{personId}/data/timerange?start&end` 人员实时范围
- GET `/historical/device/{deviceId}/timerange?start&end` 历史设备范围
- GET `/person/{personId}/historical/timerange?start&end` 历史人员范围
- GET `/historical` 历史分页/列表
- GET `/person/{personId}/historical` 历史人员分页/列表
- GET `/historical/summary` 历史汇总
- GET `/person/{personId}/historical/summary` 历史人员汇总
- GET `/health` 健康检查
- GET `/debug/historical/person/{personId}` 调试：返回人员历史列表

