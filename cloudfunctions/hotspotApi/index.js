const cloud = require('wx-server-sdk');
const activitySync = require('./activity-sync.js');
const seed = require('./seed-data.js');
const { SOURCE_CONFIGS } = require('./source-configs.js');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

const collections = {
  moments: 'hotspot_moments',
  reasons: 'hotspot_reasons',
  routes: 'hotspot_routes',
  settings: 'hotspot_settings',
  sources: 'hotspot_sources',
  syncLogs: 'hotspot_sync_logs',
  userPreferences: 'hotspot_user_preferences'
};

const PARK_ACTIVITY_SOURCE_ID = 'source-shanghai-park-activities';
const CITY_WALK_SOURCE_ID = 'source-meet-shanghai-city-walk';
const HERITAGE_TOWN_SOURCE_ID = 'source-meet-shanghai-heritage-town';
const SCENIC_AREA_SOURCE_ID = 'source-meet-shanghai-a-grade-tourist-attraction';
const ECO_CAMPING_SOURCE_ID = 'source-meet-shanghai-eco-camping-tourism';
const ensuredCollections = new Set();

async function ping() {
  return {
    message: 'hotspotApi connected',
    env: cloud.DYNAMIC_CURRENT_ENV,
    time: new Date().toISOString()
  };
}

function cleanDocument(document) {
  const next = { ...document };
  delete next._id;
  delete next._openid;
  return next;
}

function isMissingCollectionError(error) {
  const message = error && error.message ? error.message : '';
  return /-502005|DATABASE_COLLECTION_NOT_EXIST|collection not exists|Db or Table not exist|ResourceNotFound/i.test(message);
}

function isCollectionAlreadyExistsError(error) {
  const message = error && error.message ? error.message : '';
  return /-501001|-502004|DATABASE_COLLECTION_ALREADY_EXIST|DATABASE_COLLECTION_EXIST|already exists|collection exists|ResourceExist|Table exist/i.test(message);
}

async function ensureCollection(name) {
  if (ensuredCollections.has(name)) {
    return;
  }

  try {
    await db.collection(name).limit(1).get();
  } catch (error) {
    if (!isMissingCollectionError(error)) {
      throw error;
    }
    if (typeof db.createCollection !== 'function') {
      throw error;
    }

    try {
      await db.createCollection(name);
    } catch (createError) {
      if (!isCollectionAlreadyExistsError(createError)) {
        throw createError;
      }
    }
  }

  ensuredCollections.add(name);
}

async function listCollection(name) {
  try {
    const result = await db.collection(name).orderBy('sortOrder', 'asc').get();
    return result.data.map(cleanDocument);
  } catch (error) {
    return [];
  }
}

function isPublishedMoment(item) {
  if (item.status === 'expired' || item.status === 'hidden') {
    return false;
  }
  if (item.endAt && new Date(item.endAt).getTime() < Date.now()) {
    return false;
  }
  return item.status === 'published' || !item.status;
}

async function listPublishedCollection(name) {
  const items = await listCollection(name);
  return items.filter(isPublishedMoment);
}

async function listPublishedMoments() {
  return listPublishedCollection(collections.moments);
}

async function countCollection(name) {
  try {
    await ensureCollection(name);
    const result = await db.collection(name).count();
    return result.total;
  } catch (error) {
    return {
      error: error.message
    };
  }
}

async function debugDatabase() {
  const result = {};
  for (const [key, name] of Object.entries(collections)) {
    result[key] = {
      collection: name,
      count: await countCollection(name)
    };
  }
  return result;
}

async function findByPublicId(name, id) {
  if (!id) {
    return null;
  }
  try {
    const result = await db.collection(name).where({ id }).limit(1).get();
    return result.data[0] ? cleanDocument(result.data[0]) : null;
  } catch (error) {
    return null;
  }
}

async function getSettings() {
  let result;
  try {
    result = await db.collection(collections.settings).get();
  } catch (error) {
    result = { data: [] };
  }
  const settings = result.data.map(cleanDocument);
  const preferences = settings.find((item) => item.id === 'preferences') || {};
  const checklist = settings.find((item) => item.id === 'checklist');

  return {
    preferences,
    checklist: checklist ? checklist.items : []
  };
}

function getOpenId() {
  try {
    const context = cloud.getWXContext();
    return context.OPENID || 'anonymous';
  } catch (error) {
    return 'anonymous';
  }
}

async function getUserPreferences() {
  const openid = getOpenId();
  try {
    const result = await db.collection(collections.userPreferences)
      .where({ openid })
      .limit(1)
      .get();
    return result.data[0] ? cleanDocument(result.data[0]).preferences || {} : {};
  } catch (error) {
    return {};
  }
}

async function getHomeData() {
  const [moments, reasons, routes, settings] = await Promise.all([
    listPublishedMoments(),
    listCollection(collections.reasons),
    listCollection(collections.routes),
    getSettings()
  ]);

  return {
    moments,
    featuredMoments: moments.slice(0, 3),
    reasons,
    routes: routes.slice(0, 2),
    checklist: settings.checklist
  };
}

async function getBrowseData() {
  const moments = await listPublishedMoments();

  return {
    cards: moments.map(toMomentCard)
  };
}

function toMomentCard(item) {
  return {
    ...item,
    cardType: 'moment',
    badge: item.bubble,
    displayTime: item.timeLabel,
    displayPlace: item.place
  };
}

async function getParkActivityData(payload = {}) {
  const source = SOURCE_CONFIGS.find((item) => item.id === PARK_ACTIVITY_SOURCE_ID);
  if (!source) {
    throw new Error('公园活动来源未配置');
  }

  const result = await activitySync.syncActivities({
    sources: [source],
    limit: payload.limit || 60,
    sourceLimit: 1,
    sourceIds: [PARK_ACTIVITY_SOURCE_ID],
    fetchTimeout: payload.fetchTimeout || 10000
  });
  const freshCards = result.items
    .filter(isPublishedMoment)
    .map(toMomentCard);

  if (freshCards.length === 0) {
    const sourceError = result.sources && result.sources[0] && result.sources[0].error;
    throw new Error(sourceError || '公园活动官网暂时没有解析到数据');
  }

  return {
    cards: freshCards,
    sync: result
  };
}

async function getCityWalkData(payload = {}) {
  const source = SOURCE_CONFIGS.find((item) => item.id === CITY_WALK_SOURCE_ID);
  if (!source) {
    throw new Error('城市漫步来源未配置');
  }

  const result = await activitySync.syncActivities({
    sources: [source],
    limit: payload.limit || 30,
    sourceLimit: 1,
    sourceIds: [CITY_WALK_SOURCE_ID],
    fetchTimeout: payload.fetchTimeout || 10000
  });
  const freshCards = result.items
    .filter(isPublishedMoment)
    .map(toMomentCard);

  if (freshCards.length === 0) {
    const sourceError = result.sources && result.sources[0] && result.sources[0].error;
    throw new Error(sourceError || '城市漫步官网暂时没有解析到数据');
  }

  return {
    cards: freshCards,
    sync: result
  };
}

async function getHeritageTownData(payload = {}) {
  const source = SOURCE_CONFIGS.find((item) => item.id === HERITAGE_TOWN_SOURCE_ID);
  if (!source) {
    throw new Error('非遗古镇来源未配置');
  }

  const result = await activitySync.syncActivities({
    sources: [source],
    limit: payload.limit || 30,
    sourceLimit: 1,
    sourceIds: [HERITAGE_TOWN_SOURCE_ID],
    fetchTimeout: payload.fetchTimeout || 10000
  });
  const freshCards = result.items
    .filter(isPublishedMoment)
    .map(toMomentCard);

  if (freshCards.length === 0) {
    const sourceError = result.sources && result.sources[0] && result.sources[0].error;
    throw new Error(sourceError || '非遗古镇官网暂时没有解析到数据');
  }

  return {
    cards: freshCards,
    sync: result
  };
}

async function getScenicAreaData(payload = {}) {
  const source = SOURCE_CONFIGS.find((item) => item.id === SCENIC_AREA_SOURCE_ID);
  if (!source) {
    throw new Error('A级景区来源未配置');
  }

  const result = await activitySync.syncActivities({
    sources: [source],
    limit: payload.limit || 30,
    sourceLimit: 1,
    sourceIds: [SCENIC_AREA_SOURCE_ID],
    fetchTimeout: payload.fetchTimeout || 10000
  });
  const freshCards = result.items
    .filter(isPublishedMoment)
    .map(toMomentCard);

  if (freshCards.length === 0) {
    const sourceError = result.sources && result.sources[0] && result.sources[0].error;
    throw new Error(sourceError || 'A级景区官网暂时没有解析到数据');
  }

  return {
    cards: freshCards,
    sync: result
  };
}

async function getEcoCampingData(payload = {}) {
  const source = SOURCE_CONFIGS.find((item) => item.id === ECO_CAMPING_SOURCE_ID);
  if (!source) {
    throw new Error('生态露营来源未配置');
  }

  const result = await activitySync.syncActivities({
    sources: [source],
    limit: payload.limit || 30,
    sourceLimit: 1,
    sourceIds: [ECO_CAMPING_SOURCE_ID],
    fetchTimeout: payload.fetchTimeout || 10000
  });
  const freshCards = result.items
    .filter(isPublishedMoment)
    .map(toMomentCard);

  if (freshCards.length === 0) {
    const sourceError = result.sources && result.sources[0] && result.sources[0].error;
    throw new Error(sourceError || '生态露营官网暂时没有解析到数据');
  }

  return {
    cards: freshCards,
    sync: result
  };
}

async function getMapData() {
  const moments = await listPublishedMoments();

  return {
    moments: moments.map((item, index) => ({
      ...item,
      mapX: item.mapX || 24 + (index % 3) * 22,
      mapY: item.mapY || 28 + index * 9
    }))
  };
}

async function getReasonsData() {
  const [reasons, moments] = await Promise.all([
    listCollection(collections.reasons),
    listPublishedMoments()
  ]);
  const selectedReason = reasons[0] || null;
  const selectedMoment = selectedReason
    ? moments.find((item) => item.id === selectedReason.momentId) || null
    : null;

  return {
    reasons,
    moments,
    selectedReason,
    selectedMoment
  };
}

async function getMineData() {
  const [settings, userPreferences] = await Promise.all([
    getSettings(),
    getUserPreferences()
  ]);

  return {
    ...settings,
    preferences: {
      ...settings.preferences,
      ...userPreferences
    }
  };
}

async function savePreferences(payload) {
  const openid = getOpenId();
  const nextPreferences = {
    id: 'preferences',
    ...(payload.preferences || {})
  };
  await upsertPublicDocument(collections.userPreferences, {
    id: `preferences-${openid}`,
    openid,
    preferences: nextPreferences,
    updatedAt: new Date().toISOString()
  });

  return {
    preferences: nextPreferences
  };
}

async function getDetail(payload) {
  const { type, id } = payload || {};
  const collectionName = {
    moment: collections.moments,
    reason: collections.reasons,
    route: collections.routes
  }[type];

  if (!collectionName) {
    return null;
  }

  const detail = await findByPublicId(collectionName, id);
  if (type === 'moment' && detail && !isPublishedMoment(detail)) {
    return null;
  }
  if (!detail || type !== 'reason') {
    return detail;
  }

  const linkedMoment = await findByPublicId(collections.moments, detail.momentId);
  const visibleLinkedMoment = linkedMoment && isPublishedMoment(linkedMoment) ? linkedMoment : null;
  return {
    ...detail,
    linkedMoment: visibleLinkedMoment,
    tags: visibleLinkedMoment ? visibleLinkedMoment.tags : [],
    description: visibleLinkedMoment ? visibleLinkedMoment.description : detail.subtitle,
    place: visibleLinkedMoment ? visibleLinkedMoment.place : '',
    walkMinutes: visibleLinkedMoment ? visibleLinkedMoment.walkMinutes : '',
    timeLabel: visibleLinkedMoment ? visibleLinkedMoment.timeLabel : '',
    lowPressureNote: visibleLinkedMoment ? visibleLinkedMoment.lowPressureNote : ''
  };
}

async function upsertPublicDocument(collectionName, document) {
  await ensureCollection(collectionName);
  const result = await db.collection(collectionName).where({ id: document.id }).limit(1).get();
  if (result.data[0]) {
    await db.collection(collectionName).doc(result.data[0]._id).update({
      data: document
    });
    return;
  }
  await db.collection(collectionName).add({
    data: document
  });
}

async function initSources() {
  await ensureCollection(collections.sources);
  await Promise.all(SOURCE_CONFIGS.map((item) => upsertPublicDocument(collections.sources, {
    ...item,
    updatedAt: new Date().toISOString()
  })));

  return {
    sources: SOURCE_CONFIGS.length
  };
}

async function initData() {
  await Promise.all(Object.values(collections).map(ensureCollection));
  await initSources();
  await Promise.all([
    ...seed.moments.map((item) => upsertPublicDocument(collections.moments, item)),
    ...seed.reasons.map((item) => upsertPublicDocument(collections.reasons, item)),
    ...seed.routes.map((item) => upsertPublicDocument(collections.routes, item)),
    upsertPublicDocument(collections.settings, seed.preferences),
    upsertPublicDocument(collections.settings, {
      id: 'checklist',
      items: seed.checklist
    })
  ]);

  return {
    moments: seed.moments.length,
    reasons: seed.reasons.length,
    routes: seed.routes.length,
    sources: SOURCE_CONFIGS.length,
    settings: 2
  };
}

async function listActiveSources(payload = {}) {
  const sourceIds = payload.sourceIds || [];
  const sourceLimit = payload.sourceLimit || activitySync.SOURCE_CONFIGS.length;
  let sources = await listCollection(collections.sources);

  if (sources.length === 0) {
    sources = SOURCE_CONFIGS;
  }

  return sources
    .filter((source) => source.status === 'active')
    .filter((source) => source.url)
    .filter((source) => sourceIds.length === 0 || sourceIds.includes(source.id))
    .slice(0, sourceLimit);
}

async function upsertActivityDocument(activity) {
  await ensureCollection(collections.moments);
  const nextStatus = activity.trustLevel === 'whitelist' ? 'published' : 'pending';
  const result = await db.collection(collections.moments)
    .where({ dedupeKey: activity.dedupeKey })
    .limit(1)
    .get();
  const existing = result.data[0];

  const document = {
    ...activity,
    status: activity.status || nextStatus,
    reviewNote: activity.reviewNote || '',
    updatedAt: new Date().toISOString()
  };

  if (existing) {
    const existingClean = cleanDocument(existing);
    const nextStatus = existingClean.status === 'hidden' || existingClean.status === 'expired'
      ? existingClean.status
      : existingClean.status || document.status;
    const merged = {
      ...document,
      status: nextStatus,
      reviewNote: existingClean.reviewNote || document.reviewNote,
      firstSeenAt: existingClean.firstSeenAt || document.syncedAt
    };

    await db.collection(collections.moments).doc(existing._id).update({
      data: merged
    });

    return {
      type: 'updated',
      activity: merged
    };
  }

  const created = {
    ...document,
    firstSeenAt: document.syncedAt
  };
  await db.collection(collections.moments).add({
    data: created
  });

  return {
    type: 'created',
    activity: created
  };
}

async function writeSyncLog(log) {
  const document = {
    id: log.id || `sync-${Date.now()}`,
    ...log
  };
  await upsertPublicDocument(collections.syncLogs, document);
  return document;
}

async function syncOfficialActivities(payload = {}) {
  const triggerType = payload.triggerType || 'manual';
  const startedAt = new Date().toISOString();
  const sources = await listActiveSources(payload);
  const stats = {
    createdCount: 0,
    updatedCount: 0,
    publishedCount: 0,
    pendingCount: 0
  };

  const result = await activitySync.syncActivities({
    sources,
    limit: payload.limit || 30,
    sourceLimit: sources.length,
    sourceIds: payload.sourceIds || [],
    fetchTimeout: payload.fetchTimeout || 12000,
    writeActivity: async (activity) => {
      const saved = await upsertActivityDocument(activity);
      if (saved.type === 'created') {
        stats.createdCount += 1;
      }
      if (saved.type === 'updated') {
        stats.updatedCount += 1;
      }
      if (saved.activity.status === 'pending') {
        stats.pendingCount += 1;
      }
      if (saved.activity.status === 'published') {
        stats.publishedCount += 1;
      }
      return saved;
    }
  });

  const log = await writeSyncLog({
    id: `sync-${Date.now()}`,
    triggerType,
    startedAt,
    finishedAt: new Date().toISOString(),
    sourceIds: sources.map((source) => source.id),
    sourceCount: sources.length,
    fetchedCount: result.fetchedCount,
    syncedCount: result.synced,
    createdCount: stats.createdCount,
    updatedCount: stats.updatedCount,
    publishedCount: stats.publishedCount,
    pendingCount: stats.pendingCount,
    errorCount: result.writeErrors.length + result.errorCount,
    sources: result.sources
  });

  return {
    ...result,
    ...stats,
    logId: log.id
  };
}

async function listPendingActivities() {
  const moments = await listCollection(collections.moments);
  const items = moments
    .filter((item) => item.status === 'pending')
    .sort((left, right) => String(right.syncedAt || '').localeCompare(String(left.syncedAt || '')));
  return {
    items,
    activities: items
  };
}

async function updateActivityStatus(payload = {}) {
  const { id, status, reviewNote = '' } = payload;
  if (!['published', 'pending', 'hidden', 'expired'].includes(status)) {
    throw new Error('活动状态无效');
  }

  const result = await db.collection(collections.moments).where({ id }).limit(1).get();
  const existing = result.data[0];
  if (!existing) {
    throw new Error('活动不存在');
  }

  await db.collection(collections.moments).doc(existing._id).update({
    data: {
      status,
      reviewNote,
      reviewedAt: new Date().toISOString()
    }
  });

  return {
    id,
    status,
    reviewNote
  };
}

async function syncActivities(payload = {}) {
  return syncOfficialActivities(payload);
}

function normalizeEvent(event = {}) {
  if (event.action) {
    return event;
  }
  if (event.Type === 'Timer') {
    return {
      action: 'syncActivities',
      payload: {
        triggerType: 'scheduled'
      }
    };
  }
  return event;
}

const actions = {
  ping,
  debugDatabase,
  getHomeData,
  getBrowseData,
  getParkActivityData,
  getCityWalkData,
  getHeritageTownData,
  getScenicAreaData,
  getEcoCampingData,
  getMapData,
  getReasonsData,
  getMineData,
  savePreferences,
  getDetail,
  initData,
  initSources,
  listPendingActivities,
  updateActivityStatus,
  syncActivities
};

exports.main = async (event = {}) => {
  const normalizedEvent = normalizeEvent(event);
  const action = actions[normalizedEvent.action];
  if (!action) {
    return {
      ok: false,
      message: `未知接口动作：${normalizedEvent.action || ''}`
    };
  }

  try {
    const data = await action(normalizedEvent.payload || {});
    return {
      ok: true,
      data
    };
  } catch (error) {
    return {
      ok: false,
      message: error.message || '云函数执行失败'
    };
  }
};
