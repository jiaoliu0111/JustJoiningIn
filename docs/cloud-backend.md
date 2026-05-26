# 微信云开发后端部署说明

当前小程序已经从本地 `data/mock.js` 切换为云开发接口：

`页面 -> services/hotspot.js -> services/cloud.js -> hotspotApi 云函数 -> 云数据库`

## 1. 开通云开发环境

在微信开发者工具中打开项目后，点击顶部“云开发”，按提示开通环境。

开通后复制环境 ID，填入：

```js
// config/cloud.js
module.exports = {
  envId: '你的云开发环境 ID'
};
```

如果只开通了一个环境，也可以暂时留空，开发者工具会使用默认环境。

## 2. 部署云函数

在微信开发者工具左侧找到：

```txt
cloudfunctions/hotspotApi
```

右键选择“上传并部署：云端安装依赖”。

也可以用微信开发者工具命令行部署。先在开发者工具里打开：

```txt
设置 -> 安全设置 -> 服务端口
```

确认“服务端口”已开启后，在终端运行：

```bash
/Applications/wechatwebdevtools.app/Contents/MacOS/cli cloud functions deploy \
  --env cloud1-d8gvzyaea9ab3e181 \
  --paths /Users/song/Documents/JustJoiningIn/cloudfunctions/hotspotApi \
  --remote-npm-install \
  --appid wx1b318b892fbeb12c \
  --lang zh
```

这里使用 `--paths + --appid` 是为了明确绑定当前 AppID 和云函数目录；这比 `--project + --names` 更稳。

## 3. 初始化数据库数据

先测试云函数是否连通。打开云函数测试，传入：

```json
{
  "action": "ping",
  "payload": {}
}
```

如果返回 `hotspotApi connected`，说明云函数已经连通。

云函数支持一次性初始化数据。打开云函数测试，传入：

```json
{
  "action": "initData",
  "payload": {}
}
```

它会写入这些集合：

```txt
hotspot_moments
hotspot_reasons
hotspot_routes
hotspot_settings
hotspot_sources
```

后面要换真实内容时，建议先改 `hotspot_sources` 和同步/审核流程；展示页只读取 `hotspot_moments` 里 `status = published` 的活动。

如果只想初始化活动来源，也可以单独调用：

```json
{
  "action": "initSources",
  "payload": {}
}
```

如果想检查数据库集合是否有数据，传入：

```json
{
  "action": "debugDatabase",
  "payload": {}
}
```

## 4. 同步上海官方活动

云函数内置了一个 V1 同步动作，会读取 `hotspot_sources` 里的 active 来源，抓取活动标题、简介、图片和来源链接，整理成 `hotspot_moments` 数据。

当前来源：

- 上海国际服务门户活动日历：https://english.shanghai.gov.cn/en-EventsCalendar/index.html
- 上海国际服务门户活动资讯：https://english.shanghai.gov.cn/en-events1/index.html
- 上海市文化和旅游局：https://whlyj.sh.gov.cn/
- 浦东、徐汇、杨浦区级/社区来源占位，接入真实 URL 前可保留为人工审核来源

在云函数测试中传入：

```json
{
  "action": "syncActivities",
  "payload": {
    "limit": 30,
    "triggerType": "manual"
  }
}
```

同步成功后，第二个 tab 的「本市热门 / 本区热门 / 附近热门」会读取整理后的 `hotspot_moments` 数据。白名单来源会默认写成 `published`；普通社区/占位来源会写成 `pending`，需要审核后才展示。

这个同步接口适合先手动运行；等小程序稳定后，可以在云开发控制台给 `hotspotApi` 配置定时触发器，每天或每周自动更新。每次同步会写入 `hotspot_sync_logs`，方便查看 `createdCount`、`updatedCount`、`pendingCount` 和错误数量。

为了让 tab 切换更快，`getBrowseData` 不再自动触发抓取。前端会先用本地预览/缓存秒开页面，再在后台刷新云端数据。

当前 `cloudfunctions/hotspotApi/config.json` 已包含两个 timer 触发器：

```txt
syncActivitiesMorning  0 0 8 * * * *
syncActivitiesEvening  0 0 17 * * * *
```

如果使用微信开发者工具 CLI 部署后，`cloud functions info` 仍显示 timeout 为 3 秒，说明 CLI 没有同步函数元数据。此时请在云开发控制台手动把 `hotspotApi` 超时调到 20 秒，并确认上述两个定时触发器已存在。

如果只想同步某几个来源，可以传入：

```json
{
  "action": "syncActivities",
  "payload": {
    "sourceIds": ["source-shanghai-events-calendar"],
    "limit": 10
  }
}
```

## 5. 审核待发布活动

查看待审核：

```json
{
  "action": "listPendingActivities",
  "payload": {}
}
```

发布、隐藏或过期某条活动：

```json
{
  "action": "updateActivityStatus",
  "payload": {
    "id": "remote-xxxx",
    "status": "published",
    "reviewNote": "确认来源可靠，可以展示"
  }
}
```

## 6. 小程序接口动作

前端目前会调用这些云函数动作：

```txt
getHomeData
getBrowseData
getMapData
getReasonsData
getMineData
getDetail
savePreferences
```

后台维护/初始化动作：

```txt
ping
debugDatabase
initData
initSources
syncActivities
listPendingActivities
updateActivityStatus
```

## 7. 数据库集合设计

```txt
hotspot_moments            活动/去处主表，只展示 status = published
hotspot_sources            活动来源配置，包含 district、parserType、trustLevel、status
hotspot_sync_logs          每次同步的统计和错误记录
hotspot_user_preferences   用户偏好，按 openid 保存
hotspot_reasons            推荐入口文案
hotspot_routes             轻路线数据
hotspot_settings           全局默认偏好和清单
```

活动状态：

```txt
published  可展示
pending    待审核
hidden     人工隐藏
expired    过期不展示
```

`dedupeKey` 用来避免同一个来源链接重复写入。同步到已有活动时会更新标题、简介、图片、时间等信息，但会保留原来的审核状态和审核备注。

## 8. 真正后端模式

云函数业务读取接口只读取云数据库，不从 `seed-data.js` 兜底。也就是说：

- 云数据库有数据，小程序页面显示云数据库内容。
- 云数据库为空，小程序页面就会显示空列表或加载失败状态。
- `seed-data.js` 只用于 `initData` 初始化，不再作为页面运行时 mock 数据。

前端服务层会做本地优先：云函数慢或冷启动时，tab 先显示本地预览/缓存，再把云端结果刷新进缓存，避免切 tab 卡住。

偏好设置会通过 `savePreferences` 写回 `hotspot_user_preferences` 集合，按微信 `openid` 区分用户。
