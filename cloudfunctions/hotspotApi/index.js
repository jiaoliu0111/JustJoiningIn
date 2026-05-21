const cloud = require('wx-server-sdk');
const activitySync = require('./activity-sync.js');
const seed = require('./seed-data.js');

cloud.init({
  env: cloud.DYNAMIC_CURRENT_ENV
});

const db = cloud.database();

const collections = {
  moments: 'hotspot_moments',
  reasons: 'hotspot_reasons',
  routes: 'hotspot_routes',
  settings: 'hotspot_settings'
};

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

async function listCollection(name) {
  try {
    const result = await db.collection(name).orderBy('sortOrder', 'asc').get();
    return result.data.map(cleanDocument);
  } catch (error) {
    return [];
  }
}

async function countCollection(name) {
  try {
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

async function getHomeData() {
  const [moments, reasons, routes, settings] = await Promise.all([
    listCollection(collections.moments),
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
  let moments = await listCollection(collections.moments);
  let autoSynced = false;
  let autoSyncError = '';
  let syncedItems = [];

  if (moments.length === 0) {
    try {
      const syncResult = await syncOfficialActivities({
        limit: 8,
        sourceLimit: 1,
        fetchTimeout: 1800
      });
      syncedItems = syncResult.items || [];
    } catch (error) {
      autoSyncError = error.message || '活动同步失败';
    }
    moments = await listCollection(collections.moments);
    autoSynced = moments.length > 0;
  }

  if (moments.length === 0 && syncedItems.length > 0) {
    moments = syncedItems;
    autoSynced = true;
  }

  return {
    autoSynced,
    autoSyncError,
    cards: moments.map((item) => ({
      ...item,
      cardType: 'moment',
      badge: item.bubble,
      displayTime: item.timeLabel,
      displayPlace: item.place
    }))
  };
}

async function getMapData() {
  const moments = await listCollection(collections.moments);

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
    listCollection(collections.moments)
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
  return getSettings();
}

async function savePreferences(payload) {
  const nextPreferences = {
    id: 'preferences',
    ...(payload.preferences || {})
  };
  await upsertPublicDocument(collections.settings, nextPreferences);

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
  if (!detail || type !== 'reason') {
    return detail;
  }

  const linkedMoment = await findByPublicId(collections.moments, detail.momentId);
  return {
    ...detail,
    linkedMoment,
    tags: linkedMoment ? linkedMoment.tags : [],
    description: linkedMoment ? linkedMoment.description : detail.subtitle,
    place: linkedMoment ? linkedMoment.place : '',
    walkMinutes: linkedMoment ? linkedMoment.walkMinutes : '',
    timeLabel: linkedMoment ? linkedMoment.timeLabel : '',
    lowPressureNote: linkedMoment ? linkedMoment.lowPressureNote : ''
  };
}

async function upsertPublicDocument(collectionName, document) {
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

async function initData() {
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
    settings: 2
  };
}

async function syncOfficialActivities(payload = {}) {
  return activitySync.syncActivities({
    limit: payload.limit || 30,
    sourceLimit: payload.sourceLimit || activitySync.SOURCE_CONFIGS.length,
    fetchTimeout: payload.fetchTimeout || 12000,
    writeActivity: (activity) => upsertPublicDocument(collections.moments, activity)
  });
}

async function syncActivities(payload = {}) {
  return syncOfficialActivities(payload);
}

const actions = {
  ping,
  debugDatabase,
  getHomeData,
  getBrowseData,
  getMapData,
  getReasonsData,
  getMineData,
  savePreferences,
  getDetail,
  initData,
  syncActivities
};

exports.main = async (event = {}) => {
  const action = actions[event.action];
  if (!action) {
    return {
      ok: false,
      message: `未知接口动作：${event.action || ''}`
    };
  }

  try {
    const data = await action(event.payload || {});
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
