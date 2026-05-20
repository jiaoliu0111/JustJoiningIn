const mock = require('../../data/mock.js');

Page({
  data: {
    preferences: mock.preferences,
    checklist: mock.checklist,
    distances: [1, 3, 5]
  },

  selectDistance(event) {
    this.setData({
      'preferences.maxDistance': Number(event.currentTarget.dataset.value)
    });
  },

  togglePreference(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`preferences.${key}`]: event.detail.value
    });
  }
});
