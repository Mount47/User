<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useEntityStore } from '@/store'
import { useCareData } from '@/composables/useCareData'
import type { DeviceStatus } from '@/types'
import { debugLog } from '@/utils/debugLog'

type StatusFilter = 'ALL' | DeviceStatus

interface MappingRow {
  id: string
  userId: string
  userName: string
  deviceType: string
  deviceId: string
  deviceName: string
  mappingName: string
  state: DeviceStatus
  lastUpdated: string
  accent: string
}

const palette = ['#8b5cf6', '#0ea5e9', '#f472b6', '#f59e0b', '#10b981', '#14b8a6']

const entityStore = useEntityStore()
const { lastSyncedAt } = useCareData()
const mappingSource = computed(() => {
  debugLog('MappingsView', 'mappings数据状态', { 
    mappingsCount: entityStore.mappings.length,
    devicesCount: entityStore.devices.length,
    loading: entityStore.loading
  })
  return entityStore.mappings.length ? entityStore.mappings : []
})
const searchTerm = ref('')
const statusFilter = ref<StatusFilter>('ALL')
const page = ref(1)
const pageSize = 5
const selectedRows = ref<string[]>([])

// 下拉框状态
const statusDropdownOpen = ref(false)

// 下拉框选择方法
function selectStatusFilter(value: StatusFilter) {
  statusFilter.value = value
  statusDropdownOpen.value = false
}

// 点击外部关闭下拉框
function closeDropdowns() {
  statusDropdownOpen.value = false
}

function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement
  if (!target.closest('.custom-select')) {
    closeDropdowns()
  }
}

onMounted(async () => {
  await entityStore.refreshAll()
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside)
})

watch(
  () => mappingSource.value,
  (next) => {
    debugLog('MappingsView', '接收到映射数据', next)
    debugLog('MappingsView', '数据接收状态', Array.isArray(next) && next.length ? '成功' : '空数据')
  },
  { immediate: true }
)

const stateCopy: Record<DeviceStatus, string> = {
  ONLINE: '在线',
  OFFLINE: '离线',
  MAINTENANCE: '维护中'
}

function formatLastUpdated(value?: string): string {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value || 'N/A'
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  }).format(date)
}

const mappingRows = computed<MappingRow[]>(() => {
  const rows: MappingRow[] = []
  let colorIndex = 0
  
  // 优先使用映射数据，如果没有映射数据则从设备数据构建默认行
  const mappings = mappingSource.value
  const devices = entityStore.devices
  
  debugLog('MappingsView', '构建表格行', { mappingsCount: mappings.length, devicesCount: devices.length })
  
  if (mappings.length > 0) {
    // 处理真实的映射数据
    mappings.forEach((mapping: any) => {
      const paletteValue = palette[colorIndex % palette.length]
      const accent = paletteValue ?? '#8b5cf6'
      
      rows.push({
        id: String(mapping.id || `mapping-${colorIndex}`),
        userId: String(mapping.personId || '未登记'),
        userName: mapping.personName || mapping.person?.personName || '未分配',
        deviceType: mapping.device?.modelType || '未知型号',
        deviceId: String(mapping.deviceId || mapping.device?.deviceId || '未知设备'),
        deviceName: mapping.deviceName || mapping.device?.deviceName || '未知设备',
        mappingName: `${mapping.deviceName || mapping.device?.deviceName || mapping.deviceId}-${mapping.personName || 'Mapping'}`,
        state: (mapping.device?.status || 'OFFLINE') as DeviceStatus,
        lastUpdated: formatLastUpdated(mapping.device?.updatedAt || mapping.device?.createdAt || lastSyncedAt.value || ''),
        accent
      })
      colorIndex += 1
    })
  } else if (devices.length > 0) {
    // 如果没有映射数据，从设备数据构建基础行
    devices.forEach((device: any) => {
      const paletteValue = palette[colorIndex % palette.length]
      
      // 为每个设备创建一个默认的映射行
      const color = palette[colorIndex % palette.length]
      rows.push({
        id: `device-${device.deviceId || device.id}-default`,
        userId: '未登记',
        userName: '未分配',
        deviceType: device.modelType || '未知型号',
        deviceId: String(device.deviceId || device.id || '未知设备'),
        deviceName: device.deviceName || '未知设备',
        mappingName: `${device.deviceName || device.deviceId}-未绑定`,
        state: (device.status || 'OFFLINE') as DeviceStatus,
        lastUpdated: formatLastUpdated(device.updatedAt || lastSyncedAt.value || ''),
        accent: color ?? '#8b5cf6'
      })
      colorIndex += 1
    })
  }
  
  debugLog('MappingsView', '构建的表格行数据', { rowCount: rows.length, rows: rows.slice(0, 3) })
  return rows
})

const filteredRows = computed(() => {
  const term = searchTerm.value.trim().toLowerCase()
  return mappingRows.value.filter((row) => {
    const matchesStatus = statusFilter.value === 'ALL' || row.state === statusFilter.value
    const matchesTerm =
      !term ||
      [row.userId, row.userName, row.deviceName, row.deviceId, row.mappingName, row.deviceType]
        .filter(Boolean)
        .some((val) => val.toLowerCase().includes(term))
    return matchesStatus && matchesTerm
  })
})

const pageCount = computed(() => Math.max(1, Math.ceil(filteredRows.value.length / pageSize)))

const pagedRows = computed(() => {
  const start = (page.value - 1) * pageSize
  return filteredRows.value.slice(start, start + pageSize)
})

const pageRangeLabel = computed(() => {
  if (!filteredRows.value.length) return 'Showing 0 from 0 data'
  const start = (page.value - 1) * pageSize + 1
  const end = Math.min(page.value * pageSize, filteredRows.value.length)
  return `Showing ${start}-${end} from ${filteredRows.value.length} data`
})

const pageIds = computed(() => pagedRows.value.map((row) => row.id))
const allOnPageSelected = computed(
  () => !!pageIds.value.length && pageIds.value.every((id) => selectedRows.value.includes(id))
)

watch(
  () => filteredRows.value.map((row) => row.id),
  (validIds) => {
    selectedRows.value = selectedRows.value.filter((id) => validIds.includes(id))
  }
)

watch(pageCount, (count) => {
  if (page.value > count) {
    page.value = count
  }
})

function toggleRowSelection(rowId: string) {
  if (selectedRows.value.includes(rowId)) {
    selectedRows.value = selectedRows.value.filter((id) => id !== rowId)
  } else {
    selectedRows.value = [...selectedRows.value, rowId]
  }
}

function toggleSelectAllOnPage() {
  if (allOnPageSelected.value) {
    selectedRows.value = selectedRows.value.filter((id) => !pageIds.value.includes(id))
  } else {
    const union = new Set([...selectedRows.value, ...pageIds.value])
    selectedRows.value = Array.from(union)
  }
}

function goPrev() {
  page.value = Math.max(1, page.value - 1)
}

function goNext() {
  page.value = Math.min(pageCount.value, page.value + 1)
}

function handleAddMapping() {
  console.info('Add mapping for selection', selectedRows.value)
}

function handleRemoveMapping() {
  console.info('Remove mapping for selection', selectedRows.value)
}
</script>

<template>
  <section class="mapping-page">
    <header class="page-head">
      <div>
        <p class="eyebrow">Mapping</p>
        <h1>雷达绑定关系</h1>
        <p class="muted">以表格形式呈现用户、设备、映射名称及状态，贴近示意图交互。</p>
      </div>
      <div class="page-actions">
        <label class="search-field" aria-label="搜索映射">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15.5 14h-.79l-.28-.27A6 6 0 1 0 14 15.5l.27.28v.79L20 21.49 21.49 20Zm-6 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
              fill="currentColor"
            />
          </svg>
          <input v-model="searchTerm" type="search" placeholder="Search here..." />
        </label>
        <div class="action-block">
          <button class="circle plus" type="button" @click="handleAddMapping">+</button>
          <button class="circle minus" type="button" @click="handleRemoveMapping">-</button>
          <p>增删映射信息</p>
        </div>
      </div>
    </header>

    <article class="table-shell">
      <div class="table-toolbar">
        <div class="filter">
          <label>状态</label>
          <div class="custom-select" :class="{ open: statusDropdownOpen }">
            <div class="select-trigger" @click="statusDropdownOpen = !statusDropdownOpen">
              <span class="select-value">
                {{ statusFilter === 'ALL' ? '全部状态' : 
                   statusFilter === 'ONLINE' ? '🟢 在线' : 
                   statusFilter === 'OFFLINE' ? '🔴 离线' : 
                   statusFilter === 'MAINTENANCE' ? '🟡 维护' : '全部状态' }}
              </span>
              <svg class="select-arrow" viewBox="0 0 24 24">
                <path d="M7 10l5 5 5-5z" fill="currentColor"/>
              </svg>
            </div>
            <div class="select-dropdown" v-show="statusDropdownOpen">
              <div 
                class="select-option" 
                :class="{ active: statusFilter === 'ALL' }"
                @click="selectStatusFilter('ALL')"
              >
                全部状态
              </div>
              <div 
                class="select-option" 
                :class="{ active: statusFilter === 'ONLINE' }"
                @click="selectStatusFilter('ONLINE')"
              >
                🟢 在线
              </div>
              <div 
                class="select-option" 
                :class="{ active: statusFilter === 'OFFLINE' }"
                @click="selectStatusFilter('OFFLINE')"
              >
                🔴 离线
              </div>
              <div 
                class="select-option" 
                :class="{ active: statusFilter === 'MAINTENANCE' }"
                @click="selectStatusFilter('MAINTENANCE')"
              >
                🟡 维护
              </div>
            </div>
          </div>
        </div>
        <button class="ghost" type="button" @click="entityStore.fetchDevices(true)">刷新绑定</button>
      </div>

      <div class="table-wrapper">
        <table>
          <thead>
            <tr>
              <th>
                <label class="checkbox">
                  <input type="checkbox" :checked="allOnPageSelected" @change="toggleSelectAllOnPage" />
                  <span></span>
                </label>
              </th>
              <th>用户ID</th>
              <th>用户姓名</th>
              <th>设备类型</th>
              <th>设备ID</th>
              <th>设备名称</th>
              <th>映射名称</th>
              <th>状态</th>
              <th>最近更新</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="row in pagedRows"
              :key="row.id"
              :class="{ selected: selectedRows.includes(row.id) }"
              :style="{ '--accent': row.accent }"
            >
              <td>
                <label class="checkbox">
                  <input
                    type="checkbox"
                    :checked="selectedRows.includes(row.id)"
                    @change="toggleRowSelection(row.id)"
                  />
                  <span></span>
                </label>
              </td>
              <td class="user-col">
                <span class="select-bar"></span>
                <strong>{{ row.userId }}</strong>
              </td>
              <td class="muted">{{ row.userName }}</td>
              <td>
                <div class="type-pill">
                  <span class="type-dot" :style="{ background: row.accent }"></span>
                  {{ row.deviceType }}
                </div>
              </td>
              <td>{{ row.deviceId }}</td>
              <td>{{ row.deviceName }}</td>
              <td>{{ row.mappingName }}</td>
              <td>
                <span class="state" :class="row.state.toLowerCase()">{{ stateCopy[row.state] }}</span>
              </td>
              <td>{{ row.lastUpdated }}</td>
              <td class="actions">
                <button type="button" aria-label="More actions">
                  <span></span>
                  <span></span>
                  <span></span>
                </button>
              </td>
            </tr>
            <tr v-if="!pagedRows.length">
              <td colspan="10" class="empty-row">没有匹配的映射记录</td>
            </tr>
          </tbody>
        </table>
      </div>

      <footer class="table-footer">
        <span>{{ pageRangeLabel }}</span>
        <div class="pager">
          <button type="button" :disabled="page === 1" @click="goPrev">‹</button>
          <button
            v-for="index in pageCount"
            :key="`page-${index}`"
            type="button"
            :class="{ current: index === page }"
            @click="page = index"
          >
            {{ index }}
          </button>
          <button type="button" :disabled="page === pageCount" @click="goNext">›</button>
        </div>
      </footer>
    </article>
  </section>
</template>

<style scoped>
:global(body) {
  background: #f4f5fb;
}

.mapping-page {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  color: #0f172a;
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  flex-wrap: wrap;
}

.page-head h1 {
  margin: 0.2rem 0;
  font-size: clamp(1.5rem, 3vw, 2.2rem);
}

.muted {
  color: rgba(15, 23, 42, 0.6);
  margin: 0;
}

.page-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  flex-wrap: wrap;
}

.search-field {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: #fff;
  border-radius: 999px;
  padding: 0.5rem 1rem;
  border: 1px solid rgba(15, 23, 42, 0.1);
}

.search-field svg {
  width: 18px;
  height: 18px;
  color: rgba(15, 23, 42, 0.5);
}

.search-field input {
  border: none;
  outline: none;
  background: transparent;
  font-size: 0.95rem;
  color: #0f172a;
}

.action-block {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.action-block p {
  margin: 0;
  font-size: 0.85rem;
  color: rgba(15, 23, 42, 0.6);
}

.action-block .circle {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  border: none;
  color: #fff;
  font-size: 1.1rem;
  cursor: pointer;
}

.action-block .plus {
  background: #8b5cf6;
}

.action-block .minus {
  background: #94a3b8;
}

.table-shell {
  background: #fff;
  border-radius: 30px;
  padding: 1.5rem;
  box-shadow: 0 25px 45px rgba(15, 23, 42, 0.08);
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.table-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.filter {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.filter label {
  font-weight: 600;
  color: rgba(15, 23, 42, 0.6);
}

.filter select {
  border-radius: 16px;
  border: 1px solid rgba(15, 23, 42, 0.15);
  padding: 0.4rem 0.8rem;
  background: #f9fafb;
  color: #0f172a;
}

.ghost {
  border: none;
  background: rgba(124, 58, 237, 0.08);
  color: #7c3aed;
  padding: 0.45rem 1rem;
  border-radius: 999px;
  cursor: pointer;
  font-weight: 600;
}

.table-wrapper {
  border: 1px solid rgba(15, 23, 42, 0.08);
  border-radius: 24px;
  overflow: hidden;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.95rem;
}

thead {
  background: #f1f5f9;
}

th,
td {
  padding: 0.85rem 1rem;
  text-align: left;
  vertical-align: middle;
}

tbody tr {
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
  position: relative;
}

tbody tr.selected {
  background: rgba(139, 92, 246, 0.05);
}

tbody tr.selected::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  border-radius: 0 4px 4px 0;
  background: var(--accent);
}

.checkbox {
  position: relative;
  display: inline-flex;
  align-items: center;
  cursor: pointer;
}

.checkbox input {
  opacity: 0;
  position: absolute;
  width: 0;
  height: 0;
}

.checkbox span {
  width: 18px;
  height: 18px;
  border-radius: 6px;
  border: 1px solid rgba(15, 23, 42, 0.3);
  display: inline-block;
}

.checkbox input:checked + span {
  background: #8b5cf6;
  border-color: #8b5cf6;
}

.user-col {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.user-col .select-bar {
  width: 4px;
  height: 28px;
  border-radius: 999px;
  background: var(--accent);
  display: inline-block;
}

.type-pill {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.type-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.state {
  padding: 0.2rem 0.8rem;
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 600;
}

.state.online {
  background: rgba(16, 185, 129, 0.15);
  color: #059669;
}

.state.offline {
  background: rgba(248, 113, 113, 0.15);
  color: #dc2626;
}

.state.maintenance {
  background: rgba(251, 191, 36, 0.2);
  color: #b45309;
}

.actions button {
  border: none;
  background: transparent;
  display: inline-flex;
  flex-direction: column;
  gap: 0.2rem;
  cursor: pointer;
}

.actions span {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: rgba(15, 23, 42, 0.5);
}

.empty-row {
  text-align: center;
  color: rgba(15, 23, 42, 0.6);
}

.table-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.8rem;
  color: rgba(15, 23, 42, 0.6);
}

.pager {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
}

.pager button {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: none;
  background: #f3f4f6;
  color: #0f172a;
  cursor: pointer;
}

.pager button.current {
  background: #7c3aed;
  color: #fff;
}

.pager button:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.25em;
  font-size: 0.75rem;
  color: rgba(15, 23, 42, 0.4);
  margin: 0;
}

@media (max-width: 960px) {
  .table-wrapper {
    overflow-x: auto;
  }
  table {
    min-width: 900px;
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
</style>
