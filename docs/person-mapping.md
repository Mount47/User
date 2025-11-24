# Person & Mapping 接口

基路径：`/api/persons`、`/api/person-device-mappings`

时间格式：`yyyy-MM-dd'T'HH:mm:ss`（或带微秒 `yyyy-MM-dd'T'HH:mm:ss.SSSSSS`）

## 人员管理（/api/persons）

### GET /api/persons
- 功能：查询全部人员列表
- 响应：`Person[]`
- 模型 Person
  - `person_id`: string
  - `person_name`: string
  - `gender`: string
  - `age`: number
  - `department`: string
  - `system_user_id`: number
  - `createdAt`: string
  - `updatedAt`: string

### GET /api/persons/{personId}
- 功能：按 ID 查询人员
- 路径参数：`personId`: string
- 响应：`Person`

### POST /api/persons
- 功能：创建人员
- 请求体：`Person`
- 约束：`person_id`、`person_name` 必填
- 响应：`Person`

### PUT /api/persons/{personId}
- 功能：更新人员（ID 不变）
- 路径参数：`personId`: string
- 请求体：`Person`
- 响应：`Person`

### DELETE /api/persons/{personId}
- 功能：删除人员
- 路径参数：`personId`: string
- 响应：204 无内容

### GET /api/persons/department/{department}
- 功能：按部门查询
- 路径参数：`department`: string
- 响应：`Person[]`

### GET /api/persons/search?name=xxx
- 功能：按姓名模糊搜索
- 查询参数：`name`: string
- 响应：`Person[]`

## 人员-设备映射（/api/person-device-mappings）

通用模型 PersonDeviceMapping
- `id`: number
- `person_id`: string
- `device_id`: string
- `mapping_name`: string
- `is_active`: boolean
- `createdAt`: string
- `updatedAt`: string

### GET /api/person-device-mappings
- 功能：获取所有活跃映射
- 响应：`PersonDeviceMapping[]`

### POST /api/person-device-mappings
- 功能：创建映射
- 请求体 CreateMappingRequest
  - `person_id`: string
  - `device_id`: string
  - `mapping_name`: string
- 响应：`PersonDeviceMapping`

### GET /api/person-device-mappings/device/{deviceId}/person
- 功能：通过设备查人
- 路径参数：`deviceId`: string
- 响应：`Person`

### GET /api/person-device-mappings/person/{personId}/device
- 功能：通过人查设备
- 路径参数：`personId`: string
- 响应：`RadarDevice`

### GET /api/person-device-mappings/{mappingId}
- 功能：按映射 ID 查询
- 路径参数：`mappingId`: number
- 响应：`PersonDeviceMapping`

### PUT /api/person-device-mappings/{mappingId}
- 功能：更新映射（名称、状态等）
- 路径参数：`mappingId`: number
- 请求体 UpdateMappingRequest（示例字段）
  - `mapping_name?`: string
  - `is_active?`: boolean
- 响应：`PersonDeviceMapping`

### DELETE /api/person-device-mappings/{mappingId}
- 功能：删除映射
- 路径参数：`mappingId`: number
- 响应：204 无内容

### DELETE /api/person-device-mappings/device/{deviceId}
- 功能：删除该设备的所有映射
- 路径参数：`deviceId`: string
- 响应：204 无内容

### DELETE /api/person-device-mappings/person/{personId}
- 功能：删除该人员的所有映射
- 路径参数：`personId`: string
- 响应：204 无内容

### PUT /api/person-device-mappings/{mappingId}/deactivate
### PUT /api/person-device-mappings/{mappingId}/reactivate
- 功能：停用/启用映射
- 路径参数：`mappingId`: number
- 响应：`PersonDeviceMapping`

### GET /api/person-device-mappings/inactive
- 功能：查询已停用映射
- 响应：`PersonDeviceMapping[]`

### DELETE /api/person-device-mappings/cleanup
- 功能：清理无效映射
- 响应：`{"success": boolean, "deleted": number}`

### POST /api/person-device-mappings/swap
- 功能：交换两个映射（按 mappingId）
- 请求体（示例）
  - `mapping_id1`: number
  - `mapping_id2`: number
- 响应：`{"success": boolean}`

### POST /api/person-device-mappings/swap-persons
- 功能：两设备绑定人员互换
- 查询参数：`deviceId1`, `deviceId2`
- 响应：`{"success": boolean, "deviceId1": string, "deviceId2": string}`

### GET /api/person-device-mappings/statistics
- 功能：绑定统计（总数、各型号计数等）
- 响应：`{"totalBindings": number, "deviceTypeStats": object, "supportedDeviceTypes": string[]}`

### GET /api/person-device-mappings/active/model-type/{modelType}
- 功能：按设备型号筛选活跃映射
- 路径参数：`modelType`: string（如 R60ABD1/R77ABH1/TI6843_*）
- 响应：`PersonDeviceMapping[]`

### 其他批量/多绑接口（如 /batch、/batch-safe、/multi-bind 等）
- 功能：批量更新或成组创建绑定；参数见后端 DTO 定义
- 说明：前端如需使用，请与后端确认请求体字段以保证安全更新策略

