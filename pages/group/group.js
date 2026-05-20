const mock = require('../../data/mock.js');

Page({
  data: {
    reasons: mock.reasonCards,
    moments: mock.nearbyMoments,
    selectedIndex: 0,
    selectedReason: mock.reasonCards[0],
    selectedMoment: mock.nearbyMoments.find((item) => item.id === mock.reasonCards[0].momentId)
  },

  pickReason(event) {
    const selectedIndex = Number(event.currentTarget.dataset.index);
    const selectedReason = this.data.reasons[selectedIndex];
    const selectedMoment = this.data.moments.find((item) => item.id === selectedReason.momentId);
    this.setData({
      selectedIndex,
      selectedReason,
      selectedMoment
    });
  },

  shuffleReason() {
    const nextIndex = (this.data.selectedIndex + 1) % this.data.reasons.length;
    const selectedReason = this.data.reasons[nextIndex];
    const selectedMoment = this.data.moments.find((item) => item.id === selectedReason.momentId);
    this.setData({
      selectedIndex: nextIndex,
      selectedReason,
      selectedMoment
    });
  },

  openSelected() {
    wx.navigateTo({
      url: `/pages/detail/detail?type=moment&id=${this.data.selectedMoment.id}`
    });
  },

  openReason(event) {
    wx.navigateTo({
      url: `/pages/detail/detail?type=reason&id=${event.currentTarget.dataset.id}`
    });
  }
});
