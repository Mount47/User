# Alerts & Detection 接口

覆盖跌倒告警、生命体征告警、人员检测状态汇总。

时间格式：`yyyy-MM-dd'T'HH:mm:ss` 或 `yyyy-MM-dd'T'HH:mm:ss.SSSSSS`

---

## 生命体征告警（/api/vitals-alerts）

模型 `VitalsAlertDTO`
- `id`: number
- `deviceId`: string
- `personId`: string
- `personName`: string
- `alertType`: string
- `severity`: string（LOW|MEDIUM|HIGH|CRITICAL）
- `detectedAt`: string
- `location`: string
- `createdAt`: string

接口：
- GET `/api/vitals-alerts` 全部列表
- GET `/api/vitals-alerts/{id}` 按 ID 查询
- GET `/api/vitals-alerts/device/{deviceId}` 按设备
- GET `/api/vitals-alerts/person/{personId}` 按人员
- GET `/api/vitals-alerts/timerange?start&end` 时间范围

---

## 跌倒告警（/api/fall-alerts）

模型 `FallAlertDTO`
- `id`, `deviceId`, `personId`, `personName`
- `fallDetectedAt`, `postureDataId`
- `alertStatus`（NEW|PENDING|RESOLVED|FALSE_ALARM）
- `severity`（LOW|MEDIUM|HIGH|CRITICAL）
- `resolvedAt`, `resolvedBy`, `resolutionNotes`
- `location`, `createdAt`, `updatedAt`

接口：
- GET `/health` 健康检查
- GET `/active` 活跃告警
- GET `/{id}` 详情
- GET `/device/{deviceId}/active` 设备活跃
- GET `/person/{personId}/active` 人员活跃
- GET `/timerange?start&end` 时间范围
- GET `/device/{deviceId}/timerange?start&end` 设备+时间范围
- GET `/person/{personId}/timerange?start&end` 人员+时间范围
- POST `/{id}/pending` 置为待处理
- POST `/{id}/resolved` 置为已处理
- POST `/{id}/false-alarm` 标记误报
- GET `/statistics` 统计信息

---

## 人员检测（/api/detection）

模型 `DetectionStatus`
- `deviceId`, `deviceName`, `modelType`
- `hasPerson`: boolean, `confidence`: number
- `lastUpdateTime`: string
- `mappedPersonId?`, `mappedPersonName?`
- `deviceStatus`: string
- `detectionDetails`
  - `heartRate`, `respiration`, `bodyMovement`, `presence`, `motion`
  - `hasValidPointClouds`, `hasValidKeypoints`
  - `pointCloudsLength`, `keypointsLength`
  - `additionalParams`: object

接口：
- GET `/status/{deviceId}` 查询单设备状态
- GET `/status/all` 全部设备状态列表
- GET `/status/model-type/{modelType}` 指定型号设备状态
- GET `/status/with-person` 附带已绑定人员信息

