const hotspotService = require('../../services/hotspot.js');
const { detailTitle } = require('../../utils/format.js');

Page({
  data: {
    type: '',
    detail: null,
    title: '详情',
    primaryText: '去这里凑热闹',
    meta: [],
    loading: true,
    errorText: ''
  },

  onLoad(options) {
    const type = options.type || '';
    const title = detailTitle(type);
    this.setData({
      type,
      title,
      primaryText: this.primaryText(type)
    });
    wx.setNavigationBarTitle({
      title
    });
    this.loadDetail(type, options.id);
  },

  loadDetail(type, id) {
    this.setData({
      loading: true,
      errorText: ''
    });

    hotspotService.getDetail(type, id).then((detail) => {
      this.setData({
        detail,
        meta: this.buildMeta(type, detail),
        loading: false
      });
    }).catch(() => {
      this.setData({
        detail: null,
        loading: false,
        errorText: '详情暂时加载失败'
      });
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
