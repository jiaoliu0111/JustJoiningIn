# 上海区社区活动采集后台 V1 设计

## 背景

当前小程序已经通过 `services/hotspot.js -> services/cloud.js -> hotspotApi 云函数 -> 云数据库` 读取活动数据。云函数里已有 `syncActivities`，可以从少量上海官方页面抓取活动并写入 `hotspot_moments`。

本轮目标是在现有链路上升级后台能力：使用微信小程序云开发的云函数、云数据库和定时触发器，持续采集上海各区、社区、官方和私营平台的活动消息，入库后由小程序读取后台数据展示。

## 首版选择

首版采用“采集后台 V1，来源配置化”的方案。

- 采集范围优先覆盖区级、街道、社区来源，兼容官方和私营平台。
- 可信白名单来源自动上线到小程序。
- 非白名单来源先入库为待审核，由运营者在微信云开发控制台修改状态。
- 第一版不做独立 Web 后台，也不做小程序管理页。
- 小程序端仍只通过 `hotspotApi` 读取云数据库，不直接访问外部来源。

## 产品原则

- 先保证“本区/附近”比“全市泛热门”更有价值。
- 数据宁可少一点，也要有来源、区域、时间和审核状态。
- 采集器要容忍来源页面失败，不能因为一个来源失败导致整次同步失败。
- 后台字段要支持后续扩展到审核页、来源管理页和更复杂解析器。
- 小程序只展示 `published` 数据，避免待确认内容影响用户体验。

## 数据模型

### hotspot_sources

新增 `hotspot_sources` 集合，保存采集来源配置。

字段：

- `id`：稳定来源 ID，例如 `source-pudong-community`.
- `name`：来源名称，例如 `浦东新区文旅局`.
- `district`：区域，例如 `浦东`、`徐汇`、`静安`.
- `sourceType`：来源类型，取值为 `official`、`community`、`venue`、`platform`.
- `url`：列表页或聚合页 URL.
- `parserType`：解析方式，首版支持 `genericList`、`wechatArticleList`、`manualHtml`.
- `trustLevel`：可信级别，取值为 `whitelist` 或 `review`.
- `status`：来源启停状态，取值为 `active` 或 `paused`.
- `categoryHint`：默认分类，例如 `本区热门` 或 `附近热门`.
- `notes`：人工备注，方便在云开发控制台维护。
- `createdAt`、`updatedAt`：维护时间。

首批来源优先级：

- 区级官方/半官方：浦东、徐汇、静安、黄浦、长宁、杨浦等区文旅、文化馆、图书馆、融媒体或政务活动入口。
- 街道/社区：可公开访问的街道社区活动页、社区文化中心活动页。
- 私营场地方：展馆、书店、商场、剧场、Livehouse、市集平台等，先默认 `review`。

### hotspot_moments

继续使用 `hotspot_moments` 作为小程序展示集合，新增后台字段。

现有展示字段继续保留：

- `id`
- `sortOrder`
- `title`
- `bubble`
- `walkMinutes`
- `timeLabel`
- `place`
- `tags`
- `description`
- `free`
- `noSignup`
- `quietFriendly`
- `lowPressureNote`
- `color`
- `priceLabel`
- `category`
- `image`
- `sourceName`
- `sourceUrl`
- `district`
- `mapX`
- `mapY`

新增后台字段：

- `status`：`published`、`pending`、`hidden`、`expired`.
- `sourceId`：关联 `hotspot_sources.id`.
- `sourceType`：冗余来源类型，便于筛选。
- `trustLevel`：冗余可信级别，便于审核。
- `dedupeKey`：去重键，由标准化标题、日期、区域、来源 URL 生成。
- `rawTitle`：原始标题。
- `rawSummary`：原始摘要。
- `rawDateText`：原始日期文本。
- `startAt`、`endAt`：解析到的开始和结束时间，无法解析时为空。
- `lastSeenAt`：最近一次采集仍看到该活动的时间。
- `reviewNote`：人工审核备注。
- `syncedAt`：最近同步写入时间。

小程序读取接口默认只返回：

- `status === 'published'`
- 未过期，或者未能解析结束时间但 `lastSeenAt` 足够新

### hotspot_sync_logs

新增 `hotspot_sync_logs` 集合，保存每次同步结果。

字段：

- `id`：同步日志 ID.
- `triggerType`：`manual` 或 `scheduled`.
- `startedAt`、`finishedAt`.
- `sourceCount`：本次尝试来源数。
- `fetchedCount`：抓取到的原始条数。
- `createdCount`：新增活动数。
- `updatedCount`：更新活动数。
- `publishedCount`：自动上线数。
- `pendingCount`：待审核数。
- `errorCount`：失败来源数。
- `sources`：每个来源的精简结果，包含 `sourceId`、`name`、`count`、`error`.

## 云函数动作

继续使用 `hotspotApi`，在现有动作基础上扩展。

### syncActivities

升级现有动作，改为从 `hotspot_sources` 读取启用来源。

输入：

- `limit`：最多写入活动数。
- `sourceLimit`：最多同步来源数，方便测试。
- `sourceIds`：可选，只同步指定来源。
- `triggerType`：`manual` 或 `scheduled`.
- `fetchTimeout`：单来源超时时间。

处理流程：

1. 读取 `hotspot_sources` 中 `status === 'active'` 的来源。
2. 按 `sourceIds`、`sourceLimit` 过滤。
3. 逐个抓取来源页面。
4. 按 `parserType` 解析列表项。
5. 标准化成 `hotspot_moments` 所需字段。
6. 生成 `dedupeKey`，优先用 `sourceUrl`，其次用标题、日期、区域。
7. 如果已有同 `dedupeKey` 活动，更新摘要、图片、时间和 `lastSeenAt`。
8. 如果是新活动，根据 `trustLevel` 决定 `status`：
   - `whitelist` -> `published`
   - `review` -> `pending`
9. 写入 `hotspot_sync_logs`。
10. 返回同步统计和失败来源摘要。

### initSources

新增一次性初始化动作，用于写入首批来源配置。

这个动作只负责 upsert `hotspot_sources`，不删除人工新增来源。后续可以多次执行，更新内置来源的 URL、类型、状态和备注。

### listPendingActivities

首版可以先不做页面，但保留云函数动作给测试和未来管理页使用。

返回 `status === 'pending'` 的活动，按 `syncedAt` 倒序。

### updateActivityStatus

可选动作。第一版主要通过微信云开发控制台改数据库；如果实现该动作，则用于后续隐藏管理页。

输入 `id`、`status`、`reviewNote`，仅允许更新审核相关字段。

## 解析器设计

首版保留轻量、可维护的解析器，不引入大型爬虫框架。

### genericList

适合普通官网、区级平台、文化馆页面。

规则：

- 从 `li`、列表卡片、普通链接里提取 `a[href]`.
- 读取 `title`、图片 `src`、摘要类名 `desc/detail/summary`.
- 用活动关键词过滤，例如活动、展览、演出、讲座、市集、电影、亲子、文化、社区、报名。
- 生成绝对 URL。

### wechatArticleList

适合已知的公开微信文章列表或转载页。

规则：

- 提取文章链接、标题和封面。
- 不绕过登录或限制访问，不调用未授权接口。
- 无法公开访问时记录错误，不影响其他来源。

### manualHtml

适合结构特殊但可公开访问的私营场馆页面。

规则：

- 使用来源配置中的可选选择器字段。
- 首版如果配置缺失，则降级到 `genericList`。

## 去重与更新

去重策略按稳定性排序：

1. `sourceUrl` 完全一致。
2. 标准化后的 `title + district + rawDateText`.
3. 标准化后的 `title + place`.

更新已有活动时保留人工审核字段：

- 不覆盖人工设置的 `status`，除非原状态为空。
- 不覆盖 `reviewNote`.
- 不把 `hidden` 自动改回 `published`.
- 更新 `lastSeenAt`、`syncedAt`、图片、摘要、时间和标签。

## 读取接口变化

`getHomeData`、`getBrowseData`、`getMapData`、`getReasonsData` 读取 `hotspot_moments` 时应过滤 `published` 数据。

如果集合里存在旧数据没有 `status` 字段，可以在迁移期视为 `published`，避免现有页面突然空白。新采集写入的数据必须带 `status`。

## 定时同步

使用微信云开发定时触发器调用 `hotspotApi` 的 `syncActivities`。

建议频率：

- 每天上午 8 点同步一次区/社区来源。
- 每天下午 5 点可追加一次轻量同步，用于晚间活动。
- 私营来源首版可和区/社区来源同批同步，但默认进入 `pending`。

云函数超时保持宽松，单来源设置短超时，整次同步允许部分失败。

## 审核流程

第一版使用微信云开发控制台：

1. 采集写入 `hotspot_moments`.
2. 白名单来源自动 `published`.
3. 非白名单来源为 `pending`.
4. 运营者在云开发控制台查看 `pending`，确认无误后改为 `published`.
5. 不适合展示的活动改为 `hidden`.
6. 已过期活动可由后续清理逻辑改为 `expired`.

## 测试范围

需要新增或更新 Node 测试：

- 来源配置初始化能 upsert `hotspot_sources`.
- `syncActivities` 能按 `sourceLimit` 和 `sourceIds` 限制来源。
- 白名单来源写入 `published`.
- 非白名单来源写入 `pending`.
- 已有活动更新时不覆盖人工 `hidden` 或 `reviewNote`.
- 读取接口只返回 `published`，迁移期兼容旧数据无 `status`.
- 单个来源抓取失败时仍写入其他来源并生成同步日志。

## 不在首版范围

- 独立 Web 后台。
- 小程序隐藏管理页。
- 自动解析所有公众号历史消息。
- 需要登录、授权、付费或绕过反爬的来源。
- 支付、报名、用户发布活动。
- 复杂地理编码和真实步行距离计算。

## 后续扩展

- 增加管理页：待审核、发布、隐藏、来源启停。
- 增加来源健康度：连续失败次数、最近成功时间。
- 增加地理编码：把地址转成经纬度，优化地图和附近筛选。
- 增加活动过期清理：按 `endAt` 或 `lastSeenAt` 自动标记 `expired`.
- 增加来源分层：官方、社区、场馆、商业平台分别设置展示权重。
