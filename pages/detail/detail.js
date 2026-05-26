const hotspotService = require('../../services/hotspot.js');
const { detailTitle } = require('../../utils/format.js');

function hasArticleContent(detail) {
  return !!(detail && detail.contentNodes && detail.contentNodes.length);
}

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
    const snapshot = this.readSelectedDetail(type, id);
    this.setData({
      detail: snapshot,
      meta: this.buildMeta(type, snapshot),
      loading: !hasArticleContent(snapshot),
      errorText: ''
    });

    hotspotService.getDetail(type, id).then((detail) => {
      const nextDetail = detail || snapshot;
      this.setData({
        detail: nextDetail,
        meta: this.buildMeta(type, nextDetail),
        loading: false
      });
    }).catch(() => {
      if (snapshot) {
        this.setData({
          detail: snapshot,
          meta: this.buildMeta(type, snapshot),
          loading: false,
          errorText: ''
        });
        return;
      }
      this.setData({
        detail: null,
        loading: false,
        errorText: '详情暂时加载失败'
      });
    });
  },

  readSelectedDetail(type, id) {
    try {
      const stored = wx.getStorageSync('hotspot:selectedDetail');
      if (stored && stored.type === type && stored.id === id) {
        return stored.detail || null;
      }
    } catch (error) {
      return null;
    }
    return null;
  },

  primaryText(type) {
    if (type === 'route') {
      return '导航到这里';
    }
    return '导航到这里';
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
