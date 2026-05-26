const hotspotService = require('../../services/hotspot.js');

Page({
  data: {
    reasons: [],
    moments: [],
    selectedIndex: 0,
    selectedReason: null,
    selectedMoment: null,
    loading: true,
    errorText: ''
  },

  onLoad() {
    this.loadReasonsData();
  },

  loadReasonsData() {
    this.setData({
      loading: true,
      errorText: ''
    });

    hotspotService.getReasonsData({
      city: '上海'
    }).then((data) => {
      this.setData({
        reasons: data.reasons || [],
        moments: data.moments || [],
        selectedIndex: 0,
        selectedReason: data.selectedReason || null,
        selectedMoment: data.selectedMoment || null,
        loading: false
      });
    }).catch(() => {
      this.setData({
        loading: false,
        errorText: '推荐暂时加载失败'
      });
    });
  },

  pickReason(event) {
    const selectedIndex = Number(event.currentTarget.dataset.index);
    const selectedReason = this.data.reasons[selectedIndex];
    if (!selectedReason) {
      return;
    }
    const selectedMoment = this.data.moments.find((item) => item.id === selectedReason.momentId);
    this.setData({
      selectedIndex,
      selectedReason,
      selectedMoment
    });
  },

  shuffleReason() {
    if (!this.data.reasons.length) {
      return;
    }
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
    if (!this.data.selectedMoment) {
      return;
    }
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
