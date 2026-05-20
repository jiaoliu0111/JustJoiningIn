const mock = require('../../data/mock.js');

const filters = [
  { id: 'free', label: '免费' },
  { id: 'near', label: '步行 10 分钟内' },
  { id: 'now', label: '现在开始' },
  { id: 'nosignup', label: '不用报名' },
  { id: 'passby', label: '路过看看' },
  { id: 'quiet', label: '安静友好' }
];

function toCards() {
  return [
    ...mock.nearbyMoments.map((item) => ({ ...item, cardType: 'moment', badge: item.bubble, displayTime: item.timeLabel, displayPlace: item.place })),
    ...mock.routes.map((item) => ({ ...item, cardType: 'route', badge: '顺路路线', displayTime: item.duration, displayPlace: item.difficulty, walkMinutes: Math.round(item.distance * 6) }))
  ];
}

function matches(card, activeFilter) {
  if (!activeFilter) {
    return true;
  }
  if (activeFilter === 'free') {
    return card.free === true || (card.tags || []).includes('免费');
  }
  if (activeFilter === 'near') {
    return card.walkMinutes <= 10;
  }
  if (activeFilter === 'now') {
    return /现在|正在/.test(card.timeLabel || card.displayTime || '');
  }
  if (activeFilter === 'nosignup') {
    return card.noSignup === true || (card.tags || []).includes('不用报名');
  }
  if (activeFilter === 'passby') {
    return (card.tags || []).includes('路过看看也行') || (card.tags || []).includes('看看就行');
  }
  if (activeFilter === 'quiet') {
    return card.quietFriendly === true || (card.tags || []).includes('安静友好');
  }
  return true;
}

Page({
  data: {
    filters,
    activeFilter: '',
    cards: toCards(),
    visibleCards: toCards()
  },

  selectFilter(event) {
    const id = event.currentTarget.dataset.id;
    const activeFilter = this.data.activeFilter === id ? '' : id;
    this.setData({
      activeFilter,
      visibleCards: this.data.cards.filter((card) => matches(card, activeFilter))
    });
  },

  openDetail(event) {
    const { type, id } = event.currentTarget.dataset;
    wx.navigateTo({
      url: `/pages/detail/detail?type=${type}&id=${id}`
    });
  }
});
