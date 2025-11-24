# WebSocket 通道说明（文档性）

以下通道来自 OpenAPI 扩展 `x-websocket-endpoints`。实际订阅与消息结构以后端实现和前端协商为准。

通道列表：

## /ws/r60abd1 — R60ABD1 Radar Stream
- 内容：实时存在/体动/心率/呼吸波形等
- 建议 payload（示例）：
```
{
  "deviceId": "R60ABD1_001",
  "presence": 1,
  "motion": 0,
  "heartRate": 72,
  "respiration": 16,
  "timestamp": "2024-06-01T10:00:00"
}
```

## /ws/device-status — Device Status Feed
- 内容：设备在线心跳、状态变化
- 示例：`{ deviceId, realTimeOnline: true, lastHeartbeat: 1717226400 }`

## /ws/ti6843-vital — TI6843 Vital Stream
- 内容：呼吸/心率实时
- 示例：`{ deviceId, time: 12.3, breathRate: 17.5, heartRate: 72.0, timestamp }`

## /ws/ti6843-posture — TI6843 Posture Stream
- 内容：位姿/点云/关键点摘要（实际大数据量建议服务端裁剪）
- 示例：`{ device_id, posture_state: "standing", timestamp }`

## /ws/fall-alert — Fall Alert Channel
- 内容：跌倒告警事件
- 示例：`{ id, deviceId, personId, alertStatus: "NEW", fallDetectedAt, severity }`

## /ws/vitals-alert — Vitals Alert Channel
- 内容：生命体征异常事件
- 示例：`{ id, deviceId, personId, alertType, severity, detectedAt }`

