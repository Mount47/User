import http from '../httpClient'

/**
 * Radar device & status endpoints.
 */
export const deviceApi = {
  list(params = {}) {
    return http.get('/api/radar/devices', params)
  },

  listAll() {
    return http.get('/api/radar/devices/list')
  },

  getById(deviceId) {
    return http.get(`/api/radar/devices/${deviceId}`)
  },

  create(payload) {
    return http.post('/api/radar/devices', payload)
  },

  update(deviceId, payload) {
    return http.put(`/api/radar/devices/${deviceId}`, payload)
  },

  remove(deviceId) {
    return http.delete(`/api/radar/devices/${deviceId}`)
  },

  updateStatus(deviceId, status) {
    return http.put(`/api/radar/devices/${deviceId}/status`, { status })
  },

  batchUpdateStatus(payload) {
    return http.put('/api/radar/devices/status/batch', payload)
  }
}

export default deviceApi
