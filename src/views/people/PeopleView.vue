<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useCareData } from '@/composables/useCareData'
import { debugLog } from '@/utils/debugLog'
import { personApi } from '@/api'

// 表单和弹窗状态
const showUserForm = ref(false)
const formMode = ref<'create' | 'edit'>('create')
const showDeleteConfirm = ref(false)
const selectedForDelete = ref<string | null>(null)
const formLoading = ref(false)
const formError = ref('')
const feedback = ref<{ type: 'success' | 'error'; message: string } | null>(null)

// 用户表单数据
interface UserForm {
  personId: string
  personName: string
  gender: 'M' | 'F'
  age: number
  department: string
  tags?: string[]
  systemUserId?: string | number
}

const userForm = ref<UserForm>({
  personId: '',
  personName: '',
  gender: 'M',
  age: 18,
  department: '',
  tags: []
})

// 重置表单
function resetForm() {
  userForm.value = {
    personId: '',
    personName: '',
    gender: 'M',
    age: 18,
    department: '',
    tags: [],
    systemUserId: undefined
  }
  formError.value = ''
}

const slugify = (value: string) => value.trim().toLowerCase().replace(/\s+/g, '_')

function resolveSystemUserId(form: UserForm): string | number {
  const raw = form.systemUserId
  if (raw !== undefined && raw !== null && String(raw).trim() !== '') {
    return raw
  }
  const fallbackSource = form.personId.trim() || form.personName.trim()
  return slugify(fallbackSource)
}

// 显示反馈消息
function showFeedback(type: 'success' | 'error', message: string) {
  feedback.value = { type, message }
  setTimeout(() => {
    feedback.value = null
  }, 3000)
}

const { entityStore, alerts, hydrateScope, refreshAlerts } = useCareData()

const people = computed(() => entityStore.persons)

const keyword = ref('')
const tableKeyword = ref('')
const genderFilter = ref<'all' | 'M' | 'F'>('all')
const departmentFilter = ref('all')
const page = ref(1)
const pageSize = 5

// 下拉框状态
const departmentDropdownOpen = ref(false)
const genderDropdownOpen = ref(false)

// 下拉框选择方法
function selectDepartment(value: string) {
  departmentFilter.value = value
  departmentDropdownOpen.value = false
}

function selectGender(value: 'all' | 'M' | 'F') {
  genderFilter.value = value
  genderDropdownOpen.value = false
}

// 点击外部关闭下拉框
function closeDropdowns() {
  departmentDropdownOpen.value = false
  genderDropdownOpen.value = false
}

onMounted(async () => {
  await hydrateScope()
  await refreshAlerts(entityStore.selectedPersonId)
  
  // 添加点击外部关闭下拉框的事件监听
  document.addEventListener('click', handleClickOutside)
})

onUnmounted(() => {
  // 清理事件监听器
  document.removeEventListener('click', handleClickOutside)
})

// 点击外部关闭下拉框
function handleClickOutside(event: Event) {
  const target = event.target as HTMLElement
  if (!target.closest('.custom-select')) {
    closeDropdowns()
  }
}

// 用户管理方法

// 打开新增用户表单
function openAddUserForm() {
  formMode.value = 'create'
  resetForm()
  showUserForm.value = true
}

// 打开编辑用户表单
function openEditUserForm(person: any) {
  formMode.value = 'edit'
  userForm.value = {
    personId: String(person.personId ?? person.person_id ?? ''),
    personName: person.personName || '',
    gender: person.gender || 'M',
    age: person.age || 18,
    department: person.department || '',
    tags: person.tags || [],
    systemUserId: person.systemUserId
  }
  showUserForm.value = true
}

// 提交表单
async function submitUserForm() {
  const trimmedPersonId = userForm.value.personId.trim()
  if (!trimmedPersonId) {
    formError.value = '请输入用户ID'
    return
  }
  const trimmedPersonName = userForm.value.personName.trim()
  if (!trimmedPersonName) {
    formError.value = '请输入用户姓名'
    return
  }
  if (userForm.value.age < 1 || userForm.value.age > 150) {
    formError.value = '请输入正确的年龄 (1-150)'
    return
  }
  const trimmedDepartment = userForm.value.department.trim()
  if (!trimmedDepartment) {
    formError.value = '请输入部门信息'
    return
  }

  formLoading.value = true
  formError.value = ''

  try {
    const payload = {
      person_id: trimmedPersonId,
      person_name: trimmedPersonName,
      gender: userForm.value.gender,
      age: Number(userForm.value.age),
      department: trimmedDepartment,
      system_user_id: resolveSystemUserId(userForm.value)
    }

    debugLog('PeopleView', `提交${formMode.value === 'create' ? '创建' : '更新'}表单`, payload)
    console.log('完整的请求payload:', JSON.stringify(payload, null, 2))
    console.log('Payload字段类型检�?', {
      person_id: typeof payload.person_id,
      person_name: typeof payload.person_name,
      gender: typeof payload.gender,
      age: typeof payload.age,
      department: typeof payload.department,
      system_user_id: typeof payload.system_user_id
    })

    if (formMode.value === 'create') {
      console.log('发送POST请求�?', '/api/persons')
      const result = await personApi.create(payload)
      debugLog('PeopleView', '用户创建结果', result)
      showFeedback('success', '用户创建成功')
    } else {
      console.log('发送PUT请求�?', `/api/persons/${trimmedPersonId}`)
      const result = await personApi.update(trimmedPersonId, payload)
      debugLog('PeopleView', '用户更新结果', result)
      showFeedback('success', '用户信息更新成功')
    }

    showUserForm.value = false
    await hydrateScope()
  } catch (error: any) {
    debugLog('PeopleView', '表单提交错误', { error, formData: userForm.value })
    console.error('User form submission error:', error)
    const errorMsg = error?.message || error?.data?.message || '操作失败，请稍后重试'
    formError.value = errorMsg
    showFeedback('error', errorMsg)
  } finally {
    formLoading.value = false
  }
}
// 取消表单
function cancelUserForm() {
  showUserForm.value = false
  resetForm()
}

// 打开删除确认对话框
function openDeleteConfirm(personId: string) {
  selectedForDelete.value = personId
  showDeleteConfirm.value = true
}

// 删除用户
async function deleteUser() {
  if (!selectedForDelete.value) return

  formLoading.value = true
  try {
    debugLog('PeopleView', '删除用户', selectedForDelete.value)
    const result = await personApi.remove(selectedForDelete.value)
    debugLog('PeopleView', '删除结果', result)
    showFeedback('success', '用户删除成功')
    showDeleteConfirm.value = false
    selectedForDelete.value = null
    // 刷新数据
    await hydrateScope()
  } catch (error: any) {
    debugLog('PeopleView', '删除用户错误', error)
    console.error('Delete user error:', error)
    const errorMsg = error?.message || error?.data?.message || '删除失败，请稍后重试'
    showFeedback('error', errorMsg)
  } finally {
    formLoading.value = false
  }
}

// 取消删除
function cancelDelete() {
  showDeleteConfirm.value = false
  selectedForDelete.value = null
}

watch(
  () => entityStore.selectedPersonId,
  async (next, prev) => {
    if (next === prev) return
    await refreshAlerts(next)
  }
)

watch(
  () => people.value,
  (next) => {
    debugLog('PeopleView', '接收到人员数据', next)
    debugLog('PeopleView', '数据接收状态', Array.isArray(next) && next.length ? '成功' : '空数据')
  },
  { immediate: true }
)

const departments = computed(() => {
  const values = Array.from(new Set(people.value.map((person) => person.department).filter(Boolean)))
  return ['all', ...values]
})

const filtered = computed(() => {
  const globalTerm = keyword.value.trim().toLowerCase()
  const listTerm = tableKeyword.value.trim().toLowerCase()

  return people.value.filter((person) => {
    const baseTarget = `${person.personName} ${person.department} ${person.personId}`.toLowerCase()
    const deviceTarget = person.devices.map((device) => `${device.deviceId} ${device.deviceName}`.toLowerCase()).join(' ')
    const matchesKeyword = !globalTerm || baseTarget.includes(globalTerm) || deviceTarget.includes(globalTerm)
    const matchesTableKeyword = !listTerm || baseTarget.includes(listTerm) || deviceTarget.includes(listTerm)
    const matchesGender = genderFilter.value === 'all' || person.gender === genderFilter.value
    const matchesDepartment = departmentFilter.value === 'all' || person.department === departmentFilter.value
    return matchesKeyword && matchesTableKeyword && matchesGender && matchesDepartment
  })
})

watch(
  () => [filtered.value.length, pageSize],
  () => {
    page.value = 1
  }
)

const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / pageSize)))
const pagedPersons = computed(() => {
  const start = (page.value - 1) * pageSize
  return filtered.value.slice(start, start + pageSize)
})

const pageRangeLabel = computed(() => {
  if (!filtered.value.length) {
    return 'Showing 0 results'
  }
  const start = (page.value - 1) * pageSize + 1
  const end = Math.min(page.value * pageSize, filtered.value.length)
  return `Showing ${start}-${end} of ${filtered.value.length}`
})

const totalUsers = computed(() => people.value.length)
const activeUsers = computed(() => people.value.filter((person) => person.devices.length > 0).length)
const inactiveUsers = computed(() => Math.max(0, totalUsers.value - activeUsers.value))
const activeRate = computed(() => {
  if (!totalUsers.value) return 0
  return Math.round((activeUsers.value / totalUsers.value) * 100)
})

const genderStats = computed(() => {
  return people.value.reduce(
    (acc, person) => {
      acc[person.gender] += 1
      return acc
    },
    { M: 0, F: 0 }
  )
})

const genderRate = computed(() => {
  const total = genderStats.value.M + genderStats.value.F
  if (!total) {
    return { male: 0, female: 0 }
  }
  return {
    male: Math.round((genderStats.value.M / total) * 100),
    female: Math.round((genderStats.value.F / total) * 100)
  }
})

const ageBuckets = computed(() => {
  const config = [
    { label: '0-18', min: 0, max: 18 },
    { label: '19-30', min: 19, max: 30 },
    { label: '31-45', min: 31, max: 45 },
    { label: '46-60', min: 46, max: 60 },
    { label: '61-75', min: 61, max: 75 },
    { label: '76-90', min: 76, max: 90 },
    { label: '91+', min: 91, max: Infinity }
  ]
  return config.map((bucket) => {
    const male = people.value.filter(
      (person) => person.gender === 'M' && person.age != null && person.age >= bucket.min && person.age <= bucket.max
    ).length
    const female = people.value.filter(
      (person) => person.gender === 'F' && person.age != null && person.age >= bucket.min && person.age <= bucket.max
    ).length
    return { ...bucket, male, female, total: male + female }
  })
})

const newUsers = computed(() => {
  const tagged = people.value.filter((person) =>
    (person.tags || []).some((tag) => /new|新|recent/i.test(tag))
  ).length
  if (tagged) return tagged
  return Math.min(activeUsers.value, Math.ceil(activeUsers.value * 0.35))
})

const returningUsers = computed(() => Math.max(activeUsers.value - newUsers.value, 0))
const newRate = computed(() => {
  if (!activeUsers.value) return 0
  return Math.round((newUsers.value / activeUsers.value) * 100)
})

const sparklinePoints = computed(() => {
  const fallback = [20, 35, 45, 30, 50, 65, 48, 72]
  if (!people.value.length) return fallback
  return people.value.slice(0, 8).map((person, index) => {
    const normalized = ((person.age || 0) % 50) + 20 + (index % 3) * 5
    return Math.min(90, normalized)
  })
})

const sparklinePath = computed(() => {
  const points = sparklinePoints.value
  if (!points.length) return ''
  const step = 100 / (points.length - 1 || 1)
  return points
    .map((value, index) => {
      const x = index * step
      const y = 100 - value
      return `${index === 0 ? 'M' : 'L'}${x},${y}`
    })
    .join(' ')
})

const selectedPerson = computed(() => entityStore.selectedPerson)

const userAlerts = computed(() => {
  if (!alerts.value.length) return []
  const target = selectedPerson.value?.personId
  const scoped = target ? alerts.value.filter((alert: any) => alert.personId === target) : alerts.value
  return scoped.slice(0, 4)
})

const timelineItems = computed(() => {
  if (userAlerts.value.length) {
    return userAlerts.value.map((alert: any) => ({
      id: alert.alertId,
      title: alert.alertType || alert.category || 'Exception',
      type: alert.category || 'alert',
      detail: alert.description || `Device ${alert.deviceId}`,
      time: formatDate(alert.detectedAt)
    }))
  }

  if (selectedPerson.value) {
    return selectedPerson.value.devices.map((device, index) => ({
      id: `${device.deviceId}-${index}`,
      title: '设备绑定',
      type: 'device',
      detail: `${device.deviceName} · ${device.modelType || 'mmWave'}`,
      time: device.deviceId
    }))
  }

  return []
})

const latestTransactions = computed(() => {
  if (userAlerts.value.length) {
    return userAlerts.value.map((alert: any) => ({
      id: `alert-${alert.alertId}`,
      title: alert.alertType || '信息更新',
      label: alert.category || 'VITALS',
      time: formatDate(alert.detectedAt),
      tone: alert.severity === 'CRITICAL' || alert.severity === 'HIGH' ? 'danger' : 'info'
    }))
  }

  const person = selectedPerson.value
  if (person) {
    return (person.devices || []).map((device, index) => ({
      id: `${device.deviceId}-${index}`,
      title: 'Equipment use',
      label: device.deviceName,
      time: `绑定 ID ${device.deviceId}`,
      tone: 'success'
    }))
  }

  return [
    { id: 1, title: 'Equipment use', label: '示例设备', time: '2 November 2025, 13:45 PM', tone: 'success' },
    { id: 2, title: 'Information update', label: '示例操作', time: '2 November 2025, 12:15 PM', tone: 'info' }
  ]
})

const avatarInitials = computed(() => {
  if (!selectedPerson.value) return '--'
  return (selectedPerson.value.personName || '--').slice(0, 2).toUpperCase()
})

function goPrevPage() {
  page.value = Math.max(1, page.value - 1)
}

function goNextPage() {
  page.value = Math.min(pageCount.value, page.value + 1)
}

function selectRow(personId: string) {
  entityStore.setSelectedPerson(personId)
}

function formatGender(value: 'M' | 'F') {
  return value === 'M' ? '男' : '女'
}

// 生成饼状图路径
function getGenderPiePath(startPercent: number, endPercent: number): string {
  const radius = 60
  const centerX = 80
  const centerY = 80
  
  const startAngle = (startPercent / 100) * 2 * Math.PI - Math.PI / 2
  const endAngle = ((startPercent + endPercent) / 100) * 2 * Math.PI - Math.PI / 2
  
  const x1 = centerX + radius * Math.cos(startAngle)
  const y1 = centerY + radius * Math.sin(startAngle)
  const x2 = centerX + radius * Math.cos(endAngle)
  const y2 = centerY + radius * Math.sin(endAngle)
  
  const largeArcFlag = endPercent > 50 ? 1 : 0
  
  return `M ${centerX} ${centerY} L ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2} Z`
}

// 计算柱状图高度
function getBarHeight(value: number, buckets: any[]): number {
  const maxValue = Math.max(...buckets.flatMap(bucket => [bucket.male, bucket.female]))
  return maxValue > 0 ? (value / maxValue) * 100 : 0
}

function formatDate(value?: string) {
  if (!value) return 'N/A'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}
</script>

<template>
  <section class="people-page">
    <!-- 反馈消息 -->
    <div v-if="feedback" class="feedback-toast" :class="feedback.type">
      <div class="toast-content">
        <span class="toast-icon">
          {{ feedback.type === 'success' ? '✓' : '⚠️' }}
        </span>
        <span class="toast-message">{{ feedback.message }}</span>
      </div>
    </div>

    <header class="page-head">
      <div>
        <p class="eyebrow">Users</p>
        <h1>人员分析与管理</h1>
        <p class="muted">参考示意图构建的人员洞察与明细面板，可继续接入真实统计。</p>
      </div>
      <div class="page-actions">
        <label class="search-field" aria-label="搜索人员">
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path
              d="M15.5 14h-.79l-.28-.27A6 6 0 1 0 14 15.5l.27.28v.79L20 21.49 21.49 20Zm-6 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
              fill="currentColor"
            />
          </svg>
          <input v-model="keyword" type="search" placeholder="搜索姓名/设备" />
        </label>
        <button class="outline-btn" type="button">导出列表</button>
      </div>
    </header>

    <section class="insight-grid">
      <article class="card highlight">
        <header>
          <p>人员状态</p>
          <span>{{ activeRate }}%</span>
        </header>
        <div class="donut">
          <svg viewBox="0 0 120 120">
            <defs>
              <linearGradient id="activeGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#8b5cf6"/>
                <stop offset="50%" style="stop-color:#3b82f6"/>
                <stop offset="100%" style="stop-color:#06b6d4"/>
              </linearGradient>
              <linearGradient id="inactiveGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#ff6b9d"/>
                <stop offset="100%" style="stop-color:#ec4899"/>
              </linearGradient>
            </defs>
            <!-- 背景圆环 -->
            <circle cx="60" cy="60" r="44" class="track" />
            <!-- 活跃用户圆环 -->
            <circle
              cx="60"
              cy="60"
              r="44"
              fill="none"
              stroke="url(#activeGradient)"
              stroke-width="12"
              stroke-linecap="round"
              :stroke-dasharray="`${activeRate * 2.76} 276`"
              transform="rotate(-90 60 60)"
              class="progress active-ring"
            />
            <!-- 非活跃用户圆环 -->
            <circle
              cx="60"
              cy="60"
              r="32"
              fill="none"
              stroke="url(#inactiveGradient)"
              stroke-width="8"
              stroke-linecap="round"
              :stroke-dasharray="`${(100 - activeRate) * 2.01} 201`"
              transform="rotate(-90 60 60)"
              class="progress inactive-ring"
            />
          </svg>
          <div class="donut-copy">
            <strong>{{ activeUsers }}</strong>
            <small> / {{ totalUsers }}</small>
          </div>
        </div>
        <p class="secondary">绑定设备即视为活跃，随着数据刷新自动更新。</p>
        <div class="legend">
          <div>
            <span class="dot violet"></span>
            活跃 {{ activeUsers }}
          </div>
          <div>
            <span class="dot gray"></span>
            未使用 {{ inactiveUsers }}
          </div>
        </div>
      </article>

      <article class="card gender-card">
        <header>
          <p>性别分布</p>
          <span>{{ genderStats.M + genderStats.F }} 人</span>
        </header>
        <div class="pie-chart-container">
          <svg class="pie-chart" viewBox="0 0 160 160">
            <defs>
              <linearGradient id="maleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#3b82f6"/>
                <stop offset="100%" style="stop-color:#1e40af"/>
              </linearGradient>
              <linearGradient id="femaleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" style="stop-color:#ec4899"/>
                <stop offset="100%" style="stop-color:#be185d"/>
              </linearGradient>
            </defs>
            <!-- 男性扇形 -->
            <path
              :d="getGenderPiePath(0, genderRate.male)"
              fill="url(#maleGradient)"
              class="pie-slice male-slice"
            />
            <!-- 女性扇形 -->
            <path
              :d="getGenderPiePath(genderRate.male, genderRate.female)"
              fill="url(#femaleGradient)"
              class="pie-slice female-slice"
            />
          </svg>
          <div class="pie-legend">
            <div class="legend-item">
              <div class="color-indicator male-color"></div>
              <span>男性: {{ genderStats.M }} ({{ genderRate.male }}%)</span>
            </div>
            <div class="legend-item">
              <div class="color-indicator female-color"></div>
              <span>女性: {{ genderStats.F }} ({{ genderRate.female }}%)</span>
            </div>
          </div>
        </div>
      </article>

      <article class="card age-card">
        <header>
          <p>年龄分布</p>
          <span>男性 vs 女性</span>
        </header>
        <div class="bar-chart-container">
          <div class="bar-chart">
            <div v-for="bucket in ageBuckets" :key="bucket.label" class="bar-group">
              <div class="bar-label">{{ bucket.label }}</div>
              <div class="bars-wrapper">
                <div class="bar-stack">
                  <div 
                    class="bar male-bar" 
                    :style="{ 
                      height: `${getBarHeight(bucket.male, ageBuckets)}%`,
                      '--bar-color': '#3b82f6'
                    }"
                    :title="`男性：${bucket.male}人`"
                  >
                    <span class="bar-value" v-if="bucket.male > 0">{{ bucket.male }}</span>
                  </div>
                  <div 
                    class="bar female-bar" 
                    :style="{ 
                      height: `${getBarHeight(bucket.female, ageBuckets)}%`,
                      '--bar-color': '#ec4899'
                    }"
                    :title="`女性：${bucket.female}人`"
                  >
                    <span class="bar-value" v-if="bucket.female > 0">{{ bucket.female }}</span>
                  </div>
                </div>
                <div class="bar-total">{{ bucket.total }}</div>
              </div>
            </div>
          </div>
          <div class="chart-legend">
            <div class="legend-item">
              <div class="color-indicator" style="background: linear-gradient(45deg, #3b82f6, #1e40af);"></div>
              <span>男性</span>
            </div>
            <div class="legend-item">
              <div class="color-indicator" style="background: linear-gradient(45deg, #ec4899, #be185d);"></div>
              <span>女性</span>
            </div>
          </div>
        </div>
      </article>

      <article class="card new-users">
        <header>
          <p>New Users</p>
          <span>{{ newRate }}% of active</span>
        </header>
        <div class="sparkline">
          <svg viewBox="0 0 100 100" preserveAspectRatio="none">
            <path :d="sparklinePath" />
          </svg>
        </div>
        <div class="new-summary">
          <div>
            <small>New</small>
            <strong>{{ newUsers }}</strong>
          </div>
          <div>
            <small>Returning</small>
            <strong>{{ returningUsers }}</strong>
          </div>
        </div>
        <p class="secondary">可对接真实创建时间/访问记录，示意图中的折线已呈现。</p>
      </article>
    </section>

    <section class="panel-grid">
      <article class="card table-card">
        <header class="table-head">
          <div>
            <p class="eyebrow">User Details</p>
            <h2>人员列表</h2>
          </div>
          <div class="filters">
            <div class="custom-select" :class="{ open: departmentDropdownOpen }">
              <div class="select-trigger" @click="departmentDropdownOpen = !departmentDropdownOpen">
                <span class="select-value">
                  {{ departmentFilter === 'all' ? '全部科室' : departmentFilter }}
                </span>
                <svg class="select-arrow" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5z" fill="currentColor"/>
                </svg>
              </div>
              <div class="select-dropdown" v-show="departmentDropdownOpen">
                <div 
                  class="select-option" 
                  :class="{ active: departmentFilter === 'all' }"
                  @click="selectDepartment('all')"
                >
                  全部科室
                </div>
                <div 
                  v-for="item in departments.slice(1)" 
                  :key="item" 
                  class="select-option"
                  :class="{ active: departmentFilter === item }"
                  @click="selectDepartment(item || '')"
                >
                  {{ item }}
                </div>
              </div>
            </div>
            
            <div class="custom-select" :class="{ open: genderDropdownOpen }">
              <div class="select-trigger" @click="genderDropdownOpen = !genderDropdownOpen">
                <span class="select-value">
                  {{ genderFilter === 'all' ? '全部性别' : (genderFilter === 'M' ? '男性' : genderFilter === 'F' ? '女性' : '全部性别') }}
                </span>
                <svg class="select-arrow" viewBox="0 0 24 24">
                  <path d="M7 10l5 5 5-5z" fill="currentColor"/>
                </svg>
              </div>
              <div class="select-dropdown" v-show="genderDropdownOpen">
                <div 
                  class="select-option" 
                  :class="{ active: genderFilter === 'all' }"
                  @click="selectGender('all')"
                >
                  全部性别
                </div>
                <div 
                  class="select-option" 
                  :class="{ active: genderFilter === 'F' }"
                  @click="selectGender('F')"
                >
                  女性
                </div>
                <div 
                  class="select-option" 
                  :class="{ active: genderFilter === 'M' }"
                  @click="selectGender('M')"
                >
                  男性
                </div>
              </div>
            </div>
            <label class="table-search">
              <svg viewBox="0 0 24 24">
                <path
                  d="M15.5 14h-.79l-.28-.27A6 6 0 1 0 14 15.5l.27.28v.79L20 21.49 21.49 20Zm-6 0a4 4 0 1 1 0-8 4 4 0 0 1 0 8Z"
                  fill="currentColor"
                />
              </svg>
              <input v-model="tableKeyword" type="search" placeholder="Search here..." />
            </label>
            <div class="table-actions">
              <button class="circle" type="button" @click="openAddUserForm" title="添加用户">+</button>
              <button class="circle" type="button" @click="selectedPerson?.personId && openDeleteConfirm(selectedPerson.personId)" :disabled="!selectedPerson" title="删除用户">-</button>
            </div>
          </div>
        </header>

        <div class="table-wrapper">
          <table>
            <thead>
              <tr>
                <th>姓名</th>
                <th>性别</th>
                <th>年龄</th>
                <th>科室</th>
                <th>绑定设备</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="person in pagedPersons"
                :key="person.personId"
                :class="{ active: selectedPerson?.personId === person.personId }"
                @click="selectRow(person.personId)"
              >
                <td>
                  <div class="user-cell">
                    <span class="avatar-chip">{{ person.personName.slice(0, 1) }}</span>
                    <div>
                      <strong>{{ person.personName }}</strong>
                      <small>ID：{{ person.personId }}</small>
                    </div>
                  </div>
                </td>
                <td>{{ formatGender(person.gender) }}</td>
                <td>{{ person.age }}</td>
                <td>{{ person.department }}</td>
                <td>{{ person.devices?.map((item) => item.deviceName).join('、') || '未绑定' }}</td>
                <td>
                  <div class="row-actions">
                    <button class="edit-btn" @click="openEditUserForm(person)" title="编辑">
                      ✏️
                    </button>
                    <button class="delete-btn" @click="openDeleteConfirm(person.personId)" title="删除">
                      🗑️
                    </button>
                  </div>
                </td>
              </tr>
              <tr v-if="!pagedPersons.length">
                <td colspan="5">没有符合条件的数据</td>
              </tr>
            </tbody>
          </table>
        </div>

        <footer class="table-footer">
          <span>{{ pageRangeLabel }}</span>
          <div class="pager">
            <button type="button" :disabled="page === 1" @click="goPrevPage">‹</button>
            <button
              v-for="index in pageCount"
              :key="`page-${index}`"
              type="button"
              :class="{ current: index === page }"
              @click="page = index"
            >
              {{ index }}
            </button>
            <button type="button" :disabled="page === pageCount" @click="goNextPage">›</button>
          </div>
        </footer>
      </article>

      <aside class="detail-stack">
        <article class="card detail-card">
          <template v-if="selectedPerson">
            <div class="profile">
              <div class="avatar">{{ avatarInitials }}</div>
              <div>
                <h3>{{ selectedPerson.personName }}</h3>
                <p>{{ selectedPerson.department }}</p>
                <small>{{ formatGender(selectedPerson.gender) }} · {{ selectedPerson.age }} 岁</small>
              </div>
            </div>

            <dl class="detail-grid">
              <div>
                <dt>User ID</dt>
                <dd>{{ selectedPerson.personId }}</dd>
              </div>
              <div>
                <dt>Identity</dt>
                <dd>{{ selectedPerson.tags?.[0] || 'family' }}</dd>
              </div>
              <div>
                <dt>Created Time</dt>
                <dd>{{ selectedPerson.latestOverview?.collectedAt || 'N/A' }}</dd>
              </div>
              <div>
                <dt>绑定设备</dt>
                <dd>{{ selectedPerson.devices.length || '0' }}</dd>
              </div>
            </dl>

            <div class="timeline">
              <h4>Latest Activity</h4>
              <ul>
                <li v-for="item in timelineItems" :key="item.id">
                  <div class="icon" :class="item.type"></div>
                  <div>
                    <strong>{{ item.title }}</strong>
                    <p>{{ item.detail }}</p>
                  </div>
                  <small>{{ item.time }}</small>
                </li>
                <li v-if="!timelineItems.length">暂无操作记录</li>
              </ul>
            </div>
          </template>
          <template v-else>
            <div class="empty-state">
              <h3>暂无人员</h3>
              <p>等待数据同步完成后即可在此查看人员档案。</p>
            </div>
          </template>
        </article>

        <article class="card transaction-card">
          <header>
            <p>Lastest Transaction</p>
            <button type="button">查看全部</button>
          </header>
          <ul>
            <li v-for="item in latestTransactions" :key="item.id" :class="item.tone">
              <div class="badge"></div>
              <div>
                <strong>{{ item.title }}</strong>
                <p>{{ item.label }}</p>
              </div>
              <small>{{ item.time }}</small>
            </li>
          </ul>
        </article>
      </aside>
    </section>
  </section>

  <!-- 用户表单弹窗 -->
  <div v-if="showUserForm" class="modal-overlay" @click="cancelUserForm">
    <div class="modal" @click.stop>
      <div class="modal-header">
        <h3>{{ formMode === 'create' ? '添加用户' : '编辑用户' }}</h3>
        <button class="close-btn" @click="cancelUserForm">&times;</button>
      </div>
      <div class="modal-body">
        <div v-if="formError" class="error-message">
          {{ formError }}
        </div>
        <form @submit.prevent="submitUserForm">
          <div class="form-group">
            <label for="personId">用户ID *</label>
            <input
              id="personId"
              v-model="userForm.personId"
              type="text"
              placeholder="请输入唯一用户ID"
              :disabled="formMode === 'edit'"
              required
            />
          </div>
          <div class="form-group">
            <label for="personName">姓名 *</label>
            <input 
              id="personName"
              v-model="userForm.personName" 
              type="text" 
              placeholder="请输入用户姓名"
              required
            />
          </div>
          <div class="form-row">
            <div class="form-group">
              <label for="gender">性别 *</label>
              <select id="gender" v-model="userForm.gender" required>
                <option value="M">男性</option>
                <option value="F">女性</option>
              </select>
            </div>
            <div class="form-group">
              <label for="age">年龄 *</label>
              <input 
                id="age"
                v-model.number="userForm.age" 
                type="number" 
                min="1" 
                max="150" 
                placeholder="请输入年龄"
                required
              />
            </div>
          </div>
          <div class="form-group">
            <label for="department">部门 *</label>
            <input 
              id="department"
              v-model="userForm.department" 
              type="text" 
              placeholder="请输入部门信息"
              required
            />
          </div>
          <div class="modal-actions">
            <button type="button" class="cancel-btn" @click="cancelUserForm" :disabled="formLoading">
              取消
            </button>
            <button type="submit" class="submit-btn" :disabled="formLoading">
              <span v-if="formLoading">处理中...</span>
              <span v-else>{{ formMode === 'create' ? '创建' : '更新' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>

  <!-- 删除确认对话框 -->
  <div v-if="showDeleteConfirm" class="modal-overlay" @click="cancelDelete">
    <div class="modal confirm-modal" @click.stop>
      <div class="modal-header">
        <h3>确认删除</h3>
        <button class="close-btn" @click="cancelDelete">&times;</button>
      </div>
      <div class="modal-body">
        <p>您确定要删除这个用户吗？此操作不可恢复。</p>
        <div class="modal-actions">
          <button type="button" class="cancel-btn" @click="cancelDelete" :disabled="formLoading">
            取消
          </button>
          <button type="button" class="delete-btn" @click="deleteUser" :disabled="formLoading">
            <span v-if="formLoading">删除中...</span>
            <span v-else>确认删除</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
:global(body) {
  background: #f4f5fb;
}

.people-page {
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  color: #0f172a;
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.page-head h1 {
  margin: 0.3rem 0;
  font-size: clamp(1.6rem, 3vw, 2.2rem);
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

.outline-btn {
  border-radius: 999px;
  border: 1px solid rgba(126, 34, 206, 0.3);
  padding: 0.6rem 1.4rem;
  background: rgba(126, 34, 206, 0.07);
  color: #6d28d9;
  font-weight: 600;
  cursor: pointer;
}

.outline-btn:hover {
  border-color: rgba(126, 34, 206, 0.6);
}

.insight-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1rem;
}

.card {
  background: #fff;
  border-radius: 28px;
  padding: 1.5rem;
  box-shadow: 0 25px 50px rgba(15, 23, 42, 0.07);
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.card header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.8rem;
}

.card header p {
  margin: 0;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.7);
}

.card header span {
  color: #7c3aed;
  font-weight: 600;
}

.donut {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 140px;
  height: 140px;
  align-self: center;
}

.donut svg {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.donut circle {
  fill: none;
  stroke-width: 12px;
  stroke-linecap: round;
}

.donut .track {
  stroke: rgba(124, 58, 237, 0.1);
}

.donut .progress {
  stroke: url(#grad) #7c3aed;
  --percent: 0;
  transition: all 0.8s cubic-bezier(0.4, 0, 0.2, 1);
}

.donut-copy {
  position: absolute;
  text-align: center;
}

/* 增强圆环图样式 */
.donut .active-ring {
  animation: drawRing 1.5s ease-in-out;
  filter: drop-shadow(0 4px 8px rgba(59, 130, 246, 0.3));
}

.donut .inactive-ring {
  animation: drawRing 1.5s ease-in-out 0.3s both;
  filter: drop-shadow(0 4px 8px rgba(236, 72, 153, 0.3));
}

@keyframes drawRing {
  from {
    stroke-dasharray: 0 276;
  }
  to {
    stroke-dasharray: var(--dash-array, 276 276);
  }
}

/* 饼状图样式 */
.pie-chart-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.pie-chart {
  width: 120px;
  height: 120px;
}

.pie-slice {
  cursor: pointer;
  transition: all 0.3s ease;
  transform-origin: 80px 80px;
}

.pie-slice:hover {
  transform: scale(1.05);
  filter: brightness(1.1);
}

.pie-legend {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  font-size: 0.875rem;
}

.legend-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-indicator {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  flex-shrink: 0;
}

.male-color {
  background: linear-gradient(45deg, #3b82f6, #1e40af);
}

.female-color {
  background: linear-gradient(45deg, #ec4899, #be185d);
}

/* 柱状图样式 */
.bar-chart-container {
  padding: 1rem 0;
}

.bar-chart {
  display: flex;
  align-items: end;
  gap: 1rem;
  height: 120px;
  padding: 0 0.5rem;
  margin-bottom: 1rem;
}

.bar-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  flex: 1;
}

.bar-label {
  font-size: 0.75rem;
  color: rgba(15, 23, 42, 0.6);
  margin-bottom: 0.5rem;
  text-align: center;
}

.bars-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  height: 100%;
  justify-content: end;
}

.bar-stack {
  display: flex;
  gap: 2px;
  align-items: end;
  height: 80px;
}

.bar {
  position: relative;
  width: 16px;
  min-height: 2px;
  border-radius: 2px 2px 0 0;
  background: linear-gradient(to top, var(--bar-color), color-mix(in srgb, var(--bar-color) 80%, white));
  transition: all 0.3s ease;
  cursor: pointer;
}

.bar:hover {
  transform: scaleY(1.1);
  filter: brightness(1.1);
}

.bar-value {
  position: absolute;
  top: -20px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.625rem;
  color: rgba(15, 23, 42, 0.8);
  font-weight: 600;
}

.bar-total {
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.8);
}

.chart-legend {
  display: flex;
  justify-content: center;
  gap: 1.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(15, 23, 42, 0.1);
}

/* 自定义下拉选择器样式 */
.filters {
  display: flex;
  gap: 1rem;
  align-items: center;
}

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

/* 响应式设计 */
@media (max-width: 768px) {
  .filters {
    flex-direction: column;
    gap: 0.75rem;
    align-items: stretch;
  }
  
  .custom-select {
    min-width: auto;
    width: 100%;
  }
}

.legend {
  display: flex;
  gap: 1rem;
  font-size: 0.9rem;
  color: rgba(15, 23, 42, 0.6);
}

.legend .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  display: inline-flex;
  margin-right: 0.3rem;
}

.legend .violet {
  background: #8b5cf6;
}

.legend .gray {
  background: #d1d5db;
}

.secondary {
  color: rgba(15, 23, 42, 0.6);
  margin: 0;
}

.gender-card .gender {
  display: flex;
  gap: 1rem;
}

.gender-donut {
  flex: 1;
  border-radius: 24px;
  padding: 1rem;
  background: linear-gradient(135deg, #f8f5ff, #fdf4ff);
  text-align: center;
  position: relative;
}

.gender-donut span {
  display: block;
  margin-top: 0.25rem;
  color: rgba(15, 23, 42, 0.5);
}

.gender-donut.male {
  background: linear-gradient(135deg, #dbeafe, #c7d2fe);
}

.gender-donut.female {
  background: linear-gradient(135deg, #fde7f3, #fce7f3);
}

.age-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.age-card li {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}

.age-card .bars {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.age-card .bar {
  height: 6px;
  border-radius: 999px;
}

.age-card .bar.male {
  background: linear-gradient(90deg, #38bdf8, #6366f1);
}

.age-card .bar.female {
  background: linear-gradient(90deg, #f472b6, #c084fc);
}

.new-users .sparkline {
  height: 90px;
}

.new-users svg {
  width: 100%;
  height: 100%;
}

.new-users path {
  fill: none;
  stroke: #a855f7;
  stroke-width: 3;
  stroke-linecap: round;
}

.new-summary {
  display: flex;
  gap: 1rem;
}

.new-summary > div {
  flex: 1;
  background: #f9fafb;
  padding: 0.8rem 1rem;
  border-radius: 18px;
}

.new-summary small {
  color: rgba(15, 23, 42, 0.5);
  text-transform: uppercase;
  letter-spacing: 0.1em;
}

.panel-grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: 1.5rem;
}

.table-card {
  gap: 1.2rem;
}

.table-head {
  gap: 1.5rem;
  align-items: flex-end;
}

.filters {
  display: flex;
  gap: 0.8rem;
  flex-wrap: wrap;
  align-items: center;
}

select {
  border-radius: 18px;
  border: 1px solid rgba(15, 23, 42, 0.15);
  padding: 0.5rem 0.9rem;
  background: #f9fafb;
  color: #0f172a;
}

.table-search {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.4rem 0.8rem;
  border: 1px solid rgba(15, 23, 42, 0.12);
  border-radius: 16px;
  background: #fff;
}

.table-search svg {
  width: 16px;
  height: 16px;
  color: rgba(15, 23, 42, 0.4);
}

.table-search input {
  border: none;
  outline: none;
  background: transparent;
}

.table-actions {
  display: inline-flex;
  gap: 0.4rem;
}

.table-actions .circle {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  border: none;
  background: #ede9fe;
  color: #6d28d9;
  cursor: pointer;
  font-size: 1.2rem;
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
  padding: 0.9rem 1rem;
  text-align: left;
}

tbody tr {
  border-bottom: 1px solid rgba(15, 23, 42, 0.05);
  cursor: pointer;
}

tbody tr:hover {
  background: rgba(124, 58, 237, 0.05);
}

tbody tr.active {
  background: rgba(124, 58, 237, 0.08);
}

.user-cell {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.avatar-chip {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: rgba(124, 58, 237, 0.15);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
  color: #5b21b6;
}

.user-cell small {
  color: rgba(15, 23, 42, 0.5);
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
  gap: 0.4rem;
  align-items: center;
}

.pager button {
  width: 36px;
  height: 36px;
  border-radius: 12px;
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

.detail-stack {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.detail-card {
  gap: 1rem;
}

.profile {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.profile .avatar {
  width: 72px;
  height: 72px;
  border-radius: 24px;
  background: linear-gradient(135deg, #a855f7, #ec4899);
  color: #fff;
  font-size: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 600;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
}

dt {
  font-size: 0.8rem;
  color: rgba(15, 23, 42, 0.5);
  margin-bottom: 0.1rem;
}

dd {
  margin: 0;
  font-weight: 600;
}

.timeline h4 {
  margin-bottom: 0.5rem;
}

.timeline ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.timeline li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.8rem;
  align-items: center;
}

.timeline .icon {
  width: 32px;
  height: 32px;
  border-radius: 12px;
  background: #f3f4f6;
}

.timeline .icon.alert {
  background: #fee2e2;
}

.timeline .icon.device {
  background: #e0f2fe;
}

.timeline p {
  margin: 0;
  color: rgba(15, 23, 42, 0.6);
}

.timeline small {
  color: rgba(15, 23, 42, 0.45);
}

.transaction-card header {
  align-items: center;
}

.transaction-card header button {
  border: none;
  background: rgba(124, 58, 237, 0.1);
  color: #7c3aed;
  border-radius: 999px;
  padding: 0.4rem 0.9rem;
  cursor: pointer;
}

.transaction-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
}

.transaction-card li {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.6rem;
  align-items: center;
  padding: 0.7rem 1rem;
  border-radius: 18px;
  background: #f9fafb;
}

.transaction-card li .badge {
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: #e0f2fe;
}

.transaction-card li.success .badge {
  background: #dcfce7;
}

.transaction-card li.danger .badge {
  background: #fee2e2;
}

.transaction-card li p {
  margin: 0;
  color: rgba(15, 23, 42, 0.5);
}

.transaction-card small {
  color: rgba(15, 23, 42, 0.45);
}

.empty-state {
  text-align: center;
  color: rgba(15, 23, 42, 0.7);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.25em;
  font-size: 0.75rem;
  color: rgba(15, 23, 42, 0.4);
  margin: 0;
}

@media (max-width: 960px) {
  .panel-grid {
    grid-template-columns: 1fr;
  }
}

/* 反馈消息样式 */
.feedback-toast {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
  max-width: 400px;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.15);
  animation: slideInRight 0.3s ease;
}

.feedback-toast.success {
  background: linear-gradient(135deg, #10b981, #059669);
  color: white;
}

.feedback-toast.error {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.toast-content {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
}

.toast-icon {
  font-size: 1.25rem;
  flex-shrink: 0;
}

.toast-message {
  font-weight: 500;
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 操作按钮样式 */
.row-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.edit-btn, .delete-btn {
  border: none;
  background: none;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s ease;
}

.edit-btn:hover {
  background: rgba(59, 130, 246, 0.1);
}

.delete-btn:hover {
  background: rgba(239, 68, 68, 0.1);
}

/* 弹窗样式 */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  animation: fadeIn 0.3s ease;
}

.modal {
  background: white;
  border-radius: 16px;
  max-width: 500px;
  width: 90%;
  max-height: 90%;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
  animation: slideUp 0.3s ease;
}

.confirm-modal {
  max-width: 400px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid rgba(15, 23, 42, 0.1);
}

.modal-header h3 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 600;
  color: rgba(15, 23, 42, 0.9);
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: rgba(15, 23, 42, 0.5);
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.close-btn:hover {
  background: rgba(15, 23, 42, 0.1);
  color: rgba(15, 23, 42, 0.8);
}

.modal-body {
  padding: 1.5rem;
}

.error-message {
  background: rgba(239, 68, 68, 0.1);
  color: #dc2626;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  border-left: 4px solid #dc2626;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: 500;
  color: rgba(15, 23, 42, 0.8);
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 2px solid rgba(15, 23, 42, 0.1);
  border-radius: 8px;
  font-size: 0.875rem;
  transition: all 0.2s ease;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 2rem;
  justify-content: flex-end;
}

.cancel-btn, .submit-btn, .delete-btn {
  padding: 0.75rem 1.5rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.cancel-btn {
  background: rgba(15, 23, 42, 0.1);
  color: rgba(15, 23, 42, 0.7);
}

.cancel-btn:hover {
  background: rgba(15, 23, 42, 0.2);
}

.submit-btn {
  background: linear-gradient(135deg, #3b82f6, #1e40af);
  color: white;
}

.submit-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3);
}

.delete-btn {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: white;
}

.delete-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(239, 68, 68, 0.3);
}

.cancel-btn:disabled,
.submit-btn:disabled,
.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from {
    transform: translateY(30px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

/* 响应式弹窗 */
@media (max-width: 768px) {
  .modal {
    width: 95%;
    margin: 1rem;
  }
  
  .form-row {
    grid-template-columns: 1fr;
  }
  
  .modal-actions {
    flex-direction: column;
  }
  
  .cancel-btn, .submit-btn, .delete-btn {
    width: 100%;
  }
  
  .feedback-toast {
    left: 10px;
    right: 10px;
    top: 10px;
  }
}
</style>
