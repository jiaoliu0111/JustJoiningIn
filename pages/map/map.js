const hotspotService = require('../../services/hotspot.js');

Page({
  data: {
    moments: [],
    selectedMoment: null,
    loading: true,
    errorText: ''
  },

  onLoad() {
    this.loadMapData();
  },

  loadMapData() {
    this.setData({
      loading: true,
      errorText: ''
    });

    hotspotService.getMapData({
      city: '上海'
    }).then((data) => {
      const moments = data.moments || [];
      this.setData({
        moments,
        selectedMoment: moments[0] || null,
        loading: false
      });
    }).catch(() => {
      this.setData({
        loading: false,
        errorText: '地图数据暂时加载失败'
      });
    });
  },

  selectMoment(event) {
    const id = event.currentTarget.dataset.id;
    const selectedMoment = this.data.moments.find((item) => item.id === id);
    this.setData({
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
  }
});
