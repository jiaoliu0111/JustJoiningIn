const mock = require('../../data/mock.js');

Page({
  data: {
    launchStates: mock.launchStates,
    groups: mock.groups,
    selectedState: mock.launchStates[0].id,
    selectedTitle: mock.launchStates[0].title,
    quiet: true,
    duration: '1 小时',
    matched: false,
    dissolved: false,
    matchMembers: ['附近慢走的人', '想静音同走的人']
  },

  selectState(event) {
    const selectedState = event.currentTarget.dataset.id;
    const state = this.data.launchStates.find((item) => item.id === selectedState);
    this.setData({
      selectedState,
      selectedTitle: state.title,
      matched: false,
      dissolved: false
    });
  },

  toggleQuiet(event) {
    this.setData({
      quiet: event.detail.value
    });
  },

  selectDuration(event) {
    this.setData({
      duration: event.currentTarget.dataset.value,
      matched: false,
      dissolved: false
    });
  },

  publishGroup() {
    this.setData({
      matched: true,
      dissolved: false
    });
    wx.showToast({
      title: '匹配到同频搭子',
      icon: 'none'
    });
  },

  dissolveGroup() {
    this.setData({
      dissolved: true,
      matched: false
    });
    wx.showToast({
      title: '已体面散局',
      icon: 'none'
    });
  },

  openDetail(event) {
    wx.navigateTo({
      url: `/pages/detail/detail?type=group&id=${event.currentTarget.dataset.id}`
    });
  }
});
