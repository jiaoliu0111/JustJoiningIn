const hotspotService = require('../../services/hotspot.js');

Page({
  data: {
    preferences: {
      freeOnly: true,
      walkMinutes: 10,
      noSignupFirst: true,
      quietFriendly: true,
      gentleReminder: true
    },
    checklist: [],
    walkMinutes: [6, 10, 15],
    loading: true,
    errorText: ''
  },

  onLoad() {
    this.loadMineData();
  },

  loadMineData() {
    this.setData({
      loading: true,
      errorText: ''
    });

    hotspotService.getMineData().then((data) => {
      this.setData({
        preferences: data.preferences || this.data.preferences,
        checklist: data.checklist || [],
        loading: false
      });
    }).catch(() => {
      this.setData({
        loading: false,
        errorText: '偏好设置暂时加载失败'
      });
    });
  },

  selectWalkMinutes(event) {
    const preferences = {
      ...this.data.preferences,
      walkMinutes: Number(event.currentTarget.dataset.value)
    };
    this.setData({
      preferences
    });
    this.savePreferences(preferences);
  },

  togglePreference(event) {
    const key = event.currentTarget.dataset.key;
    const preferences = {
      ...this.data.preferences,
      [key]: event.detail.value
    };
    this.setData({
      preferences
    });
    this.savePreferences(preferences);
  },

  savePreferences(preferences) {
    hotspotService.savePreferences(preferences).catch(() => {
      wx.showToast({
        title: '偏好保存失败',
        icon: 'none'
      });
    });
  }
});
