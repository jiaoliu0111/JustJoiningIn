const mock = require('../data/mock.js');

const collections = {
  moment: mock.nearbyMoments,
  reason: mock.reasonCards,
  route: mock.routes,
};

function findDetail(type, id) {
  const list = collections[type];
  if (!list) {
    return null;
  }
  return list.find((item) => item.id === id) || null;
}

function detailTitle(type) {
  return {
    moment: '附近小热闹',
    reason: '出门理由',
    route: '放空路线',
  }[type] || '详情';
}

function joinTags(tags) {
  return Array.isArray(tags) ? tags.join(' · ') : '';
}

module.exports = {
  findDetail,
  detailTitle,
  joinTags
};
