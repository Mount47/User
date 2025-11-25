import { defineStore } from 'pinia'
import { personApi, deviceApi, mappingApi } from '@/api'
import { CACHE_TTL } from '@/utils/constants'
import { isStale } from '@/utils/date'
import { normalizeError } from '@/utils/errorHandler'
import { debugLog } from '@/utils/debugLog'
import type { CaregiverPerson, CaregiverPersonDevice } from '@/types'

export interface PersonSummary extends CaregiverPerson {
  id: string | number
  systemUserId?: string | number
  createdAt?: string
  updatedAt?: string
  raw?: Record<string, any>
}

export interface DeviceSummary {
  id: string | number
  deviceId: string | number
  deviceName: string
  modelType?: string
  model?: string
  location?: string
  status?: string
  type?: string
  createdAt?: string
  updatedAt?: string
  raw?: Record<string, any>
}

export interface PersonDeviceMapping {
  id: string | number
  personId: string | number
  deviceId: string | number
  active: boolean
  mappingName?: string
  personName?: string
  deviceName?: string
  person?: PersonSummary
  device?: DeviceSummary
  raw?: Record<string, any>
}

interface EntityState {
  selectedPersonId: string | number | null
  selectedDeviceId: string | number | null
  persons: PersonSummary[]
  devices: DeviceSummary[]
  mappings: PersonDeviceMapping[]
  lastFetched: {
    persons: number | null
    devices: number | null
    mappings: number | null
  }
  recentPersonIds: (string | number)[]
  recentDeviceIds: (string | number)[]
  loading: {
    persons: boolean
    devices: boolean
    mappings: boolean
  }
}

const MAX_RECENT = 6

export const useEntityStore = defineStore('entityCache', {
  state: (): EntityState => ({
    selectedPersonId: null,
    selectedDeviceId: null,
    persons: [],
    devices: [],
    mappings: [],
    lastFetched: {
      persons: null,
      devices: null,
      mappings: null
    },
    recentPersonIds: [],
    recentDeviceIds: [],
    loading: {
      persons: false,
      devices: false,
      mappings: false
    }
  }),

  getters: {
    selectedPerson(state) {
      return state.persons.find((item) => item.id === state.selectedPersonId) || null
    },
    selectedDevice(state) {
      return state.devices.find((item) => item.id === state.selectedDeviceId) || null
    }
  },

//   新增标准化逻辑 normalizePerson

// 将后端字段 person_id/person_name/system_user_id/createdAt/... 映射为前端的 personId/personName/...。
// 处理 devices，即使后端未返回也会给出 []，防止 .map() 访问 undefined。
// 提供默认值（性别、科室、标签、年龄等），并保留原始数据在 raw 字段，方便调试。
  actions: {
    async fetchPersons(force = false) {
      if (!force && !isStale(this.lastFetched.persons || undefined, CACHE_TTL.persons)) {
        return this.persons
      }
      this.loading.persons = true
      try {
        const list = await personApi.list()
        const normalizeDevice = (payload: any): CaregiverPersonDevice => ({
          deviceId: payload?.device_id ?? payload?.deviceId ?? payload?.id ?? 'UNKNOWN_DEVICE',
          deviceName: payload?.device_name ?? payload?.deviceName ?? payload?.name ?? '未命名设备',
          modelType: payload?.model_type ?? payload?.modelType
        })
        const normalizePerson = (item: any): PersonSummary => {
          const fallbackId = `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          const personId = item?.person_id ?? item?.personId ?? item?.id ?? fallbackId
          const devices = Array.isArray(item?.devices) ? item.devices.map(normalizeDevice) : []
          return {
            id: personId,
            personId,
            personName: item?.person_name ?? item?.personName ?? item?.name ?? '未知人员',
            department: item?.department ?? '未分配科室',
            gender: item?.gender === 'F' ? 'F' : 'M',
            age: Number.isFinite(Number(item?.age)) ? Number(item?.age) : 0,
            devices,
            tags: item?.tags ?? [],
            latestOverview: item?.latestOverview ?? item?.latest_overview,
            lastAlertAt: item?.lastAlertAt ?? item?.last_alert_at,
            systemUserId: item?.system_user_id ?? item?.systemUserId,
            createdAt: item?.createdAt ?? item?.created_at,
            updatedAt: item?.updatedAt ?? item?.updated_at,
            raw: item
          }
        }
        const payload = Array.isArray(list) ? list : list?.records || list?.data || []
        this.persons = payload.map(normalizePerson)
        this.lastFetched.persons = Date.now()
        debugLog('EntityStore', '人员数据加载完成', { count: this.persons.length })
        return this.persons
      } catch (error) {
        debugLog('EntityStore', '人员数据加载失败', error)
        throw normalizeError(error)
      } finally {
        this.loading.persons = false
      }
    },

    async fetchDevices(force = false) {
      if (!force && !isStale(this.lastFetched.devices || undefined, CACHE_TTL.devices)) {
        return this.devices
      }
      this.loading.devices = true
      try {
        const list = await deviceApi.list()
        const normalizeDevice = (item: any): DeviceSummary => {
          const fallbackId = `device-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          const deviceId = item?.deviceId ?? item?.device_id ?? item?.id ?? fallbackId
          const statusRaw = item?.status ?? 'OFFLINE'
          return {
            id: deviceId,
            deviceId,
            deviceName: item?.deviceName ?? item?.device_name ?? item?.name ?? '未命名设备',
            modelType: item?.modelType ?? item?.model_type,
            model: item?.model,
            location: item?.location,
            type: item?.type,
            status: typeof statusRaw === 'string' ? statusRaw.toUpperCase() : 'OFFLINE',
            createdAt: item?.createdAt ?? item?.created_at,
            updatedAt: item?.updatedAt ?? item?.updated_at,
            raw: item
          }
        }
        const payload = Array.isArray(list?.records)
          ? list.records
          : Array.isArray(list?.data)
            ? list.data
            : Array.isArray(list)
              ? list
              : []
        this.devices = payload.map(normalizeDevice)
        this.lastFetched.devices = Date.now()
        debugLog('EntityStore', '设备数据加载完成', { count: this.devices.length })
        return this.devices
      } catch (error) {
        debugLog('EntityStore', '设备数据加载失败', error)
        throw normalizeError(error)
      } finally {
        this.loading.devices = false
      }
    },

    async fetchMappings(force = false) {
      if (!force && !isStale(this.lastFetched.mappings || undefined, CACHE_TTL.mappings)) {
        return this.mappings
      }
      this.loading.mappings = true
      try {
        const list = await mappingApi.listActive()
        const normalizeMapping = (item: any): PersonDeviceMapping => {
          const personPayload = item?.person ?? {}
          const devicePayload = item?.device ?? {}
          const fallbackPersonId =
            item?.person_id ??
            personPayload?.person_id ??
            personPayload?.personId ??
            `person-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
          const fallbackDeviceId =
            item?.device_id ??
            devicePayload?.deviceId ??
            devicePayload?.device_id ??
            `device-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`

          const compactPerson: PersonSummary = {
            id: fallbackPersonId,
            personId: fallbackPersonId,
            personName: personPayload?.person_name ?? '未知人员',
            department: personPayload?.department ?? '未分配科室',
            gender: personPayload?.gender === 'F' ? 'F' : 'M',
            age: Number.isFinite(Number(personPayload?.age)) ? Number(personPayload?.age) : 0,
            devices: [],
            tags: personPayload?.tags ?? [],
            latestOverview: personPayload?.latestOverview ?? personPayload?.latest_overview,
            lastAlertAt: personPayload?.lastAlertAt ?? personPayload?.last_alert_at,
            systemUserId: personPayload?.system_user_id ?? personPayload?.systemUserId,
            createdAt: personPayload?.createdAt ?? personPayload?.created_at,
            updatedAt: personPayload?.updatedAt ?? personPayload?.updated_at,
            raw: personPayload
          }

          const compactDevice: DeviceSummary = {
            id: fallbackDeviceId,
            deviceId: fallbackDeviceId,
            deviceName: devicePayload?.deviceName ?? devicePayload?.device_name ?? '未命名设备',
            modelType: devicePayload?.modelType ?? devicePayload?.model_type,
            model: devicePayload?.model,
            location: devicePayload?.location,
            type: devicePayload?.type,
            status: typeof devicePayload?.status === 'string' ? devicePayload.status.toUpperCase() : 'OFFLINE',
            createdAt: devicePayload?.createdAt ?? devicePayload?.created_at,
            updatedAt: devicePayload?.updatedAt ?? devicePayload?.updated_at,
            raw: devicePayload
          }

          return {
            id: item?.id ?? `${fallbackPersonId}-${fallbackDeviceId}`,
            personId: fallbackPersonId,
            deviceId: fallbackDeviceId,
            active: item?.is_active ?? item?.active ?? true,
            mappingName: item?.mapping_name ?? item?.mappingName,
            personName: compactPerson.personName,
            deviceName: compactDevice.deviceName,
            person: compactPerson,
            device: compactDevice,
            raw: item
          }
        }

        const payload = Array.isArray(list?.records)
          ? list.records
          : Array.isArray(list?.data)
            ? list.data
            : Array.isArray(list)
              ? list
              : []
        this.mappings = payload.map(normalizeMapping)
        this.lastFetched.mappings = Date.now()
        debugLog('EntityStore', '映射数据加载完成', { count: this.mappings.length })
        return this.mappings
      } catch (error) {
        debugLog('EntityStore', '映射数据加载失败', error)
        throw normalizeError(error)
      } finally {
        this.loading.mappings = false
      }
    },

    async refreshAll(force = false) {
      await Promise.all([
        this.fetchPersons(force),
        this.fetchDevices(force),
        this.fetchMappings(force)
      ])
    },

    setSelectedPerson(personId: string | number | null) {
      this.selectedPersonId = personId
      if (personId) {
        this.trackRecent('person', personId)
      }
    },

    setSelectedDevice(deviceId: string | number | null) {
      this.selectedDeviceId = deviceId
      if (deviceId) {
        this.trackRecent('device', deviceId)
      }
    },

    trackRecent(type: 'person' | 'device', id: string | number) {
      const key = type === 'person' ? 'recentPersonIds' : 'recentDeviceIds'
      const list = this[key] as (string | number)[]
      const filtered = list.filter((item) => item !== id)
      filtered.unshift(id)
      this[key] = filtered.slice(0, MAX_RECENT)
    },

    upsertMapping(mapping: PersonDeviceMapping) {
      const index = this.mappings.findIndex((item) => item.id === mapping.id)
      if (index >= 0) {
        this.mappings.splice(index, 1, mapping)
      } else {
        this.mappings.unshift(mapping)
      }
    },

    removeMapping(id: string | number) {
      this.mappings = this.mappings.filter((item) => item.id !== id)
    }
  }
})
