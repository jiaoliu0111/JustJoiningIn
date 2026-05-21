const hotspotService = require('../../services/hotspot.js');

const filters = [
  { id: 'city', label: '本市热门' },
  { id: 'district', label: '本区热门' },
  { id: 'nearby', label: '附近热门' }
];

function matches(card, activeFilter) {
  if (!activeFilter) {
    return true;
  }
  if (activeFilter === 'city') {
    return card.category === '本市热门' || card.free === true;
  }
  if (activeFilter === 'district') {
    return card.category === '本区热门' || card.walkMinutes <= 12;
  }
  if (activeFilter === 'nearby') {
    return card.category === '附近热门' || card.walkMinutes <= 10;
  }
  return true;
}

function filterLabel(id) {
  const filter = filters.find((item) => item.id === id);
  return filter ? filter.label : '热闹';
}

Page({
  data: {
    filters,
    activeFilter: 'city',
    activeFilterLabel: '本市热门',
    cards: [],
    visibleCards: [],
    loading: true,
    errorText: ''
  },

  onLoad() {
    this.loadBrowseData();
  },

  loadBrowseData() {
    this.setData({
      loading: true,
      errorText: ''
    });

    hotspotService.getBrowseData({
      city: '上海'
    }).then((data) => {
      const cards = data.cards || [];
      this.setData({
        cards,
        visibleCards: cards.filter((card) => matches(card, this.data.activeFilter)),
        loading: false
      });
    }).catch(() => {
      this.setData({
        loading: false,
        errorText: '附近热闹暂时加载失败'
      });
    });
  },

  selectFilter(event) {
    const id = event.currentTarget.dataset.id;
    const activeFilter = this.data.activeFilter === id ? '' : id;
    this.setData({
      activeFilter,
      activeFilterLabel: filterLabel(activeFilter),
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
