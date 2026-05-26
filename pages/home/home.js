const hotspotService = require('../../services/hotspot.js');

const banners = [
  {
    id: 'banner-park',
    title: '初夏公园花展',
    subtitle: '把最近的绿意排进今天',
    image: '/assets/events/park.png',
    badge: '热门活动'
  },
  {
    id: 'banner-market',
    title: '周末趣味市集',
    subtitle: '少规划一点，路过也能逛',
    image: '/assets/events/gallery.png',
    badge: '新开打卡'
  },
  {
    id: 'banner-night',
    title: '夜景漫步路线',
    subtitle: '半小时也能换个心情',
    image: '/assets/events/summer.png',
    badge: '主题游玩'
  }
];

const quickEntries = [
  { id: 'park-activities', label: '公园活动', icon: '', imageIcon: '/assets/icons/park-activities.png', filterId: 'parkActivities' },
  { id: 'city-walk', label: '城市漫步', icon: '', imageIcon: '/assets/icons/city-walk.png', filterId: 'cityWalk' },
  { id: 'heritage-town', label: '非遗古镇', icon: '', imageIcon: '/assets/icons/heritage-town.png', filterId: 'heritageTown' },
  { id: 'scenic-area', label: 'A级景区', icon: '', imageIcon: '/assets/icons/scenic-area.png', filterId: 'scenicArea' },
  { id: 'eco-camping', label: '生态露营', icon: '', imageIcon: '/assets/icons/eco-camping.png', filterId: 'ecoCamping' }
];

function decorateMoment(moment, index = 0) {
  return {
    ...moment,
    distanceLabel: `步行 ${moment.walkMinutes || 10} 分钟`,
    previewTags: (moment.tags || []).slice(0, 3),
    rating: (4.8 - index * 0.1).toFixed(1),
    checkins: 1200 - index * 160
  };
}

function decorateRoute(route) {
  return {
    ...route,
    stopText: (route.stops || []).join(' · '),
    peopleLabel: /亲子|商场|宠物/.test(`${route.title} ${(route.tags || []).join(' ')}`) ? '亲子遛娃' : '单人漫步'
  };
}

Page({
  data: {
    cityName: '上海',
    searchKeyword: '',
    banners: banners,
    quickEntries: quickEntries,
    moments: [],
    nearbyMoments: [],
    popularMoments: [],
    routePlans: [],
    loading: true,
    errorText: ''
  },

  onLoad() {
    this.loadHomeData();
  },

  loadHomeData() {
    this.setData({
      loading: true,
      errorText: ''
    });

    hotspotService.getHomeData({
      city: this.data.cityName,
      radiusKm: 3
    }).then((data) => {
      const moments = (data.moments || []).map(decorateMoment);
      const routes = (data.routes || []).map(decorateRoute);
      this.setData({
        moments,
        nearbyMoments: moments.slice().sort((a, b) => (a.walkMinutes || 99) - (b.walkMinutes || 99)).slice(0, 3),
        popularMoments: moments.slice(0, 4),
        routePlans: routes.slice(0, 3),
        loading: false
      });
    }).catch(() => {
      this.setData({
        loading: false,
        errorText: '今天的推荐暂时加载失败'
      });
    });
  },

  updateSearch(event) {
    this.setData({
      searchKeyword: event.detail.value
    });
  },

  goSearch() {
    wx.switchTab({
      url: '/pages/bustle/bustle'
    });
  },

  switchCity() {
    wx.showToast({
      title: '当前城市：上海',
      icon: 'none'
    });
  },

  openMessages() {
    wx.showToast({
      title: '暂无新消息',
      icon: 'none'
    });
  },

  goBustle() {
    wx.switchTab({
      url: '/pages/bustle/bustle'
    });
  },

  goQuickEntry(event) {
    const { filter } = event.currentTarget.dataset;
    const filterId = filter || 'parkActivities';
    wx.setStorageSync('hotspot:targetFilter', filterId);
    wx.switchTab({
      url: '/pages/bustle/bustle'
    });
  },

  goRecommend() {
    wx.navigateTo({
      url: '/pages/group/group'
    });
  },

  openDetail(event) {
    const { type, id } = event.currentTarget.dataset;
    const card = this.data.moments.find((item) => item.id === id);
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
  }
});
