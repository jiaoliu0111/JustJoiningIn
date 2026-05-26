const { SOURCE_CONFIGS } = require('./source-configs.js');

const moments = [
  {
    id: 'moment-coffee',
    sortOrder: 10,
    title: '街角免费咖啡试饮',
    bubble: '免费咖啡',
    walkMinutes: 6,
    timeLabel: '现在开始',
    place: '安福路街角咖啡车',
    tags: ['免费', '步行 6 分钟', '不用报名', '路过看看也行'],
    description: '咖啡车今天做新豆试饮，路过拿一小杯就能走，不需要消费，也不用聊天。',
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
    id: 'moment-guitar',
    sortOrder: 20,
    title: '草坪吉他小演出',
    bubble: '草坪吉他',
    walkMinutes: 8,
    timeLabel: '15 分钟后',
    place: '社区公园南草坪',
    tags: ['免费', '现在可去', '站着听也行', '安静友好'],
    description: '两位学生在草坪边弹唱，坐不坐都行，听一首歌就能回家。',
    free: true,
    noSignup: true,
    quietFriendly: true,
    lowPressureNote: '站在边上听一会儿就好。',
    color: 'green',
    priceLabel: '免费参加',
    category: '附近热门',
    image: '/assets/events/park.png',
    mapX: 64,
    mapY: 28
  },
  {
    id: 'moment-books',
    sortOrder: 30,
    title: '旧书交换小桌',
    bubble: '旧书交换',
    walkMinutes: 9,
    timeLabel: '正在进行',
    place: '社区书店门口',
    tags: ['免费', '不用报名', '室内门口', '路过看看也行'],
    description: '书店门口摆了旧书交换桌，不带书也能翻一翻，适合短暂停留。',
    free: true,
    noSignup: true,
    quietFriendly: true,
    lowPressureNote: '翻两页就走也自然。',
    color: 'mint',
    priceLabel: '免费参加',
    category: '本区热门',
    image: '/assets/events/bookshop.png',
    mapX: 46,
    mapY: 55
  },
  {
    id: 'moment-craft',
    sortOrder: 40,
    title: '社区手作体验摊',
    bubble: '手作体验',
    walkMinutes: 12,
    timeLabel: '现在开始',
    place: '邻里中心入口',
    tags: ['免费', '材料已备', '不用报名', '轻松参与'],
    description: '志愿者带着做纸花和小挂件，材料都在现场，不想做也可以看看。',
    free: true,
    noSignup: true,
    quietFriendly: false,
    lowPressureNote: '看别人做也算凑过热闹。',
    color: 'green',
    priceLabel: '免费参加',
    category: '附近热门',
    image: '/assets/events/gallery.png',
    mapX: 70,
    mapY: 68
  },
  {
    id: 'moment-adoption',
    sortOrder: 50,
    title: '宠物领养日',
    bubble: '宠物领养',
    walkMinutes: 10,
    timeLabel: '今天 16:00',
    place: '商场中庭',
    tags: ['免费', '步行 10 分钟', '看看就行', '室内'],
    description: '公益组织带来几只待领养小动物，可以远远看看，不需要留下资料。',
    free: true,
    noSignup: true,
    quietFriendly: true,
    lowPressureNote: '只看一眼也很治愈。',
    color: 'peach',
    priceLabel: '免费参加',
    category: '本市热门',
    image: '/assets/events/cat.png',
    mapX: 24,
    mapY: 66
  }
];

const reasons = [
  {
    id: 'reason-nearest',
    sortOrder: 10,
    title: '最近的免费选择',
    subtitle: '6 分钟走到街角，拿一杯试饮咖啡。',
    momentId: 'moment-coffee',
    cta: '现在去看看'
  },
  {
    id: 'reason-quiet',
    sortOrder: 20,
    title: '不需要说话的去处',
    subtitle: '去草坪边听一首歌，站着也行。',
    momentId: 'moment-guitar',
    cta: '就看这个'
  },
  {
    id: 'reason-indoor',
    sortOrder: 30,
    title: '不晒太阳的去处',
    subtitle: '商场中庭有宠物领养日，看看就能回。',
    momentId: 'moment-adoption',
    cta: '就看这个'
  }
];

const routes = [
  {
    id: 'route-corner',
    sortOrder: 10,
    title: '咖啡车到书店门口',
    duration: '35 分钟',
    distance: 1.4,
    difficulty: '很轻松',
    stops: ['街角咖啡车', '社区花坛', '书店门口旧书桌'],
    tags: ['免费', '步行可达', '路过看看也行'],
    description: '两个小热闹顺路串起来，不用规划，走到哪算哪。'
  },
  {
    id: 'route-grass',
    sortOrder: 20,
    title: '草坪音乐绕一圈',
    duration: '45 分钟',
    distance: 1.8,
    difficulty: '不累脚',
    stops: ['公园南门', '草坪吉他', '树荫长椅'],
    tags: ['免费', '安静友好', '现在可去'],
    description: '适合只想晒一点太阳、听一点声音的人。'
  },
  {
    id: 'route-mall',
    sortOrder: 30,
    title: '商场中庭短暂停留',
    duration: '30 分钟',
    distance: 1.2,
    difficulty: '室内轻松',
    stops: ['商场入口', '宠物领养日', '中庭休息区'],
    tags: ['室内', '不用报名', '看看就行'],
    description: '天气不好也能出门，逛一圈就回来。'
  }
];

const preferences = {
  id: 'preferences',
  freeOnly: true,
  walkMinutes: 10,
  noSignupFirst: true,
  quietFriendly: true,
  gentleReminder: true
};

const checklist = ['穿舒服的鞋', '带水杯', '轻装出行'];

const publishedMoments = moments.map((moment) => ({
  ...moment,
  status: 'published',
  sourceId: 'source-local-preview',
  sourceType: 'seed',
  trustLevel: 'whitelist',
  parserType: 'manual',
  dedupeKey: `seed:${moment.id}`,
  rawTitle: moment.title,
  rawSummary: moment.description,
  rawDateText: moment.timeLabel,
  reviewNote: '',
  lastSeenAt: '2026-05-21T00:00:00.000Z',
  syncedAt: '2026-05-21T00:00:00.000Z'
}));

module.exports = {
  moments: publishedMoments,
  reasons,
  routes,
  sources: SOURCE_CONFIGS,
  preferences,
  checklist
};
