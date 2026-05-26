const SOURCE_CONFIGS = [
  {
    id: 'source-shanghai-events-calendar',
    name: '上海国际服务门户活动日历',
    district: '',
    sourceType: 'official',
    url: 'https://english.shanghai.gov.cn/en-EventsCalendar/index.html',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本市热门',
    notes: '上海市级官方活动日历，保留作为全市补充来源。'
  },
  {
    id: 'source-shanghai-events-news',
    name: '上海国际服务门户活动资讯',
    district: '',
    sourceType: 'official',
    url: 'https://english.shanghai.gov.cn/en-events1/index.html',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本市热门',
    notes: '上海官方英文门户活动资讯，自动发布前仍保留来源链接。'
  },
  {
    id: 'source-shanghai-culture-tourism',
    name: '上海市文化和旅游局',
    district: '',
    sourceType: 'official',
    url: 'https://whlyj.sh.gov.cn/',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本市热门',
    notes: '市级文旅公开信息，补充全市活动。'
  },
  {
    id: 'source-shanghai-public-culture',
    name: '上海市公共文化配送',
    district: '',
    sourceType: 'official',
    url: 'https://www.shwhgj.org.cn/',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本区热门',
    notes: '公共文化配送平台，常见区级活动预告。'
  },
  {
    id: 'source-shanghai-park-activities',
    name: '上海市绿化和市容管理局公园活动专区',
    district: '',
    sourceType: 'official',
    url: 'https://lhsr.sh.gov.cn/gyhd/index.html',
    parserType: 'parkActivityList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '公园活动',
    notes: '上海市绿化和市容管理局公园活动栏目，用于热闹页“公园活动”类目。'
  },
  {
    id: 'source-meet-shanghai-city-walk',
    name: '上海旅游城市漫步',
    district: '',
    sourceType: 'official',
    url: 'https://www1.meet-in-shanghai.net/cn/city-walk/',
    apiUrl: 'https://api1.meet-in-shanghai.net/api/place/public/page',
    parserType: 'cityWalkList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '城市漫步',
    notes: '中国上海旅游官方网站 CityWalk 页面，用于热闹页“城市漫步”类目。'
  },
  {
    id: 'source-meet-shanghai-heritage-town',
    name: '上海旅游非遗古镇',
    district: '',
    sourceType: 'official',
    url: 'https://www1.meet-in-shanghai.net/cn/intangible-cultural-heritage-ancient-town/',
    apiUrl: 'https://api1.meet-in-shanghai.net/api/place/public/page',
    subjectParentId: '1037',
    subjectId: '1076',
    parserType: 'cityWalkList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '非遗古镇',
    hideListTags: true,
    notes: '中国上海旅游官方网站非遗古镇页面，用于热闹页“非遗古镇”类目。'
  },
  {
    id: 'source-meet-shanghai-a-grade-tourist-attraction',
    name: '上海旅游A级景区',
    district: '',
    sourceType: 'official',
    url: 'https://www1.meet-in-shanghai.net/cn/a-grade-tourist-attraction/',
    apiUrl: 'https://api1.meet-in-shanghai.net/api/place/public/page',
    subjectParentId: '1053',
    subjectId: '1118',
    apiSortName: 'level',
    parserType: 'cityWalkList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: 'A级景区',
    hideListTags: true,
    notes: '中国上海旅游官方网站A级景区页面，用于热闹页“A级景区”类目。'
  },
  {
    id: 'source-meet-shanghai-eco-camping-tourism',
    name: '上海旅游生态露营',
    district: '',
    sourceType: 'official',
    url: 'https://www1.meet-in-shanghai.net/cn/eco-camping-tourism/',
    apiUrl: 'https://api1.meet-in-shanghai.net/api/place/public/page',
    subjectParentId: '1048',
    subjectId: '1108',
    parserType: 'cityWalkList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '生态露营',
    hideListTags: true,
    notes: '中国上海旅游官方网站生态露营旅游页面，用于热闹页“生态露营”类目。'
  },
  {
    id: 'source-shanghai-mass-art',
    name: '上海市群众艺术馆',
    district: '徐汇',
    sourceType: 'official',
    url: 'https://www.shqyg.com/',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本区热门',
    notes: '徐汇区公共文化场馆，可补充市民艺术活动。'
  },
  {
    id: 'source-jingan-government',
    name: '上海静安区人民政府',
    district: '静安',
    sourceType: 'official',
    url: 'https://www.jingan.gov.cn/',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本区热门',
    notes: '静安区门户信息，先用通用列表解析。'
  },
  {
    id: 'source-pudong-community-culture',
    name: '浦东社区文化活动',
    district: '浦东',
    sourceType: 'community',
    url: 'https://www.pudong.gov.cn/',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '本区热门',
    notes: '浦东区公开门户，后续可替换为更精确的社区文化入口。'
  },
  {
    id: 'source-jingan-pengpu-culture-center',
    name: '彭浦镇社区文化活动中心',
    district: '静安',
    sourceType: 'community',
    url: 'https://www.shggwh.com/Home-1247.html',
    parserType: 'genericList',
    trustLevel: 'whitelist',
    status: 'active',
    categoryHint: '附近热门',
    notes: '社区文化活动中心公开页面。'
  },
  {
    id: 'source-private-venue-review',
    name: '私营场馆活动入口',
    district: '',
    sourceType: 'venue',
    url: 'https://www.douban.com/location/shanghai/events/future-all',
    parserType: 'genericList',
    trustLevel: 'review',
    status: 'paused',
    categoryHint: '本市热门',
    notes: '私营/平台类内容默认待审核，首版暂停，确认合规后启用。'
  }
];

function normalizeSourceConfig(source = {}) {
  const normalized = {
    id: source.id || '',
    name: source.name || '',
    district: source.district || '',
    sourceType: source.sourceType || (source.district ? 'community' : 'official'),
    url: source.url || '',
    apiUrl: source.apiUrl || '',
    parserType: source.parserType || 'genericList',
    trustLevel: source.trustLevel || 'review',
    status: source.status || 'active',
    categoryHint: source.categoryHint || (source.district ? '本区热门' : '本市热门'),
    notes: source.notes || ''
  };
  if (source.subjectParentId) {
    normalized.subjectParentId = source.subjectParentId;
  }
  if (source.subjectId) {
    normalized.subjectId = source.subjectId;
  }
  if (source.apiSortName) {
    normalized.apiSortName = source.apiSortName;
  }
  if (source.hideListTags === true) {
    normalized.hideListTags = true;
  }
  return normalized;
}

module.exports = {
  SOURCE_CONFIGS: SOURCE_CONFIGS.map(normalizeSourceConfig),
  normalizeSourceConfig
};
