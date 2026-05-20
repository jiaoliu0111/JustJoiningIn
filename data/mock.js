const launchStates = [
  {
    id: 'wander',
    title: '没事出门晃一晃',
    subtitle: '不用目的地，先走到楼下再说',
    icon: '晃'
  },
  {
    id: 'walk',
    title: '就近散步压马路',
    subtitle: '3km 内慢慢走，不赶路',
    icon: '走'
  },
  {
    id: 'random',
    title: '随缘搭伴随便逛',
    subtitle: '有人就一起，没话也不尴尬',
    icon: '随'
  }
];

const activities = [
  {
    id: 'act-park-movie',
    title: '社区公园露天电影',
    category: '公园活动',
    district: '徐汇区',
    time: '周六 19:00',
    place: '康健园草坪',
    distance: 1.2,
    source: '上海公园官方发布',
    tags: ['免费', '周末', '无需准备'],
    description: '草坪上看一场老电影，适合吃完饭慢慢晃过去，坐不住也可以提前离开。',
    free: true,
    quietFriendly: true
  },
  {
    id: 'act-community-market',
    title: '邻里便民小市集',
    category: '社区活动',
    district: '静安区',
    time: '周日 10:00',
    place: '曹家渡社区广场',
    distance: 2.4,
    source: '社区云活动',
    tags: ['免费', '社区', '近'],
    description: '修伞、磨刀、旧物交换和小摊，市井味很足，随便逛二十分钟也不亏。',
    free: true,
    quietFriendly: false
  },
  {
    id: 'act-river-nature',
    title: '滨江生态轻科普',
    category: '公园活动',
    district: '浦东新区',
    time: '周六 15:30',
    place: '滨江森林公园北门',
    distance: 2.8,
    source: '公园服务号',
    tags: ['免费', '公园', '静音友好'],
    description: '跟着志愿者认几种树和鸟，节奏慢，不需要社交表现。',
    free: true,
    quietFriendly: true
  },
  {
    id: 'act-health-corner',
    title: '社区健康咨询角',
    category: '社区活动',
    district: '黄浦区',
    time: '周日 14:00',
    place: '瑞金二路街道活动室',
    distance: 1.9,
    source: '数字居委会',
    tags: ['官方来源', '室内', '短时间'],
    description: '顺路量个血压、拿点便民资料，适合想出门但不想走太远的人。',
    free: true,
    quietFriendly: true
  }
];

const hotspots = [
  {
    id: 'hot-river',
    title: '日晖港滨河步道',
    type: '晚风散步',
    distance: 0.8,
    heat: 82,
    tags: ['3km 内', '静音友好', '晚风'],
    description: '傍晚人不少但不拥挤，适合慢走和短时放空。',
    activeGroups: 3
  },
  {
    id: 'hot-lane',
    title: '老弄堂烟火街',
    type: '城市瞎逛',
    distance: 1.6,
    heat: 76,
    tags: ['小吃', '市井', '免费逛'],
    description: '小摊、熟食店和路边花摊都在，适合没目的地乱逛。',
    activeGroups: 2
  },
  {
    id: 'hot-park',
    title: '桂林公园后门',
    type: '社区公园',
    distance: 2.1,
    heat: 69,
    tags: ['公园', '3km 内', '不累脚'],
    description: '树多、有长椅，适合社恐友好的静音同走。',
    activeGroups: 1
  },
  {
    id: 'hot-square',
    title: '便民广场周末角',
    type: '社区热闹',
    distance: 2.7,
    heat: 73,
    tags: ['社区', '人气', '短时'],
    description: '常有临时摊位和居民活动，去看一眼就算凑过热闹。',
    activeGroups: 2
  }
];

const routes = [
  {
    id: 'route-breeze',
    title: '滨河晚风 45 分钟',
    duration: '45 分钟',
    distance: 2.2,
    difficulty: '不累脚',
    stops: ['便利店拿水', '滨河步道', '桥下长椅'],
    tags: ['傍晚', '静音友好', '3km 内'],
    description: '适合吃完饭下楼，不用赶路，风大就坐一会儿。'
  },
  {
    id: 'route-lane',
    title: '老街烟火 60 分钟',
    duration: '60 分钟',
    distance: 2.8,
    difficulty: '轻松',
    stops: ['弄堂口', '熟食店', '社区花园'],
    tags: ['小吃', '市井', '免费逛'],
    description: '一路都有小店和路人，热闹但不用参与。'
  },
  {
    id: 'route-park',
    title: '公园绕一圈 35 分钟',
    duration: '35 分钟',
    distance: 1.5,
    difficulty: '很轻松',
    stops: ['公园北门', '树荫步道', '出口花坛'],
    tags: ['公园', '短时', '无需准备'],
    description: '没动力时最稳的一条，出门成本很低。'
  }
];

const groups = [
  {
    id: 'grp-quiet-river',
    title: '静音逛滨江步道',
    status: '等 1 人',
    place: '日晖港滨河步道',
    distance: 0.8,
    members: 2,
    capacity: 3,
    duration: '1 小时',
    quiet: true,
    anonymous: true,
    tags: ['静音同行', '1 小时散局', '3km 内']
  },
  {
    id: 'grp-park',
    title: '楼下公园散步',
    status: '等 1 人',
    place: '桂林公园后门',
    distance: 2.1,
    members: 2,
    capacity: 3,
    duration: '1 小时',
    quiet: false,
    anonymous: true,
    tags: ['无需准备', '不累脚', '匿名']
  },
  {
    id: 'grp-lane',
    title: '老街随便逛',
    status: '等 2 人',
    place: '老弄堂烟火街',
    distance: 1.6,
    members: 1,
    capacity: 3,
    duration: '半天内',
    quiet: false,
    anonymous: false,
    tags: ['小吃', '市井', '随缘']
  }
];

const preferences = {
  maxDistance: 3,
  anonymous: true,
  quietFriendly: true,
  weekendReminder: true
};

const checklist = ['穿舒服的鞋', '带水杯', '轻装出行'];

module.exports = {
  launchStates,
  activities,
  hotspots,
  routes,
  groups,
  preferences,
  checklist
};
