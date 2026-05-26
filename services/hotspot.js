const { callCloudApi } = require('./cloud.js');
const fallbackData = require('./fallback-data.js');

const CACHE_VERSION = '2026-05-25-official-park-v1';
const MEET_API_URL = 'https://api1.meet-in-shanghai.net/api/place/public/page';
const MEET_SOURCES = {
  heritageTown: {
    action: 'getHeritageTownData',
    sourceId: 'source-meet-shanghai-heritage-town',
    sourceName: '上海旅游非遗古镇',
    url: 'https://www1.meet-in-shanghai.net/cn/intangible-cultural-heritage-ancient-town/',
    subjectId: '1076',
    category: '非遗古镇',
    sortName: 'ID'
  },
  scenicArea: {
    action: 'getScenicAreaData',
    sourceId: 'source-meet-shanghai-a-grade-tourist-attraction',
    sourceName: '上海旅游A级景区',
    url: 'https://www1.meet-in-shanghai.net/cn/a-grade-tourist-attraction/',
    subjectId: '1118',
    category: 'A级景区',
    sortName: 'level'
  },
  ecoCamping: {
    action: 'getEcoCampingData',
    sourceId: 'source-meet-shanghai-eco-camping-tourism',
    sourceName: '上海旅游生态露营',
    url: 'https://www1.meet-in-shanghai.net/cn/eco-camping-tourism/',
    subjectId: '1108',
    category: '生态露营',
    sortName: 'ID'
  }
};

function shouldUseFallback(error) {
  const message = error && error.message ? error.message : '';
  return /timeout|fail|云开发|云函数|network|未初始化/i.test(message);
}

function stripTags(value = '') {
  return String(value)
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function shortDistrict(value = '') {
  return String(value).replace(/(新区|区|县)$/g, '');
}

function absoluteMeetUrl(base, value = '') {
  if (!value) {
    return '';
  }
  const normalized = String(value).replace(/\\/g, '/');
  if (/^https?:\/\//i.test(normalized)) {
    return normalized;
  }
  const siteRoot = 'https://www1.meet-in-shanghai.net';
  if (normalized.startsWith('/')) {
    return `${siteRoot}${normalized}`;
  }
  return `${base.replace(/\/+$/, '')}/${normalized}`;
}

function buildMeetApiUrl(source, limit) {
  return `${MEET_API_URL}?current=1&size=${encodeURIComponent(limit)}&siteCode=cn&subjectId=${encodeURIComponent(source.subjectId)}&sortName=${encodeURIComponent(source.sortName)}&order=desc`;
}

function meetDetailUrl(source, record = {}) {
  const subjectCode = String(record.subjectCode || '').split(',').find(Boolean) || '';
  const translatorFile = String(record.translatorFile || '').replace(/^\/+/, '');
  if (!subjectCode || !translatorFile) {
    return source.url;
  }
  return absoluteMeetUrl(source.url, `/cn/${subjectCode}/${translatorFile}`);
}

function normalizeMeetCard(record = {}, index, source) {
  const title = stripTags(record.title || '');
  const district = shortDistrict(record.district || record.address || '');
  const level = stripTags(record.level || '');
  const titleTag = /^\d+A$/i.test(level) ? level : '';
  const displayPlace = district ? `上海 · ${district}` : '上海';
  const sourceUrl = meetDetailUrl(source, record);

  return {
    id: `remote-${source.sourceId}-${String(record.translatorFile || title || index).replace(/[^a-z0-9\u4e00-\u9fa5-]/gi, '-')}`,
    sortOrder: 1000 + index,
    title,
    bubble: source.category,
    badge: source.category,
    walkMinutes: source.category === '生态露营' ? 24 : 18,
    timeLabel: '近期活动',
    place: displayPlace,
    displayPlace,
    tags: [],
    level,
    titleTag,
    hideListTags: true,
    description: stripTags(record.description || record.content || ''),
    free: false,
    noSignup: true,
    quietFriendly: true,
    lowPressureNote: '先看看详情，觉得合适再出发。',
    color: ['mint', 'green', 'peach'][index % 3],
    priceLabel: '查看详情',
    category: source.category,
    image: absoluteMeetUrl(source.url, record.thumbnailPic || record.headPic || record.pics || ''),
    sourceName: source.sourceName,
    sourceUrl,
    district,
    address: stripTags(record.venueName || record.address || district || ''),
    mapX: 20 + (index % 4) * 18,
    mapY: 24 + (index % 5) * 12,
    status: 'published',
    sourceId: source.sourceId,
    sourceType: 'official',
    trustLevel: 'whitelist',
    rawTitle: title,
    rawSummary: stripTags(record.description || record.content || ''),
    rawDateText: '',
    contentNodes: [],
    cardType: 'moment'
  };
}

function requestMeetShanghaiData(source, params = {}, runtimeWx) {
  if (!runtimeWx || typeof runtimeWx.request !== 'function') {
    return Promise.reject(new Error('当前环境无法直接请求官网数据'));
  }
  const limit = params.limit || 30;
  const url = buildMeetApiUrl(source, limit);

  return new Promise((resolve, reject) => {
    runtimeWx.request({
      url,
      method: 'GET',
      timeout: params.fetchTimeout || 10000,
      success(response) {
        if (response.statusCode && response.statusCode >= 400) {
          reject(new Error(`官网接口请求失败：${response.statusCode}`));
          return;
        }
        const records = response.data
          && response.data.data
          && Array.isArray(response.data.data.records)
          ? response.data.data.records
          : [];
        const cards = records
          .map((record, index) => normalizeMeetCard(record, index, source))
          .filter((card) => card.title && card.image);
        resolve({
          cards,
          sync: {
            sourceCount: 1,
            fetchedCount: records.length,
            synced: cards.length,
            sources: [{
              sourceId: source.sourceId,
              name: source.sourceName,
              url: source.url,
              count: cards.length
            }]
          }
        });
      },
      fail(error) {
        reject(error || new Error('官网接口请求失败'));
      }
    });
  });
}

function withOfficialMeetFallback(apiCaller, action, params, source, runtimeWx) {
  const cloudTimeout = params.cloudTimeout || 3500;
  const cloudRequest = Promise.race([
    apiCaller(action, params),
    new Promise((resolve, reject) => setTimeout(() => reject(new Error('timeout')), cloudTimeout))
  ]);

  return cloudRequest.catch(() => requestMeetShanghaiData(source, params, runtimeWx));
}

function withFallback(request, fallback) {
  return request().catch((error) => {
    if (!shouldUseFallback(error)) {
      throw error;
    }
    console.warn('[hotspot] 云端接口暂不可用，使用本地预览数据：', error.message || error);
    return fallback();
  });
}

function getStorage(storageApi) {
  if (storageApi) {
    return storageApi;
  }
  if (typeof wx !== 'undefined' && wx.getStorageSync && wx.setStorageSync) {
    return wx;
  }
  return null;
}

function readCache(storage, key) {
  if (!storage) {
    return null;
  }
  try {
    const cached = storage.getStorageSync(key) || null;
    if (!cached || cached.version !== CACHE_VERSION) {
      return null;
    }
    return cached.data || null;
  } catch (error) {
    return null;
  }
}

function writeCache(storage, key, value) {
  if (!storage) {
    return;
  }
  try {
    storage.setStorageSync(key, {
      version: CACHE_VERSION,
      data: value
    });
  } catch (error) {
    // Ignore cache write failures; page rendering must not depend on storage.
  }
}

function createHotspotService(apiCaller = callCloudApi, storageApi) {
  const storage = getStorage(storageApi);
  const runtimeWx = storageApi || (typeof wx !== 'undefined' ? wx : null);

  function localFirst(action, params, cacheKey, fallback) {
    const cached = readCache(storage, cacheKey);
    const initial = cached || fallback();

    apiCaller(action, params)
      .then((data) => {
        if (data) {
          writeCache(storage, cacheKey, data);
        }
      })
      .catch((error) => {
        if (!shouldUseFallback(error)) {
          console.warn('[hotspot] 云端接口刷新失败：', error.message || error);
        }
      });

    return Promise.resolve(initial);
  }

  function getHomeData(params = {}) {
    return localFirst('getHomeData', params, 'hotspot:home', fallbackData.asHomeData);
  }

  function getBrowseData(params = {}) {
    return localFirst('getBrowseData', params, 'hotspot:browse', fallbackData.asBrowseData);
  }

  function getParkActivityData(params = {}) {
    return apiCaller('getParkActivityData', params);
  }

  function getCityWalkData(params = {}) {
    return apiCaller('getCityWalkData', params);
  }

  function getHeritageTownData(params = {}) {
    return withOfficialMeetFallback(apiCaller, MEET_SOURCES.heritageTown.action, params, MEET_SOURCES.heritageTown, runtimeWx);
  }

  function getScenicAreaData(params = {}) {
    return withOfficialMeetFallback(apiCaller, MEET_SOURCES.scenicArea.action, params, MEET_SOURCES.scenicArea, runtimeWx);
  }

  function getEcoCampingData(params = {}) {
    return withOfficialMeetFallback(apiCaller, MEET_SOURCES.ecoCamping.action, params, MEET_SOURCES.ecoCamping, runtimeWx);
  }

  function getMapData(params = {}) {
    return localFirst('getMapData', params, 'hotspot:map', fallbackData.asMapData);
  }

  function getReasonsData(params = {}) {
    return localFirst('getReasonsData', params, 'hotspot:reasons', fallbackData.asReasonsData);
  }

  function getMineData(params = {}) {
    return localFirst('getMineData', params, 'hotspot:mine', fallbackData.asMineData);
  }

  function savePreferences(preferences) {
    return withFallback(
      () => apiCaller('savePreferences', { preferences }),
      () => ({ preferences })
    );
  }

  function getDetail(type, id) {
    return withFallback(
      () => apiCaller('getDetail', { type, id }),
      () => fallbackData.getDetail(type, id)
    );
  }

  function syncActivities(params = {}) {
    return apiCaller('syncActivities', params);
  }

  function ping(params = {}) {
    return apiCaller('ping', params);
  }

  function debugDatabase(params = {}) {
    return apiCaller('debugDatabase', params);
  }

  return {
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
    syncActivities
  };
}

module.exports = {
  ...createHotspotService(),
  createHotspotService
};
