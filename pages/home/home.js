const mock = require('../../data/mock.js');
const { formatHomeClock } = require('../../utils/time.js');

Page({
  data: {
    moments: mock.nearbyMoments,
    featuredMoments: mock.nearbyMoments.slice(0, 3),
    routes: mock.routes.slice(0, 2),
    reasons: mock.reasonCards,
    checklist: mock.checklist,
    currentDate: '',
    currentWeekday: '',
    currentTime: ''
  },

  onLoad() {
    this.updateClock();
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
