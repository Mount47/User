# 毫米波雷达监测系统 API 文档

本目录为面向前端的接口文档，按业务模块分文件，结构简洁、不冗余，覆盖当前代码中的所有 REST 接口与主要响应模型。示例字段名与类型来源于实体/DTO 定义，时间字段注明格式。

- Person & Mapping: 人员与设备映射管理（人员 CRUD、绑定关系）
- Radar Devices: 设备管理与设备状态总览
- Radar Data: 各型号雷达的设备与数据接口（R60ABD1、R77ABH1、TI6843 Vital/Posture）
- Alerts & Detection: 跌倒/生命体征告警与人员检测汇总
- Diagnostics: 诊断接口（数据库连接等）
- WebSocket: 文档性说明各实时推送通道

子文档：
- person-mapping.md
- radar-devices.md
- radar-data.md
- alerts-detection.md
- diagnostics.md
- websockets.md

全局说明：
- 时间格式：除特别说明外，`yyyy-MM-dd'T'HH:mm:ss` 或 `yyyy-MM-dd'T'HH:mm:ss.SSSSSS`
- 分页：如返回 Page，统一含 `devices/currentPage/totalItems/totalPages/pageSize/hasNext/hasPrevious` 字段
- 跨域：部分控制器已启用 `@CrossOrigin`

