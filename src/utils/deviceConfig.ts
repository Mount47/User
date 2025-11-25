import type { CaregiverDevice } from '@/types'

/**
 * 设备管理配置文件（TypeScript 版本）
 *   - 保留与 reference/deviceconfig.js 相同的中文注释，方便快速对照
 *   - 只保留当前项目实际存在的几种型号
 */

// 设备监测类型映射（modelType -> 中文显示）
export const DEVICE_MODEL_TYPE_MAP = {
  'TI6843-VITAL': '呼吸心跳',
  'TI6843-POSTURE': '位姿监测',
  'TI6843-ECG': '心电监测',
  'R60ABD1': '呼吸心跳'
} as const

// 设备状态映射（英文 -> 中文）
export const DEVICE_STATUS_MAP = {
  ONLINE: '在线',
  OFFLINE: '离线',
  MAINTENANCE: '维护中'
} as const

// 状态标签色值（用于自定义样式的 tag）
export const DEVICE_STATUS_TONE: Record<keyof typeof DEVICE_STATUS_MAP, string> = {
  ONLINE: '#22c55e',
  OFFLINE: '#94a3b8',
  MAINTENANCE: '#fbbf24'
}

// 监测类型标签颜色映射（与 reference 页面保持一致）
export const DEVICE_TYPE_TAG_COLOR = {
  '人体位姿': 'success',
  '姿态监测': 'success',
  '呼吸心跳': 'warning',
  '人员检测': 'warning',
  '生命体征': 'danger',
  心电: 'danger'
} as const

const normalizeStatusKey = (status?: string) => {
  const key = String(status || '').trim().toUpperCase()
  if (key in DEVICE_STATUS_MAP) {
    return key as keyof typeof DEVICE_STATUS_MAP
  }
  return 'OFFLINE'
}

// 获取设备监测类型（优先 type 字段，其次 modelType -> model）
export function getDeviceMonitorType(device?: Partial<CaregiverDevice> & Record<string, any>) {
  if (!device) return '未知类型'
  if (device.type) return device.type
  const modelType = device.modelType && DEVICE_MODEL_TYPE_MAP[device.modelType as keyof typeof DEVICE_MODEL_TYPE_MAP]
  if (modelType) return modelType
  const model = device.model?.toUpperCase()
  if (model) {
    const match = Object.entries(DEVICE_MODEL_TYPE_MAP).find(([key]) => model.includes(key))
    if (match) return match[1]
  }
  return '未知类型'
}

// 获取设备状态显示文本
export function getDeviceStatusText(status?: string) {
  const key = normalizeStatusKey(status)
  return DEVICE_STATUS_MAP[key]
}

// 获取设备状态对应颜色
export function getDeviceStatusTone(status?: string) {
  const key = normalizeStatusKey(status)
  return DEVICE_STATUS_TONE[key]
}

// 获取型号显示文本
export function getDeviceModelText(device?: Partial<CaregiverDevice>) {
  if (!device) return '-'
  return device.model || device.modelType || '-'
}

// 格式化时间显示（“刚刚 / xx分钟前 / 标准时间”）
export function formatDeviceTime(value?: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  const diff = Date.now() - date.getTime()
  if (diff < 60_000) return '刚刚'
  if (diff < 3_600_000) {
    const minutes = Math.floor(diff / 60_000)
    return `${minutes} 分钟前`
  }
  const formatter = new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
  return formatter.format(date)
}

// 推断设备型号类别（用于差异化展示）
export function getDeviceType(deviceIdOrModel?: string) {
  const source = (deviceIdOrModel || '').toUpperCase()
  if (source.includes('R60')) return 'R60ABD1'
  if (source.includes('R77')) return 'R77ABH1'
  if (source.includes('TI6843') || source.includes('TI-6843')) return 'TI6843'
  if (source.includes('ECG')) return 'ECG'
  return 'UNKNOWN'
}

// 根据设备标识推断串口/波特率
export function getDevicePortConfig(deviceIdOrName?: string) {
  const id = deviceIdOrName || ''
  const match = id.match(/COM\d+/i)
  const port = match ? match[0].toUpperCase() : 'COM3'
  const type = getDeviceType(id)
  const baudRateMap: Record<string, string> = {
    R60ABD1: '115200',
    TI6843: '115200',
    R77ABH1: '115200',
    ECG: '115200'
  }
  return { port, baudRate: baudRateMap[type] || '115200' }
}
