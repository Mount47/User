import { computed, ref } from 'vue'
import { useEntityStore } from '@/store'
import type {
  AlertCategory,
  AlertStatus,
  CaregiverAlert,
  DetectionSummary,
  DeviceStatusOverview,
  VitalDataPoint
} from '@/types'
import { fallAlertApi } from '@/api/person-alert/alerts'
import { detectionApi } from '@/api/radar-devices/realtime'
import { deviceStatusApi } from '@/api/radar-devices/deviceStatus'
import { ti6843VitalApi } from '@/api/radar-devices/ti6843Vital'
import { logger } from '@/utils/logger'

type AlertFilters = {
  category: AlertCategory | 'ALL'
  status: AlertStatus | 'ALL'
  personScope: 'CURRENT' | 'ALL'
}

const alerts = ref<CaregiverAlert[]>([])
const detectionSummaries = ref<DetectionSummary[]>([])
const histories = ref<Record<string, VitalDataPoint[]>>({})
const deviceOverview = ref<DeviceStatusOverview | null>(null)
const alertFilters = ref<AlertFilters>({
  category: 'ALL',
  status: 'ACTIVE',
  personScope: 'CURRENT'
})
const syncing = ref(false)
const lastSyncedAt = ref<string | null>(null)

const ensureArray = <T = any>(payload: any): T[] => {
  if (Array.isArray(payload)) return payload as T[]
  if (payload && Array.isArray(payload.records)) {
    return payload.records as T[]
  }
  return []
}

const resolvePersonId = (person?: any) =>
  person?.personId ?? person?.id ?? person?.person_id ?? null

async function refreshAlerts(personId?: string | number | null) {
  const entityStore = useEntityStore()
  try {
    const params: Record<string, unknown> = {}
    const filters = alertFilters.value
    if (filters.category !== 'ALL') params.category = filters.category
    if (filters.status !== 'ALL') params.status = filters.status
    const scopePerson =
      filters.personScope === 'ALL'
        ? personId
        : personId ?? entityStore.selectedPersonId ?? resolvePersonId(entityStore.selectedPerson)
    if (scopePerson) params.personId = scopePerson
    const response = await fallAlertApi.list(params)
    alerts.value = ensureArray<CaregiverAlert>(response)
  } catch (error) {
    logger.warn('Failed to refresh alerts', error)
    alerts.value = []
  }
}

async function refreshDeviceOverview() {
  try {
    deviceOverview.value = await deviceStatusApi.deviceOverview()
  } catch (error) {
    logger.warn('Failed to fetch device overview', error)
    deviceOverview.value = null
  }
}

async function refreshDetections() {
  try {
    const response = await detectionApi.statusesWithPerson()
    detectionSummaries.value = ensureArray<DetectionSummary>(response)
  } catch (error) {
    logger.warn('Failed to fetch detection summaries', error)
    detectionSummaries.value = []
  }
}

async function fetchHistory(personId?: string | number | null, options?: Record<string, unknown>) {
  const entityStore = useEntityStore()
  const target =
    personId ??
    entityStore.selectedPersonId ??
    resolvePersonId(entityStore.selectedPerson) ??
    resolvePersonId(entityStore.persons[0])
  if (!target) return
  try {
    const response = await ti6843VitalApi.samplesByPerson(String(target), {
      size: 40,
      ...options
    })
    histories.value = {
      ...histories.value,
      [String(target)]: ensureArray<VitalDataPoint>(response)
    }
  } catch (error) {
    logger.warn('Failed to fetch history data', error)
  }
}

async function hydrateScope(force = false) {
  const entityStore = useEntityStore()
  if (syncing.value) return
  syncing.value = true
  try {
    await entityStore.refreshAll(force)
    const preferred =
      entityStore.selectedPersonId ??
      resolvePersonId(entityStore.selectedPerson) ??
      resolvePersonId(entityStore.persons[0])
    if (preferred && !entityStore.selectedPersonId) {
      entityStore.setSelectedPerson(preferred)
    }
    await Promise.all([refreshAlerts(preferred), refreshDeviceOverview(), refreshDetections()])
    if (preferred) {
      await fetchHistory(preferred)
    }
    lastSyncedAt.value = new Date().toISOString()
  } finally {
    syncing.value = false
  }
}

function setAlertFilter(partial: Partial<AlertFilters>) {
  alertFilters.value = { ...alertFilters.value, ...partial }
  return refreshAlerts()
}

export function useCareData() {
  const entityStore = useEntityStore()
  const alertStats = computed(() => {
    const scoped = alerts.value
    return {
      total: scoped.length,
      active: scoped.filter((item) => item.status === 'ACTIVE').length,
      critical: scoped.filter((item) => item.severity === 'CRITICAL' || item.severity === 'HIGH').length
    }
  })

  return {
    entityStore,
    alerts,
    alertFilters,
    alertStats,
    detectionSummaries,
    histories,
    deviceOverview,
    syncing,
    lastSyncedAt,
    hydrateScope,
    refreshAlerts,
    refreshDeviceOverview,
    refreshDetections,
    fetchHistory,
    setAlertFilter
  }
}
