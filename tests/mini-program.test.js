const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

test('mini program shell files exist', () => {
  [
    'app.js',
    'app.json',
    'app.wxss',
    'project.config.json',
    'sitemap.json',
    'config/cloud.js',
    'services/cloud.js',
    'services/fallback-data.js',
    'services/hotspot.js',
    'cloudfunctions/hotspotApi/index.js',
    'cloudfunctions/hotspotApi/activity-sync.js',
    'cloudfunctions/hotspotApi/config.json',
    'cloudfunctions/hotspotApi/package.json',
    'cloudfunctions/hotspotApi/seed-data.js',
    'utils/format.js',
    'utils/time.js'
  ].forEach((file) => assert.equal(exists(file), true, `${file} should exist`));
});

test('app config registers detail page and three tabs without a map tab', () => {
  const app = readJson('app.json');
  assert.deepEqual(app.pages, [
    'pages/home/home',
    'pages/bustle/bustle',
    'pages/group/group',
    'pages/mine/mine',
    'pages/detail/detail'
  ]);
  assert.equal(app.tabBar.list.length, 3);
  assert.deepEqual(
    app.tabBar.list.map((item) => item.text),
    ['首页', '热闹', '我的']
  );
  assert.deepEqual(
    app.tabBar.list.map((item) => item.pagePath),
    ['pages/home/home', 'pages/bustle/bustle', 'pages/mine/mine']
  );
  assert.equal(app.pages.includes('pages/map/map'), false);
});

test('app config declares user location permission for native map location display', () => {
  const app = readJson('app.json');

  assert.ok(app.permission, 'app.json should declare permission for map show-location');
  assert.ok(app.permission['scope.userLocation'], 'scope.userLocation is required by map show-location');
  assert.match(app.permission['scope.userLocation'].desc, /位置|导航|地图/);
});

test('tab bar uses matching local png icons for every tab', () => {
  const app = readJson('app.json');
  const expectedIconNames = ['house', 'bustle', 'mine'];

  app.tabBar.list.forEach((item, index) => {
    const name = expectedIconNames[index];

    assert.equal(item.iconPath, `assets/tabbar/${name}.png`);
    assert.equal(item.selectedIconPath, `assets/tabbar/${name}-active.png`);

    [item.iconPath, item.selectedIconPath].forEach((iconPath) => {
      assert.equal(path.extname(iconPath), '.png', `${iconPath} should be a png asset`);
      assert.equal(exists(iconPath), true, `${iconPath} should exist`);

      const icon = fs.readFileSync(path.join(root, iconPath));
      assert.deepEqual([...icon.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
      assert.ok(icon.byteLength < 40 * 1024, `${iconPath} should stay below WeChat tab icon size limits`);
    });
  });
});

test('all page component files exist', () => {
  ['home', 'bustle', 'group', 'mine', 'detail'].forEach((page) => {
    ['js', 'json', 'wxml', 'wxss'].forEach((extension) => {
      assert.equal(
        exists(`pages/${page}/${page}.${extension}`),
        true,
        `${page}.${extension} should exist`
      );
    });
  });
});

test('cloud seed data exposes complete MVP content', () => {
  const seed = require('../cloudfunctions/hotspotApi/seed-data.js');
  assert.ok(seed.moments.length >= 5, 'nearby moments should include local small happenings');
  assert.ok(seed.reasons.length >= 3, 'reason cards should include low-pressure prompts');
  assert.ok(seed.routes.length >= 3, 'routes should include ready plans');
  assert.ok(seed.sources.length >= 3, 'backend should include configured activity sources');

  const moment = seed.moments[0];
  [
    'id',
    'title',
    'bubble',
    'walkMinutes',
    'timeLabel',
    'place',
    'tags',
    'description',
    'free',
    'noSignup',
    'lowPressureNote',
    'status',
    'dedupeKey'
  ].forEach((key) => assert.ok(Object.hasOwn(moment, key), `moment.${key}`));
  seed.moments.forEach((item) => {
    assert.equal(item.status, 'published');
  });
  seed.sources.forEach((source) => {
    ['id', 'name', 'district', 'sourceType', 'url', 'parserType', 'trustLevel', 'status', 'categoryHint'].forEach((key) => {
      assert.ok(Object.hasOwn(source, key), `source.${key}`);
    });
  });

  assert.equal(seed.preferences.walkMinutes, 10);
  assert.equal(seed.preferences.freeOnly, true);
  assert.ok(seed.checklist.includes('穿舒服的鞋'));
});

test('detail helper exposes static display formatters only', () => {
  const { detailTitle, joinTags } = require('../utils/format.js');

  assert.equal(detailTitle('moment'), '附近小热闹');
  assert.equal(detailTitle('reason'), '推荐去处');
  assert.equal(detailTitle('route'), '放空路线');
  assert.equal(detailTitle('unknown'), '详情');
  assert.equal(joinTags(['免费', '不用报名']), '免费 · 不用报名');
});

test('mini program initializes cloud development and registers cloudfunction root', () => {
  const appJs = fs.readFileSync(path.join(root, 'app.js'), 'utf8');
  const project = readJson('project.config.json');

  assert.equal(project.cloudfunctionRoot, 'cloudfunctions/');
  assert.match(appJs, /wx\.cloud\.init/);
  assert.match(appJs, /config\/cloud\.js/);
});

test('pages use hotspot services instead of local mock data', () => {
  const runtimeFiles = [
    'pages/home/home.js',
    'pages/bustle/bustle.js',
    'pages/group/group.js',
    'pages/detail/detail.js',
    'pages/mine/mine.js',
    'utils/format.js'
  ];
  const runtimeSource = runtimeFiles
    .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
    .join('\n');

  assert.doesNotMatch(runtimeSource, /data\/mock/);
  assert.doesNotMatch(runtimeSource, /mock\./);
  ['getHomeData', 'getBrowseData', 'getReasonsData', 'getMineData', 'savePreferences', 'getDetail'].forEach((method) => {
    assert.match(runtimeSource, new RegExp(`hotspotService\\.${method}`), `${method} should be used by pages`);
  });
});

test('cloud service wraps hotspotApi callFunction results', async () => {
  const { API_FUNCTION_NAME, callCloudApi } = require('../services/cloud.js');
  const calls = [];
  const fakeWx = {
    cloud: {
      callFunction(options) {
        calls.push(options);
        return Promise.resolve({
          result: {
            ok: true,
            data: { items: [{ id: 'moment-coffee' }] }
          }
        });
      }
    }
  };

  const result = await callCloudApi('getHomeData', { city: '上海' }, fakeWx);

  assert.equal(API_FUNCTION_NAME, 'hotspotApi');
  assert.deepEqual(calls, [{
    name: 'hotspotApi',
    data: {
      action: 'getHomeData',
      payload: { city: '上海' }
    }
  }]);
  assert.deepEqual(result, { items: [{ id: 'moment-coffee' }] });
  const { createHotspotService } = require('../services/hotspot.js');
  const service = createHotspotService(callCloudApi.bind(null));
  assert.equal(typeof service.ping, 'function');
  assert.equal(typeof service.debugDatabase, 'function');
  await assert.rejects(
    () => callCloudApi('getHomeData', {}, {
      cloud: {
        callFunction() {
          return Promise.resolve({ result: { ok: false, message: '云函数失败' } });
        }
      }
    }),
    /云函数失败/
  );
});

test('hotspot service shows local preview data when cloud function times out', async () => {
  const { createHotspotService } = require('../services/hotspot.js');
  const service = createHotspotService(() => Promise.reject(new Error('timeout')));

  const browseData = await service.getBrowseData({ city: '上海' });

  assert.ok(browseData.cards.length >= 3);
  assert.equal(browseData.cards[0].cardType, 'moment');
  assert.ok(['本市热门', '本区热门', '附近热门'].includes(browseData.cards[0].category));
});

test('tab data uses local preview immediately instead of waiting for slow cloud calls', async () => {
  const { createHotspotService } = require('../services/hotspot.js');
  const service = createHotspotService(() => new Promise(() => {}));

  const result = await Promise.race([
    service.getMapData({ city: '上海' }),
    new Promise((resolve) => setTimeout(() => resolve('still waiting'), 20))
  ]);

  assert.notEqual(result, 'still waiting');
  assert.ok(result.moments.length >= 3);
});

test('park activity data does not fall back to local preview when cloud is slow', async () => {
  const { createHotspotService } = require('../services/hotspot.js');
  const service = createHotspotService(() => new Promise(() => {}));

  const result = await Promise.race([
    service.getParkActivityData({ city: '上海' }).then(
      () => 'resolved',
      () => 'rejected'
    ),
    new Promise((resolve) => setTimeout(() => resolve('still waiting'), 20))
  ]);

  assert.equal(result, 'still waiting');
});

test('city walk data does not fall back to local preview when cloud is slow', async () => {
  const { createHotspotService } = require('../services/hotspot.js');
  const service = createHotspotService(() => new Promise(() => {}));

  const result = await Promise.race([
    service.getCityWalkData({ city: '上海' }).then(
      () => 'resolved',
      () => 'rejected'
    ),
    new Promise((resolve) => setTimeout(() => resolve('still waiting'), 20))
  ]);

  assert.equal(result, 'still waiting');
});

test('official Meet in Shanghai category data falls back to website API when cloud is unavailable', async () => {
  const { createHotspotService } = require('../services/hotspot.js');
  const requested = [];
  const fakeWx = {
    request(options) {
      requested.push(options.url);
      options.success({
        statusCode: 200,
        data: {
          code: 200,
          data: {
            records: [{
              title: '召稼楼古镇',
              thumbnailPic: '\\cn\\uploads\\2025\\06\\12\\zhaojialou.jpg',
              subjectCode: 'ancient-town,tourist-attraction',
              subjectName: '古镇,景区',
              district: '闵行区',
              content: '召稼楼古镇是具有深厚历史背景和文化价值的古镇。',
              level: '4A',
              venueName: '上海市闵行区浦江镇沈杜公路2059号',
              translatorFile: 'zhaojialou-ancient-town-411839'
            }]
          }
        }
      });
    }
  };
  const service = createHotspotService(() => Promise.reject(new Error('timeout')), fakeWx);

  const data = await service.getHeritageTownData({ limit: 5, cloudTimeout: 5 });

  assert.equal(requested.length, 1);
  assert.match(requested[0], /api1\.meet-in-shanghai\.net\/api\/place\/public\/page/);
  assert.match(requested[0], /subjectId=1076/);
  assert.equal(data.cards.length, 1);
  assert.equal(data.cards[0].title, '召稼楼古镇');
  assert.equal(data.cards[0].category, '非遗古镇');
  assert.equal(data.cards[0].titleTag, '4A');
  assert.equal(data.cards[0].hideListTags, true);
  assert.equal(data.cards[0].image, 'https://www1.meet-in-shanghai.net/cn/uploads/2025/06/12/zhaojialou.jpg');
});

test('tab data refreshes cloud results into cache without blocking first paint', async () => {
  const { createHotspotService } = require('../services/hotspot.js');
  const store = {};
  const storage = {
    getStorageSync(key) {
      return store[key];
    },
    setStorageSync(key, value) {
      store[key] = value;
    }
  };
  let resolveCloud;
  const cloudResult = {
    moments: [{ id: 'cloud-moment', title: '云端小热闹' }]
  };
  const service = createHotspotService(() => new Promise((resolve) => {
    resolveCloud = () => resolve(cloudResult);
  }), storage);

  const first = await service.getMapData({ city: '上海' });
  assert.notEqual(first.moments[0].id, 'cloud-moment');

  resolveCloud();
  await new Promise((resolve) => setTimeout(resolve, 0));

  const second = await service.getMapData({ city: '上海' });
  assert.equal(second.moments[0].id, 'cloud-moment');
});

test('tab data ignores stale unversioned cache entries', async () => {
  const { createHotspotService } = require('../services/hotspot.js');
  const store = {
    'hotspot:browse': {
      cards: [{
        id: 'stale-card',
        title: '旧缓存卡片',
        image: '/assets/events/studio.png'
      }]
    }
  };
  const storage = {
    getStorageSync(key) {
      return store[key];
    },
    setStorageSync(key, value) {
      store[key] = value;
    }
  };
  const service = createHotspotService(() => new Promise(() => {}), storage);

  const result = await service.getBrowseData({ city: '上海' });

  assert.notEqual(result.cards[0].id, 'stale-card');
  result.cards.forEach((card) => {
    assert.doesNotMatch(card.image || '', /studio\.png/);
  });
});

test('hotspot cloud function exposes data actions for pages', () => {
  const source = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/index.js'), 'utf8');
  const config = readJson('cloudfunctions/hotspotApi/config.json');

  ['ping', 'debugDatabase', 'getHomeData', 'getBrowseData', 'getParkActivityData', 'getCityWalkData', 'getMapData', 'getReasonsData', 'getMineData', 'savePreferences', 'getDetail', 'initData', 'initSources', 'listPendingActivities', 'updateActivityStatus', 'syncActivities'].forEach((action) => {
    assert.match(source, new RegExp(action), `${action} should be handled by hotspotApi`);
  });
  assert.match(source, /activity-sync\.js/);
  assert.doesNotMatch(source, /listCollection\(collections\.(moments|reasons|routes),\s*seed\./);
  assert.doesNotMatch(source, /findByPublicId\(collections\.(moments|reasons|routes),[^)]*\)\s*\|\|\s*seed\./);
  const browseBody = source.slice(
    source.indexOf('async function getBrowseData()'),
    source.indexOf('function toMomentCard')
  );
  assert.doesNotMatch(browseBody, /syncOfficialActivities/);
  assert.match(source, /wx-server-sdk/);
  assert.match(source, /hotspot_moments/);
  assert.match(source, /hotspot_reasons/);
  assert.match(source, /hotspot_routes/);
  assert.match(source, /hotspot_sources/);
  assert.match(source, /hotspot_sync_logs/);
  assert.match(source, /hotspot_user_preferences/);
  assert.match(source, /source-shanghai-park-activities/);
  assert.match(source, /createCollection/);
  assert.match(source, /listPublishedCollection/);
  assert.match(source, /listPublishedMoments/);
  assert.match(source, /status === 'published'/);
  assert.match(source, /status === 'pending'/);
  assert.match(source, /trustLevel === 'whitelist' \? 'published' : 'pending'/);
  assert.match(source, /reviewNote/);
  assert.match(source, /getWXContext/);
  assert.ok(config.timeout >= 20, 'cloud function timeout should allow cold starts and activity sync');
});

test('backend source sync model includes review status, dedupe keys, and logs', () => {
  const syncSource = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/activity-sync.js'), 'utf8');
  const apiSource = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/index.js'), 'utf8');

  assert.match(syncSource, /dedupeKey/);
  assert.match(syncSource, /sourceId/);
  assert.match(syncSource, /trustLevel/);
  assert.match(syncSource, /parserType/);
  assert.match(apiSource, /upsertActivityDocument/);
  assert.match(apiSource, /writeSyncLog/);
  assert.match(apiSource, /sourceIds/);
  assert.match(apiSource, /triggerType/);
  assert.match(apiSource, /createdCount/);
  assert.match(apiSource, /updatedCount/);
  assert.match(apiSource, /pendingCount/);
});

test('cloud function preserves manual review fields when upserting fetched activities', () => {
  const source = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/index.js'), 'utf8');
  const upsertBody = source.slice(
    source.indexOf('async function upsertActivityDocument'),
    source.indexOf('async function writeSyncLog')
  );

  assert.match(upsertBody, /existingClean\.status === 'hidden'/);
  assert.match(upsertBody, /existingClean\.status === 'expired'/);
  assert.match(upsertBody, /existingClean\.reviewNote/);
  assert.match(upsertBody, /dedupeKey/);
  assert.doesNotMatch(upsertBody, /data:\s*document/);
});

test('cloud function config schedules activity sync and timer events default to sync', () => {
  const config = readJson('cloudfunctions/hotspotApi/config.json');
  const source = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/index.js'), 'utf8');

  assert.ok(Array.isArray(config.triggers));
  assert.ok(config.triggers.length >= 2);
  config.triggers.forEach((trigger) => {
    assert.equal(trigger.type, 'timer');
    assert.match(trigger.name, /syncActivities/);
    assert.match(trigger.config, /^\d+ \d+ \d+ \* \* \* \*$/);
  });
  assert.match(source, /normalizeEvent/);
  assert.match(source, /event\.Type === 'Timer'/);
  assert.match(source, /triggerType:\s*'scheduled'/);
});

test('debug database counts ensure backend collections exist before counting', () => {
  const source = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/index.js'), 'utf8');
  const countBody = source.slice(
    source.indexOf('async function countCollection'),
    source.indexOf('async function debugDatabase')
  );

  assert.match(countBody, /await ensureCollection\(name\)/);
});

test('cloud backend docs explain collector source initialization and review flow', () => {
  const docs = fs.readFileSync(path.join(root, 'docs/cloud-backend.md'), 'utf8');

  assert.match(docs, /initSources/);
  assert.match(docs, /hotspot_sources/);
  assert.match(docs, /hotspot_sync_logs/);
  assert.match(docs, /pending/);
  assert.match(docs, /published/);
  assert.match(docs, /定时触发器/);
});

test('activity source configs cover Shanghai district and review sources', () => {
  const { SOURCE_CONFIGS, normalizeSourceConfig } = require('../cloudfunctions/hotspotApi/source-configs.js');

  assert.ok(SOURCE_CONFIGS.length >= 6);
  assert.ok(SOURCE_CONFIGS.some((source) => source.district === '浦东'));
  assert.ok(SOURCE_CONFIGS.some((source) => source.district === '徐汇'));
  assert.ok(SOURCE_CONFIGS.some((source) => (
    source.id === 'source-shanghai-park-activities'
    && source.url === 'https://lhsr.sh.gov.cn/gyhd/index.html'
    && source.parserType === 'parkActivityList'
    && source.categoryHint === '公园活动'
  )));
  assert.ok(SOURCE_CONFIGS.some((source) => source.trustLevel === 'whitelist'));
  assert.ok(SOURCE_CONFIGS.some((source) => source.trustLevel === 'review'));

  const normalized = normalizeSourceConfig({
    id: 'source-test',
    name: '测试社区活动',
    district: '杨浦',
    url: 'https://example.com/events'
  });

  assert.deepEqual(normalized, {
    id: 'source-test',
    name: '测试社区活动',
    district: '杨浦',
    sourceType: 'community',
    url: 'https://example.com/events',
    apiUrl: '',
    parserType: 'genericList',
    trustLevel: 'review',
    status: 'active',
    categoryHint: '本区热门',
    notes: ''
  });
});

test('activity sync parses official Shanghai event list pages', () => {
  const { extractListItems } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const html = `
    <ul class="picTextList squarePicList new-year-list">
      <li>
        <a href="/en-EventsCalendar/20260428/example.html" title="Sporting events, exhibitions & performances in May" target="_blank">
          <img src="/cmsres/47/example.jpg" alt="May events">
          <p class="title"><span>Sporting events, exhibitions & performances in May</span></p>
          <p class="detail">The May Day holiday is here, and Shanghai is brimming with things to see and do.</p>
        </a>
      </li>
    </ul>`;

  const items = extractListItems(html, {
    url: 'https://english.shanghai.gov.cn/en-EventsCalendar/index.html',
    name: '上海国际服务门户',
    categoryHint: '本市热门'
  });

  assert.equal(items.length, 1);
  assert.equal(items[0].title, 'Sporting events, exhibitions & performances in May');
  assert.equal(items[0].description, 'The May Day holiday is here, and Shanghai is brimming with things to see and do.');
  assert.equal(items[0].sourceUrl, 'https://english.shanghai.gov.cn/en-EventsCalendar/20260428/example.html');
  assert.equal(items[0].image, 'https://english.shanghai.gov.cn/cmsres/47/example.jpg');
  assert.equal(items[0].sourceName, '上海国际服务门户');
});

test('activity sync parses Shanghai park activity list pages', () => {
  const { extractListItems, normalizeActivity } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const source = {
    id: 'source-shanghai-park-activities',
    url: 'https://lhsr.sh.gov.cn/gyhd/index.html',
    name: '上海市绿化和市容管理局公园活动专区',
    sourceType: 'official',
    trustLevel: 'whitelist',
    parserType: 'parkActivityList',
    categoryHint: '公园活动'
  };
  const html = `
    <div class="text pt_list">
      <div class="text_1"><img src="/xxgk/triangle.png"></div>
      <a href="/gyhd/20260525/81164828-fbbc-400d-9ce3-58cdb3b2cca7.html" title="初夏花约，上海共青森林公园2026八仙花展示活动启幕">
        初夏花约，上海共青森林公园2026八仙花展示活动启幕
      </a>
      <div class="text_2">2026-05-25</div>
    </div>`;

  const items = extractListItems(html, source);
  const activity = normalizeActivity(items[0], 0, source);

  assert.equal(items.length, 1);
  assert.equal(items[0].title, '初夏花约，上海共青森林公园2026八仙花展示活动启幕');
  assert.equal(items[0].rawDateText, '2026-05-25');
  assert.equal(items[0].sourceUrl, 'https://lhsr.sh.gov.cn/gyhd/20260525/81164828-fbbc-400d-9ce3-58cdb3b2cca7.html');
  assert.equal(activity.category, '公园活动');
  assert.equal(activity.bubble, '公园活动');
  assert.equal(activity.timeLabel, '2026-05-25');
  assert.equal(activity.status, 'published');
});

test('activity sync parses Meet in Shanghai city walk API records', () => {
  const { extractListItems, normalizeActivity } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const source = {
    id: 'source-meet-shanghai-city-walk',
    url: 'https://www1.meet-in-shanghai.net/cn/city-walk/',
    apiUrl: 'https://api1.meet-in-shanghai.net/api/place/public/page',
    name: '上海旅游城市漫步',
    sourceType: 'official',
    trustLevel: 'whitelist',
    parserType: 'cityWalkList',
    categoryHint: '城市漫步'
  };
  const payload = JSON.stringify({
    code: 200,
    data: {
      records: [{
        title: '愚园艺术生活街区',
        thumbnailPic: '\\cn\\uploads\\2025\\06\\12\\yuyuan.jpg',
        subjectCode: 'tourism-and-leisure-district,night-culture',
        subjectName: '旅游休闲街区,夜间文化',
        address: '长宁区',
        district: '长宁区',
        venueName: '上海市长宁区愚园路',
        content: '梧桐树影下的城市漫步路线，沿街能看到老建筑、咖啡馆、社区小店和安静的支路，适合慢慢走完整条街区。'.repeat(4),
        translatorFile: 'yuyuan-art-life-block'
      }]
    }
  });

  const items = extractListItems(payload, source);
  const activity = normalizeActivity(items[0], 0, source);

  assert.equal(items.length, 1);
  assert.equal(items[0].title, '愚园艺术生活街区');
  assert.ok(items[0].description.length > 96);
  assert.match(items[0].description, /适合慢慢走完整条街区。$/);
  assert.equal(items[0].district, '长宁');
  assert.equal(items[0].address, '上海市长宁区愚园路');
  assert.deepEqual(items[0].tags, ['旅游休闲街区', '夜间文化']);
  assert.equal(items[0].sourceUrl, 'https://www1.meet-in-shanghai.net/cn/tourism-and-leisure-district/yuyuan-art-life-block');
  assert.equal(items[0].image, 'https://www1.meet-in-shanghai.net/cn/uploads/2025/06/12/yuyuan.jpg');
  assert.equal(activity.category, '城市漫步');
  assert.equal(activity.bubble, '城市漫步');
  assert.equal(activity.address, '上海市长宁区愚园路');
  assert.deepEqual(activity.tags, ['旅游休闲街区', '夜间文化']);
  assert.equal(activity.status, 'published');
});

test('activity sync extracts a suitable hero image from Shanghai park detail pages', () => {
  const { extractDetailHeroImage, extractDetailContentNodes } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const html = `
    <div class="header"><img src="/static/images/logo.png" alt="logo"></div>
    <div id="ivs_content" class="TRS_Editor">
      <p>活动现场</p>
      <img style="float: none;" title="DSC02562.JPG" src="/cmsres/4f/flower-show.JPG" alt="DSC02562.JPG" width="400">
      <p>这里是官网详情正文。</p>
    </div>`;

  const image = extractDetailHeroImage(html, 'https://lhsr.sh.gov.cn/gyhd/detail.html');
  const nodes = extractDetailContentNodes(html, 'https://lhsr.sh.gov.cn/gyhd/detail.html');

  assert.equal(image, 'https://lhsr.sh.gov.cn/cmsres/4f/flower-show.JPG');
  assert.deepEqual(nodes, [
    {
      name: 'p',
      attrs: { class: 'detail-content-paragraph' },
      children: [{ type: 'text', text: '活动现场' }]
    },
    {
      name: 'img',
      attrs: {
        class: 'detail-content-image',
        mode: 'widthFix',
        src: 'https://lhsr.sh.gov.cn/cmsres/4f/flower-show.JPG'
      }
    },
    {
      name: 'p',
      attrs: { class: 'detail-content-paragraph' },
      children: [{ type: 'text', text: '这里是官网详情正文。' }]
    }
  ]);
});

test('park activity sync enriches list cards with detail page hero images', async () => {
  const { syncActivities } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const source = {
    id: 'source-shanghai-park-activities',
    url: 'https://lhsr.sh.gov.cn/gyhd/index.html',
    name: '上海市绿化和市容管理局公园活动专区',
    sourceType: 'official',
    trustLevel: 'whitelist',
    parserType: 'parkActivityList',
    categoryHint: '公园活动',
    status: 'active'
  };
  const listHtml = `
    <div class="text pt_list">
      <a href="/gyhd/20260525/example.html" title="初夏花约，上海共青森林公园2026八仙花展示活动启幕">初夏花约，上海共青森林公园2026八仙花展示活动启幕</a>
      <div class="text_2">2026-05-25</div>
    </div>`;
  const detailHtml = '<div id="ivs_content"><p>官网正文</p><img src="/cmsres/park/main.JPG" width="400"></div>';
  const requestedUrls = [];

  const result = await syncActivities({
    sources: [source],
    sourceLimit: 1,
    sourceIds: [source.id],
    limit: 1,
    fetcher: (url) => {
      requestedUrls.push(url);
      return Promise.resolve(url.endsWith('/gyhd/index.html') ? listHtml : detailHtml);
    }
  });

  assert.deepEqual(requestedUrls, [
    'https://lhsr.sh.gov.cn/gyhd/index.html',
    'https://lhsr.sh.gov.cn/gyhd/20260525/example.html'
  ]);
  assert.equal(result.items[0].image, 'https://lhsr.sh.gov.cn/cmsres/park/main.JPG');
  assert.equal(result.items[0].contentNodes[0].children[0].text, '官网正文');
});

test('park activity sync enriches every returned card with a detail image', async () => {
  const { syncActivities } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const source = {
    id: 'source-shanghai-park-activities',
    url: 'https://lhsr.sh.gov.cn/gyhd/index.html',
    name: '上海市绿化和市容管理局公园活动专区',
    sourceType: 'official',
    trustLevel: 'whitelist',
    parserType: 'parkActivityList',
    categoryHint: '公园活动',
    status: 'active'
  };
  const listItems = Array.from({ length: 10 }, (_, index) => `
    <div class="text pt_list">
      <a href="/gyhd/20260427/example-${index}.html" title="公园活动详情图测试 ${index}">公园活动详情图测试 ${index}</a>
      <div class="text_2">2026-04-27</div>
    </div>`).join('');

  const result = await syncActivities({
    sources: [source],
    sourceLimit: 1,
    sourceIds: [source.id],
    limit: 10,
    fetcher: (url) => {
      if (url.endsWith('/gyhd/index.html')) {
        return Promise.resolve(listItems);
      }
      const id = url.match(/example-(\d+)/)[1];
      return Promise.resolve(`<div class="TRS_Editor"><img src="/cmsres/park/detail-${id}.jpg" width="400"></div>`);
    }
  });

  assert.equal(result.items.length, 10);
  assert.equal(result.items[9].image, 'https://lhsr.sh.gov.cn/cmsres/park/detail-9.jpg');
  result.items.forEach((item) => {
    assert.doesNotMatch(item.image, /\/assets\/events\/park\.png/);
  });
});

test('park activity sync paginates current and previous month data without truncating page one', async () => {
  const { syncActivities } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const source = {
    id: 'source-shanghai-park-activities',
    url: 'https://lhsr.sh.gov.cn/gyhd/index.html',
    name: '上海市绿化和市容管理局公园活动专区',
    sourceType: 'official',
    trustLevel: 'whitelist',
    parserType: 'parkActivityList',
    categoryHint: '公园活动',
    status: 'active'
  };
  const row = (slug, title, date) => `
    <div class="text pt_list">
      <a href="/gyhd/${slug}.html" title="${title}">${title}</a>
      <div class="text_2">${date}</div>
    </div>`;
  const pageOne = [
    ...Array.from({ length: 12 }, (_, index) => row(`202605/page-one-${index}`, `五月公园活动 ${index}`, '2026-05-15')),
    row('202604/page-one-bottom-1', '第一页底部四月活动一', '2026-04-20'),
    row('202604/page-one-bottom-2', '第一页底部四月活动二', '2026-04-16'),
    row('202604/page-one-bottom-3', '第一页底部四月活动三', '2026-04-13')
  ].join('');
  const pageTwo = [
    row('202604/page-two-1', '第二页四月活动一', '2026-04-08'),
    row('202604/page-two-2', '第二页四月活动二', '2026-04-02'),
    row('202603/page-two-old', '第二页三月旧活动', '2026-03-30')
  ].join('');
  const requestedListUrls = [];

  const result = await syncActivities({
    sources: [source],
    sourceLimit: 1,
    sourceIds: [source.id],
    limit: 60,
    now: new Date('2026-05-25T12:00:00+08:00'),
    fetcher: (url) => {
      if (/index(?:_\d+)?\.html$/.test(url)) {
        requestedListUrls.push(url);
      }
      if (url.endsWith('/gyhd/index.html')) {
        return Promise.resolve(pageOne);
      }
      if (url.endsWith('/gyhd/index_2.html')) {
        return Promise.resolve(pageTwo);
      }
      return Promise.resolve('<div class="TRS_Editor"><img src="/cmsres/park/detail.jpg" width="400"></div>');
    }
  });

  assert.deepEqual(requestedListUrls, [
    'https://lhsr.sh.gov.cn/gyhd/index.html',
    'https://lhsr.sh.gov.cn/gyhd/index_2.html'
  ]);
  assert.equal(result.items.length, 17);
  assert.ok(result.items.some((item) => item.rawTitle === '第一页底部四月活动三'));
  assert.ok(result.items.some((item) => item.rawTitle === '第二页四月活动二'));
  assert.ok(result.items.every((item) => /2026-(05|04)-/.test(item.rawDateText)));
  assert.ok(result.items.every((item) => item.image === 'https://lhsr.sh.gov.cn/cmsres/park/detail.jpg'));
});

test('city walk sync calls Meet in Shanghai API and publishes official cards', async () => {
  const { syncActivities } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const source = {
    id: 'source-meet-shanghai-city-walk',
    url: 'https://www1.meet-in-shanghai.net/cn/city-walk/',
    apiUrl: 'https://api1.meet-in-shanghai.net/api/place/public/page',
    name: '上海旅游城市漫步',
    sourceType: 'official',
    trustLevel: 'whitelist',
    parserType: 'cityWalkList',
    categoryHint: '城市漫步',
    status: 'active'
  };
  const requestedUrls = [];

  const result = await syncActivities({
    sources: [source],
    sourceLimit: 1,
    sourceIds: [source.id],
    limit: 4,
    fetcher: (url) => {
      requestedUrls.push(url);
      return Promise.resolve(JSON.stringify({
        code: 200,
        data: {
          records: [{
            title: '衡复音乐街区',
            thumbnailPic: '/cn/uploads/2025/06/12/hengfu.jpg',
            subjectCode: 'night-culture,tourism-and-leisure-district',
            subjectName: '夜间文化,旅游休闲街区',
            address: '徐汇区',
            district: '徐汇区',
            content: '沿着音乐街区慢慢走。',
            translatorFile: 'hengfu-music-block'
          }]
        }
      }));
    }
  });

  assert.equal(requestedUrls.length, 1);
  assert.match(requestedUrls[0], /^https:\/\/api1\.meet-in-shanghai\.net\/api\/place\/public\/page\?/);
  assert.match(requestedUrls[0], /subjectParentId=1039/);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].rawTitle, '衡复音乐街区');
  assert.equal(result.items[0].category, '城市漫步');
  assert.equal(result.items[0].image, 'https://www1.meet-in-shanghai.net/cn/uploads/2025/06/12/hengfu.jpg');
});

test('heritage town sync calls Meet in Shanghai ancient town API and preserves level tags', async () => {
  const { syncActivities } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const source = {
    id: 'source-meet-shanghai-heritage-town',
    url: 'https://www1.meet-in-shanghai.net/cn/intangible-cultural-heritage-ancient-town/',
    apiUrl: 'https://api1.meet-in-shanghai.net/api/place/public/page',
    subjectParentId: '1037',
    subjectId: '1076',
    name: '上海旅游非遗古镇',
    sourceType: 'official',
    trustLevel: 'whitelist',
    parserType: 'cityWalkList',
    categoryHint: '非遗古镇',
    hideListTags: true,
    status: 'active'
  };
  const requestedUrls = [];

  const result = await syncActivities({
    sources: [source],
    sourceLimit: 1,
    sourceIds: [source.id],
    limit: 4,
    fetcher: (url) => {
      requestedUrls.push(url);
      return Promise.resolve(JSON.stringify({
        code: 200,
        data: {
          records: [{
            title: '召稼楼古镇',
            thumbnailPic: '\\cn\\uploads\\2025\\06\\12\\zhaojialou.jpg',
            subjectCode: 'ancient-town,tourist-attraction',
            subjectName: '古镇,景区',
            address: '闵行区',
            district: '闵行区',
            content: '召稼楼古镇是具有深厚历史背景和文化价值的古镇。',
            level: '4A',
            venueName: '上海市闵行区浦江镇沈杜公路2059号',
            translatorFile: 'zhaojialou-ancient-town-411839'
          }]
        }
      }));
    }
  });

  assert.equal(requestedUrls.length, 1);
  assert.match(requestedUrls[0], /subjectId=1076/);
  assert.doesNotMatch(requestedUrls[0], /subjectParentId=1037/);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0].rawTitle, '召稼楼古镇');
  assert.equal(result.items[0].category, '非遗古镇');
  assert.equal(result.items[0].titleTag, '4A');
  assert.equal(result.items[0].hideListTags, true);
  assert.equal(result.items[0].image, 'https://www1.meet-in-shanghai.net/cn/uploads/2025/06/12/zhaojialou.jpg');
});

test('scenic area sync calls Meet in Shanghai A-grade tourist attraction API', async () => {
  const { syncActivities } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const source = {
    id: 'source-meet-shanghai-a-grade-tourist-attraction',
    url: 'https://www1.meet-in-shanghai.net/cn/a-grade-tourist-attraction/',
    apiUrl: 'https://api1.meet-in-shanghai.net/api/place/public/page',
    subjectParentId: '1053',
    subjectId: '1118',
    apiSortName: 'level',
    name: '上海旅游A级景区',
    sourceType: 'official',
    trustLevel: 'whitelist',
    parserType: 'cityWalkList',
    categoryHint: 'A级景区',
    hideListTags: true,
    status: 'active'
  };
  const requestedUrls = [];

  const result = await syncActivities({
    sources: [source],
    sourceLimit: 1,
    sourceIds: [source.id],
    limit: 4,
    fetcher: (url) => {
      requestedUrls.push(url);
      return Promise.resolve(JSON.stringify({
        code: 200,
        data: {
          records: [{
            title: '上海东方明珠广播电视塔',
            thumbnailPic: '\\cn\\uploads\\2025\\06\\12\\pearl.jpg',
            subjectCode: 'tourist-attraction',
            subjectName: '景区',
            district: '浦东新区',
            content: '上海经典A级景区。',
            level: '5A',
            venueName: '上海市浦东新区世纪大道1号',
            translatorFile: 'shanghai-oriental-pearl-radio-and-television-tower-946003'
          }]
        }
      }));
    }
  });

  assert.equal(requestedUrls.length, 1);
  assert.match(requestedUrls[0], /subjectId=1118/);
  assert.match(requestedUrls[0], /sortName=level/);
  assert.equal(result.items[0].category, 'A级景区');
  assert.equal(result.items[0].titleTag, '5A');
  assert.equal(result.items[0].sourceId, source.id);
});

test('eco camping sync calls Meet in Shanghai eco camping tourism API', async () => {
  const { syncActivities } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const source = {
    id: 'source-meet-shanghai-eco-camping-tourism',
    url: 'https://www1.meet-in-shanghai.net/cn/eco-camping-tourism/',
    apiUrl: 'https://api1.meet-in-shanghai.net/api/place/public/page',
    subjectParentId: '1048',
    subjectId: '1108',
    name: '上海旅游生态露营',
    sourceType: 'official',
    trustLevel: 'whitelist',
    parserType: 'cityWalkList',
    categoryHint: '生态露营',
    hideListTags: true,
    status: 'active'
  };
  const requestedUrls = [];

  const result = await syncActivities({
    sources: [source],
    sourceLimit: 1,
    sourceIds: [source.id],
    limit: 4,
    fetcher: (url) => {
      requestedUrls.push(url);
      return Promise.resolve(JSON.stringify({
        code: 200,
        data: {
          records: [{
            title: '上海长风公园',
            thumbnailPic: '\\cn\\uploads\\2025\\06\\12\\changfeng.jpg',
            subjectCode: 'campsite',
            subjectName: '露营地',
            district: '普陀区',
            content: '适合城市生态露营。',
            level: '其他',
            venueName: '上海市普陀区大渡河路451号',
            translatorFile: 'shanghai-changfeng-park-571263'
          }]
        }
      }));
    }
  });

  assert.equal(requestedUrls.length, 1);
  assert.match(requestedUrls[0], /subjectId=1108/);
  assert.equal(result.items[0].category, '生态露营');
  assert.equal(result.items[0].sourceId, source.id);
  assert.equal(result.items[0].titleTag, '');
});

test('park activity category reads official website data instead of fallback preview data', () => {
  const apiSource = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/index.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.join(root, 'services/hotspot.js'), 'utf8');
  const fallbackSource = fs.readFileSync(path.join(root, 'services/fallback-data.js'), 'utf8');
  const parkBody = apiSource.slice(
    apiSource.indexOf('async function getParkActivityData'),
    apiSource.indexOf('async function getMapData')
  );

  assert.match(parkBody, /activitySync\.syncActivities/);
  assert.match(parkBody, /PARK_ACTIVITY_SOURCE_ID/);
  assert.match(parkBody, /limit:\s*payload\.limit\s*\|\|\s*60/);
  assert.match(parkBody, /fetchTimeout:\s*payload\.fetchTimeout\s*\|\|\s*10000/);
  assert.doesNotMatch(parkBody, /syncOfficialActivities/);
  assert.match(serviceSource, /getParkActivityData/);
  assert.match(fs.readFileSync(path.join(root, 'pages/bustle/bustle.js'), 'utf8'), /limit:\s*60/);
  assert.doesNotMatch(serviceSource, /asParkActivityData/);
  assert.doesNotMatch(fallbackSource, /preview-park-hydrangea|公园活动专区数据暂未刷新/);
});

test('heritage town category reads Meet in Shanghai data from home shortcut', () => {
  const apiSource = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/index.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.join(root, 'services/hotspot.js'), 'utf8');
  const homeJs = fs.readFileSync(path.join(root, 'pages/home/home.js'), 'utf8');
  const bustleJs = fs.readFileSync(path.join(root, 'pages/bustle/bustle.js'), 'utf8');
  const bustleWxml = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxml'), 'utf8');
  const heritageBody = apiSource.slice(
    apiSource.indexOf('async function getHeritageTownData'),
    apiSource.indexOf('async function getMapData')
  );

  assert.match(heritageBody, /activitySync\.syncActivities/);
  assert.match(heritageBody, /HERITAGE_TOWN_SOURCE_ID/);
  assert.match(heritageBody, /limit:\s*payload\.limit\s*\|\|\s*30/);
  assert.match(heritageBody, /fetchTimeout:\s*payload\.fetchTimeout\s*\|\|\s*10000/);
  assert.match(serviceSource, /getHeritageTownData/);
  assert.match(homeJs, /filterId:\s*'heritageTown'/);
  assert.match(bustleJs, /activeFilter === 'heritageTown'/);
  assert.match(bustleJs, /hotspotService\.getHeritageTownData/);
  assert.match(bustleWxml, /class="title-tag"/);
  assert.match(bustleWxml, /wx:if="\{\{item\.titleTag\}\}"/);
  assert.match(bustleWxml, /wx:if="\{\{item\.tags && item\.tags\.length && !item\.hideListTags\}\}"/);
});

test('scenic area and eco camping categories read their own Meet in Shanghai data sources', () => {
  const apiSource = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/index.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.join(root, 'services/hotspot.js'), 'utf8');
  const bustleJs = fs.readFileSync(path.join(root, 'pages/bustle/bustle.js'), 'utf8');

  assert.match(apiSource, /async function getScenicAreaData/);
  assert.match(apiSource, /SCENIC_AREA_SOURCE_ID/);
  assert.match(apiSource, /async function getEcoCampingData/);
  assert.match(apiSource, /ECO_CAMPING_SOURCE_ID/);
  assert.match(serviceSource, /getScenicAreaData/);
  assert.match(serviceSource, /getEcoCampingData/);
  assert.match(bustleJs, /hotspotService\.getScenicAreaData/);
  assert.match(bustleJs, /hotspotService\.getEcoCampingData/);
  assert.doesNotMatch(bustleJs, /\['cityWalk', 'scenicArea', 'ecoCamping'\]\.includes\(activeFilter\)/);
});

test('bustle filters reuse already loaded category cards without another request', () => {
  const bustleJs = fs.readFileSync(path.join(root, 'pages/bustle/bustle.js'), 'utf8');

  assert.match(bustleJs, /categoryCache:\s*\{\}/);
  assert.match(bustleJs, /getCachedCategoryCards\(activeFilter\)/);
  assert.match(bustleJs, /setCategoryCards\(activeFilter,\s*cards\)/);
  assert.match(bustleJs, /const cachedCards = this\.getCachedCategoryCards\(activeFilter\)/);
  assert.match(bustleJs, /if \(cachedCards\)\s*\{[\s\S]*visibleCards:\s*cachedCards[\s\S]*loading:\s*false[\s\S]*return;/);
});

test('bustle filter switching resets the page scroll position to the top', () => {
  const bustleJs = fs.readFileSync(path.join(root, 'pages/bustle/bustle.js'), 'utf8');

  assert.match(bustleJs, /selectFilter\(event\)[\s\S]*this\.activateFilter\(activeFilter,\s*\{\s*resetScroll:\s*true\s*\}\)/);
  assert.match(bustleJs, /resetListScroll\(\)/);
  assert.match(bustleJs, /wx\.pageScrollTo\(\{\s*scrollTop:\s*0,\s*duration:\s*0\s*\}\)/);
});

test('heritage town filter does not reuse city walk cards by keyword fallback', () => {
  const bustleJs = fs.readFileSync(path.join(root, 'pages/bustle/bustle.js'), 'utf8');
  const heritageBranch = bustleJs.slice(
    bustleJs.indexOf("if (activeFilter === 'heritageTown')"),
    bustleJs.indexOf("if (activeFilter === 'scenicArea')")
  );

  assert.match(heritageBranch, /card\.category === '非遗古镇'/);
  assert.match(heritageBranch, /card\.sourceId === 'source-meet-shanghai-heritage-town'/);
  assert.doesNotMatch(heritageBranch, /return\s*\/[^/]*老街/);
  assert.doesNotMatch(heritageBranch, /return\s*\/[^/]*heritage/);
});

test('city walk category reads Meet in Shanghai data from home shortcut', () => {
  const apiSource = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/index.js'), 'utf8');
  const serviceSource = fs.readFileSync(path.join(root, 'services/hotspot.js'), 'utf8');
  const homeJs = fs.readFileSync(path.join(root, 'pages/home/home.js'), 'utf8');
  const homeWxml = fs.readFileSync(path.join(root, 'pages/home/home.wxml'), 'utf8');
  const bustleJs = fs.readFileSync(path.join(root, 'pages/bustle/bustle.js'), 'utf8');
  const cityWalkBody = apiSource.slice(
    apiSource.indexOf('async function getCityWalkData'),
    apiSource.indexOf('async function getMapData')
  );

  assert.match(cityWalkBody, /activitySync\.syncActivities/);
  assert.match(cityWalkBody, /CITY_WALK_SOURCE_ID/);
  assert.match(cityWalkBody, /limit:\s*payload\.limit\s*\|\|\s*30/);
  assert.match(cityWalkBody, /fetchTimeout:\s*payload\.fetchTimeout\s*\|\|\s*10000/);
  assert.match(serviceSource, /getCityWalkData/);
  assert.match(`${homeWxml}\n${homeJs}`, /城市漫步/);
  assert.match(homeWxml, /bindtap="goQuickEntry"/);
  assert.match(homeWxml, /data-filter="\{\{item\.filterId\}\}"/);
  assert.match(homeJs, /filterId:\s*'cityWalk'/);
  assert.match(homeJs, /setStorageSync\('hotspot:targetFilter', filterId\)/);
  assert.match(bustleJs, /getStorageSync\('hotspot:targetFilter'\)/);
  assert.match(bustleJs, /removeStorageSync\('hotspot:targetFilter'\)/);
  assert.match(bustleJs, /loadCityWalkData/);
  assert.match(bustleJs, /hotspotService\.getCityWalkData/);
});

test('city walk cards expose source tags in the bustle list', () => {
  const bustleWxml = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxml'), 'utf8');
  const bustleWxss = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxss'), 'utf8');

  assert.match(bustleWxml, /class="tag-row"/);
  assert.match(bustleWxml, /wx:for="\{\{item\.tags\}\}"/);
  assert.match(bustleWxss, /\.tag-row/);
});

test('bustle cards open details from title only and keep descriptions for detail only', () => {
  const bustleWxml = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxml'), 'utf8');
  const syncSource = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/activity-sync.js'), 'utf8');

  assert.doesNotMatch(bustleWxml, /class="cover-wrap"[^>]*bindtap="openDetail"/);
  assert.match(bustleWxml, /class="item-title title-link"[^>]*catchtap="openDetail"/);
  assert.doesNotMatch(bustleWxml, /class="event-card card"[^>]*bindtap="openDetail"/);
  assert.doesNotMatch(bustleWxml, /<view class="item-desc">\{\{item\.description\}\}<\/view>/);
  assert.doesNotMatch(bustleWxml, /\{\{item\.displayTime\}\}/);
  assert.doesNotMatch(syncSource, /stripTags\(raw\.description \|\| '来自上海公开活动信息，详情以来源页面为准。'\)\.slice\(0,\s*96\)/);
});

test('bustle navigation icon opens the native map page directly without an app map tab', () => {
  const bustleJs = fs.readFileSync(path.join(root, 'pages/bustle/bustle.js'), 'utf8');
  const bustleWxml = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxml'), 'utf8');

  assert.match(bustleWxml, /class="map-icon-btn"[^>]*catchtap="navigateToMap"/);
  assert.match(bustleJs, /navigateToMap\(event\)/);
  assert.match(bustleJs, /resolveCardLocation/);
  assert.match(bustleJs, /wx\.request\(\{[\s\S]*apis\.map\.qq\.com\/ws\/geocoder\/v1/s);
  assert.match(bustleJs, /isDevtoolsRuntime/);
  assert.match(bustleJs, /getSystemInfoSync/);
  assert.match(bustleJs, /开发者工具不支持调起地图导航/);
  assert.match(bustleJs, /wx\.openLocation/);
  assert.doesNotMatch(bustleJs, /setStorageSync\('hotspot:navigationTarget'/);
  assert.doesNotMatch(bustleJs, /wx\.switchTab\(\{\s*url:\s*'\/pages\/map\/map'/s);
  assert.doesNotMatch(bustleJs, /navigateTo\(\{\s*url:\s*'\/pages\/map\/map'/s);
});

test('bustle navigation uses a compact map icon instead of a text button', () => {
  const bustleWxml = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxml'), 'utf8');
  const bustleWxss = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxss'), 'utf8');

  assert.doesNotMatch(bustleWxml, /导航到这里/);
  assert.doesNotMatch(bustleWxml, /primary-btn event-action/);
  assert.doesNotMatch(bustleWxml, /⌖ \{\{item\.displayPlace\}\}/);
  assert.doesNotMatch(bustleWxml, /class="place-pin"/);
  assert.doesNotMatch(bustleWxml, /class="place-pin-dot"/);
  assert.match(bustleWxml, /class="place-pin-icon"[^>]*src="\/assets\/icons\/location-pin-muted\.png"/);
  assert.match(bustleWxml, /class="place-name"\s*>\{\{item\.displayPlace\}\}/);
  assert.match(bustleWxml, /class="map-icon-btn"[^>]*catchtap="navigateToMap"/);
  assert.match(bustleWxml, /class="map-pin"/);
  assert.match(bustleWxml, /class="map-pin-dot"/);
  assert.doesNotMatch(bustleWxml, /<text class="map-icon">/);
  assert.match(bustleWxss, /\.meta-row\s*\{[^}]*align-items:\s*center;/s);
  assert.match(bustleWxss, /\.place-meta\s*\{[^}]*align-items:\s*center;/s);
  assert.match(bustleWxss, /\.place-meta\s*\{[^}]*line-height:\s*34rpx;/s);
  assert.match(bustleWxss, /\.place-name\s*\{[^}]*align-items:\s*center;/s);
  assert.match(bustleWxss, /\.place-pin-icon\s*\{[^}]*display:\s*block;/s);
  assert.match(bustleWxss, /\.place-pin-icon\s*\{[^}]*width:\s*30rpx;/s);
  assert.match(bustleWxss, /\.map-icon-btn/);
  assert.match(bustleWxss, /\.map-pin/);
  assert.match(bustleWxss, /\.map-pin-dot/);
});

test('city walk source is configured from Meet in Shanghai city-walk page', () => {
  const { SOURCE_CONFIGS } = require('../cloudfunctions/hotspotApi/source-configs.js');
  const source = SOURCE_CONFIGS.find((item) => item.id === 'source-meet-shanghai-city-walk');

  assert.equal(source.url, 'https://www1.meet-in-shanghai.net/cn/city-walk/');
  assert.equal(source.apiUrl, 'https://api1.meet-in-shanghai.net/api/place/public/page');
  assert.equal(source.parserType, 'cityWalkList');
  assert.equal(source.categoryHint, '城市漫步');
});

test('heritage town source is configured from Meet in Shanghai ancient town page', () => {
  const { SOURCE_CONFIGS } = require('../cloudfunctions/hotspotApi/source-configs.js');
  const source = SOURCE_CONFIGS.find((item) => item.id === 'source-meet-shanghai-heritage-town');

  assert.equal(source.url, 'https://www1.meet-in-shanghai.net/cn/intangible-cultural-heritage-ancient-town/');
  assert.equal(source.apiUrl, 'https://api1.meet-in-shanghai.net/api/place/public/page');
  assert.equal(source.parserType, 'cityWalkList');
  assert.equal(source.subjectParentId, '1037');
  assert.equal(source.subjectId, '1076');
  assert.equal(source.categoryHint, '非遗古镇');
  assert.equal(source.hideListTags, true);
});

test('activity sync normalizes and categorizes official activities', () => {
  const { dedupeActivities, normalizeActivity } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const officialSource = {
    id: 'source-shanghai-official',
    name: '上海国际服务门户',
    sourceType: 'official',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本市热门'
  };
  const districtActivity = normalizeActivity({
    title: 'Jiading district weekend cultural market',
    description: 'A relaxed public event in Jiading district for local residents.',
    sourceName: '上海国际服务门户',
    sourceUrl: 'https://english.shanghai.gov.cn/en-events1/jiading.html',
    categoryHint: '本市热门',
    image: 'https://english.shanghai.gov.cn/cmsres/jiading.jpg'
  }, 0, officialSource);
  const cityActivity = normalizeActivity({
    title: 'Sporting events, exhibitions & performances in May',
    description: 'Shanghai has exhibitions and performances across the city.',
    sourceName: '上海国际服务门户',
    sourceUrl: 'https://english.shanghai.gov.cn/en-EventsCalendar/may.html',
    categoryHint: '本市热门'
  }, 1, officialSource);
  const nearActivity = normalizeActivity({
    title: '社区公园露天电影',
    description: '附近社区今晚开放，不用报名。',
    sourceName: '上海市文化和旅游局',
    sourceUrl: 'https://whlyj.sh.gov.cn/movie.html',
    categoryHint: '本市热门'
  }, 2, officialSource);

  assert.match(districtActivity.id, /^remote-/);
  assert.equal(districtActivity.category, '本区热门');
  assert.equal(districtActivity.district, '嘉定');
  assert.equal(districtActivity.sourceName, '上海国际服务门户');
  assert.ok(districtActivity.tags.includes('可信来源'));
  assert.equal(cityActivity.category, '本市热门');
  assert.equal(nearActivity.category, '附近热门');
  assert.equal(nearActivity.noSignup, true);
  assert.deepEqual(dedupeActivities([districtActivity, districtActivity]), [districtActivity]);
});

test('activity sync preserves raw source metadata when normalizing without source argument', () => {
  const { normalizeActivity } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const activity = normalizeActivity({
    title: '浦东社区公益市集活动',
    description: '免费市集，不用报名。',
    sourceId: 'source-pudong-community',
    sourceName: '浦东社区文化活动',
    sourceType: 'community',
    trustLevel: 'whitelist',
    district: '浦东',
    categoryHint: '本区热门'
  }, 0);

  assert.equal(activity.sourceId, 'source-pudong-community');
  assert.equal(activity.sourceName, '浦东社区文化活动');
  assert.equal(activity.sourceType, 'community');
  assert.equal(activity.trustLevel, 'whitelist');
  assert.equal(activity.status, 'published');
  assert.equal(activity.district, '浦东');
  assert.equal(activity.category, '本区热门');
  assert.ok(activity.tags.includes('可信来源'));
});

test('activity sync dedupes activities by dedupe key before fallback fields', () => {
  const { dedupeActivities } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const first = {
    id: 'remote-first',
    title: '社区活动 A',
    dedupeKey: 'text:same'
  };
  const second = {
    id: 'remote-second',
    title: '社区活动 B',
    dedupeKey: 'text:same'
  };
  const third = {
    id: 'remote-third',
    title: '社区活动 C',
    dedupeKey: 'text:other'
  };

  assert.deepEqual(dedupeActivities([first, second, third]), [first, third]);
});

test('activity sync can limit source count for quick cloud warm-up', async () => {
  const { syncActivities } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const calls = [];
  const result = await syncActivities({
    sources: [
      { name: 'source-a', url: 'https://example.com/a', categoryHint: '本市热门' },
      { name: 'source-b', url: 'https://example.com/b', categoryHint: '本市热门' }
    ],
    sourceLimit: 1,
    limit: 2,
    fetchTimeout: 1800,
    fetcher(url, options) {
      calls.push({ url, timeout: options.timeout });
      return Promise.resolve(`
        <li>
          <a href="/event.html" title="Free exhibition in Shanghai">
            <p class="detail">A free public exhibition in Shanghai.</p>
          </a>
        </li>`);
    }
  });

  assert.deepEqual(calls, [{ url: 'https://example.com/a', timeout: 1800 }]);
  assert.equal(result.synced, 1);
  assert.equal(result.items[0].category, '本市热门');
});

test('activity sync filters sources and assigns review status from source trust', async () => {
  const { syncActivities } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const written = [];
  const sources = [
    {
      id: 'source-official',
      name: '徐汇文化馆',
      district: '徐汇',
      sourceType: 'official',
      url: 'https://example.com/xuhui',
      categoryHint: '本区热门',
      trustLevel: 'whitelist',
      status: 'active'
    },
    {
      id: 'source-venue',
      name: '民营剧场',
      district: '黄浦',
      sourceType: 'venue',
      url: 'https://example.com/venue',
      categoryHint: '本区热门',
      trustLevel: 'review',
      status: 'active'
    }
  ];

  const result = await syncActivities({
    sources,
    sourceIds: ['source-venue'],
    fetcher(url) {
      return Promise.resolve(`
        <li>
          <a href="/show.html" title="黄浦社区周末音乐活动">
            <p class="detail">民营剧场开放日，需查看详情。</p>
          </a>
        </li>`);
    },
    writeActivity(activity) {
      written.push(activity);
      return Promise.resolve();
    }
  });

  assert.equal(result.synced, 1);
  assert.equal(result.sources.length, 1);
  assert.equal(result.sources[0].sourceId, 'source-venue');
  assert.equal(written[0].sourceId, 'source-venue');
  assert.equal(written[0].sourceType, 'venue');
  assert.equal(written[0].trustLevel, 'review');
  assert.equal(written[0].status, 'pending');
  assert.match(written[0].dedupeKey, /^url:/);
  assert.equal(written[0].rawTitle, '黄浦社区周末音乐活动');
  assert.equal(written[0].district, '黄浦');
});

test('activity sync publishes whitelist source items and reports counters', async () => {
  const { syncActivities } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const result = await syncActivities({
    sources: [
      {
        id: 'source-official',
        name: '浦东文化活动',
        district: '浦东',
        sourceType: 'community',
        url: 'https://example.com/pudong',
        categoryHint: '本区热门',
        trustLevel: 'whitelist',
        status: 'active'
      }
    ],
    fetcher() {
      return Promise.resolve(`
        <li>
          <a href="/market.html" title="浦东社区公益市集活动">
            <p class="detail">免费市集，不用报名。</p>
          </a>
        </li>`);
    }
  });

  assert.equal(result.synced, 1);
  assert.equal(result.publishedCount, 1);
  assert.equal(result.pendingCount, 0);
  assert.equal(result.errorCount, 0);
  assert.equal(result.items[0].status, 'published');
  assert.equal(result.items[0].sourceId, 'source-official');
  assert.equal(result.items[0].place, '上海 · 浦东');
});

test('activity sync keeps fetched items when database writes fail', async () => {
  const { syncActivities } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const result = await syncActivities({
    sources: [
      { name: 'source-a', url: 'https://example.com/a', categoryHint: '本市热门' }
    ],
    fetcher() {
      return Promise.resolve(`
        <li>
          <a href="/event.html" title="Free gallery exhibition in Shanghai">
            <p class="detail">A free public exhibition in Shanghai.</p>
          </a>
        </li>`);
    },
    writeActivity() {
      throw new Error('collection not found');
    }
  });

  assert.equal(result.synced, 1);
  assert.equal(result.items.length, 1);
  assert.equal(result.writeErrors.length, 1);
  assert.match(result.writeErrors[0].message, /collection not found/);
});

test('bustle page shows an in-page loading state while city hot data loads', () => {
  const js = fs.readFileSync(path.join(root, 'pages/bustle/bustle.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxml'), 'utf8');
  const wxss = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxss'), 'utf8');

  assert.match(js, /loading:\s*true/);
  assert.match(js, /loading:\s*false/);
  assert.match(wxml, /wx:if="\{\{loading\}\}"/);
  assert.match(wxml, /正在加载\{\{activeFilterLabel\}\}/);
  assert.doesNotMatch(wxml, /正在整理附近值得看的活动/);
  assert.match(wxml, /class="loading-spinner"/);
  assert.match(wxss, /\.loading-card/);
  assert.match(wxss, /@keyframes\s+spin/);
  assert.match(wxml, /map-icon-btn/);
  assert.doesNotMatch(wxml, /导航到这里/);
  assert.doesNotMatch(wxml, /现在去看看/);
});

test('bustle brand and filter tabs stay fixed together at the top while the list scrolls', () => {
  const wxml = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxml'), 'utf8');
  const wxss = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxss'), 'utf8');

  assert.match(wxml, /class="bustle-fixed-header"[\s\S]*class="brand-bar"[\s\S]*class="filter-scroll"/);
  assert.match(wxss, /\.bustle-fixed-header\s*\{[^}]*position:\s*fixed;/s);
  assert.match(wxss, /\.bustle-fixed-header\s*\{[^}]*top:\s*0;/s);
  assert.match(wxss, /\.bustle-fixed-header\s*\{[^}]*z-index:\s*30;/s);
  assert.match(wxss, /\.bustle-fixed-header\s*\{[^}]*background:\s*#f3faf8;/s);
  assert.match(wxss, /\.filter-scroll\s*\{[^}]*background:\s*#f3faf8;/s);
  assert.match(wxss, /\.bustle-page\s*\{[^}]*padding-top:\s*248rpx;/s);
  assert.match(wxss, /\.event-list\s*\{[^}]*margin-top:\s*12rpx;/s);
  assert.match(wxss, /\.loading-card\s*\{[^}]*margin-top:\s*12rpx;/s);
});

test('bustle detail link opens the selected card detail page', () => {
  const js = fs.readFileSync(path.join(root, 'pages/bustle/bustle.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxml'), 'utf8');
  const wxss = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxss'), 'utf8');

  assert.match(wxml, /class="item-title title-link"[^>]*catchtap="openDetail"/);
  assert.doesNotMatch(wxml, /查看详情/);
  assert.doesNotMatch(wxml, /detail-link/);
  assert.match(wxss, /\.title-link/);
  assert.doesNotMatch(wxss, /\.detail-link/);
  assert.match(js, /setStorageSync\(\s*'hotspot:selectedDetail'/);
  assert.match(js, /cards\.find\(\(card\) => card\.id === id\)/);
  assert.match(js, /\/pages\/detail\/detail\?type=\$\{type\}&id=\$\{id\}/);
});

test('detail page renders the source article content without local helper modules', () => {
  const js = fs.readFileSync(path.join(root, 'pages/detail/detail.js'), 'utf8');
  const wxml = fs.readFileSync(path.join(root, 'pages/detail/detail.wxml'), 'utf8');
  const wxss = fs.readFileSync(path.join(root, 'pages/detail/detail.wxss'), 'utf8');

  assert.match(js, /readSelectedDetail\(type,\s*id\)/);
  assert.match(js, /getStorageSync\(\s*'hotspot:selectedDetail'/);
  assert.match(js, /if \(snapshot\)/);
  assert.match(wxml, /class="detail-image"/);
  assert.match(wxml, /src="\{\{detail\.image\}\}"/);
  assert.match(wxml, /class="detail-image"[\s\S]*detail-loading-card[\s\S]*class="article-fallback"/);
  assert.match(wxml, /rich-text/);
  assert.match(wxml, /detail\.contentNodes/);
  assert.match(wxml, /loading && \(!detail\.contentNodes \|\| !detail\.contentNodes\.length\)/);
  assert.match(js, /hasArticleContent\(snapshot\)/);
  assert.match(js, /loading:\s*!hasArticleContent\(snapshot\)/);
  assert.doesNotMatch(wxml, /\{\{title\}\}|rawDateText|timeLabel/);
  assert.doesNotMatch(wxml, /tag-row|detail\.tags|一眼信息|为什么不尴尬|来源信息/);
  assert.doesNotMatch(wxss, /\.info-grid|\.info-item|\.source-card|\.stop|\.rule/);
  assert.match(wxss, /\.article-card/);
  assert.match(wxss, /\.detail-image/);
  assert.match(wxss, /\.detail-loading-card/);
});

test('home page follows the discovery portal design', () => {
  const wxml = fs.readFileSync(path.join(root, 'pages/home/home.wxml'), 'utf8');
  const wxss = fs.readFileSync(path.join(root, 'pages/home/home.wxss'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'pages/home/home.js'), 'utf8');

  assert.match(wxml, /class="top-nav"/);
  assert.match(wxml, /class="city-selector"/);
  assert.match(wxml, /class="search-box"/);
  assert.match(wxml, /placeholder="搜索地点、关键词、活动"/);
  assert.match(wxml, /class="message-btn"/);
  assert.match(wxml, /class="hero-swiper"/);
  assert.match(wxml, /class="quick-entry-row"/);
  const homeSources = `${wxml}\n${js}`;
  ['公园活动', '城市漫步', '非遗古镇', 'A级景区', '生态露营'].forEach((label) => {
    assert.match(homeSources, new RegExp(label));
  });
  ['自然公园', '逛吃美食', '文化场馆', '运动休闲'].forEach((label) => {
    assert.doesNotMatch(homeSources, new RegExp(label));
  });
  assert.match(wxml, /wx:for="\{\{quickEntries\}\}"/);
  assert.match(wxml, /data-filter="\{\{item\.filterId\}\}"/);
  assert.match(wxml, /bindtap="goQuickEntry"/);
  assert.match(js, /filterId:\s*'parkActivities'/);
  assert.match(js, /label:\s*'城市漫步'[\s\S]*imageIcon:\s*'\/assets\/icons\/city-walk\.png'/);
  assert.match(js, /filterId:\s*'heritageTown'/);
  assert.match(js, /filterId:\s*'scenicArea'/);
  assert.match(js, /filterId:\s*'ecoCamping'/);
  assert.match(js, /setStorageSync\('hotspot:targetFilter', filterId\)/);
  assert.match(wxml, /class="quick-icon-image"/);
  assert.match(wxss, /\.quick-icon-image/);
  assert.match(wxml, /附近好去处/);
  assert.match(wxml, /本周人气逛点/);
  assert.match(wxml, /懒人游玩方案/);
  assert.match(wxml, /查看更多/);
  assert.match(js, /banners:/);
  assert.match(js, /quickEntries:/);
  assert.match(js, /nearbyMoments/);
  assert.match(js, /popularMoments/);
  assert.match(js, /routePlans/);
  assert.match(js, /goSearch/);
  assert.doesNotMatch(wxml, /class="clock-card"/);
  assert.doesNotMatch(wxml, /current(?:Date|Weekday|Time)/);
  assert.doesNotMatch(wxml, /每日温柔提醒|今天也要\s*对自己好一点|发现生活中的小确幸/);
  assert.doesNotMatch(wxss, /\.clock-|\.daily-card|\.hot-card/);
  assert.match(wxss, /\.portal-section/);
});

test('home hero does not render a top time module', () => {
  const wxml = fs.readFileSync(path.join(root, 'pages/home/home.wxml'), 'utf8');
  const js = fs.readFileSync(path.join(root, 'pages/home/home.js'), 'utf8');

  assert.doesNotMatch(wxml, /clock-(?:card|time|date|top|caption)/);
  assert.doesNotMatch(js, /formatHomeClock|updateClock|startClock|stopClock|clockTimer/);
});

test('new visual system uses mint and deep green surfaces', () => {
  const appWxss = fs.readFileSync(path.join(root, 'app.wxss'), 'utf8');
  const homeWxss = fs.readFileSync(path.join(root, 'pages/home/home.wxss'), 'utf8');
  const bustleWxss = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxss'), 'utf8');
  const mineWxss = fs.readFileSync(path.join(root, 'pages/mine/mine.wxss'), 'utf8');

  assert.match(appWxss, /background:\s*#f3faf8;/);
  assert.match(appWxss, /\.primary-btn\s*\{[^}]*background:\s*#007968;/s);
  assert.match(appWxss, /\.card\s*\{[^}]*background:\s*#ffffff;/s);
  assert.match(homeWxss, /#8fe5d0/);
  assert.match(bustleWxss, /\.event-cover/);
  assert.match(mineWxss, /\.preference-card/);
});

test('visible app copy follows hotspot discovery direction', () => {
  const visibleFiles = [
    'app.json',
    'cloudfunctions/hotspotApi/seed-data.js',
    'pages/home/home.wxml',
    'pages/bustle/bustle.js',
    'pages/bustle/bustle.wxml',
    'pages/group/group.json',
    'pages/group/group.wxml',
    'pages/detail/detail.wxml',
    'pages/mine/mine.wxml'
  ];
  const text = visibleFiles
    .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
    .join('\n');

  ['匹配搭子', '发布凑局', '一键散局', '散局', '匿名结伴', '现成可以加入', '等 1 人', '等 2 人'].forEach((phrase) => {
    assert.equal(text.includes(phrase), false, `visible copy should not include ${phrase}`);
  });
  assert.match(text, /附近好去处/);
  assert.match(text, /本周人气逛点/);
  assert.match(text, /懒人游玩方案/);
  assert.match(text, /公园活动/);
  assert.match(text, /城市漫步/);
  assert.match(text, /非遗古镇/);
  assert.match(text, /A级景区/);
  assert.match(text, /生态露营/);
  assert.match(text, /只看免费/);
  assert.match(text, /安静路过友好/);
});

test('recommendation flow is not exposed as a top-level reason tab', () => {
  const app = readJson('app.json');
  const groupJson = readJson('pages/group/group.json');
  const homeJs = fs.readFileSync(path.join(root, 'pages/home/home.js'), 'utf8');
  const visibleCopy = [
    'app.json',
    'pages/home/home.wxml',
    'pages/group/group.json',
    'pages/group/group.wxml'
  ].map((file) => fs.readFileSync(path.join(root, file), 'utf8')).join('\n');

  assert.equal(app.tabBar.list.some((item) => item.pagePath === 'pages/group/group'), false);
  assert.equal(app.tabBar.list.some((item) => item.text === '理由'), false);
  assert.equal(groupJson.navigationBarTitleText, '推荐');
  assert.match(homeJs, /wx\.navigateTo\(\{\s*url:\s*'\/pages\/group\/group'/s);
  assert.doesNotMatch(homeJs, /wx\.switchTab\(\{\s*url:\s*'\/pages\/group\/group'/s);
  assert.doesNotMatch(visibleCopy, /理由/);
});

test('browse filters and mine page expose low-pressure discovery controls', () => {
  const bustleJs = fs.readFileSync(path.join(root, 'pages/bustle/bustle.js'), 'utf8');
  const mineWxml = fs.readFileSync(path.join(root, 'pages/mine/mine.wxml'), 'utf8');
  const seed = require('../cloudfunctions/hotspotApi/seed-data.js');

  assert.match(bustleJs, /const filters = \[\s*\{\s*id: 'parkActivities', label: '公园活动' \},\s*\{\s*id: 'cityWalk', label: '城市漫步' \},\s*\{\s*id: 'heritageTown', label: '非遗古镇' \},\s*\{\s*id: 'scenicArea', label: 'A级景区' \},\s*\{\s*id: 'ecoCamping', label: '生态露营' \}/);
  assert.match(bustleJs, /activeFilter === 'cityWalk'/);
  assert.match(bustleJs, /activeFilter === 'heritageTown'/);
  assert.match(bustleJs, /activeFilter === 'scenicArea'/);
  assert.match(bustleJs, /activeFilter === 'ecoCamping'/);
  assert.match(bustleJs, /activeFilter:\s*'parkActivities'/);
  assert.match(bustleJs, /activeFilterLabel:\s*'公园活动'/);
  assert.match(bustleJs, /onLoad\(\)\s*\{[\s\S]*this\.activateFilter\(pendingFilter \|\| this\.data\.activeFilter\)/);
  ['公园活动', '城市漫步', '非遗古镇', 'A级景区', '生态露营'].forEach((label) => {
    assert.match(bustleJs, new RegExp(label));
  });
  ['免费', '步行 10 分钟内', '现在开始', '不用报名', '路过看看', '安静友好'].forEach((label) => {
    assert.doesNotMatch(bustleJs, new RegExp(label));
  });
  ['只看免费', '步行范围', '不用报名优先', '安静路过友好', '极简出门清单'].forEach((label) => {
    assert.match(mineWxml, new RegExp(label));
  });
  seed.moments.forEach((moment) => {
    assert.doesNotMatch(moment.image || '', /studio\.png/);
    if (moment.free) {
      assert.equal(moment.priceLabel, '免费参加', `${moment.title} should not show a paid price`);
    }
  });
});

test('tab pages include simple visible empty states', () => {
  const bustleWxml = fs.readFileSync(path.join(root, 'pages/bustle/bustle.wxml'), 'utf8');

  assert.match(bustleWxml, /附近暂时没有符合条件的小热闹/);
  assert.match(bustleWxml, /先换个筛选/);
});
