# Shanghai Activity Collector Backend Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the V1 WeChat Cloud backend that collects Shanghai district/community activity sources, stores trusted items as published, stores review sources as pending, and lets the mini program read only publishable activities.

**Architecture:** Keep the existing `hotspotApi` cloud function as the single API boundary. Add a focused source configuration module, upgrade `activity-sync.js` to normalize source metadata and review state, and extend `index.js` with cloud database collections, published filtering, source initialization, sync logs, and review helpers.

**Tech Stack:** Native WeChat Mini Program, `wx-server-sdk`, Node.js CommonJS modules, Node built-in `node:test`, existing cloud database collections.

---

## File Structure

- Create `cloudfunctions/hotspotApi/source-configs.js`: built-in source definitions and source normalization helpers.
- Modify `cloudfunctions/hotspotApi/activity-sync.js`: source filtering, parser routing, richer normalization, dedupe keys, review status, sync counters.
- Modify `cloudfunctions/hotspotApi/index.js`: new collections, published filtering, source/log upserts, `initSources`, `listPendingActivities`, `updateActivityStatus`.
- Modify `tests/mini-program.test.js`: behavior tests for source config, sync metadata, review state, published filtering, and new cloud actions.
- Modify `docs/cloud-backend.md`: deployment and operations notes for source initialization, manual review, and timed sync.

Do not modify page UI files in this implementation. The mini program should benefit through existing service calls.

---

### Task 1: Add Source Configuration Module

**Files:**
- Create: `cloudfunctions/hotspotApi/source-configs.js`
- Modify: `tests/mini-program.test.js`

- [ ] **Step 1: Write the failing test**

Append this test near the activity sync tests in `tests/mini-program.test.js`:

```js
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
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/mini-program.test.js
```

Expected: FAIL with `Cannot find module '../cloudfunctions/hotspotApi/source-configs.js'`.

- [ ] **Step 3: Create the source config module**

Create `cloudfunctions/hotspotApi/source-configs.js`:

```js
const SOURCE_CONFIGS = [
  {
    id: 'source-shanghai-events-calendar',
    name: '上海国际服务门户活动日历',
    district: '',
    sourceType: 'official',
    url: 'https://english.shanghai.gov.cn/en-EventsCalendar/index.html',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本市热门',
    notes: '上海市级官方活动日历，保留作为全市补充来源。'
  },
  {
    id: 'source-shanghai-culture-tourism',
    name: '上海市文化和旅游局',
    district: '',
    sourceType: 'official',
    url: 'https://whlyj.sh.gov.cn/',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本市热门',
    notes: '市级文旅公开信息，补充全市活动。'
  },
  {
    id: 'source-shanghai-public-culture',
    name: '上海市公共文化配送',
    district: '',
    sourceType: 'official',
    url: 'https://www.shwhgj.org.cn/',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本区热门',
    notes: '公共文化配送平台，常见区级活动预告。'
  },
  {
    id: 'source-shanghai-mass-art',
    name: '上海市群众艺术馆',
    district: '徐汇',
    sourceType: 'official',
    url: 'https://www.shqyg.com/',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本区热门',
    notes: '徐汇区公共文化场馆，可补充市民艺术活动。'
  },
  {
    id: 'source-jingan-government',
    name: '上海静安区人民政府',
    district: '静安',
    sourceType: 'official',
    url: 'https://www.jingan.gov.cn/',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本区热门',
    notes: '静安区门户信息，先用通用列表解析。'
  },
  {
    id: 'source-pudong-community-culture',
    name: '浦东社区文化活动',
    district: '浦东',
    sourceType: 'community',
    url: 'https://www.pudong.gov.cn/',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本区热门',
    notes: '浦东区公开门户，后续可替换为更精确的社区文化入口。'
  },
  {
    id: 'source-jingan-pengpu-culture-center',
    name: '彭浦镇社区文化活动中心',
    district: '静安',
    sourceType: 'community',
    url: 'https://www.shggwh.com/Home-1247.html',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '附近热门',
    notes: '社区文化活动中心公开页面。'
  },
  {
    id: 'source-private-venue-review',
    name: '私营场馆活动入口',
    district: '',
    sourceType: 'venue',
    url: 'https://www.douban.com/location/shanghai/events/future-all',
    parserType: 'genericList',
    trustLevel: 'review',
    status: 'paused',
    categoryHint: '本市热门',
    notes: '私营/平台类内容默认待审核，首版暂停，确认合规后启用。'
  }
];

function normalizeSourceConfig(source = {}) {
  return {
    id: source.id || '',
    name: source.name || '',
    district: source.district || '',
    sourceType: source.sourceType || (source.district ? 'community' : 'official'),
    url: source.url || '',
    parserType: source.parserType || 'genericList',
    trustLevel: source.trustLevel || 'review',
    status: source.status || 'active',
    categoryHint: source.categoryHint || (source.district ? '本区热门' : '本市热门'),
    notes: source.notes || ''
  };
}

module.exports = {
  SOURCE_CONFIGS: SOURCE_CONFIGS.map(normalizeSourceConfig),
  normalizeSourceConfig
};
```

- [ ] **Step 4: Run test to verify it passes**

Run:

```bash
node --test tests/mini-program.test.js
```

Expected: PASS for the new test. Existing unrelated tests may fail only if the current dirty worktree already has conflicting page expectations; record those failures before continuing.

- [ ] **Step 5: Commit**

Stage only the files from this task:

```bash
git add cloudfunctions/hotspotApi/source-configs.js tests/mini-program.test.js
git commit -m "Add activity source configs"
```

---

### Task 2: Upgrade Activity Sync Normalization

**Files:**
- Modify: `cloudfunctions/hotspotApi/activity-sync.js`
- Modify: `tests/mini-program.test.js`

- [ ] **Step 1: Write the failing tests**

Append these tests near the existing `activity sync can limit source count` test:

```js
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
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/mini-program.test.js
```

Expected: FAIL because `sourceIds`, `status`, `sourceId`, `dedupeKey`, and sync counters are not implemented.

- [ ] **Step 3: Modify `activity-sync.js` imports and source defaults**

At the top of `cloudfunctions/hotspotApi/activity-sync.js`, replace the inline `SOURCE_CONFIGS` declaration with:

```js
const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { SOURCE_CONFIGS, normalizeSourceConfig } = require('./source-configs.js');
```

Remove the old inline `SOURCE_CONFIGS` array from this file.

- [ ] **Step 4: Add dedupe and source selection helpers**

Add these helpers before `normalizeActivity`:

```js
function normalizeForKey(value = '') {
  return stripTags(value).toLowerCase().replace(/\s+/g, '');
}

function createDedupeKey(raw, district) {
  if (raw.sourceUrl) {
    return `url:${hashId(raw.sourceUrl)}`;
  }
  const title = normalizeForKey(raw.title);
  const date = normalizeForKey(raw.rawDateText || raw.timeLabel || '');
  const place = normalizeForKey(raw.place || district || '');
  return `text:${hashId(`${title}|${date}|${place}`)}`;
}

function statusForSource(source) {
  return source.trustLevel === 'whitelist' ? 'published' : 'pending';
}

function selectSources(sources, sourceIds, sourceLimit) {
  const selectedIds = Array.isArray(sourceIds) && sourceIds.length > 0
    ? new Set(sourceIds)
    : null;
  return sources
    .map(normalizeSourceConfig)
    .filter((source) => source.status === 'active')
    .filter((source) => !selectedIds || selectedIds.has(source.id))
    .slice(0, sourceLimit);
}
```

- [ ] **Step 5: Replace `normalizeActivity` with the richer version**

Replace the existing `normalizeActivity` function with:

```js
function normalizeActivity(raw, index = 0, source = {}) {
  const normalizedSource = normalizeSourceConfig(source);
  const title = stripTags(raw.title || '').slice(0, 36);
  const description = stripTags(raw.description || '来自上海公开活动信息，详情以来源页面为准。').slice(0, 96);
  const district = raw.district || normalizedSource.district || findDistrict(`${title} ${description}`);
  const text = `${title} ${description} ${district}`;
  const category = inferCategory({
    ...raw,
    categoryHint: raw.categoryHint || normalizedSource.categoryHint
  }, district);
  const quietFriendly = /(展|艺术|gallery|museum|exhibition|公园|花园|阅读|文化)/i.test(text);
  const free = /(免费|free|open to all|公益)/i.test(text);
  const noSignup = /(不用报名|无需报名|无需预约|免预约|no registration|required no registration|walk.?in)/i.test(text)
    || !/(报名|预约|register|registration|reservation|booking)/i.test(text);
  const walkMinutes = category === '附近热门' ? 8 : category === '本区热门' ? 14 : 18;
  const sourceName = raw.sourceName || normalizedSource.name || '';
  const sourceUrl = raw.sourceUrl || '';
  const now = new Date().toISOString();

  return {
    id: `remote-${hashId(sourceUrl || `${title}-${sourceName}`)}`,
    sortOrder: 1000 + index,
    title,
    bubble: inferBubble(title),
    walkMinutes,
    timeLabel: inferTimeLabel(`${text} ${raw.rawDateText || ''}`),
    place: district ? `上海 · ${district}` : '上海',
    tags: [
      normalizedSource.trustLevel === 'whitelist' ? '可信来源' : '待确认',
      free ? '免费优先' : '查看详情',
      quietFriendly ? '适合慢逛' : '城市活动'
    ],
    description,
    free,
    noSignup,
    quietFriendly,
    lowPressureNote: '先看看详情，觉得合适再出发。',
    color: ['mint', 'green', 'peach'][index % 3],
    priceLabel: free ? '免费参加' : '查看详情',
    category,
    image: raw.image || '',
    sourceName,
    sourceUrl,
    district,
    mapX: 20 + (index % 4) * 18,
    mapY: 24 + (index % 5) * 12,
    status: statusForSource(normalizedSource),
    sourceId: normalizedSource.id,
    sourceType: normalizedSource.sourceType,
    trustLevel: normalizedSource.trustLevel,
    dedupeKey: createDedupeKey({ ...raw, sourceUrl }, district),
    rawTitle: stripTags(raw.title || ''),
    rawSummary: stripTags(raw.description || ''),
    rawDateText: raw.rawDateText || '',
    startAt: raw.startAt || '',
    endAt: raw.endAt || '',
    lastSeenAt: now,
    reviewNote: '',
    syncedAt: now
  };
}
```

- [ ] **Step 6: Replace `syncActivities` with source filtering and counters**

Replace the existing `syncActivities` function with:

```js
async function syncActivities(options = {}) {
  const {
    sources = SOURCE_CONFIGS,
    fetcher = fetchText,
    fetchTimeout = 12000,
    writeActivity,
    limit = 30,
    sourceLimit = sources.length,
    sourceIds
  } = options;
  const activeSources = selectSources(sources, sourceIds, sourceLimit);
  const sourceResults = [];
  const rawItems = [];

  for (const source of activeSources) {
    try {
      const html = await fetcher(source.url, { source, timeout: fetchTimeout });
      const items = extractListItems(html, source).map((item) => ({
        ...item,
        sourceId: source.id,
        sourceType: source.sourceType,
        trustLevel: source.trustLevel,
        district: item.district || source.district,
        categoryHint: item.categoryHint || source.categoryHint
      }));
      sourceResults.push({
        sourceId: source.id,
        name: source.name,
        url: source.url,
        count: items.length
      });
      rawItems.push(...items.map((item) => ({ item, source })));
    } catch (error) {
      sourceResults.push({
        sourceId: source.id,
        name: source.name,
        url: source.url,
        count: 0,
        error: error.message
      });
    }
  }

  const seen = new Set();
  const normalizedItems = [];
  for (const pair of rawItems) {
    const normalized = normalizeActivity(pair.item, normalizedItems.length, pair.source);
    const key = normalized.dedupeKey || normalized.sourceUrl || normalized.id;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalizedItems.push(normalized);
    if (normalizedItems.length >= limit) {
      break;
    }
  }

  const writeErrors = [];

  if (writeActivity) {
    for (const item of normalizedItems) {
      try {
        await writeActivity(item);
      } catch (error) {
        writeErrors.push({
          id: item.id,
          title: item.title,
          message: error.message || '写入失败'
        });
      }
    }
  }

  const publishedCount = normalizedItems.filter((item) => item.status === 'published').length;
  const pendingCount = normalizedItems.filter((item) => item.status === 'pending').length;
  const errorCount = sourceResults.filter((source) => source.error).length;

  return {
    synced: normalizedItems.length,
    skipped: Math.max(rawItems.length - normalizedItems.length, 0),
    sourceCount: activeSources.length,
    fetchedCount: rawItems.length,
    publishedCount,
    pendingCount,
    errorCount,
    sources: sourceResults,
    writeErrors,
    items: normalizedItems
  };
}
```

- [ ] **Step 7: Export new helpers**

Update the `module.exports` block:

```js
module.exports = {
  SOURCE_CONFIGS,
  absoluteUrl,
  createDedupeKey,
  decodeHtml,
  dedupeActivities,
  extractListItems,
  fetchText,
  normalizeActivity,
  selectSources,
  stripTags,
  syncActivities
};
```

- [ ] **Step 8: Run tests**

Run:

```bash
node --test tests/mini-program.test.js
```

Expected: PASS for all activity sync tests. If older tests expect `官方来源` in tags, update those expectations to accept `可信来源`, because trust state is now explicit.

- [ ] **Step 9: Commit**

```bash
git add cloudfunctions/hotspotApi/activity-sync.js tests/mini-program.test.js
git commit -m "Add review status to activity sync"
```

---

### Task 3: Add Cloud Database Source, Log, and Published Filtering

**Files:**
- Modify: `cloudfunctions/hotspotApi/index.js`
- Modify: `tests/mini-program.test.js`

- [ ] **Step 1: Write static behavior tests**

Add this test after `hotspot cloud function exposes data actions for pages`:

```js
test('cloud function exposes collector backend actions and collections', () => {
  const source = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/index.js'), 'utf8');

  ['sources', 'syncLogs'].forEach((collectionKey) => {
    assert.match(source, new RegExp(`${collectionKey}:`), `${collectionKey} collection should be configured`);
  });
  ['initSources', 'listPendingActivities', 'updateActivityStatus'].forEach((action) => {
    assert.match(source, new RegExp(action), `${action} should be handled by hotspotApi`);
  });
  assert.match(source, /listPublishedMoments/);
  assert.match(source, /status:\s*'published'/);
  assert.match(source, /hotspot_sources/);
  assert.match(source, /hotspot_sync_logs/);
  assert.match(source, /writeSyncLog/);
});
```

Add this test near the activity sync tests:

```js
test('cloud function preserves manual review fields when upserting fetched activities', () => {
  const source = fs.readFileSync(path.join(root, 'cloudfunctions/hotspotApi/index.js'), 'utf8');
  const upsertBody = source.slice(
    source.indexOf('async function upsertActivityDocument'),
    source.indexOf('async function initData')
  );

  assert.match(upsertBody, /existing\.status === 'hidden'/);
  assert.match(upsertBody, /existing\.reviewNote/);
  assert.match(upsertBody, /dedupeKey/);
  assert.doesNotMatch(upsertBody, /doc\\(result\\.data\\[0\\]\\._id\\)\\.update\\(\\{\\s*data:\\s*document/s);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
node --test tests/mini-program.test.js
```

Expected: FAIL because the new collections, actions, and helper names are missing.

- [ ] **Step 3: Extend collection names**

In `cloudfunctions/hotspotApi/index.js`, replace the `collections` object with:

```js
const collections = {
  moments: 'hotspot_moments',
  reasons: 'hotspot_reasons',
  routes: 'hotspot_routes',
  settings: 'hotspot_settings',
  sources: 'hotspot_sources',
  syncLogs: 'hotspot_sync_logs'
};
```

- [ ] **Step 4: Add published moment filtering**

Add this helper after `listCollection`:

```js
function isPublishedMoment(item) {
  if (!item.status) {
    return true;
  }
  if (item.status !== 'published') {
    return false;
  }
  if (!item.endAt) {
    return true;
  }
  return new Date(item.endAt).getTime() >= Date.now();
}

async function listPublishedMoments() {
  const moments = await listCollection(collections.moments);
  return moments.filter(isPublishedMoment);
}
```

Then replace all page-facing calls that read `listCollection(collections.moments)` in `getHomeData`, `getBrowseData`, `getMapData`, and `getReasonsData` with `listPublishedMoments()`.

- [ ] **Step 5: Add source and log helpers**

At the top of `index.js`, add:

```js
const { SOURCE_CONFIGS } = require('./source-configs.js');
```

Add these helpers after `upsertPublicDocument`:

```js
async function upsertSourceDocument(source) {
  const now = new Date().toISOString();
  const document = {
    ...source,
    updatedAt: now,
    createdAt: source.createdAt || now
  };
  await upsertPublicDocument(collections.sources, document);
}

async function listActiveSources(payload = {}) {
  let result;
  try {
    result = await db.collection(collections.sources).where({ status: 'active' }).get();
  } catch (error) {
    result = { data: [] };
  }
  let sources = result.data.map(cleanDocument);
  if (Array.isArray(payload.sourceIds) && payload.sourceIds.length > 0) {
    const selected = new Set(payload.sourceIds);
    sources = sources.filter((source) => selected.has(source.id));
  }
  if (payload.sourceLimit) {
    sources = sources.slice(0, payload.sourceLimit);
  }
  return sources;
}

async function writeSyncLog(summary) {
  const now = new Date().toISOString();
  const id = `sync-${now.replace(/[:.]/g, '-')}`;
  const document = {
    id,
    triggerType: summary.triggerType || 'manual',
    startedAt: summary.startedAt || now,
    finishedAt: now,
    sourceCount: summary.sourceCount || 0,
    fetchedCount: summary.fetchedCount || 0,
    createdCount: summary.createdCount || 0,
    updatedCount: summary.updatedCount || 0,
    publishedCount: summary.publishedCount || 0,
    pendingCount: summary.pendingCount || 0,
    errorCount: summary.errorCount || 0,
    sources: summary.sources || []
  };
  await upsertPublicDocument(collections.syncLogs, document);
  return document;
}
```

- [ ] **Step 6: Add activity upsert that preserves review fields**

Add this helper after `writeSyncLog` and before `initData`:

```js
async function upsertActivityDocument(document) {
  const queryKey = document.dedupeKey
    ? { dedupeKey: document.dedupeKey }
    : { id: document.id };
  const result = await db.collection(collections.moments).where(queryKey).limit(1).get();
  const existing = result.data[0] ? cleanDocument(result.data[0]) : null;

  if (existing) {
    const nextStatus = existing.status === 'hidden' || existing.status === 'expired'
      ? existing.status
      : existing.status || document.status;
    const nextReviewNote = existing.reviewNote || document.reviewNote || '';
    await db.collection(collections.moments).doc(result.data[0]._id).update({
      data: {
        ...document,
        status: nextStatus,
        reviewNote: nextReviewNote
      }
    });
    return 'updated';
  }

  await db.collection(collections.moments).add({
    data: document
  });
  return 'created';
}
```

- [ ] **Step 7: Add cloud function actions**

Add these functions before `syncOfficialActivities`:

```js
async function initSources() {
  await Promise.all(SOURCE_CONFIGS.map((source) => upsertSourceDocument(source)));
  return {
    sources: SOURCE_CONFIGS.length
  };
}

async function listPendingActivities(payload = {}) {
  const limit = payload.limit || 50;
  try {
    const result = await db.collection(collections.moments)
      .where({ status: 'pending' })
      .orderBy('syncedAt', 'desc')
      .limit(limit)
      .get();
    return {
      items: result.data.map(cleanDocument)
    };
  } catch (error) {
    return {
      items: [],
      error: error.message || '读取待审核活动失败'
    };
  }
}

async function updateActivityStatus(payload = {}) {
  const allowedStatuses = ['published', 'pending', 'hidden', 'expired'];
  if (!payload.id || !allowedStatuses.includes(payload.status)) {
    throw new Error('活动 ID 或状态无效');
  }
  const result = await db.collection(collections.moments).where({ id: payload.id }).limit(1).get();
  if (!result.data[0]) {
    throw new Error('活动不存在');
  }
  await db.collection(collections.moments).doc(result.data[0]._id).update({
    data: {
      status: payload.status,
      reviewNote: payload.reviewNote || '',
      reviewedAt: new Date().toISOString()
    }
  });
  return {
    id: payload.id,
    status: payload.status
  };
}
```

- [ ] **Step 8: Replace `syncOfficialActivities` to use database sources and logs**

Replace `syncOfficialActivities` with:

```js
async function syncOfficialActivities(payload = {}) {
  const startedAt = new Date().toISOString();
  let createdCount = 0;
  let updatedCount = 0;
  let sources = await listActiveSources(payload);

  if (sources.length === 0) {
    sources = SOURCE_CONFIGS.filter((source) => source.status === 'active');
  }

  const result = await activitySync.syncActivities({
    sources,
    limit: payload.limit || 30,
    sourceLimit: payload.sourceLimit || sources.length,
    sourceIds: payload.sourceIds,
    fetchTimeout: payload.fetchTimeout || 12000,
    writeActivity: async (activity) => {
      const operation = await upsertActivityDocument(activity);
      if (operation === 'created') {
        createdCount += 1;
      } else {
        updatedCount += 1;
      }
    }
  });

  await writeSyncLog({
    ...result,
    triggerType: payload.triggerType || 'manual',
    startedAt,
    createdCount,
    updatedCount
  });

  return {
    ...result,
    createdCount,
    updatedCount
  };
}
```

- [ ] **Step 9: Register actions**

Add these entries to the `actions` object:

```js
  initSources,
  listPendingActivities,
  updateActivityStatus,
```

Keep `syncActivities` registered.

- [ ] **Step 10: Run tests**

Run:

```bash
node --test tests/mini-program.test.js
```

Expected: PASS for the new static cloud function tests and existing cloud action tests.

- [ ] **Step 11: Commit**

```bash
git add cloudfunctions/hotspotApi/index.js tests/mini-program.test.js
git commit -m "Wire activity collector into cloud database"
```

---

### Task 4: Add Backend Operations Documentation

**Files:**
- Modify: `docs/cloud-backend.md`
- Modify: `tests/mini-program.test.js`

- [ ] **Step 1: Write documentation coverage test**

Add this test near the existing cloud backend tests:

```js
test('cloud backend docs explain collector source initialization and review flow', () => {
  const docs = fs.readFileSync(path.join(root, 'docs/cloud-backend.md'), 'utf8');

  assert.match(docs, /initSources/);
  assert.match(docs, /hotspot_sources/);
  assert.match(docs, /hotspot_sync_logs/);
  assert.match(docs, /pending/);
  assert.match(docs, /published/);
  assert.match(docs, /定时触发器/);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
node --test tests/mini-program.test.js
```

Expected: FAIL because the docs do not yet mention all collector operations.

- [ ] **Step 3: Update `docs/cloud-backend.md`**

Add this section after the current “同步上海官方活动” section:

```markdown
## 5. 初始化活动采集来源

活动采集后台使用 `hotspot_sources` 保存来源配置。首次部署或更新内置来源后，在云函数测试中传入：

```json
{
  "action": "initSources",
  "payload": {}
}
```

它会写入或更新首批上海活动来源，包括市级官方来源、区级/社区来源和一个默认暂停的私营平台示例。这个动作不会删除你在云开发控制台里手动新增的来源。

来源字段里最重要的是：

- `status`: `active` 会参与同步，`paused` 不同步。
- `trustLevel`: `whitelist` 采集后自动进入 `published`，`review` 采集后进入 `pending`。
- `parserType`: 首版主要使用 `genericList`。

## 6. 审核和发布采集活动

同步后的活动写入 `hotspot_moments`。

小程序只读取 `published` 活动。非白名单来源会先写成 `pending`，可以在微信云开发控制台打开 `hotspot_moments`，确认标题、时间、地点和来源后，把 `status` 改成 `published`。

不适合展示的活动可以改成 `hidden`。过期活动后续可以改成 `expired`。

每次同步会写入 `hotspot_sync_logs`，用于查看本次尝试的来源数、抓取条数、自动发布条数、待审核条数和失败来源。

## 7. 定时触发器建议

等手动同步稳定后，可以在云开发控制台给 `hotspotApi` 配置定时触发器。推荐每天同步一到两次：

- 上午 8 点同步区/社区活动。
- 下午 5 点追加一次轻量同步，补充晚间活动。

定时触发器调用 `syncActivities`，payload 可以使用：

```json
{
  "action": "syncActivities",
  "payload": {
    "limit": 50,
    "triggerType": "scheduled"
  }
}
```
```

Then renumber the later “小程序接口动作” and “真正后端模式” sections so the document headings remain sequential.

- [ ] **Step 4: Run tests**

Run:

```bash
node --test tests/mini-program.test.js
```

Expected: PASS for the documentation coverage test.

- [ ] **Step 5: Commit**

```bash
git add docs/cloud-backend.md tests/mini-program.test.js
git commit -m "Document activity collector operations"
```

---

### Task 5: Final Verification

**Files:**
- Verify: `cloudfunctions/hotspotApi/source-configs.js`
- Verify: `cloudfunctions/hotspotApi/activity-sync.js`
- Verify: `cloudfunctions/hotspotApi/index.js`
- Verify: `docs/cloud-backend.md`
- Verify: `tests/mini-program.test.js`

- [ ] **Step 1: Run the full Node test suite**

Run:

```bash
node --test tests/mini-program.test.js
```

Expected: all tests pass. If tests fail because of pre-existing dirty page changes, list the failing test names and inspect whether they are unrelated to the collector backend.

- [ ] **Step 2: Inspect changed files**

Run:

```bash
git diff --stat HEAD
git diff -- cloudfunctions/hotspotApi/source-configs.js cloudfunctions/hotspotApi/activity-sync.js cloudfunctions/hotspotApi/index.js docs/cloud-backend.md tests/mini-program.test.js
```

Expected: changes are limited to the collector backend, documentation, and tests.

- [ ] **Step 3: Check cloud action names**

Run:

```bash
rg -n "initSources|syncActivities|listPendingActivities|updateActivityStatus|hotspot_sources|hotspot_sync_logs" cloudfunctions/hotspotApi docs/cloud-backend.md tests/mini-program.test.js
```

Expected: all new actions and collections appear in implementation, docs, and tests.

- [ ] **Step 4: Leave final status**

Summarize:

```text
Implemented Shanghai activity collector backend V1:
- Configurable activity sources in hotspot_sources.
- Trusted sources publish automatically; review sources enter pending.
- Mini program reads only published activities while old records remain visible during migration.
- Sync logs write to hotspot_sync_logs.
- Operations docs cover initSources, manual review, and scheduled sync.
```

---

## Self-Review

Spec coverage:

- `hotspot_sources`: Task 1 creates source configs; Task 3 wires collection and `initSources`.
- `hotspot_moments` review fields: Task 2 adds normalized fields; Task 3 preserves review state during upsert.
- `hotspot_sync_logs`: Task 3 writes logs; Task 4 documents log usage.
- White-list auto publish and review-source pending: Task 2 tests and implements `trustLevel` mapping.
- Published-only reads: Task 3 adds `listPublishedMoments`.
- Source failure tolerance: existing sync failure behavior remains, Task 2 preserves `errorCount`.
- Timed sync: Task 4 documents scheduled payload.
- No UI/admin page: no page files are included in this plan.

Placeholder scan:

- The plan contains exact file paths, commands, and code snippets for every implementation step.
- The plan avoids unresolved placeholders and keeps optional future work out of the implementation tasks.

Type consistency:

- Source fields match the design: `id`, `name`, `district`, `sourceType`, `url`, `parserType`, `trustLevel`, `status`, `categoryHint`, `notes`.
- Activity review fields match the design: `status`, `sourceId`, `sourceType`, `trustLevel`, `dedupeKey`, `rawTitle`, `rawSummary`, `rawDateText`, `startAt`, `endAt`, `lastSeenAt`, `reviewNote`, `syncedAt`.
- Cloud actions match the design: `syncActivities`, `initSources`, `listPendingActivities`, `updateActivityStatus`.
