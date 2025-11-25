<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import PersonSummaryCard from '@/components/PersonSummaryCard.vue'
import AlertTimeline from '@/components/AlertTimeline.vue'
import SparkLine from '@/components/SparkLine.vue'
import { useAuthStore } from '@/store'
import { useCareData } from '@/composables/useCareData'

const authStore = useAuthStore()
const {
  entityStore,
  alerts,
  detectionSummaries,
  deviceOverview,
  histories,
  hydrateScope,
  refreshAlerts,
  refreshDeviceOverview,
  refreshDetections,
  fetchHistory,
  lastSyncedAt,
  syncing
} = useCareData()

const activePerson = computed(() => entityStore.selectedPerson)
const persons = computed(() => entityStore.persons)
const summaryStats = computed(() => ({
  personCount: persons.value.length,
  deviceCount: entityStore.devices.length,
  role: authStore.roles[0] || authStore.user?.roles?.[0] || '访客',
  serverTime: lastSyncedAt.value
}))

const activeHistory = computed(() => {
  const personId =
    activePerson.value?.personId || activePerson.value?.id || entityStore.selectedPersonId
  if (!personId) return []
  return histories.value[String(personId)] || []
})

const detectionRows = computed(() => detectionSummaries.value.slice(0, 4))

onMounted(async () => {
  await hydrateScope()
})

watch(
  () => entityStore.selectedPersonId,
  async (next, prev) => {
    if (next === prev || !next) return
    await fetchHistory(next)
    await refreshAlerts(next)
  }
)

async function syncLatest() {
  await hydrateScope(true)
  await Promise.all([refreshDeviceOverview(), refreshDetections()])
}
</script>

<template>
  <section class="dashboard">
    <div class="hero">
      <div>
        <p class="eyebrow">您好，{{ authStore.displayName || authStore.user?.username || '访客' }}</p>
        <h2>我的照护范围</h2>
        <p class="muted">
          上次同步时间：
          {{ summaryStats.serverTime ? new Date(summaryStats.serverTime).toLocaleString() : '暂无' }}
        </p>
      </div>
      <div class="hero-actions">
        <div class="hero-stats">
          <div>
            <span>人员</span>
            <strong>{{ summaryStats.personCount }}</strong>
          </div>
          <div>
            <span>设备</span>
            <strong>{{ summaryStats.deviceCount }}</strong>
          </div>
          <div>
            <span>角色</span>
            <strong>{{ summaryStats.role }}</strong>
          </div>
        </div>
        <button type="button" class="ghost" :disabled="syncing" @click="syncLatest">
          <!-- {{ refreshing ? '同步中...' : '同步接口数据' }} -->
        </button>
      </div>
    </div>

    <div class="status-grid" v-if="deviceOverview">
      <div class="status-card">
        <p>在线设备</p>
        <strong>{{ deviceOverview.online }}</strong>
      </div>
      <div class="status-card warning">
        <p>离线 / 维护</p>
        <strong>{{ deviceOverview.offline + deviceOverview.maintenance }}</strong>
      </div>
      <div class="status-card">
        <p>活跃映射</p>
        <strong>{{ deviceOverview.activeMappings }}</strong>
      </div>
      <div class="status-card">
        <p>平均心跳延迟</p>
        <strong>{{ deviceOverview.avgHeartbeatDelaySec }}s</strong>
      </div>
    </div>

    <div class="focus-card" v-if="activePerson">
      <div>
        <p class="eyebrow">当前聚焦</p>
        <h3>{{ activePerson.personName }} · {{ activePerson.department }}</h3>
        <p class="muted">
          绑定设备：{{ activePerson.devices.map((item) => item.deviceName).join('、') || '暂无' }}
        </p>
      </div>
      <div class="hero-stats" v-if="activePerson.latestOverview">
        <div>
          <span>心率</span>
          <strong>{{ activePerson.latestOverview?.heartRate }} bpm</strong>
        </div>
        <div>
          <span>呼吸</span>
          <strong>{{ activePerson.latestOverview?.breathRate }} rpm</strong>
        </div>
        <div>
          <span>体动</span>
          <strong>{{ activePerson.latestOverview?.motion }}</strong>
        </div>
      </div>
    </div>

    <div class="grid">
      <div class="cards">
        <PersonSummaryCard
          v-for="person in persons"
          :key="person.personId"
          :person="person"
          :is-active="activePerson?.personId === person.personId"
          @select="entityStore.setSelectedPerson"
        />
      </div>
      <div class="right-panel">
        <div class="history" v-if="activeHistory.length">
          <header>
            <p class="eyebrow">24 小时趋势</p>
            <h3>生命体征走势</h3>
          </header>
          <div class="chart-row">
            <div>
              <p>心率</p>
              <SparkLine :data="activeHistory" field="heartRate" color="#fb7185" />
            </div>
            <div>
              <p>呼吸</p>
              <SparkLine :data="activeHistory" field="breathRate" color="#34d399" />
            </div>
            <div>
              <p>体动</p>
              <SparkLine :data="activeHistory" field="motion" color="#818cf8" />
            </div>
          </div>
        </div>

        <div class="detection" v-if="detectionRows.length">
          <header>
            <p class="eyebrow">检测看板</p>
            <h3>姿态 / Vital / 在离床</h3>
          </header>
          <table>
            <thead>
              <tr>
                <th>设备</th>
                <th>人员</th>
                <th>类型</th>
                <th>状态</th>
                <th>刷新</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in detectionRows" :key="item.detectionId">
                <td>{{ item.deviceName }}</td>
                <td>{{ item.personName || '未绑定' }}</td>
                <td>{{ item.detectionType }}</td>
                <td>
                  <span v-if="item.detectionType === 'PRESENCE'">
                    {{ item.presence ? '有人' : '无人' }}
                  </span>
                  <span v-else-if="item.detectionType === 'VITAL'">
                    {{ item.heartRate }} bpm / {{ item.breathRate }} rpm
                  </span>
                  <span v-else>
                    {{ item.posture || '未知' }}
                    <strong v-if="item.fallRisk" class="tag">跌倒风险</strong>
                  </span>
                </td>
                <td>{{ new Date(item.updatedAt).toLocaleTimeString() }}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <AlertTimeline :items="alerts.slice(0, 6)" />
      </div>
    </div>
  </section>
</template>

<style scoped>
.dashboard {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.hero,
.focus-card {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.95), rgba(236, 245, 255, 0.92));
  border-radius: 24px;
  border: 1px solid rgba(15, 23, 42, 0.05);
  padding: 1.8rem;
  color: #0f172a;
  display: flex;
  justify-content: space-between;
  gap: 2rem;
  flex-wrap: wrap;
  align-items: center;
  box-shadow: 0 20px 55px rgba(15, 23, 42, 0.12);
}

.eyebrow {
  text-transform: uppercase;
  letter-spacing: 0.2em;
  font-size: 0.8rem;
  color: #94a3b8;
}

.muted {
  color: #6b7280;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.hero-stats {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 14px;
  border: 1px solid rgba(15, 23, 42, 0.05);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.6);
}

.hero-stats span {
  font-size: 0.75rem;
  color: #9ca3af;
}

.hero-stats strong {
  font-size: 1.4rem;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
  align-items: stretch;
}

.status-card {
  padding: 1rem;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(15, 23, 42, 0.06);
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.1);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.status-card.warning {
  border-color: rgba(248, 113, 113, 0.25);
}

.status-card p {
  font-size: 0.8rem;
  color: rgba(15, 23, 42, 0.55);
}

.status-card strong {
  display: block;
  font-size: 1.8rem;
}

.grid {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(320px, 1fr);
  gap: 1.8rem;
}

.cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1.5rem;
}

.right-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.history,
.detection {
  background: rgba(255, 255, 255, 0.93);
  border-radius: 20px;
  border: 1px solid rgba(15, 23, 42, 0.06);
  padding: 1.2rem;
  box-shadow: 0 18px 45px rgba(15, 23, 42, 0.1);
}

.chart-row {
  display: grid;
  gap: 1rem;
}

.chart-row > div {
  background: rgba(248, 250, 252, 0.9);
  border-radius: 18px;
  padding: 0.8rem;
}

.detection table {
  width: 100%;
  border-collapse: collapse;
  margin-top: 0.8rem;
}

.detection th,
.detection td {
  padding: 0.6rem 0.4rem;
  text-align: left;
  font-size: 0.85rem;
}

.tag {
  color: #f87171;
  margin-left: 0.4rem;
  font-size: 0.75rem;
}

@media (max-width: 960px) {
  .grid {
    grid-template-columns: 1fr;
  }
}
</style>
