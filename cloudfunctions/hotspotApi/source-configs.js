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
  return {
    id: source.id || '',
    name: source.name || '',
    district: source.district || '',
    sourceType: source.sourceType || (source.district ? 'community' : 'official'),
    url: source.url || '',
    parserType: source.parserType || 'genericList',
    trustLevel: source.trustLevel || 'review',
    status: source.status || 'active',
    categoryHint: source.categoryHint || (source.district ? '本区热门' : '本市热门'),
    notes: source.notes || ''
  };
}

module.exports = {
  SOURCE_CONFIGS: SOURCE_CONFIGS.map(normalizeSourceConfig),
  normalizeSourceConfig
};
