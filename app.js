const cloudConfig = require('./config/cloud.js');

App({
  globalData: {
    activeReason: null,
    preferences: {
      freeOnly: true,
      walkMinutes: 10,
      noSignupFirst: true,
      quietFriendly: true,
      gentleReminder: true
    }
  },

  onLaunch() {
    if (wx.cloud) {
      const options = {
        traceUser: true
      };
      if (cloudConfig.envId) {
        options.env = cloudConfig.envId;
      }
      wx.cloud.init(options);
    }
  },

  setActiveReason(reason) {
    this.globalData.activeReason = reason;
  },

  updatePreferences(nextPreferences) {
    this.globalData.preferences = {
      ...this.globalData.preferences,
      ...nextPreferences
    };
  }
});
