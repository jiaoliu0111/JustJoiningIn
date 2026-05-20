const nearbyMoments = [
  {
    id: 'moment-coffee',
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
    color: 'orange'
  },
  {
    id: 'moment-guitar',
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
    color: 'green'
  },
  {
    id: 'moment-books',
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
    color: 'orange'
  },
  {
    id: 'moment-craft',
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
    color: 'green'
  },
  {
    id: 'moment-adoption',
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
    color: 'tomato'
  }
];

const reasonCards = [
  {
    id: 'reason-nearest',
    title: '最近的免费理由',
    subtitle: '6 分钟走到街角，拿一杯试饮咖啡。',
    momentId: 'moment-coffee',
    cta: '现在去看看'
  },
  {
    id: 'reason-quiet',
    title: '不需要说话的理由',
    subtitle: '去草坪边听一首歌，站着也行。',
    momentId: 'moment-guitar',
    cta: '给我这个理由'
  },
  {
    id: 'reason-indoor',
    title: '不晒太阳的理由',
    subtitle: '商场中庭有宠物领养日，看看就能回。',
    momentId: 'moment-adoption',
    cta: '就看这个'
  }
];

const routes = [
  {
    id: 'route-corner',
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
  freeOnly: true,
  walkMinutes: 10,
  noSignupFirst: true,
  quietFriendly: true,
  gentleReminder: true
};

const checklist = ['穿舒服的鞋', '带水杯', '轻装出行'];

module.exports = {
  nearbyMoments,
  reasonCards,
  routes,
  preferences,
  checklist
};
