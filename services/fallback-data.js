const moments = [
  {
    id: 'preview-coffee',
    sortOrder: 10,
    title: '街角免费咖啡试饮',
    bubble: '免费咖啡',
    walkMinutes: 6,
    timeLabel: '现在开始',
    place: '安福路街角咖啡车',
    tags: ['免费', '步行 6 分钟', '不用报名'],
    description: '云函数还没连上时的预览内容。咖啡车今天做新豆试饮，路过拿一小杯就能走。',
    free: true,
    noSignup: true,
    quietFriendly: true,
    lowPressureNote: '拿一杯就走，不尴尬。',
    color: 'mint',
    priceLabel: '免费参加',
    category: '本市热门',
    image: '/assets/events/summer.png',
    mapX: 30,
    mapY: 34
  },
  {
    id: 'preview-books',
    sortOrder: 20,
    title: '旧书交换小桌',
    bubble: '旧书交换',
    walkMinutes: 9,
    timeLabel: '正在进行',
    place: '社区书店门口',
    tags: ['免费', '不用报名', '室内门口'],
    description: '书店门口摆了旧书交换桌，不带书也能翻一翻，适合短暂停留。',
    free: true,
    noSignup: true,
    quietFriendly: true,
    lowPressureNote: '翻两页就走也自然。',
    color: 'green',
    priceLabel: '免费参加',
    category: '本区热门',
    image: '/assets/events/bookshop.png',
    mapX: 46,
    mapY: 55
  },
  {
    id: 'preview-guitar',
    sortOrder: 30,
    title: '草坪吉他小演出',
    bubble: '草坪吉他',
    walkMinutes: 8,
    timeLabel: '15 分钟后',
    place: '社区公园南草坪',
    tags: ['免费', '现在可去', '站着听也行'],
    description: '两位学生在草坪边弹唱，坐不坐都行，听一首歌就能回家。',
    free: true,
    noSignup: true,
    quietFriendly: true,
    lowPressureNote: '站在边上听一会儿就好。',
    color: 'peach',
    priceLabel: '免费参加',
    category: '附近热门',
    image: '/assets/events/studio.png',
    mapX: 64,
    mapY: 28
  }
];

const reasons = [
  {
    id: 'preview-reason-nearest',
    sortOrder: 10,
    title: '最近的免费理由',
    subtitle: '6 分钟走到街角，拿一杯试饮咖啡。',
    momentId: 'preview-coffee',
    cta: '现在去看看'
  }
];

const routes = [
  {
    id: 'preview-route-corner',
    sortOrder: 10,
    title: '咖啡车到书店门口',
    duration: '35 分钟',
    distance: 1.4,
    difficulty: '很轻松',
    stops: ['街角咖啡车', '社区花坛', '书店门口旧书桌'],
    tags: ['免费', '步行可达', '路过看看也行'],
    description: '两个小热闹顺路串起来，不用规划，走到哪算哪。'
  }
];

const checklist = ['穿舒服的鞋', '带水杯', '轻装出行'];

const preferences = {
  id: 'preferences',
  freeOnly: true,
  walkMinutes: 10,
  noSignupFirst: true,
  quietFriendly: true,
  gentleReminder: true
};

function asBrowseData() {
  return {
    cards: moments.map((item) => ({
      ...item,
      cardType: 'moment',
      badge: item.bubble,
      displayTime: item.timeLabel,
      displayPlace: item.place
    }))
  };
}

function asHomeData() {
  return {
    moments,
    featuredMoments: moments.slice(0, 3),
    reasons,
    routes,
    checklist
  };
}

function asMapData() {
  return {
    moments
  };
}

function asReasonsData() {
  const selectedReason = reasons[0] || null;
  const selectedMoment = selectedReason
    ? moments.find((item) => item.id === selectedReason.momentId) || null
    : null;

  return {
    reasons,
    moments,
    selectedReason,
    selectedMoment
  };
}

function asMineData() {
  return {
    preferences,
    checklist
  };
}

function getDetail(type, id) {
  const source = {
    moment: moments,
    reason: reasons,
    route: routes
  }[type] || [];
  return source.find((item) => item.id === id) || null;
}

module.exports = {
  moments,
  reasons,
  routes,
  checklist,
  preferences,
  asBrowseData,
  asHomeData,
  asMapData,
  asReasonsData,
  asMineData,
  getDetail
};
