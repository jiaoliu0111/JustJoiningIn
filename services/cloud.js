const API_FUNCTION_NAME = 'hotspotApi';

function getWx(wxApi) {
  if (wxApi) {
    return wxApi;
  }
  if (typeof wx !== 'undefined') {
    return wx;
  }
  return null;
}

function callCloudApi(action, payload = {}, wxApi) {
  const runtimeWx = getWx(wxApi);

  if (!runtimeWx || !runtimeWx.cloud || typeof runtimeWx.cloud.callFunction !== 'function') {
    return Promise.reject(new Error('云开发还没有初始化，请先配置微信云开发环境。'));
  }

  return runtimeWx.cloud.callFunction({
    name: API_FUNCTION_NAME,
    data: {
      action,
      payload
    }
  }).then((response) => {
    const result = response && response.result ? response.result : {};
    if (!result.ok) {
      throw new Error(result.message || '云函数请求失败');
    }
    return result.data;
  });
}

module.exports = {
  API_FUNCTION_NAME,
  callCloudApi
};
