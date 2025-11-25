/**
 * 全局类型声明
 * 汇总人员、设备、映射、实时/历史数据、告警等模块在前端使用的数据结构。
 */

// ==================== 通用基础类型 ====================

/** ISO 字符串时间，所有接口统一用 string 表示 */
export type ISODateString = string

/** 列表分页元数据，对应各管理页分页组件 */
export interface PaginationMeta {
  total: number
  currentPage: number
  pageSize: number
  totalPages?: number
}

/** 后端分页响应的通用封装 */
export interface PaginatedResponse<T> {
  content: T[]
  meta: PaginationMeta
}

// ==================== 人员模块 ====================

/** 人员档案信息，供人员管理和映射弹窗展示 */
export interface PersonProfile {
  personId: string
  personName: string
  gender?: 'male' | 'female' | 'other' | string
  age?: number
  department?: string
  systemUserId?: string
  createdAt?: ISODateString
  updatedAt?: ISODateString
}

// ==================== 设备模块 ====================

/** 设备状态枚举，兼容原始英文和值映射 */
export type DeviceStatus =
  | 'online'
  | 'offline'
  | 'maintenance'
  | 'bound'
  | 'unbound'
  | string

/** 设备基础信息，供设备列表和监控页使用 */
export interface DeviceInfo {
  deviceId: string
  deviceName: string
  modelType?: string
  model?: string
  location?: string
  type?: string
  status?: string
  rawStatus?: DeviceStatus
  lastDataTime?: ISODateString
  createdAt?: ISODateString
  updatedAt?: ISODateString
}

/** 设备绑定状态信息，映射管理页的附加视图 */
export interface DeviceBindingStatus {
  deviceId: string
  deviceName: string
  modelType?: string
  isBound: boolean
  boundPersonName?: string
  boundPersonId?: string
  mappingId?: number | string
  lastDataTime?: ISODateString
  status?: DeviceStatus
}

/** 设备统计信息卡片字段 */
export interface DeviceStatistics {
  total?: number
  online?: number
  offline?: number
  bound?: number
  unbound?: number
}

// ==================== 人员-设备映射 ====================

/** 人员与设备绑定关系 */
export interface PersonDeviceMapping {
  id?: number | string
  personId: string
  deviceId: string
  mappingName?: string
  isActive: boolean
  createdAt?: ISODateString
  updatedAt?: ISODateString
  personName?: string
  deviceName?: string
}

// ==================== 实时数据 - 生命体征 ====================

/** 实时生命体征包（R60ABD1 / TI6843 Vital 共用） */
export interface VitalRealtimeData {
  deviceId: string
  personId?: string
  timestamp: ISODateString
  heartRate?: number
  respiration?: number
  bodyMovement?: number
  presence?: number | string | boolean
  motion?: string
  sleep?: string
  presenceStatus?: string
  motionStatus?: string
  sleepStatus?: string
}



// ==================== 实时数据 - 位姿 ====================

/** 通用三维点 */
export interface Point3D {
  x: number
  y: number
  z: number
  index?: number
}

/** WebSocket 推送的原始位姿数据 */
export interface PostureRealtimePayload {
  deviceId: string
  personId?: string
  timestamp: ISODateString
  postureStatus?: string
  postureState?: string
  pointclouds?: number[][][]
  keypoints?: number[][]
  confidence?: number
  room?: string
}

/** 格式化后的位姿展示数据（formatPostureDataForDisplay） */
export interface PostureDisplayData extends PostureRealtimePayload {
  hasValidPointClouds: boolean
  hasValidKeypoints: boolean
  totalPointCloudCount: number
  keypointCount: number
  dataQuality: number
  dataType: string
}

/** 位姿轨迹点（轨迹动画使用） */
export interface TrajectoryPoint extends Point3D {
  timestamp?: ISODateString
}

// ==================== 告警模块 ====================

/** 跌倒警报状态 */
export type FallAlertStatus = 'NEW' | 'PENDING' | 'RESOLVED' | 'FALSE_ALARM' | string

/** 跌倒警报严重程度 */
export type FallAlertSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string

/** 跌倒警报数据结构 */
export interface FallAlert {
  id: number
  deviceId: string
  personId?: string
  personName?: string
  location?: string
  status: FallAlertStatus
  severity: FallAlertSeverity
  fallDetectedAt: ISODateString
  resolvedAt?: ISODateString
  handlerBy?: string
  notes?: string
  isFalseAlarm?: boolean
  durationMinutes?: number
}

/** 告警统计信息 */
export interface AlertStatistics {
  activeCount: number
  todayCount: number
  resolvedCount: number
  falseAlarmCount: number
}

/** WebSocket 通用消息结构 */
export interface WebSocketMessage<T = unknown> {
  type: string
  data: T
  timestamp?: ISODateString
  message?: string
}

/** 跌倒告警 WebSocket 推送体 */
export interface FallAlertWsPayload {
  type: 'welcome' | 'subscription_confirmed' | 'fall_alert' | 'heartbeat' | string
  data?: FallAlert
  message?: string
  timestamp?: ISODateString
}

// ==================== 历史数据查询 ====================

/** 历史数据通用查询参数 */
export interface HistoricalQueryParams {
  deviceId?: string
  personId?: string
  start: ISODateString
  end: ISODateString
  page?: number
  size?: number
}
/** 生命体征历史记录 */
export interface VitalHistoricalRecord extends VitalRealtimeData {
  id?: number | string
  source?: 'device' | 'person'
  heartRateAvg?: number
  respirationAvg?: number
}

/** 位姿历史记录 */
export interface PostureHistoricalRecord extends PostureRealtimePayload {
  id?: number | string
  startTime?: ISODateString
  endTime?: ISODateString
  posture_status?: string
}