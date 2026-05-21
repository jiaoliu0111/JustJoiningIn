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

test('app config registers detail page and four tabs', () => {
  const app = readJson('app.json');
  assert.deepEqual(app.pages, [
    'pages/home/home',
    'pages/bustle/bustle',
    'pages/map/map',
    'pages/group/group',
    'pages/mine/mine',
    'pages/detail/detail'
  ]);
  assert.equal(app.tabBar.list.length, 4);
  assert.deepEqual(
    app.tabBar.list.map((item) => item.text),
    ['首页', '热闹', '地图', '我的']
  );
});

test('tab bar uses matching local png icons for every tab', () => {
  const app = readJson('app.json');
  const expectedIconNames = ['house', 'bustle', 'map', 'mine'];

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
  ['home', 'bustle', 'map', 'group', 'mine', 'detail'].forEach((page) => {
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
    'lowPressureNote'
  ].forEach((key) => assert.ok(Object.hasOwn(moment, key), `moment.${key}`));

  assert.equal(seed.preferences.walkMinutes, 10);
  assert.equal(seed.preferences.freeOnly, true);
  assert.ok(seed.checklist.includes('穿舒服的鞋'));
});

test('detail helper exposes static display formatters only', () => {
  const { detailTitle, joinTags } = require('../utils/format.js');

  assert.equal(detailTitle('moment'), '附近小热闹');
  assert.equal(detailTitle('reason'), '出门理由');
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
    'pages/map/map.js',
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
  ['getHomeData', 'getBrowseData', 'getMapData', 'getReasonsData', 'getMineData', 'savePreferences', 'getDetail'].forEach((method) => {
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

test('hotspot cloud function exposes data actions for pages', () => {
  const source = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/index.js'), 'utf8');
  const config = readJson('cloudfunctions/hotspotApi/config.json');

  ['ping', 'debugDatabase', 'getHomeData', 'getBrowseData', 'getMapData', 'getReasonsData', 'getMineData', 'savePreferences', 'getDetail', 'initData', 'syncActivities'].forEach((action) => {
    assert.match(source, new RegExp(action), `${action} should be handled by hotspotApi`);
  });
  assert.match(source, /activity-sync\.js/);
  assert.doesNotMatch(source, /listCollection\(collections\.(moments|reasons|routes),\s*seed\./);
  assert.doesNotMatch(source, /findByPublicId\(collections\.(moments|reasons|routes),[^)]*\)\s*\|\|\s*seed\./);
  assert.match(source, /wx-server-sdk/);
  assert.match(source, /hotspot_moments/);
  assert.match(source, /hotspot_reasons/);
  assert.match(source, /hotspot_routes/);
  assert.ok(config.timeout >= 20, 'cloud function timeout should allow cold starts and activity sync');
});

test('activity source configs cover Shanghai district and review sources', () => {
  const { SOURCE_CONFIGS, normalizeSourceConfig } = require('../cloudfunctions/hotspotApi/source-configs.js');

  assert.ok(SOURCE_CONFIGS.length >= 6);
  assert.ok(SOURCE_CONFIGS.some((source) => source.district === '浦东'));
  assert.ok(SOURCE_CONFIGS.some((source) => source.district === '徐汇'));
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

test('activity sync normalizes and categorizes official activities', () => {
  const { dedupeActivities, normalizeActivity } = require('../cloudfunctions/hotspotApi/activity-sync.js');
  const districtActivity = normalizeActivity({
    title: 'Jiading district weekend cultural market',
    description: 'A relaxed public event in Jiading district for local residents.',
    sourceName: '上海国际服务门户',
    sourceUrl: 'https://english.shanghai.gov.cn/en-events1/jiading.html',
    categoryHint: '本市热门',
    image: 'https://english.shanghai.gov.cn/cmsres/jiading.jpg'
  }, 0);
  const cityActivity = normalizeActivity({
    title: 'Sporting events, exhibitions & performances in May',
    description: 'Shanghai has exhibitions and performances across the city.',
    sourceName: '上海国际服务门户',
    sourceUrl: 'https://english.shanghai.gov.cn/en-EventsCalendar/may.html',
    categoryHint: '本市热门'
  }, 1);
  const nearActivity = normalizeActivity({
    title: '社区公园露天电影',
    description: '附近社区今晚开放，不用报名。',
    sourceName: '上海市文化和旅游局',
    sourceUrl: 'https://whlyj.sh.gov.cn/movie.html',
    categoryHint: '本市热门'
  }, 2);

  assert.match(districtActivity.id, /^remote-/);
  assert.equal(districtActivity.category, '本区热门');
  assert.equal(districtActivity.district, '嘉定');
  assert.equal(districtActivity.sourceName, '上海国际服务门户');
  assert.ok(districtActivity.tags.includes('官方来源'));
  assert.equal(cityActivity.category, '本市热门');
  assert.equal(nearActivity.category, '附近热门');
  assert.equal(nearActivity.noSignup, true);
  assert.deepEqual(dedupeActivities([districtActivity, districtActivity]), [districtActivity]);
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
  assert.match(wxml, /class="loading-spinner"/);
  assert.match(wxss, /\.loading-card/);
  assert.match(wxss, /@keyframes\s+spin/);
});

test('home page follows the new daily check-in design', () => {
  const wxml = fs.readFileSync(path.join(root, 'pages/home/home.wxml'), 'utf8');
  const wxss = fs.readFileSync(path.join(root, 'pages/home/home.wxss'), 'utf8');

  assert.match(wxml, /class="brand-bar"/);
  assert.match(wxml, /class="clock-card"/);
  assert.match(wxml, /今天也要\s*对自己好一点/);
  assert.match(wxml, /本市热门/);
  assert.match(wxml, /发现生活中的小确幸/);
  assert.match(wxss, /\.clock-card\s*\{[^}]*width:\s*100%;/s);
  assert.match(wxss, /\.clock-card\s*\{[^}]*text-align:\s*center;/s);
  assert.match(wxss, /\.clock-top\s*\{[^}]*justify-content:\s*center;/s);
  assert.match(wxss, /\.clock-time\s*\{[^}]*font-size:\s*92rpx;/s);
  assert.match(wxss, /\.hot-card\s*\{[^}]*background:\s*#8fe5d0;/s);
  assert.match(wxss, /\.hot-card\s*\{[^}]*padding:\s*44rpx 32rpx;/s);
  assert.match(wxss, /\.hot-card\s*\{[^}]*margin-top:\s*58rpx;/s);
  assert.match(wxml, /class="hot-icon-core"/);
});

test('home clock formats date, weekday, and time for the hero', () => {
  const { formatHomeClock } = require('../utils/time.js');
  const clock = formatHomeClock(new Date('2026-05-20T15:11:00+08:00'));

  assert.equal(clock.currentDate, '05月20日');
  assert.equal(clock.currentWeekday, '周三');
  assert.equal(clock.currentTime, '15:11');
});

test('home hero keeps month-day next to the time text', () => {
  const wxml = fs.readFileSync(path.join(root, 'pages/home/home.wxml'), 'utf8');

  assert.equal(/currentDate/.test(wxml), true);
  assert.match(wxml, /class="clock-time"[^>]*>\{\{currentTime\}\}/);
  assert.match(wxml, /class="clock-date"[^>]*>\{\{currentDate\}\}/);
  assert.equal(/hero-calendar/.test(wxml), false);
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
  assert.match(mineWxss, /\.profile-illustration/);
});

test('visible app copy follows hotspot discovery direction', () => {
  const visibleFiles = [
    'app.json',
    'cloudfunctions/hotspotApi/seed-data.js',
    'pages/home/home.wxml',
    'pages/bustle/bustle.wxml',
    'pages/map/map.wxml',
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
  assert.match(text, /今天也要\s*对自己好一点/);
  assert.match(text, /本市热门/);
  assert.match(text, /本区热门/);
  assert.match(text, /地图/);
  assert.match(text, /我的收藏/);
});
