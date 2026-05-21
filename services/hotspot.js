const { callCloudApi } = require('./cloud.js');
const fallbackData = require('./fallback-data.js');

function shouldUseFallback(error) {
  const message = error && error.message ? error.message : '';
  return /timeout|fail|云开发|云函数|network|未初始化/i.test(message);
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

function createHotspotService(apiCaller = callCloudApi) {
  function getHomeData(params = {}) {
    return withFallback(
      () => apiCaller('getHomeData', params),
      fallbackData.asHomeData
    );
  }

  function getBrowseData(params = {}) {
    return withFallback(
      () => apiCaller('getBrowseData', params),
      fallbackData.asBrowseData
    );
  }

  function getMapData(params = {}) {
    return withFallback(
      () => apiCaller('getMapData', params),
      fallbackData.asMapData
    );
  }

  function getReasonsData(params = {}) {
    return withFallback(
      () => apiCaller('getReasonsData', params),
      fallbackData.asReasonsData
    );
  }

  function getMineData(params = {}) {
    return withFallback(
      () => apiCaller('getMineData', params),
      fallbackData.asMineData
    );
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
