function detailTitle(type) {
  return {
    moment: '附近小热闹',
    reason: '推荐去处',
    route: '放空路线',
  }[type] || '详情';
}

function joinTags(tags) {
  return Array.isArray(tags) ? tags.join(' · ') : '';
}

module.exports = {
  detailTitle,
  joinTags
};
