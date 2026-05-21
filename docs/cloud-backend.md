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
```

后面要换真实内容时，直接在云数据库里修改这些集合即可。

如果想检查数据库集合是否有数据，传入：

```json
{
  "action": "debugDatabase",
  "payload": {}
}
```

## 4. 同步上海官方活动

云函数内置了一个 V1 同步动作，会从上海官方/公共活动页面抓取活动标题、简介、图片和来源链接，整理成 `hotspot_moments` 数据。

当前来源：

- 上海国际服务门户活动日历：https://english.shanghai.gov.cn/en-EventsCalendar/index.html
- 上海国际服务门户活动资讯：https://english.shanghai.gov.cn/en-events1/index.html
- 上海市文化和旅游局：https://whlyj.sh.gov.cn/

在云函数测试中传入：

```json
{
  "action": "syncActivities",
  "payload": {
    "limit": 30
  }
}
```

同步成功后，第二个 tab 的「本市热门 / 本区热门 / 附近热门」会读取整理后的 `hotspot_moments` 数据。这个同步接口适合先手动运行；等小程序稳定后，可以在云开发控制台给 `hotspotApi` 配置定时触发器，每天或每周自动更新。

如果 `hotspot_moments` 暂时为空，`getBrowseData` 会自动从第一个官方来源快速同步一批活动，避免第二个 tab 空白。

## 5. 小程序接口动作

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
syncActivities
```

## 6. 真正后端模式

业务读取接口现在只读取云数据库，不再从本地种子数据兜底。也就是说：

- 云数据库有数据，小程序页面显示云数据库内容。
- 云数据库为空，小程序页面就会显示空列表或加载失败状态。
- `seed-data.js` 只用于 `initData` 初始化，不再作为页面运行时 mock 数据。

偏好设置会通过 `savePreferences` 写回 `hotspot_settings` 集合。
