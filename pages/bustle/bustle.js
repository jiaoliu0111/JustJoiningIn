const mock = require('../../data/mock.js');

const filters = [
  { id: 'free', label: '免费' },
  { id: 'near', label: '3km 内' },
  { id: 'weekend', label: '周末' },
  { id: 'quiet', label: '静音友好' },
  { id: 'park', label: '公园活动' },
  { id: 'community', label: '社区活动' }
];

function toCards() {
  return [
    ...mock.activities.map((item) => ({ ...item, cardType: 'activity', badge: item.category })),
    ...mock.hotspots.map((item) => ({ ...item, cardType: 'hotspot', badge: item.type, time: '现在热度' })),
    ...mock.routes.map((item) => ({ ...item, cardType: 'route', badge: '放空路线', time: item.duration }))
  ];
}

function matches(card, activeFilter) {
  if (!activeFilter) {
    return true;
  }
  if (activeFilter === 'free') {
    return card.free === true || (card.tags || []).includes('免费逛');
  }
  if (activeFilter === 'near') {
    return card.distance <= 3;
  }
  if (activeFilter === 'weekend') {
    return (card.tags || []).includes('周末') || /周/.test(card.time || '');
  }
  if (activeFilter === 'quiet') {
    return card.quietFriendly === true || (card.tags || []).includes('静音友好');
  }
  if (activeFilter === 'park') {
    return card.category === '公园活动' || card.type === '社区公园';
  }
  if (activeFilter === 'community') {
    return card.category === '社区活动' || card.type === '社区热闹';
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
