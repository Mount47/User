<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { deviceApi } from '@/api'
import { useEntityStore } from '@/store'
import type { CaregiverDevice } from '@/types'
import {
  DEVICE_MODEL_TYPE_MAP,
  getDeviceMonitorType,
  getDeviceStatusText,
  getDeviceStatusTone,
  getDeviceModelText,
  formatDeviceTime
} from '@/utils/deviceConfig'
import { debugLog } from '@/utils/debugLog'

type DeviceStatusKey = 'ONLINE' | 'OFFLINE' | 'MAINTENANCE'

const entityStore = useEntityStore()

const loading = ref(false)
const rows = ref<CaregiverDevice[]>([])
const filters = reactive({ search: '', modelType: '', status: '' })
const pagination = reactive({ page: 1, size: 10, total: 0 })
const stats = reactive({ total: 0, online: 0, offline: 0, maintenance: 0 })
const selection = ref<Set<string>>(new Set())

const showForm = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const formError = ref('')
const formData = reactive({
  deviceId: '',
  deviceName: '',
  modelType: '',
  model: '',
  location: '',
  status: 'OFFLINE' as DeviceStatusKey
})

const showDetail = ref(false)
const detailDevice = ref<CaregiverDevice | null>(null)
const showBatchStatus = ref(false)
const batchStatus = ref<DeviceStatusKey>('OFFLINE')
const feedback = ref<{ type: 'success' | 'error'; text: string } | null>(null)

const statusOptions = [
  { label: getDeviceStatusText('ONLINE'), value: 'ONLINE' as DeviceStatusKey },
  { label: getDeviceStatusText('OFFLINE'), value: 'OFFLINE' as DeviceStatusKey },
  { label: getDeviceStatusText('MAINTENANCE'), value: 'MAINTENANCE' as DeviceStatusKey }
]

const modelTypeOptions = Array.from(new Set(Object.keys(DEVICE_MODEL_TYPE_MAP)))

// 下拉框状态
const modelTypeDropdownOpen = ref(false)
const statusDropdownOpen = ref(false)

// 下拉框选择方法
function selectModelType(value: string) {
  filters.modelType = value
  modelTypeDropdownOpen.value = false
}

function selectStatus(value: string) {
  filters.status = value
  statusDropdownOpen.value = false
}

// 点击外部关闭下拉框
function closeDropdowns() {
  modelTypeDropdownOpen.value = false
  statusDropdownOpen.value = false
}

function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement
  if (!target.closest('.custom-select')) {
    closeDropdowns()
  }
}

const selectedCount = computed(() => selection.value.size)
const allSelected = computed(
  () => rows.value.length > 0 && selectedCount.value === rows.value.length
)

const rangeSummary = computed(() => {
  if (!pagination.total) return '暂无数据'
  const start = (pagination.page - 1) * pagination.size + 1
  const end = Math.min(pagination.page * pagination.size, pagination.total)
  return `显示 ${start}-${end} 条，共 ${pagination.total} 条记录`
})

const normalizeStatus = (value?: string): DeviceStatusKey => {
  const next = String(value || '').toUpperCase()
  return next === 'ONLINE' || next === 'MAINTENANCE' ? (next as DeviceStatusKey) : 'OFFLINE'
}

const normalizeListResponse = (payload: any) => {
  if (!payload) return { items: [], total: 0, pageIndex: 0, zeroBased: true, hasPageIndex: false }
  
  // 记录原始响应以便调试
  debugLog('DevicesView', '原始API响应', payload)
  
  const meta = payload.meta || payload.pagination || {}
  const hasPageIndex =
    typeof meta.currentPage === 'number' ||
    typeof meta.page === 'number' ||
    typeof payload.page === 'number'

  const pageIndex = hasPageIndex
    ? typeof meta.currentPage === 'number'
      ? meta.currentPage
      : typeof meta.page === 'number'
        ? meta.page
        : payload.page
    : 0

  const zeroBased = hasPageIndex && !!(meta.currentPage === undefined && (meta.page !== undefined || payload.page !== undefined))
  
  // 处理各种可能的响应格式
  let items = []
  let total = 0
  
  if (Array.isArray(payload.records)) {
    items = payload.records
    total =
      meta.totalItems ?? meta.total ?? meta.totalRecords ?? meta.totalElements ?? payload.total ?? payload.records.length
  } else if (Array.isArray(payload.data)) {
    items = payload.data
    total =
      meta.totalItems ?? meta.total ?? meta.totalRecords ?? meta.totalElements ?? payload.total ?? payload.data.length
  } else if (Array.isArray(payload.items)) {
    items = payload.items
    total =
      meta.totalItems ?? meta.total ?? meta.totalRecords ?? meta.totalElements ?? payload.total ?? payload.items.length
  } else if (Array.isArray(payload.list)) {
    items = payload.list
    total = meta.totalItems ?? meta.total ?? meta.totalRecords ?? meta.totalElements ?? payload.total ?? payload.list.length
  } else if (Array.isArray(payload)) {
    items = payload
    total = payload.length
  } else {
    // 尝试从响应中提取任何数组字段
    const arrayFields = Object.keys(payload).filter(key => Array.isArray(payload[key]))
    if (arrayFields.length > 0) {
      const firstArrayField = arrayFields[0]!
      items = payload[firstArrayField]
      total = payload.total ?? items.length
      debugLog('DevicesView', `使用字段 ${firstArrayField} 作为数据源`, { items, total })
    } else {
      items = []
      total = meta.totalItems ?? meta.total ?? payload.total ?? 0
    }
  }
  
  const result = { items, total, pageIndex, zeroBased, hasPageIndex }
  debugLog('DevicesView', '解析后的响应数据', result)
  return result
}

const updateStats = () => {
  const counts = { ONLINE: 0, OFFLINE: 0, MAINTENANCE: 0 }
  rows.value.forEach((item: any) => {
    const key = normalizeStatus(item.status)
    counts[key] += 1
  })
  stats.total = pagination.total || rows.value.length
  stats.online = counts.ONLINE
  stats.offline = counts.OFFLINE
  stats.maintenance = counts.MAINTENANCE
}

const setFeedback = (type: 'success' | 'error', text: string) => {
  feedback.value = { type, text }
  setTimeout(() => {
    if (feedback.value?.text === text) {
      feedback.value = null
    }
  }, 3200)
}

const loadDevices = async () => {
  loading.value = true
  try {
    const params = {
      page: pagination.page - 1,
      size: pagination.size,
      search: filters.search || undefined,
      modelType: filters.modelType || undefined,
      status: filters.status || undefined,
      sortBy: 'updatedAt',
      sortDir: 'desc'
    }
    const response = await deviceApi.list(params)
    const { items, total, pageIndex, zeroBased, hasPageIndex } = normalizeListResponse(response)
    rows.value = (items || []).map((item: CaregiverDevice) => ({
      ...item,
      status: normalizeStatus(item.status)
    }))
    pagination.total = typeof total === 'number' ? total : rows.value.length
    if (hasPageIndex && typeof pageIndex === 'number') {
      pagination.page = zeroBased ? pageIndex + 1 : pageIndex || 1
    }
    if (pagination.page < 1) pagination.page = 1
    updateStats()
    selection.value.clear()
    debugLog('DevicesView', '设备列表加载成功', { count: rows.value.length, params })
  } catch (error: any) {
    console.error('Failed to load devices', error)
    setFeedback('error', error?.message || '加载设备列表失败')
    debugLog('DevicesView', '设备列表加载失败', error)
  } finally {
    loading.value = false
  }
}

const handleSearch = () => {
  pagination.page = 1
  loadDevices()
}

const resetFilters = () => {
  filters.search = ''
  filters.modelType = ''
  filters.status = ''
  handleSearch()
}

const changePage = (delta: number) => {
  const next = pagination.page + delta
  if (next < 1) return
  const maxPage = Math.max(1, Math.ceil(pagination.total / pagination.size))
  if (next > maxPage) return
  pagination.page = next
  loadDevices()
}

const toggleAllSelection = (event: Event) => {
  const checked = (event.target as HTMLInputElement).checked
  if (!checked) {
    selection.value.clear()
    return
  }
  const ids = rows.value.map((item: any) => item.deviceId)
  selection.value = new Set(ids)
}

const toggleSelection = (deviceId: string) => {
  if (!selection.value.has(deviceId)) {
    selection.value.add(deviceId)
  } else {
    selection.value.delete(deviceId)
  }
}

const prepareForm = (mode: 'create' | 'edit', device?: CaregiverDevice) => {
  formMode.value = mode
  formError.value = ''
  if (mode === 'edit' && device) {
    formData.deviceId = device.deviceId
    formData.deviceName = device.deviceName || ''
    formData.modelType = device.modelType || ''
    formData.model = device.model || ''
    formData.location = device.location || ''
    formData.status = normalizeStatus(device.status)
  } else {
    formData.deviceId = ''
    formData.deviceName = ''
    formData.modelType = ''
    formData.model = ''
    formData.location = ''
    formData.status = 'OFFLINE'
  }
  showForm.value = true
}

const validateForm = () => {
  if (!formData.deviceId.trim()) {
    formError.value = '设备 ID 不能为空'
    return false
  }
  if (formMode.value === 'create' && rows.value.some((item: any) => item.deviceId === formData.deviceId.trim())) {
    formError.value = '设备 ID 已存在'
    return false
  }
  if (!formData.deviceName.trim()) {
    formError.value = '请输入设备名称'
    return false
  }
  if (!formData.modelType.trim()) {
    formError.value = '请选择型号类型'
    return false
  }
  formError.value = ''
  return true
}

const submitForm = async () => {
  if (!validateForm()) return
  try {
    const payload = {
      deviceId: formData.deviceId.trim(),
      deviceName: formData.deviceName.trim(),
      modelType: formData.modelType.trim(),
      model: formData.model.trim() || undefined,
      location: formData.location.trim() || undefined,
      status: formData.status
    }
    if (formMode.value === 'create') {
      await deviceApi.create(payload)
      setFeedback('success', '设备已创建')
      debugLog('DevicesView', '调用设备创建 API', payload)
    } else {
      await deviceApi.update(payload.deviceId, {
        deviceName: payload.deviceName,
        model: payload.model,
        location: payload.location,
        status: payload.status,
        modelType: payload.modelType
      })
      setFeedback('success', '设备信息已更新')
      debugLog('DevicesView', '调用设备更新 API', payload)
    }
    showForm.value = false
    await loadDevices()
    entityStore.fetchDevices(true).catch(() => {})
  } catch (error: any) {
    console.error('Failed to save device', error)
    setFeedback('error', error?.message || '保存设备失败')
    debugLog('DevicesView', '保存设备失败', error)
  }
}

const handleDelete = async (device: CaregiverDevice) => {
  if (!window.confirm()) return
  try {
    await deviceApi.remove(device.deviceId)
    setFeedback('success', '设备已删除')
    await loadDevices()
    entityStore.fetchDevices(true).catch(() => {})
  } catch (error: any) {
    console.error('Failed to delete device', error)
    setFeedback('error', error?.message || '删除失败')
    debugLog('DevicesView', '删除设备失败', error)
  }
}

const handleBatchDelete = async () => {
  if (!selectedCount.value) {
    setFeedback('error', '请先选择设备')
    return
  }
  if (!window.confirm()) return
  try {
    const ids = Array.from(selection.value)
    for (const id of ids) {
      await deviceApi.remove(id)
    }
    setFeedback('success', `已删除 ${selectedCount.value} 个设备`)
    await loadDevices()
    entityStore.fetchDevices(true).catch(() => {})
  } catch (error: any) {
    console.error('Batch delete failed', error)
    setFeedback('error', error?.message || '批量删除失败')
  }
}

const openDetail = (device: CaregiverDevice) => {
  detailDevice.value = device
  showDetail.value = true
}

const openBatchStatusDialog = () => {
  if (!selectedCount.value) {
    setFeedback('error', '请至少选择一个设备')
    return
  }
  batchStatus.value = 'OFFLINE'
  showBatchStatus.value = true
}

const getMonitorTypeTagClass = (device: CaregiverDevice) => {
  const monitorType = getDeviceMonitorType(device)
  const colorMap: Record<string, string> = {
    '人体位姿': 'success',
    '姿态监测': 'success', 
    '位姿监测': 'success',
    '呼吸心跳': 'warning',
    '人员检测': 'warning',
    '生命体征': 'danger',
    '心电': 'danger',
    '心电监测': 'danger'
  }
  return colorMap[monitorType] || 'info'
}

const confirmBatchStatus = async () => {
  try {
    const ids = Array.from(selection.value)
    if (!ids.length) return
    if (ids.length === 1) {
      await deviceApi.updateStatus(ids[0], batchStatus.value)
      debugLog('DevicesView', '调用单个设备状态更新 API', { id: ids[0], status: batchStatus.value })
    } else {
      await deviceApi.batchUpdateStatus({ deviceIds: ids, status: batchStatus.value })
      debugLog('DevicesView', '调用批量设备状态更新 API', { ids, status: batchStatus.value })
    }
    setFeedback('success', '状态更新成功')
    showBatchStatus.value = false
    await loadDevices()
    entityStore.fetchDevices(true).catch(() => {})
  } catch (error: any) {
    console.error('Batch status update failed', error)
    setFeedback('error', error?.message || '更新状态失败')
  }
}

onMounted(() => {
  loadDevices()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

watch(
  () => rows.value,
  (next) => {
    console.info('[DevicesView] 接收到设备数据', next)
    console.info('[DevicesView] 数据接收状态', Array.isArray(next) && next.length ? '成功' : '空数据')
  },
  { immediate: true }
)
</script>

<template>
  <section class="device-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">设备管理</p>
        <h2>雷达设备列表</h2>
        <p class="muted">支持搜索 / 新增 / 编辑 / 批量操作，快速维护站点中的毫米波设备</p>
      </div>
      <div class="counter">
        <span>{{ stats.total }} 台设备</span>
        <span class="status-pill online">在线 {{ stats.online }}</span>
        <span class="status-pill offline">离线 {{ stats.offline }}</span>
        <span class="status-pill maintenance">维护 {{ stats.maintenance }}</span>
      </div>
    </header>

    <div v-if="feedback" class="toast" :class="feedback.type">
      {{ feedback.text }}
    </div>

    <div class="panel filters">
      <div class="field">
        <label>关键字</label>
        <input
          v-model="filters.search"
          type="text"
          placeholder="输入设备ID、名称或位置"
          @keyup.enter="handleSearch"
        >
      </div>
      <div class="field">
        <label>型号类型</label>
        <div class="custom-select" :class="{ open: modelTypeDropdownOpen }">
          <div class="select-trigger" @click="modelTypeDropdownOpen = !modelTypeDropdownOpen">
            <span class="select-value">
              {{ filters.modelType || '全部' }}
            </span>
            <svg class="select-arrow" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z" fill="currentColor"/>
            </svg>
          </div>
          <div class="select-dropdown" v-show="modelTypeDropdownOpen">
            <div 
              class="select-option" 
              :class="{ active: !filters.modelType }"
              @click="selectModelType('')"
            >
              全部
            </div>
            <div 
              v-for="item in modelTypeOptions" 
              :key="item" 
              class="select-option"
              :class="{ active: filters.modelType === item }"
              @click="selectModelType(item)"
            >
              📡 {{ item }}
            </div>
          </div>
        </div>
      </div>
      <div class="field">
        <label>状态</label>
        <div class="custom-select" :class="{ open: statusDropdownOpen }">
          <div class="select-trigger" @click="statusDropdownOpen = !statusDropdownOpen">
            <span class="select-value">
              {{ filters.status ? statusOptions.find(opt => opt.value === filters.status)?.label : '全部' }}
            </span>
            <svg class="select-arrow" viewBox="0 0 24 24">
              <path d="M7 10l5 5 5-5z" fill="currentColor"/>
            </svg>
          </div>
          <div class="select-dropdown" v-show="statusDropdownOpen">
            <div 
              class="select-option" 
              :class="{ active: !filters.status }"
              @click="selectStatus('')"
            >
              全部
            </div>
            <div 
              v-for="item in statusOptions" 
              :key="item.value" 
              class="select-option"
              :class="{ active: filters.status === item.value }"
              @click="selectStatus(item.value)"
            >
              <span class="status-dot" :class="item.value.toLowerCase()"></span>
              {{ item.label }}
            </div>
          </div>
        </div>
      </div>
      <div class="actions">
        <button type="button" class="primary" @click="handleSearch">搜索</button>
        <button type="button" class="ghost" @click="resetFilters">重置</button>
      </div>
    </div>

    <div class="panel toolbar">
      <div class="left">
        <button type="button" class="primary" @click="prepareForm('create')">新增设备</button>
        <button type="button" class="ghost" :disabled="!selectedCount" @click="openBatchStatusDialog">
          批量更新状态 ({{ selectedCount }})
        </button>
        <button type="button" class="danger" :disabled="!selectedCount" @click="handleBatchDelete">
          批量删除 ({{ selectedCount }})
        </button>
      </div>
      <div class="right">
        <span>{{ rangeSummary }}</span>
        <button type="button" class="ghost" @click="loadDevices">刷新</button>
      </div>
    </div>

    <div class="panel table-panel">
      <table>
        <thead>
          <tr>
            <th width="36">
              <input type="checkbox" :checked="allSelected" @change="toggleAllSelection">
            </th>
            <th>设备 ID</th>
            <th>名称</th>
            <th>型号</th>
            <th>监测类型</th>
            <th>状态</th>
            <th>位置</th>
            <th>最后心跳</th>
            <th>操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="9" class="empty">正在加载...</td>
          </tr>
          <tr v-else-if="!rows.length">
            <td colspan="9" class="empty">暂无设备，点击“新增设备”创建</td>
          </tr>
          <tr v-for="device in rows" :key="device.deviceId">
            <td>
              <input
                type="checkbox"
                :checked="selection.has(device.deviceId)"
                @change="toggleSelection(device.deviceId)"
              >
            </td>
            <td class="mono">{{ device.deviceId }}</td>
            <td>
              <div class="title">{{ device.deviceName || '未命名设备' }}</div>
              <div class="sub">{{ device.modelType || '未知型号' }}</div>
            </td>
            <td>{{ getDeviceModelText(device) }}</td>
            <td>
              <span class="tag" :class="getMonitorTypeTagClass(device)">
                {{ getDeviceMonitorType(device) }}
              </span>
            </td>
            <td>
              <span class="status-chip" :style="{ background: getDeviceStatusTone(device.status) }">
                {{ getDeviceStatusText(device.status) }}
              </span>
            </td>
            <td>{{ device.location || '未填写' }}</td>
            <td>{{ formatDeviceTime(device.lastHeartbeat || device.updatedAt) }}</td>
            <td class="ops">
              <button type="button" class="ghost" @click="openDetail(device)">详情</button>
              <button type="button" class="ghost" @click="prepareForm('edit', device)">编辑</button>
              <button type="button" class="danger" @click="handleDelete(device)">删除</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="pagination">
      <button type="button" class="ghost" @click="changePage(-1)" :disabled="pagination.page === 1">上一页</button>
      <span>第 {{ pagination.page }} 页</span>
      <button
        type="button"
        class="ghost"
        @click="changePage(1)"
        :disabled="pagination.page >= Math.ceil(pagination.total / pagination.size)"
      >下一页</button>
    </div>

    <div v-if="showForm" class="modal-backdrop" @click.self="showForm = false">
      <div class="modal">
        <h3>{{ formMode === 'create' ? '新增设备' : '编辑设备' }}</h3>
        <div class="form-grid">
          <label>
            <span>设备 ID</span>
            <input v-model="formData.deviceId" :disabled="formMode === 'edit'" placeholder="唯一标识" />
          </label>
          <label>
            <span>设备名称</span>
            <input v-model="formData.deviceName" placeholder="请输入名称" />
          </label>
          <label>
            <span>型号类型</span>
            <select v-model="formData.modelType">
              <option value="" disabled>请选择型号</option>
              <option v-for="item in modelTypeOptions" :key="item" :value="item">{{ item }}</option>
            </select>
          </label>
          <label>
            <span>型号描述</span>
            <input v-model="formData.model" placeholder="如：TI6843-VITAL-V1.0" />
          </label>
          <label>
            <span>安装位置</span>
            <input v-model="formData.location" placeholder="示例：3F-床位A" />
          </label>
          <label>
            <span>状态</span>
            <select v-model="formData.status">
              <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </label>
        </div>
        <p v-if="formError" class="form-error">{{ formError }}</p>
        <div class="modal-actions">
          <button type="button" class="ghost" @click="showForm = false">取消</button>
          <button type="button" class="primary" @click="submitForm">保存</button>
        </div>
      </div>
    </div>

    <div v-if="showDetail && detailDevice" class="modal-backdrop" @click.self="showDetail = false">
      <div class="modal">
        <h3>设备详情</h3>
        <ul class="detail-list">
          <li><span>设备 ID</span><strong>{{ detailDevice.deviceId }}</strong></li>
          <li><span>名称</span><strong>{{ detailDevice.deviceName || '未命名' }}</strong></li>
          <li><span>监测类型</span><strong>{{ getDeviceMonitorType(detailDevice) }}</strong></li>
          <li><span>型号</span><strong>{{ getDeviceModelText(detailDevice) }}</strong></li>
          <li><span>安装位置</span><strong>{{ detailDevice.location || '未填写' }}</strong></li>
          <li><span>状态</span><strong>{{ getDeviceStatusText(detailDevice.status) }}</strong></li>
          <li><span>最近心跳</span><strong>{{ formatDeviceTime(detailDevice.lastHeartbeat) }}</strong></li>
          <li><span>更新时间</span><strong>{{ formatDeviceTime(detailDevice.updatedAt) }}</strong></li>
        </ul>
        <div class="modal-actions">
          <button type="button" class="ghost" @click="showDetail = false">关闭</button>
        </div>
      </div>
    </div>

    <div v-if="showBatchStatus" class="modal-backdrop" @click.self="showBatchStatus = false">
      <div class="modal">
        <h3>批量更新状态</h3>
        <p class="muted" style="margin-bottom: 12px">将更新 {{ selectedCount }} 个设备</p>
        <select v-model="batchStatus">
          <option v-for="item in statusOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
        </select>
        <div class="modal-actions">
          <button type="button" class="ghost" @click="showBatchStatus = false">取消</button>
          <button type="button" class="primary" @click="confirmBatchStatus">确定</button>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.device-page {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.5rem;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.88), rgba(236, 244, 255, 0.9));
  box-shadow: 0 20px 45px rgba(15, 23, 42, 0.08);
}

.eyebrow {
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-size: 0.8rem;
  color: #6b7280;
}

.muted {
  color: #6b7280;
}

.counter {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
}

.status-pill {
  padding: 0.2rem 0.8rem;
  border-radius: 999px;
  color: #0f172a;
  font-weight: 600;
  font-size: 0.85rem;
}

.status-pill.online {
  background: rgba(34, 197, 94, 0.2);
}

.status-pill.offline {
  background: rgba(148, 163, 184, 0.2);
}

.status-pill.maintenance {
  background: rgba(251, 191, 36, 0.2);
}

.panel {
  background: #fff;
  border-radius: 18px;
  padding: 1rem 1.2rem;
  box-shadow: 0 12px 35px rgba(15, 23, 42, 0.08);
}

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  align-items: end;
}

.filters .field {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.filters input,
.filters select {
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 10px;
  padding: 0.55rem 0.75rem;
  font-size: 0.95rem;
}

.filters .actions {
  display: flex;
  gap: 0.5rem;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.toolbar .left,
.toolbar .right {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  align-items: center;
}

button {
  border: none;
  border-radius: 12px;
  padding: 0.55rem 1rem;
  font-weight: 600;
  cursor: pointer;
}

button.primary {
  background: linear-gradient(135deg, #38bdf8, #a855f7);
  color: #fff;
}

button.ghost {
  background: rgba(15, 23, 42, 0.06);
  color: #0f172a;
}

button.danger {
  background: rgba(248, 113, 113, 0.18);
  color: #b91c1c;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.table-panel {
  overflow-x: auto;
}

.table-panel table {
  width: 100%;
  border-collapse: collapse;
}

.table-panel th,
.table-panel td {
  text-align: left;
  padding: 0.75rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);
}

.table-panel thead {
  background: rgba(15, 23, 42, 0.04);
}

.table-panel input[type='checkbox'] {
  width: 16px;
  height: 16px;
}

.table-panel .title {
  font-weight: 600;
}

.table-panel .sub {
  font-size: 0.85rem;
  color: #94a3b8;
}

.mono {
  font-family: 'Fira Code', monospace;
}

.tag {
  display: inline-flex;
  align-items: center;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
  background: rgba(99, 102, 241, 0.12);
  color: #312e81;
}

.tag.success {
  background: rgba(34, 197, 94, 0.18);
  color: #166534;
}

.tag.warning {
  background: rgba(251, 191, 36, 0.25);
  color: #92400e;
}

.tag.danger {
  background: rgba(248, 113, 113, 0.2);
  color: #b91c1c;
}

.tag.info {
  background: rgba(148, 163, 184, 0.25);
  color: #334155;
}

.status-chip {
  display: inline-flex;
  padding: 0.2rem 0.65rem;
  border-radius: 999px;
  color: #0f172a;
  font-weight: 600;
}

.ops {
  display: flex;
  gap: 0.4rem;
}

.empty {
  text-align: center;
  color: #94a3b8;
}

.pagination {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  justify-content: center;
}

.toast {
  padding: 0.75rem 1rem;
  border-radius: 12px;
  font-weight: 600;
}

.toast.success {
  background: rgba(34, 197, 94, 0.15);
  color: #15803d;
}

.toast.error {
  background: rgba(248, 113, 113, 0.15);
  color: #b91c1c;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  z-index: 20;
}

.modal {
  background: #fff;
  border-radius: 18px;
  padding: 1.2rem;
  width: min(640px, 100%);
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 0.8rem;
}

.form-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  font-size: 0.9rem;
  color: #475569;
}

.form-grid input,
.form-grid select,
.modal select {
  border: 1px solid rgba(15, 23, 42, 0.15);
  border-radius: 10px;
  padding: 0.5rem 0.65rem;
  font-size: 0.95rem;
}

.form-error {
  color: #dc2626;
  font-weight: 600;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.6rem;
}

.detail-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 0.6rem;
}

.detail-list li {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 0.7rem;
  background: rgba(15, 23, 42, 0.04);
  border-radius: 10px;
}

.detail-list span {
  color: #475569;
}

@media (max-width: 768px) {
  .toolbar {
    flex-direction: column;
    align-items: flex-start;
  }

  .counter {
    justify-content: flex-start;
  }
}

/* 自定义下拉选择器样式 */
.custom-select {
  position: relative;
  min-width: 140px;
}

.select-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  background: white;
  border: 2px solid rgba(15, 23, 42, 0.1);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  font-size: 0.875rem;
  font-weight: 500;
  color: rgba(15, 23, 42, 0.8);
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.1);
}

.select-trigger:hover {
  border-color: rgba(59, 130, 246, 0.3);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.15);
  transform: translateY(-1px);
}

.custom-select.open .select-trigger {
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.select-value {
  flex: 1;
  text-align: left;
}

.select-arrow {
  width: 20px;
  height: 20px;
  color: rgba(15, 23, 42, 0.5);
  transition: transform 0.3s ease;
  margin-left: 0.5rem;
}

.custom-select.open .select-arrow {
  transform: rotate(180deg);
  color: #3b82f6;
}

.select-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: white;
  border: 2px solid rgba(59, 130, 246, 0.2);
  border-radius: 12px;
  margin-top: 0.25rem;
  box-shadow: 0 10px 25px rgba(15, 23, 42, 0.15);
  animation: dropdownSlide 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  overflow: hidden;
  max-height: 200px;
  overflow-y: auto;
}

@keyframes dropdownSlide {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.select-option {
  padding: 0.75rem 1rem;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 0.875rem;
  color: rgba(15, 23, 42, 0.8);
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.select-option:last-child {
  border-bottom: none;
}

.select-option:hover {
  background: linear-gradient(45deg, rgba(59, 130, 246, 0.08), rgba(147, 51, 234, 0.08));
  color: #3b82f6;
  transform: translateX(4px);
}

.select-option.active {
  background: linear-gradient(45deg, rgba(59, 130, 246, 0.12), rgba(147, 51, 234, 0.12));
  color: #3b82f6;
  font-weight: 600;
  position: relative;
}

.select-option.active::after {
  content: '✓';
  position: absolute;
  right: 1rem;
  color: #3b82f6;
  font-weight: bold;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.status-dot.online {
  background: #10b981;
}

.status-dot.offline {
  background: #ef4444;
}

.status-dot.maintenance {
  background: #f59e0b;
}
</style>
