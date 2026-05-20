const mock = require('../../data/mock.js');

Page({
  data: {
    launchStates: mock.launchStates,
    activities: mock.activities.slice(0, 2),
    hotspots: mock.hotspots,
    routes: mock.routes.slice(0, 2),
    groups: mock.groups.slice(0, 2),
    checklist: mock.checklist
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
