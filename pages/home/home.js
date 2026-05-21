const hotspotService = require('../../services/hotspot.js');
const { formatHomeClock } = require('../../utils/time.js');

Page({
  data: {
    moments: [],
    featuredMoments: [],
    routes: [],
    reasons: [],
    checklist: [],
    currentDate: '',
    currentWeekday: '',
    currentTime: '',
    loading: true,
    errorText: ''
  },

  onLoad() {
    this.updateClock();
    this.loadHomeData();
  },

  onShow() {
    this.startClock();
  },

  onHide() {
    this.stopClock();
  },

  onUnload() {
    this.stopClock();
  },

  updateClock() {
    this.setData(formatHomeClock());
  },

  startClock() {
    this.stopClock();
    this.updateClock();
    this.clockTimer = setInterval(() => {
      this.updateClock();
    }, 60000);
  },

  stopClock() {
    if (this.clockTimer) {
      clearInterval(this.clockTimer);
      this.clockTimer = null;
    }
  },

  loadHomeData() {
    this.setData({
      loading: true,
      errorText: ''
    });

    hotspotService.getHomeData({
      city: '上海',
      radiusKm: 3
    }).then((data) => {
      const moments = data.moments || [];
      const routes = data.routes || [];
      this.setData({
        moments,
        featuredMoments: data.featuredMoments || moments.slice(0, 3),
        routes: routes.slice(0, 2),
        reasons: data.reasons || [],
        checklist: data.checklist || [],
        loading: false
      });
    }).catch(() => {
      this.setData({
        loading: false,
        errorText: '附近小热闹暂时加载失败'
      });
    });
  },

  goReason() {
    wx.switchTab({
      url: '/pages/group/group'
    });
  },

  goBustle() {
    wx.switchTab({
      url: '/pages/bustle/bustle'
    });
  },

  openDetail(event) {
    const { type, id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?type=${type}&id=${id}`
    });
  }
});
