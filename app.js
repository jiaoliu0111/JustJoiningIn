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
