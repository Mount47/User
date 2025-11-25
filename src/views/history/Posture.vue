<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useCareData } from '@/composables/useCareData'
import { debugLog } from '@/utils/debugLog'

const { entityStore, detectionSummaries, hydrateScope, refreshDetections } = useCareData()

const selectedPerson = computed(() => entityStore.selectedPerson)
const people = computed(() => entityStore.persons)

// 姿态历史按照时间排序
const postureHistory = computed(() => {
  const personId = selectedPerson.value?.personId
  if (!personId) return []
  return detectionSummaries.value
    .filter((item) => item.personId === personId && item.detectionType === 'POSTURE')
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
})

const timelineEvents = computed(() => postureHistory.value.slice(0, 15))

const postureStats = computed(() => {
  const base = { standing: 0, sitting: 0, walking: 0, unknown: 0 }
  postureHistory.value.forEach((item) => {
    const key = (item.posture || '').toLowerCase()
    if (key.includes('stand')) base.standing += 1
    else if (key.includes('sit')) base.sitting += 1
    else if (key.includes('walk')) base.walking += 1
    else base.unknown += 1
  })
  const total = Object.values(base).reduce((sum, value) => sum + value, 0) || 1
  return Object.entries(base).map(([label, value]) => ({
    label,
    value,
    percent: Math.round((value / total) * 100)
  }))
})

function formatDate(value?: string) {
  if (!value) return '暂无'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date)
}

function onSelectChange(event: Event) {
  const target = event.target as HTMLSelectElement
  entityStore.setSelectedPerson(target.value)
}

onMounted(async () => {
  await hydrateScope()
  if (!detectionSummaries.value.length) {
    await refreshDetections()
  }
})

watch(
  () => postureHistory.value,
  (next) => {
    debugLog('History-Posture', '历史姿态数据更新', { count: next.length })
  },
  { immediate: true }
)
</script>

<template>
  <section class="history-page" v-if="selectedPerson">
    <header class="page-head">
      <div>
        <p class="eyebrow">Historical Statistic</p>
        <h1>姿态历史回放</h1>
        <p class="muted">展示最近的姿态快照，结合占床与风险情况。</p>
      </div>
      <div class="controls">
        <label>
          <span>选择人员</span>
          <select v-model="entityStore.selectedPersonId" @change="onSelectChange">
            <option v-for="person in people" :key="person.personId" :value="person.personId">
              {{ person.personName }}
            </option>
          </select>
        </label>
        <div class="tab-bar">
          <RouterLink class="tab" to="/history/breath-heart" active-class="active">呼吸 / 心率</RouterLink>
          <RouterLink class="tab" to="/history/posture" active-class="active">姿态分析</RouterLink>
        </div>
      </div>
    </header>

    <div class="grid">
      <article class="card stat-card">
        <h3>姿态占比</h3>
        <ul>
          <li v-for="item in postureStats" :key="item.label">
            <span>{{ item.label }}</span>
            <strong>{{ item.percent }}%</strong>
          </li>
        </ul>
      </article>

      <article class="card timeline-card">
        <header>
          <p>Posture Timeline</p>
          <span>最近 {{ timelineEvents.length }} 条</span>
        </header>
        <ul>
          <li v-for="event in timelineEvents" :key="event.detectionId">
            <div class="dot" :class="{ alert: event.fallRisk }"></div>
            <div>
              <strong>{{ event.posture || '未知姿态' }}</strong>
              <p>{{ event.deviceName || 'Unknown device' }}</p>
            </div>
            <small>{{ formatDate(event.updatedAt) }}</small>
          </li>
          <li v-if="!timelineEvents.length" class="empty">等待姿态数据...</li>
        </ul>
      </article>
    </div>
  </section>
  <p v-else class="empty">暂无人员，请先完成登录与授权。</p>
</template>

<style scoped>
.history-page {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.page-head {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  flex-wrap: wrap;
  align-items: center;
}

.controls {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.controls select {
  border: 1px solid rgba(15, 23, 42, 0.2);
  border-radius: 12px;
  padding: 0.4rem 0.8rem;
}

.tab-bar {
  display: inline-flex;
  padding: 0.2rem;
  background: rgba(15, 23, 42, 0.08);
  gap: 0.3rem;
  border-radius: 16px;
}

.tab-bar .tab {
  padding: 0.35rem 0.9rem;
  border-radius: 12px;
  text-decoration: none;
  color: #0f172a;
  font-weight: 600;
}

.tab-bar .active {
  background: linear-gradient(135deg, #8b5cf6, #22d3ee);
  color: #fff;
}

.grid {
  display: grid;
  grid-template-columns: minmax(240px, 320px) minmax(0, 1fr);
  gap: 1rem;
}

.card {
  background: #fff;
  border-radius: 24px;
  padding: 1.2rem;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.08);
}

.stat-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.stat-card li {
  display: flex;
  justify-content: space-between;
  border-bottom: 1px dashed rgba(15, 23, 42, 0.08);
  padding-bottom: 0.4rem;
}

.timeline-card ul {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.timeline-card li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.8rem;
  padding: 0.8rem 1rem;
  border-radius: 16px;
  background: #f9fafb;
}

.timeline-card .dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #22c55e;
}

.timeline-card .dot.alert {
  background: #f97316;
}

.empty {
  text-align: center;
  color: rgba(15, 23, 42, 0.6);
}

@media (max-width: 960px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
