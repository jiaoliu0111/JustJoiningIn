const hotspotService = require('../../services/hotspot.js');
const mapConfig = require('../../config/map.js');

const DEFAULT_LOCATION = {
  latitude: 31.2304,
  longitude: 121.4737
};

const filters = [
  { id: 'parkActivities', label: '公园活动' },
  { id: 'cityWalk', label: '城市漫步' },
  { id: 'heritageTown', label: '非遗古镇' },
  { id: 'scenicArea', label: 'A级景区' },
  { id: 'ecoCamping', label: '生态露营' }
];

function matches(card, activeFilter) {
  if (!activeFilter) {
    return true;
  }
  const text = `${card.title || ''} ${card.description || ''} ${(card.tags || []).join(' ')} ${card.place || ''} ${card.address || ''} ${card.displayPlace || ''}`;
  if (activeFilter === 'parkActivities') {
    return card.category === '公园活动' || card.sourceId === 'source-shanghai-park-activities';
  }
  if (activeFilter === 'cityWalk') {
    if (card.category === '城市漫步' || card.sourceId === 'source-meet-shanghai-city-walk') {
      return true;
    }
    return /漫步|步行|路线|散步|街|walk/i.test(text);
  }
  if (activeFilter === 'heritageTown') {
    if (card.category === '非遗古镇' || card.sourceId === 'source-meet-shanghai-heritage-town') {
      return true;
    }
    return false;
  }
  if (activeFilter === 'scenicArea') {
    return card.category === 'A级景区' || card.sourceId === 'source-meet-shanghai-a-grade-tourist-attraction';
  }
  if (activeFilter === 'ecoCamping') {
    return card.category === '生态露营' || card.sourceId === 'source-meet-shanghai-eco-camping-tourism';
  }
  return true;
}

function filterLabel(id) {
  const filter = filters.find((item) => item.id === id);
  return filter ? filter.label : '热闹';
}

function toNumber(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCoordinate(card = {}) {
  const latitude = toNumber(card.latitude || card.lat);
  const longitude = toNumber(card.longitude || card.lng);
  if (latitude && longitude) {
    return {
      latitude,
      longitude,
      locationApproximate: false
    };
  }
  return null;
}

function fallbackCoordinates(card = {}) {
  const mapX = toNumber(card.mapX) || 52;
  const mapY = toNumber(card.mapY) || 48;
  return {
    latitude: Number((DEFAULT_LOCATION.latitude + (50 - mapY) * 0.0022).toFixed(6)),
    longitude: Number((DEFAULT_LOCATION.longitude + (mapX - 50) * 0.0026).toFixed(6)),
    locationApproximate: true
  };
}

function isDevtoolsRuntime() {
  try {
    const info = wx.getSystemInfoSync ? wx.getSystemInfoSync() : {};
    return info.platform === 'devtools';
  } catch (error) {
    return false;
  }
}

Page({
  data: {
    filters,
    activeFilter: 'parkActivities',
    activeFilterLabel: '公园活动',
    cards: [],
    categoryCache: {},
    visibleCards: [],
    loading: true,
    errorText: ''
  },

  onLoad() {
    const pendingFilter = this.readPendingFilter();
    this.activateFilter(pendingFilter || this.data.activeFilter);
  },

  onShow() {
    const pendingFilter = this.readPendingFilter();
    if (pendingFilter) {
      this.activateFilter(pendingFilter);
    }
  },

  readPendingFilter() {
    try {
      const pendingFilter = wx.getStorageSync('hotspot:targetFilter');
      if (pendingFilter) {
        wx.removeStorageSync('hotspot:targetFilter');
      }
      return pendingFilter || '';
    } catch (error) {
      return '';
    }
  },

  activateFilter(activeFilter, options = {}) {
    const cachedCards = this.getCachedCategoryCards(activeFilter);
    if (cachedCards) {
      this.setData({
        activeFilter,
        activeFilterLabel: filterLabel(activeFilter),
        visibleCards: cachedCards,
        loading: false,
        errorText: ''
      }, () => {
        if (options.resetScroll) {
          this.resetListScroll();
        }
      });
      return;
    }

    this.setData({
      activeFilter,
      activeFilterLabel: filterLabel(activeFilter),
      visibleCards: this.data.cards.filter((card) => matches(card, activeFilter))
    }, () => {
      if (options.resetScroll) {
        this.resetListScroll();
      }
    });
    if (activeFilter === 'parkActivities') {
      this.loadParkActivityData();
      return;
    }
    if (activeFilter === 'heritageTown') {
      this.loadHeritageTownData();
      return;
    }
    if (activeFilter === 'scenicArea') {
      this.loadScenicAreaData();
      return;
    }
    if (activeFilter === 'ecoCamping') {
      this.loadEcoCampingData();
      return;
    }
    if (activeFilter === 'cityWalk') {
      this.loadCityWalkData(activeFilter);
    }
  },

  resetListScroll() {
    if (wx.pageScrollTo) {
      wx.pageScrollTo({
        scrollTop: 0,
        duration: 0
      });
    }
  },

  getCachedCategoryCards(activeFilter) {
    const categoryCache = this.data.categoryCache || {};
    if (!activeFilter || !Object.prototype.hasOwnProperty.call(categoryCache, activeFilter)) {
      return null;
    }
    return categoryCache[activeFilter] || [];
  },

  setCategoryCards(activeFilter, cards) {
    const categoryCards = cards || [];
    const categoryCache = {
      ...(this.data.categoryCache || {}),
      [activeFilter]: categoryCards
    };
    const existingIds = new Set(categoryCards.map((card) => card.id));
    const mergedCards = [
      ...categoryCards,
      ...this.data.cards.filter((card) => !existingIds.has(card.id))
    ];
    const visibleCards = this.data.activeFilter === activeFilter
      ? categoryCards
      : mergedCards.filter((card) => matches(card, this.data.activeFilter));

    this.setData({
      categoryCache,
      cards: mergedCards,
      visibleCards,
      loading: false,
      errorText: ''
    });
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
    this.activateFilter(activeFilter, { resetScroll: true });
  },

  loadParkActivityData() {
    this.setData({
      loading: true,
      errorText: ''
    });

    hotspotService.getParkActivityData({
      city: '上海',
      limit: 60,
      fetchTimeout: 10000
    }).then((data) => {
      const parkCards = data.cards || [];
      this.setCategoryCards('parkActivities', parkCards);
    }).catch(() => {
      this.setData({
        loading: false,
        errorText: '公园活动暂时没加载出来'
      });
    });
  },

  loadCityWalkData(activeFilter = 'cityWalk') {
    this.setData({
      loading: true,
      errorText: ''
    });

    hotspotService.getCityWalkData({
      city: '上海',
      limit: 30,
      fetchTimeout: 10000
    }).then((data) => {
      const cityWalkCards = data.cards || [];
      this.setCategoryCards(activeFilter, cityWalkCards);
    }).catch(() => {
      this.setData({
        loading: false,
        errorText: '城市漫步暂时没加载出来'
      });
    });
  },

  loadHeritageTownData() {
    this.setData({
      loading: true,
      errorText: ''
    });

    hotspotService.getHeritageTownData({
      city: '上海',
      limit: 30,
      fetchTimeout: 10000
    }).then((data) => {
      const heritageCards = data.cards || [];
      this.setCategoryCards('heritageTown', heritageCards);
    }).catch(() => {
      this.setData({
        loading: false,
        errorText: '非遗古镇暂时没加载出来'
      });
    });
  },

  loadScenicAreaData() {
    this.setData({
      loading: true,
      errorText: ''
    });

    hotspotService.getScenicAreaData({
      city: '上海',
      limit: 30,
      fetchTimeout: 10000
    }).then((data) => {
      const scenicCards = data.cards || [];
      this.setCategoryCards('scenicArea', scenicCards);
    }).catch(() => {
      this.setData({
        loading: false,
        errorText: 'A级景区暂时没加载出来'
      });
    });
  },

  loadEcoCampingData() {
    this.setData({
      loading: true,
      errorText: ''
    });

    hotspotService.getEcoCampingData({
      city: '上海',
      limit: 30,
      fetchTimeout: 10000
    }).then((data) => {
      const campingCards = data.cards || [];
      this.setCategoryCards('ecoCamping', campingCards);
    }).catch(() => {
      this.setData({
        loading: false,
        errorText: '生态露营暂时没加载出来'
      });
    });
  },

  openDetail(event) {
    const { type, id } = event.currentTarget.dataset;
    const card = this.data.cards.find((card) => card.id === id);
    if (card) {
      wx.setStorageSync('hotspot:selectedDetail', {
        type,
        id,
        detail: card
      });
    }
    wx.navigateTo({
      url: `/pages/detail/detail?type=${type}&id=${id}`
    });
  },

  navigateToMap(event) {
    const { id } = event.currentTarget.dataset;
    const card = this.data.cards.find((card) => card.id === id);
    if (card) {
      this.resolveCardLocation(card).then((locatedCard) => {
        if (isDevtoolsRuntime()) {
          wx.showModal({
            title: '请用真机导航',
            content: '开发者工具不支持调起地图导航，真机预览时点击这里会打开微信原生地图。',
            showCancel: false
          });
          return;
        }
        wx.openLocation({
          latitude: locatedCard.latitude,
          longitude: locatedCard.longitude,
          name: locatedCard.title,
          address: locatedCard.address || locatedCard.place || locatedCard.displayPlace || '',
          scale: 18
        });
      });
      return;
    }
    wx.showToast({
      title: '地点信息暂时不可用',
      icon: 'none'
    });
  },

  resolveCardLocation(card) {
    const normalized = normalizeCoordinate(card);
    if (normalized) {
      return Promise.resolve({
        ...card,
        ...normalized
      });
    }

    const address = card.address || card.place || card.displayPlace || '';
    const tencentMapKey = mapConfig.tencentMapKey;
    if (!address || !tencentMapKey) {
      return Promise.resolve({
        ...card,
        ...fallbackCoordinates(card)
      });
    }

    return new Promise((resolve) => {
      wx.request({
        url: 'https://apis.map.qq.com/ws/geocoder/v1/',
        data: {
          address,
          key: tencentMapKey
        },
        success: (response) => {
          const location = response.data
            && response.data.result
            && response.data.result.location;
          if (location && location.lat && location.lng) {
            resolve({
              ...card,
              latitude: Number(location.lat),
              longitude: Number(location.lng),
              locationApproximate: false
            });
            return;
          }
          resolve({
            ...card,
            ...fallbackCoordinates(card)
          });
        },
        fail: () => {
          resolve({
            ...card,
            ...fallbackCoordinates(card)
          });
        }
      });
    });
  }
});
