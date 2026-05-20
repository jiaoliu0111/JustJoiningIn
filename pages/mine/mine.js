const mock = require('../../data/mock.js');

Page({
  data: {
    preferences: mock.preferences,
    checklist: mock.checklist,
    walkMinutes: [6, 10, 15]
  },

  selectWalkMinutes(event) {
    this.setData({
      'preferences.walkMinutes': Number(event.currentTarget.dataset.value)
    });
  },

  togglePreference(event) {
    const key = event.currentTarget.dataset.key;
    this.setData({
      [`preferences.${key}`]: event.detail.value
    });
  }
});
