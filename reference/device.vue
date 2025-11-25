<template>
  <div class="app-container">
    <!-- 搜索和过滤区域 -->
    <div class="filter-container">
      <el-input
        v-model="filters.search"
        placeholder="搜索设备ID、名称或位置"
        style="width: 240px;"
        class="filter-item"
        prefix-icon="el-icon-search"
        clearable
        @keyup.enter.native="handleSearch"
        @clear="handleSearch"
      />
      <el-select
        v-model="filters.modelType"
        placeholder="选择型号类型"
        clearable
        style="width: 160px"
        class="filter-item"
        @change="handleSearch"
      >
        <el-option
          v-for="type in modelTypes"
          :key="type"
          :label="type"
          :value="type"
        />
      </el-select>
      <el-select
        v-model="filters.status"
        placeholder="选择状态"
        clearable
        style="width: 120px"
        class="filter-item"
        @change="handleSearch"
      >
        <el-option label="在线" value="online" />
        <el-option label="离线" value="offline" />
        <el-option label="维护中" value="maintenance" />
      </el-select>
      <el-button
        class="filter-item search-btn"
        type="primary"
        @click="handleSearch"
      >
        <i class="el-icon-search" /> 搜索
      </el-button>
      <el-button
        class="filter-item refresh-btn"
        plain
        @click="handleRefresh"
      >
        <i class="el-icon-refresh" /> 刷新
      </el-button>
    </div>

    <!-- 操作按钮区域 -->
    <div class="operation-container">
      <el-button type="primary" icon="el-icon-plus" @click="handleAddDevice">
        新增设备
      </el-button>
      <el-button
        type="success"
        icon="el-icon-check"
        :disabled="selectedDevices.length === 0"
        @click="handleBatchUpdateStatus"
      >
        批量更新状态 ({{ selectedDevices.length }})
      </el-button>
      <el-button
        type="danger"
        icon="el-icon-delete"
        :disabled="selectedDevices.length === 0"
        @click="handleBatchDelete"
      >
        批量删除 ({{ selectedDevices.length }})
      </el-button>
      <div style="margin-left: auto; display: flex; align-items: center; gap: 15px;">
        <el-tag type="info" effect="plain">
          <i class="el-icon-s-platform" /> 总数: {{ pagination.total }}
        </el-tag>
        <el-tag type="success" effect="plain">
          <i class="el-icon-success" /> 在线: {{ statistics.onlineDevices }}
        </el-tag>
        <el-tag type="danger" effect="plain">
          <i class="el-icon-error" /> 离线: {{ statistics.offlineDevices }}
        </el-tag>
        <el-tag type="warning" effect="plain">
          <i class="el-icon-warning" /> 维护: {{ statistics.maintenanceDevices }}
        </el-tag>
      </div>
    </div>

    <!-- 表格区域 -->
    <div class="table-container">
      <el-table
        ref="deviceTable"
        v-loading="loading"
        :data="deviceList"
        stripe
        height="100%"
        style="min-height: 400px;"
        empty-text="暂无设备数据，点击上方新增设备按钮添加"
        @selection-change="handleSelectionChange"
      >
        <el-table-column type="selection" width="55" />
        
        <el-table-column prop="deviceId" label="设备ID" width="180" />
        
        <el-table-column prop="deviceName" label="设备名称" show-overflow-tooltip />
        
        <el-table-column label="型号" width="150" show-overflow-tooltip>
          <template slot-scope="scope">
            {{ getModelText(scope.row) }}
          </template>
        </el-table-column>
        
        <el-table-column label="监测类型" width="120" align="center">
          <template slot-scope="scope">
            <el-tag :type="getTypeTagColor(scope.row)" effect="dark" size="small">
              {{ getMonitorType(scope.row) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column label="状态" width="110" align="center">
          <template slot-scope="scope">
            <el-tag :type="getStatusTagType(scope.row.status)" effect="plain" size="small">
              <i :class="getStatusIcon(scope.row.status)" style="margin-right: 3px" />
              {{ getStatusText(scope.row.status) }}
            </el-tag>
          </template>
        </el-table-column>
        
        <el-table-column prop="location" label="位置" width="150" show-overflow-tooltip />
        
        <el-table-column label="最后更新" width="180" show-overflow-tooltip>
          <template slot-scope="scope">
            {{ formatTime(scope.row.updatedAt) }}
          </template>
        </el-table-column>
        
        <el-table-column label="操作" width="280" fixed="right">
          <template slot-scope="scope">
            <div class="operation-buttons">
              <el-tooltip content="查看监测" placement="top" effect="light">
                <el-button class="btn-custom monitor" circle @click="viewMonitor(scope.row)">
                  <i class="el-icon-video-camera" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="查看详情" placement="top" effect="light">
                <el-button class="btn-custom details" circle @click="handleViewDetails(scope.row)">
                  <i class="el-icon-view" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="编辑设备" placement="top" effect="light">
                <el-button class="btn-custom edit" circle @click="handleEdit(scope.row)">
                  <i class="el-icon-edit" />
                </el-button>
              </el-tooltip>
              <el-tooltip content="删除设备" placement="top" effect="light">
                <el-button class="btn-custom delete" circle @click="handleDelete(scope.row)">
                  <i class="el-icon-delete" />
                </el-button>
              </el-tooltip>
            </div>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 分页区域 -->
    <div class="pagination-container">
      <el-pagination
        background
        :current-page="pagination.currentPage"
        :page-sizes="[10, 20, 30, 50]"
        :page-size="pagination.pageSize"
        :total="pagination.total"
        layout="total, sizes, prev, pager, next, jumper"
        @size-change="handleSizeChange"
        @current-change="handlePageChange"
      />
    </div>

    <!-- 设备详情对话框 -->
    <el-dialog
      title="设备详情"
      :visible.sync="detailsDialogVisible"
      width="600px"
      @close="resetDetailsDialog"
    >
      <div v-if="currentDevice" class="device-details">
        <el-descriptions :column="2" border>
          <el-descriptions-item label="设备ID">
            {{ currentDevice.deviceId }}
          </el-descriptions-item>
          <el-descriptions-item label="设备名称">
            {{ currentDevice.deviceName || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="型号">
            {{ getModelText(currentDevice) }}
          </el-descriptions-item>
          <el-descriptions-item label="型号类型">
            {{ currentDevice.modelType || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="监测类型">
            <el-tag :type="getTypeTagColor(currentDevice)" effect="dark" size="small">
              {{ getMonitorType(currentDevice) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="设备状态">
            <el-tag :type="getStatusTagType(currentDevice.status)" size="small">
              <i :class="getStatusIcon(currentDevice.status)" />
              {{ getStatusText(currentDevice.status) }}
            </el-tag>
          </el-descriptions-item>
          <el-descriptions-item label="安装位置" :span="2">
            {{ currentDevice.location || '-' }}
          </el-descriptions-item>
          <el-descriptions-item label="创建时间">
            {{ formatTime(currentDevice.createdAt) }}
          </el-descriptions-item>
          <el-descriptions-item label="最后更新">
            {{ formatTime(currentDevice.updatedAt) }}
          </el-descriptions-item>
        </el-descriptions>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="detailsDialogVisible = false">关闭</el-button>
        <el-button type="primary" @click="handleEditFromDetails">编辑</el-button>
        <el-button type="success" icon="el-icon-video-camera" @click="viewMonitor(currentDevice)">前往监测</el-button>
      </span>
    </el-dialog>

    <!-- 编辑设备对话框 -->
    <el-dialog
      :title="editForm.deviceId && currentDevice ? '编辑设备' : '新增设备'"
      :visible.sync="editDialogVisible"
      width="500px"
      @close="resetEditDialog"
    >
      <el-form ref="editForm" :model="editForm" :rules="editRules" label-width="100px">
        <el-form-item label="设备ID" prop="deviceId">
          <el-input v-model="editForm.deviceId" :disabled="!!currentDevice" placeholder="请输入设备ID" />
        </el-form-item>
        
        <el-form-item label="设备名称" prop="deviceName">
          <el-input v-model="editForm.deviceName" placeholder="请输入设备名称" />
        </el-form-item>
        
        <el-form-item label="型号类型" prop="modelType">
          <el-select v-model="editForm.modelType" :disabled="!!currentDevice" placeholder="请选择型号类型" style="width: 100%">
            <el-option
              v-for="type in modelTypes"
              :key="type"
              :label="type"
              :value="type"
            />
          </el-select>
        </el-form-item>
        
        <el-form-item label="设备型号" prop="model">
          <el-input v-model="editForm.model" placeholder="如：TI6843-VITAL-V1.0" />
        </el-form-item>
        
        <el-form-item label="安装位置" prop="location">
          <el-input v-model="editForm.location" placeholder="请输入安装位置" />
        </el-form-item>
        
        <el-form-item label="设备状态" prop="status">
          <el-select v-model="editForm.status" placeholder="请选择设备状态" style="width: 100%">
            <el-option label="在线" value="online" />
            <el-option label="离线" value="offline" />
            <el-option label="维护中" value="maintenance" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="editDialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="submitting" @click="handleSubmitEdit">保存</el-button>
      </span>
    </el-dialog>

    <!-- 状态切换对话框 -->
    

    <!-- 批量更新状态对话框 -->
    <el-dialog
      title="批量更新设备状态"
      :visible.sync="batchStatusDialogVisible"
      width="450px"
    >
      <el-alert
        :title="`将更新 ${selectedDevices.length} 个设备的状态`"
        type="warning"
        :closable="false"
        style="margin-bottom: 20px"
      />
      <div class="status-selection">
        <el-radio-group v-model="batchStatus" size="medium">
          <el-radio-button label="online">
            <i class="el-icon-success" /> 在线
          </el-radio-button>
          <el-radio-button label="offline">
            <i class="el-icon-error" /> 离线
          </el-radio-button>
          <el-radio-button label="maintenance">
            <i class="el-icon-warning" /> 维护中
          </el-radio-button>
        </el-radio-group>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="batchStatusDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleConfirmBatchStatus">确定</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import {
  getDeviceMonitorType,
  getDeviceStatusText,
  getDeviceStatusTagType,
  getDeviceStatusIcon,
  getDeviceModelText,
  formatDeviceTime,
  DEVICE_TYPE_TAG_COLOR
} from '@/utils/deviceConfig'
import {
  getDevices,
  addDevice,
  updateDevice,
  deleteDevice,
  updateDeviceStatus
} from '@/api/device'

export default {
  name: 'DeviceManagement',
  data() {
    return {
      loading: false,
      submitting: false,
      deviceList: [],
      pagination: {
        currentPage: 1,
        pageSize: 10,
        total: 0
      },
      filters: {
        search: '',
        modelType: '',
        status: ''
      },
      statistics: {
        totalDevices: 0,
        onlineDevices: 0,
        offlineDevices: 0,
        maintenanceDevices: 0
      },
      modelTypes: [
        'TI6843-VITAL',
        'TI6843-POSTURE',
        'R60ABD1',
        'R77ABH1'
      ],
      selectedDevices: [],
      currentDevice: null,
      detailsDialogVisible: false,
      editDialogVisible: false,
      batchStatusDialogVisible: false,
      batchStatus: '',
      editForm: {
        deviceId: '',
        deviceName: '',
        modelType: '',
        model: '',
        location: '',
        status: 'offline'
      },
      editRules: {
        deviceId: [
          { required: true, message: '请输入设备ID', trigger: 'blur' },
          { min: 3, max: 50, message: '长度在 3 到 50 个字符', trigger: 'blur' }
        ],
        modelType: [
          { required: true, message: '请选择型号类型', trigger: 'change' }
        ],
        status: [
          { required: true, message: '请选择设备状态', trigger: 'change' }
        ]
      },
      wsConnection: null
    }
  },
  mounted() {
    this.loadDevices()
    this.setupWebSocket()
  },
  beforeDestroy() {
    this.closeWebSocket()
  },
  methods: {
    // 工具方法
    getMonitorType(device) {
      return getDeviceMonitorType(device)
    },
    getStatusText(status) {
      return getDeviceStatusText(status)
    },
    getStatusTagType(status) {
      return getDeviceStatusTagType(status)
    },
    getStatusIcon(status) {
      return getDeviceStatusIcon(status)
    },
    getModelText(device) {
      return getDeviceModelText(device)
    },
    formatTime(time) {
      return formatDeviceTime(time)
    },
    getTypeTagColor(device) {
      const type = this.getMonitorType(device)
      return DEVICE_TYPE_TAG_COLOR[type] || 'info'
    },

    // 加载设备列表
    async loadDevices() {
      this.loading = true
      try {
        const params = {
          page: this.pagination.currentPage - 1,
          size: this.pagination.pageSize,
          search: this.filters.search || undefined,
          modelType: this.filters.modelType || undefined,
          status: this.filters.status || undefined,
          sortBy: 'updatedAt',
          sortDir: 'desc'
        }

        const { data, meta } = await getDevices(params)
        this.deviceList = data || []
        
        if (meta) {
          this.pagination.total = meta.totalItems || meta.total || 0
          this.pagination.currentPage = (meta.currentPage || 0) + 1
        }

        // 计算统计信息
        this.calculateStatistics()
      } catch (error) {
        console.error('加载设备列表失败:', error)
        this.$message.error('加载设备列表失败')
      } finally {
        this.loading = false
      }
    },

    // 计算统计信息
    calculateStatistics() {
      const total = this.pagination.total
      const online = this.deviceList.filter(d => d.status === 'online').length
      const offline = this.deviceList.filter(d => d.status === 'offline').length
      const maintenance = this.deviceList.filter(d => d.status === 'maintenance').length
      
      this.statistics = {
        totalDevices: total,
        onlineDevices: online,
        offlineDevices: offline,
        maintenanceDevices: maintenance
      }
    },

    // 搜索
    handleSearch() {
      this.pagination.currentPage = 1
      this.loadDevices()
    },

    // 刷新
    handleRefresh() {
      this.loadDevices()
      this.$message.success('刷新成功')
    },

    // 分页变化
    handleSizeChange(size) {
      this.pagination.pageSize = size
      this.pagination.currentPage = 1
      this.loadDevices()
    },
    handlePageChange(page) {
      this.pagination.currentPage = page
      this.loadDevices()
    },

    // 选择变化
    handleSelectionChange(selection) {
      this.selectedDevices = selection
    },

    // 查看详情
    handleViewDetails(device) {
      this.currentDevice = device
      this.detailsDialogVisible = true
    },
    resetDetailsDialog() {
      this.currentDevice = null
    },

    // 编辑设备
    handleEdit(device) {
      this.currentDevice = device
      this.editForm = {
        deviceId: device.deviceId,
        deviceName: device.deviceName || '',
        modelType: device.modelType || '',
        model: device.model || '',
        location: device.location || '',
        status: device.status || 'offline'
      }
      this.editDialogVisible = true
    },
    handleEditFromDetails() {
      this.detailsDialogVisible = false
      this.handleEdit(this.currentDevice)
    },
    resetEditDialog() {
      this.currentDevice = null
      this.editForm = {
        deviceId: '',
        deviceName: '',
        modelType: '',
        model: '',
        location: '',
        status: 'offline'
      }
      if (this.$refs.editForm) {
        this.$refs.editForm.clearValidate()
      }
    },

    // 查看监测
    viewMonitor(device) {
      if (!device) return
      const type = (device.type || '').trim()
      const typeRouteMap = {
        '人体位姿': '/monitor/posture',
        '呼吸心跳': '/monitor/vital',
        '心电': '/monitor/ecg',
        // 兼容其他可能的命名
        '人体雷达': '/monitor/posture',
        '呼吸雷达': '/monitor/vital',
        '心电雷达': '/monitor/ecg'
      }
      const path = typeRouteMap[type] || '/monitor'
      this.$router.push({
        path,
        query: {
          deviceId: device.deviceId,
          deviceName: device.deviceName,
          deviceLocation: device.location
        }
      })
    },

    // 新增设备
    handleAddDevice() {
      this.currentDevice = null
      this.resetEditDialog()
      this.editDialogVisible = true
    },

    // 提交编辑
    async handleSubmitEdit() {
      try {
        await this.$refs.editForm.validate()
        this.submitting = true

        if (this.currentDevice) {
          // 更新设备
          await updateDevice(this.editForm.deviceId, {
            deviceName: this.editForm.deviceName,
            model: this.editForm.model,
            location: this.editForm.location,
            status: this.editForm.status
          })
          this.$message.success('设备信息已更新')
        } else {
          // 新增设备
          await addDevice({
            deviceId: this.editForm.deviceId,
            deviceName: this.editForm.deviceName,
            modelType: this.editForm.modelType,
            model: this.editForm.model,
            location: this.editForm.location,
            status: this.editForm.status
          })
          this.$message.success('设备注册成功')
        }

        this.editDialogVisible = false
        this.loadDevices()
      } catch (error) {
        console.error('保存设备失败:', error)
        this.$message.error(error.message || '保存失败')
      } finally {
        this.submitting = false
      }
    },

    // 状态管理（已移除单个状态管理按钮与对话框）

    // 删除设备
    handleDelete(device) {
      this.$confirm(`确定要删除设备 "${device.deviceName || device.deviceId}" 吗？此操作不可撤销！`, '确认删除', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(async() => {
        try {
          await deleteDevice(device.deviceId)
          this.$message.success('设备已删除')
          this.loadDevices()
        } catch (error) {
          console.error('删除设备失败:', error)
          this.$message.error(error.response?.data?.message || '删除失败，设备可能存在绑定关系')
        }
      }).catch(() => {})
    },

    // 批量更新状态
    handleBatchUpdateStatus() {
      if (this.selectedDevices.length === 0) {
        this.$message.warning('请先选择设备')
        return
      }
      this.batchStatus = 'offline'
      this.batchStatusDialogVisible = true
    },
    async handleConfirmBatchStatus() {
      if (!this.batchStatus) return

      try {
        const deviceIds = this.selectedDevices.map(d => d.deviceId)
        for (const deviceId of deviceIds) {
          await updateDeviceStatus(deviceId, this.batchStatus)
        }
        this.$message.success(`已成功更新 ${deviceIds.length} 个设备的状态`)
        this.batchStatusDialogVisible = false
        this.$refs.deviceTable.clearSelection()
        this.loadDevices()
      } catch (error) {
        console.error('批量更新状态失败:', error)
        this.$message.error('批量更新失败')
      }
    },

    // 批量删除
    handleBatchDelete() {
      if (this.selectedDevices.length === 0) {
        this.$message.warning('请先选择设备')
        return
      }

      const deviceNames = this.selectedDevices.map(d => d.deviceName || d.deviceId).join('、')
      this.$confirm(`确定要删除以下 ${this.selectedDevices.length} 个设备吗？\n\n${deviceNames}\n\n此操作不可撤销！`, '批量删除确认', {
        confirmButtonText: '确定删除',
        cancelButtonText: '取消',
        type: 'error'
      }).then(async() => {
        try {
          for (const device of this.selectedDevices) {
            await deleteDevice(device.deviceId)
          }
          this.$message.success(`已成功删除 ${this.selectedDevices.length} 个设备`)
          this.$refs.deviceTable.clearSelection()
          this.loadDevices()
        } catch (error) {
          console.error('批量删除失败:', error)
          this.$message.error('批量删除失败，部分设备可能存在绑定关系')
        }
      }).catch(() => {})
    },

    // WebSocket
    setupWebSocket() {
      try {
        const serverIp = process.env.VUE_APP_SERVER_IP || 'localhost'
        const serverPort = process.env.VUE_APP_SERVER_PORT || '8080'
        const wsUrl = `ws://${serverIp}:${serverPort}/ws/device-status`
        
        this.wsConnection = new WebSocket(wsUrl)
        
        this.wsConnection.onopen = () => {
          console.log('✅ WebSocket连接已建立')
        }
        
        this.wsConnection.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data)
            
            if (message.type === 'DEVICE_STATUS_CHANGE') {
              const device = this.deviceList.find(d => d.deviceId === message.deviceId)
              if (device) {
                device.status = message.newStatus
                device.updatedAt = message.timestamp
                this.$message.info(`设备 ${device.deviceName || device.deviceId} 状态已变更为 ${this.getStatusText(message.newStatus)}`)
              }
              this.calculateStatistics()
            } else if (message.type === 'DEVICE_STATISTICS') {
              this.statistics = {
                totalDevices: message.totalDevices || 0,
                onlineDevices: message.onlineDevices || 0,
                offlineDevices: message.offlineDevices || 0,
                maintenanceDevices: message.statusDistribution?.maintenance || 0
              }
            }
          } catch (error) {
            console.error('WebSocket消息解析失败:', error)
          }
        }
        
        this.wsConnection.onerror = (error) => {
          console.error('WebSocket错误:', error)
        }
        
        this.wsConnection.onclose = () => {
          console.log('WebSocket连接已关闭')
        }
      } catch (error) {
        console.error('WebSocket连接失败:', error)
      }
    },
    closeWebSocket() {
      if (this.wsConnection) {
        this.wsConnection.close()
        this.wsConnection = null
      }
    }
  }
}
</script>

<style scoped>
/* 统一使用app-container */
.app-container {
  padding: 20px;
}

/* 搜索和过滤区域 */
.filter-container {
  padding: 15px;
  margin-bottom: 20px;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  background: #f9f9f9;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.filter-item {
  margin-right: 10px;
  margin-bottom: 10px;
}

.search-btn {
  background: #409EFF;
  border-color: #409EFF;
  border-radius: 4px;
  padding: 9px 15px;
  font-weight: 500;
  transition: all 0.3s;
}

.search-btn:hover {
  background: #66b1ff;
  border-color: #66b1ff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
}

.refresh-btn {
  color: #67C23A;
  border-color: #67C23A;
  border-radius: 4px;
  padding: 9px 15px;
  font-weight: 500;
}

.refresh-btn:hover {
  color: #fff;
  background-color: #67C23A;
  border-color: #67C23A;
  box-shadow: 0 2px 8px rgba(103, 194, 58, 0.3);
}

/* 操作按钮区域 */
.operation-container {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f8f8f8;
  display: flex;
  align-items: center;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.operation-container .el-button {
  margin-right: 10px;
  border-radius: 4px;
  padding: 9px 15px;
  font-weight: 500;
  transition: all 0.3s;
}

/* 表格容器 */
.table-container {
  background: #fff;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
  overflow: hidden;
}

/* 表格操作按钮 */
.operation-buttons {
  display: flex;
  justify-content: flex-start;
  align-items: center;
}

.btn-custom {
  margin-right: 10px;
  width: 36px;
  height: 36px;
  padding: 0;
  font-size: 16px;
  transition: all 0.3s;
  border: none;
}

.btn-custom:hover {
  transform: scale(1.1);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.2);
}

.details {
  background-color: #909399;
  color: white;
}

.details:hover {
  background-color: #a6a9ad;
}

.edit {
  background-color: #E6A23C;
  color: white;
}

.edit:hover {
  background-color: #ebb563;
}

.monitor {
  background-color: #409EFF;
  color: white;
}

.monitor:hover {
  background-color: #66b1ff;
}

.status {
  background-color: #409EFF;
  color: white;
}

.status:hover {
  background-color: #66b1ff;
}

.delete {
  background-color: #F56C6C;
  color: white;
}

.delete:hover {
  background-color: #f78989;
}

/* 分页区域 */
.pagination-container {
  padding: 20px 0;
  text-align: right;
}

/* 表格样式 */
.el-table {
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.el-table th {
  background-color: #f5f7fa;
  color: #606266;
  font-weight: 600;
}

/* 标签样式 */
.el-tag {
  border-radius: 4px;
  font-weight: 500;
}

/* 设备详情 */
.device-details {
  padding: 10px 0;
}

/* 状态选择 */
.status-selection {
  padding: 20px 0;
  text-align: center;
}

/* 对话框底部 */
.dialog-footer {
  text-align: right;
}

/* 响应式 */
@media (max-width: 1200px) {
  .operation-buttons {
    gap: 4px;
  }

  .btn-custom {
    width: 28px !important;
    height: 28px !important;
    font-size: 14px !important;
  }
}
</style>
