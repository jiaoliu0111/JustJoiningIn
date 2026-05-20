const { findDetail, detailTitle, groupProgress } = require('../../utils/format.js');

Page({
  data: {
    type: '',
    detail: null,
    title: '详情',
    primaryText: '去这里凑热闹',
    meta: []
  },

  onLoad(options) {
    const type = options.type || '';
    const detail = findDetail(type, options.id);
    const title = detailTitle(type);
    this.setData({
      type,
      detail,
      title,
      primaryText: this.primaryText(type),
      meta: this.buildMeta(type, detail)
    });
    wx.setNavigationBarTitle({
      title
    });
  },

  primaryText(type) {
    if (type === 'route') {
      return '开始这条路线';
    }
    if (type === 'group') {
      return '加入这个凑局';
    }
    return '去这里凑热闹';
  },

  buildMeta(type, detail) {
    if (!detail) {
      return [];
    }
    if (type === 'activity') {
      return [detail.time, detail.place, detail.source, `${detail.distance}km`];
    }
    if (type === 'hotspot') {
      return [detail.type, `热度 ${detail.heat}`, `${detail.activeGroups} 个凑局`, `${detail.distance}km`];
    }
    if (type === 'route') {
      return [detail.duration, detail.difficulty, `${detail.distance}km`];
    }
    if (type === 'group') {
      return [detail.place, groupProgress(detail), detail.duration, `${detail.distance}km`];
    }
    return [];
  },

  takeAction() {
    if (this.data.type === 'group') {
      wx.showToast({
        title: '已加入，轻松点',
        icon: 'none'
      });
      return;
    }
    if (this.data.type === 'route') {
      wx.showToast({
        title: '出门清单已备好',
        icon: 'none'
      });
      return;
    }
    wx.switchTab({
      url: '/pages/group/group'
    });
  }
});
