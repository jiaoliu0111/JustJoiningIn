const mock = require('../../data/mock.js');
const { findDetail, detailTitle } = require('../../utils/format.js');

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
    let detail = findDetail(type, options.id);
    if (type === 'reason' && detail) {
      const moment = mock.nearbyMoments.find((item) => item.id === detail.momentId);
      detail = {
        ...detail,
        linkedMoment: moment,
        tags: moment ? moment.tags : [],
        description: moment ? moment.description : detail.subtitle,
        place: moment ? moment.place : '',
        walkMinutes: moment ? moment.walkMinutes : '',
        timeLabel: moment ? moment.timeLabel : '',
        lowPressureNote: moment ? moment.lowPressureNote : ''
      };
    }
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
      return '现在去看看';
    }
    return '现在去看看';
  },

  buildMeta(type, detail) {
    if (!detail) {
      return [];
    }
    if (type === 'moment') {
      return [`步行 ${detail.walkMinutes} 分钟`, detail.timeLabel, detail.place, detail.noSignup ? '不用报名' : '看现场提示'];
    }
    if (type === 'route') {
      return [detail.duration, detail.difficulty, `${detail.distance}km`];
    }
    if (type === 'reason') {
      return [`步行 ${detail.walkMinutes} 分钟`, detail.timeLabel, detail.place, '路过看看也行'];
    }
    return [];
  },

  takeAction() {
    wx.showToast({
      title: '路过看看也行',
      icon: 'none'
    });
  }
});
