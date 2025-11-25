<script setup lang="ts">
import { computed, onMounted, watch } from 'vue'
import { useCareData } from '@/composables/useCareData'
import { debugLog } from '@/utils/debugLog'

const { entityStore, detectionSummaries, hydrateScope, refreshDetections } = useCareData()

// 选中人员 & 下拉列表
const selectedPerson = computed(() => entityStore.selectedPerson)
const people = computed(() => entityStore.persons)

// 根据检测缓存找出对应姿态快照
const postureDetection = computed(() => {
  const personId = selectedPerson.value?.personId
  if (!personId) return null
  return detectionSummaries.value.find(
    (item) => item.personId === personId && item.detectionType === 'POSTURE'
  )
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
    debugLog('Realtime-Posture', '姿态数据更新', { count: next.length })
  },
  { immediate: true }
)
</script>

<template>
  <section class="realtime-page" v-if="selectedPerson">
    <header class="page-head">
      <div>
        <p class="eyebrow">实时监测</p>
        <h1>人体位姿概览</h1>
        <p class="muted">集中展示姿态、占床状态与风险等级。</p>
      </div>
      <div class="controls">
        <label class="select-field">
          <span>选择人员</span>
          <select v-model="entityStore.selectedPersonId" @change="onSelectChange">
            <option v-for="person in people" :key="person.personId" :value="person.personId">
              {{ person.personName }} · {{ person.devices[0]?.deviceName || '未绑定' }}
            </option>
          </select>
        </label>
        <div class="tab-bar">
          <RouterLink class="tab" to="/realtime/breath-heart" active-class="active">
            实时体征
          </RouterLink>
          <RouterLink class="tab" to="/realtime/posture" active-class="active">
            人体位姿
          </RouterLink>
        </div>
      </div>
    </header>

    <div class="tab-panel posture-panel">
      <article class="card chart-card" v-if="postureDetection">
        <div class="chart-head">
          <div>
            <p class="eyebrow">人体位姿监测</p>
            <h2>位姿概览</h2>
            <p class="muted">最新更新 · {{ formatDate(postureDetection.updatedAt) }}</p>
          </div>
          <div class="chart-legend">
            <span>{{ postureDetection.fallRisk ? '检测到跌倒风险' : '姿态稳定' }}</span>
          </div>
        </div>
        <div class="posture-layout">
          <div class="posture-visual">
            <div class="posture-cloud">
              <p>{{ postureDetection.anomalyTag || '姿态稳定' }}</p>
              <span>Device · {{ postureDetection.deviceName }}</span>
              <em>{{ formatDate(postureDetection.updatedAt) }}</em>
            </div>
            <div class="posture-state">
              <strong>{{ postureDetection.posture || '未识别' }}</strong>
              <span>{{ postureDetection.presence ? '监测中' : '未占床' }}</span>
            </div>
          </div>
          <div class="posture-side">
            <article class="card posture-card">
              <p>跌倒风险</p>
              <strong>{{ postureDetection.fallRisk ? '高' : '低' }}</strong>
              <small>设备实时推送的风险因子</small>
            </article>
            <article class="card posture-card">
              <p>当前占床</p>
              <strong>{{ postureDetection.presence ? '有人' : '无人' }}</strong>
              <span>{{ postureDetection.presence ? '监测中' : '未占床' }}</span>
            </article>
            <article class="card posture-card">
              <p>心率</p>
              <strong>{{ postureDetection.heartRate ?? '--' }} 次/分</strong>
              <span>传感器快照</span>
            </article>
              <article class="card posture-card">
              <p>呼吸</p>
              <strong>{{ postureDetection.breathRate ?? '--' }} 次/分</strong>
              <span>传感器快照</span>
            </article>
          </div>
        </div>
        <div class="posture-meta">
          <p>设备 · {{ postureDetection?.deviceName }} · {{ postureDetection?.deviceId }}</p>
          <p>人员 · {{ postureDetection?.personName || selectedPerson.personName }}</p>
        </div>
      </article>
      <article v-else class="card chart-card muted-card">
        <h2>暂未收到位姿数据</h2>
        <p>等待设备推送最新的人体位姿检测结果。</p>
      </article>
    </div>
  </section>
  <p v-else class="empty">暂无人员，请先完成登录与授权。</p>
</template>

<style scoped>
.realtime-page {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.page-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  padding: 1.3rem 1.5rem;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.92), rgba(240, 245, 255, 0.92));
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 24px 60px rgba(15, 23, 42, 0.1);
}

.controls {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.select-field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.6rem 0.8rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.85);
  border: 1px solid rgba(15, 23, 42, 0.08);
  color: #0f172a;
}

.select-field select {
  border: none;
  background: transparent;
  font-weight: 700;
  color: #0f172a;
  outline: none;
}

.tab-bar {
  display: inline-flex;
  padding: 0.25rem;
  border-radius: 14px;
  background: rgba(15, 23, 42, 0.05);
  gap: 0.3rem;
}

.tab-bar .tab {
  border: none;
  padding: 0.55rem 1.2rem;
  border-radius: 12px;
  background: transparent;
  color: #0f172a;
  font-weight: 700;
  text-decoration: none;
}

.tab-bar .active {
  background: linear-gradient(135deg, #6ee7f3, #a855f7);
  color: #0b1020;
  box-shadow: 0 10px 25px rgba(168, 85, 247, 0.25);
}

.tab-panel {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.card {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 1rem 1.2rem;
  border: 1px solid rgba(15, 23, 42, 0.05);
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.12);
  color: #0f172a;
}

.chart-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.eyebrow {
  text-transform: uppercase;
  color: #9ca3af;
  letter-spacing: 0.1em;
  font-size: 0.8rem;
}

.muted {
  color: #6b7280;
}

.posture-layout {
  display: grid;
  grid-template-columns: 1.3fr 1fr;
  gap: 0.9rem;
  align-items: stretch;
}

.posture-visual {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.8rem;
}

.posture-cloud {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(208, 229, 255, 0.9));
  border: 1px dashed rgba(99, 102, 241, 0.35);
  border-radius: 16px;
  padding: 1rem;
  text-align: center;
  color: #4b5563;
}

.posture-cloud p {
  margin: 0;
  font-weight: 700;
}

.posture-cloud span {
  color: #94a3b8;
}

.posture-cloud em {
  display: block;
  color: #a855f7;
  margin-top: 0.4rem;
}

.posture-state {
  background: #0f172a;
  color: white;
  border-radius: 16px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.posture-state span {
  color: rgba(255, 255, 255, 0.8);
}

.posture-side {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.7rem;
}

.posture-card {
  padding: 0.8rem 1rem;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(237, 242, 255, 0.95));
}

.posture-meta {
  display: flex;
  gap: 1rem;
  flex-wrap: wrap;
  color: #6b7280;
}

.empty {
  text-align: center;
  color: #94a3b8;
}

@media (max-width: 1080px) {
  .posture-layout {
    grid-template-columns: 1fr;
  }

  .controls {
    flex-direction: column;
    align-items: flex-start;
  }

  .tab-bar {
    align-self: flex-end;
  }
}
</style>
