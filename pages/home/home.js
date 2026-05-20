const mock = require('../../data/mock.js');
const { formatHomeClock } = require('../../utils/time.js');

Page({
  data: {
    launchStates: mock.launchStates,
    activities: mock.activities.slice(0, 2),
    hotspots: mock.hotspots,
    routes: mock.routes.slice(0, 2),
    groups: mock.groups.slice(0, 2),
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

  goGroup() {
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
