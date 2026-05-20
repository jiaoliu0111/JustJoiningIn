const mock = require('../data/mock.js');

const collections = {
  activity: mock.activities,
  hotspot: mock.hotspots,
  route: mock.routes,
  group: mock.groups
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
    activity: '官方活动',
    hotspot: '附近热闹',
    route: '放空路线',
    group: '临时凑局'
  }[type] || '详情';
}

function joinTags(tags) {
  return Array.isArray(tags) ? tags.join(' · ') : '';
}

function groupProgress(group) {
  return `${group.members}/${group.capacity} 人 · ${group.status}`;
}

module.exports = {
  findDetail,
  detailTitle,
  joinTags,
  groupProgress
};
