App({
  globalData: {
    activeGroup: null,
    preferences: {
      maxDistance: 3,
      anonymous: true,
      quietFriendly: true,
      weekendReminder: true
    }
  },

  setActiveGroup(group) {
    this.globalData.activeGroup = group;
  },

  updatePreferences(nextPreferences) {
    this.globalData.preferences = {
      ...this.globalData.preferences,
      ...nextPreferences
    };
  }
});
