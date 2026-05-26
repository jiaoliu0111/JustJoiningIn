const crypto = require('crypto');
const http = require('http');
const https = require('https');
const { SOURCE_CONFIGS, normalizeSourceConfig } = require('./source-configs.js');

const DISTRICT_KEYWORDS = [
  ['浦东', ['pudong', '浦东']],
  ['黄浦', ['huangpu', '黄浦']],
  ['徐汇', ['xuhui', '徐汇']],
  ['长宁', ['changning', '长宁']],
  ['静安', ['jingan', "jing'an", '静安']],
  ['普陀', ['putuo', '普陀']],
  ['虹口', ['hongkou', '虹口']],
  ['杨浦', ['yangpu', '杨浦']],
  ['闵行', ['minhang', '闵行']],
  ['宝山', ['baoshan', '宝山']],
  ['嘉定', ['jiading', '嘉定']],
  ['金山', ['jinshan', '金山']],
  ['松江', ['songjiang', '松江']],
  ['青浦', ['qingpu', '青浦']],
  ['奉贤', ['fengxian', '奉贤']],
  ['崇明', ['chongming', '崇明']]
];

const ACTIVITY_KEYWORDS = [
  '活动',
  '展',
  '展览',
  '演出',
  '音乐',
  '市集',
  '电影',
  '讲座',
  '文化',
  '公园',
  '体验',
  'event',
  'events',
  'exhibition',
  'exhibitions',
  'performance',
  'performances',
  'festival',
  'market',
  'concert',
  'show',
  'museum',
  'gallery',
  'tour'
];

function fetchText(url, optionsOrTimeout = 12000, redirects = 2) {
  const timeout = typeof optionsOrTimeout === 'number'
    ? optionsOrTimeout
    : optionsOrTimeout.timeout || 12000;
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https:') ? https : http;
    const request = client.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 JustJoiningInMiniProgram/1.0'
      },
      timeout
    }, (response) => {
      const location = response.headers.location;
      if (location && response.statusCode >= 300 && response.statusCode < 400 && redirects > 0) {
        response.resume();
        fetchText(absoluteUrl(url, location), timeout, redirects - 1).then(resolve, reject);
        return;
      }

      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`请求失败：${response.statusCode}`));
        return;
      }

      const chunks = [];
      response.on('data', (chunk) => chunks.push(chunk));
      response.on('end', () => {
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
    });

    request.on('timeout', () => {
      request.destroy(new Error('请求超时'));
    });
    request.on('error', reject);
  });
}

function decodeHtml(value = '') {
  return String(value)
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .trim();
}

function stripTags(value = '') {
  return decodeHtml(String(value).replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' '));
}

function getAttribute(html, name) {
  const match = html.match(new RegExp(`${name}\\s*=\\s*["']([^"']+)["']`, 'i'));
  return match ? decodeHtml(match[1]) : '';
}

function absoluteUrl(base, value = '') {
  if (!value) {
    return '';
  }
  try {
    const normalizedValue = decodeHtml(value).replace(/\\/g, '/');
    return new URL(normalizedValue, base).toString();
  } catch (error) {
    return '';
  }
}

function extractTextByClass(html, className) {
  const match = html.match(new RegExp(`<[^>]*class=["'][^"']*${className}[^"']*["'][^>]*>([\\s\\S]*?)<\\/[^>]+>`, 'i'));
  return match ? stripTags(match[1]) : '';
}

function looksLikeActivity(title, description = '') {
  const text = `${title} ${description}`.toLowerCase();
  return title.length >= 4 && ACTIVITY_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()));
}

function extractListItems(html, source) {
  if (source.parserType === 'parkActivityList') {
    return extractParkActivityItems(html, source);
  }
  if (source.parserType === 'cityWalkList') {
    return extractCityWalkItems(html, source);
  }

  const items = [];
  const listItems = html.match(/<li[\s\S]*?<\/li>/gi) || [];
  const sourceMeta = sourceSnapshot(source);

  listItems.forEach((item) => {
    const anchor = item.match(/<a\b[\s\S]*?<\/a>/i);
    if (!anchor) {
      return;
    }

    const href = getAttribute(anchor[0], 'href');
    const imageTag = anchor[0].match(/<img\b[^>]*>/i);
    const title = getAttribute(anchor[0], 'title')
      || extractTextByClass(anchor[0], 'title')
      || (imageTag ? getAttribute(imageTag[0], 'alt') : '')
      || stripTags(anchor[0]);
    const description = extractTextByClass(anchor[0], 'detail')
      || extractTextByClass(anchor[0], 'desc')
      || extractTextByClass(anchor[0], 'summary');

    if (!href || !looksLikeActivity(title, description)) {
      return;
    }

    items.push({
      title,
      description,
      ...sourceMeta,
      sourceUrl: absoluteUrl(source.url, href),
      image: imageTag ? absoluteUrl(source.url, getAttribute(imageTag[0], 'src')) : '',
      categoryHint: source.categoryHint
    });
  });

  if (items.length > 0) {
    return items;
  }

  return extractGenericAnchors(html, source);
}

function shortDistrict(value = '') {
  return String(value).replace(/(新区|区|县)$/g, '');
}

function cleanTag(value = '') {
  return stripTags(value).replace(/\s+/g, '').slice(0, 12);
}

function extractCityWalkItems(payload, source) {
  let data;
  try {
    data = JSON.parse(payload);
  } catch (error) {
    return [];
  }

  const records = data && data.data && Array.isArray(data.data.records)
    ? data.data.records
    : [];
  const sourceMeta = sourceSnapshot(source);

  return records.map((record) => {
    const subjectCode = String(record.subjectCode || '').split(',').find(Boolean) || 'city-walk';
    const title = stripTags(record.title || '');
    const district = shortDistrict(record.district || record.address || '');
    const tags = String(record.subjectName || record.label || '')
      .split(',')
      .map(cleanTag)
      .filter(Boolean)
      .slice(0, 4);
    const translatorFile = String(record.translatorFile || '').replace(/^\/+/, '');
    const sourceUrl = translatorFile
      ? absoluteUrl(source.url, `/cn/${subjectCode}/${translatorFile}`)
      : source.url;
    const image = absoluteUrl(source.url, record.thumbnailPic || record.headPic || record.pics || '');
    const address = stripTags(record.venueName || record.address || district || '');
    const description = stripTags(record.description || record.content || `${district || '上海'}城市漫步推荐。`);
    const level = cleanTag(record.level || '');

    return {
      title,
      description,
      ...sourceMeta,
      sourceUrl,
      image,
      district,
      address,
      tags,
      level,
      titleTag: /^\d+A$/i.test(level) ? level : '',
      hideListTags: source.hideListTags === true,
      rawDateText: '',
      categoryHint: source.categoryHint
    };
  }).filter((item) => item.title && item.sourceUrl && item.image);
}

function extractParkActivityItems(html, source) {
  const blocks = html.match(/<div\b[^>]*class=["'][^"']*\bpt_list\b[^"']*["'][^>]*>[\s\S]*?<\/div>\s*<\/div>/gi) || [];
  const sourceMeta = sourceSnapshot(source);

  return blocks.map((block) => {
    const anchor = block.match(/<a\b[\s\S]*?<\/a>/i);
    if (!anchor) {
      return null;
    }
    const href = getAttribute(anchor[0], 'href');
    const title = getAttribute(anchor[0], 'title') || stripTags(anchor[0]);
    const dateMatch = block.match(/<div\b[^>]*class=["'][^"']*\btext_2\b[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    const rawDateText = dateMatch ? stripTags(dateMatch[1]) : '';

    return {
      title,
      description: rawDateText ? `上海公园活动，发布于 ${rawDateText}。` : '上海公园活动，详情以来源页面为准。',
      ...sourceMeta,
      sourceUrl: absoluteUrl(source.url, href),
      image: '',
      rawDateText,
      categoryHint: source.categoryHint
    };
  }).filter((item) => item && item.sourceUrl && item.title);
}

function isLikelyContentImage(src = '') {
  return Boolean(src)
    && !/^data:/i.test(src)
    && !/(logo|icon|search|qrcode|qr|blank|spacer|loading|triangle|arrow|weixin|wechat)/i.test(src)
    && !/\/(static|res|xxgk)\//i.test(src)
    && /\.(jpe?g|png|webp)(\?|#|$)/i.test(src);
}

function extractDetailHeroImage(html, detailUrl) {
  const images = html.match(/<img\b[^>]*>/gi) || [];
  for (const image of images) {
    const src = getAttribute(image, 'src') || getAttribute(image, 'data-src') || getAttribute(image, 'original');
    if (!isLikelyContentImage(src)) {
      continue;
    }
    const absolute = absoluteUrl(detailUrl, src);
    if (absolute) {
      return absolute;
    }
  }
  return '';
}

function extractDetailContentHtml(html = '') {
  const marker = html.match(/<div\b[^>]*id=["']ivs_content["'][^>]*>/i);
  if (!marker) {
    const editor = html.match(/<div\b[^>]*class=["'][^"']*(?:TRS_Editor|pt_content)[^"']*["'][^>]*>([\s\S]*?)<\/div>/i);
    return editor ? editor[1] : '';
  }
  const start = marker.index + marker[0].length;
  const endMatch = html.slice(start).match(/<ul\b[^>]*style=["'][^"']*display:\s*none[^"']*["']/i);
  const end = endMatch ? start + endMatch.index : html.indexOf('</div>', start);
  return html.slice(start, end > start ? end : undefined);
}

function contentNodeFromText(text) {
  const cleanText = stripTags(text);
  if (!cleanText) {
    return null;
  }
  return {
    name: 'p',
    attrs: { class: 'detail-content-paragraph' },
    children: [{ type: 'text', text: cleanText }]
  };
}

function contentNodeFromImage(tag, detailUrl) {
  const src = getAttribute(tag, 'src') || getAttribute(tag, 'data-src') || getAttribute(tag, 'original');
  if (!isLikelyContentImage(src)) {
    return null;
  }
  const absolute = absoluteUrl(detailUrl, src);
  if (!absolute) {
    return null;
  }
  return {
    name: 'img',
    attrs: {
      class: 'detail-content-image',
      mode: 'widthFix',
      src: absolute
    }
  };
}

function extractDetailContentNodes(html, detailUrl) {
  const contentHtml = extractDetailContentHtml(html);
  const nodes = [];
  const blocks = contentHtml.match(/<p\b[\s\S]*?<\/p>|<img\b[^>]*>/gi) || [];

  blocks.forEach((block) => {
    const imageTags = block.match(/<img\b[^>]*>/gi) || [];
    if (imageTags.length > 0) {
      imageTags.forEach((imageTag) => {
        const imageNode = contentNodeFromImage(imageTag, detailUrl);
        if (imageNode) {
          nodes.push(imageNode);
        }
      });
      const textWithoutImages = block.replace(/<img\b[^>]*>/gi, '');
      const textNode = contentNodeFromText(textWithoutImages);
      if (textNode) {
        nodes.push(textNode);
      }
      return;
    }

    const textNode = contentNodeFromText(block);
    if (textNode) {
      nodes.push(textNode);
    }
  });

  return nodes;
}

async function enrichParkActivityImages(items, source, fetcher, fetchTimeout) {
  const imageLimit = source.detailImageLimit || items.length;
  const detailTimeout = source.detailFetchTimeout || Math.min(fetchTimeout, 3000);
  return Promise.all(items.map(async (item, index) => {
    if (index >= imageLimit || item.image || !item.sourceUrl) {
      return item;
    }

    try {
      const html = await fetcher(item.sourceUrl, { source, timeout: detailTimeout, detail: true });
      return {
        ...item,
        image: extractDetailHeroImage(html, item.sourceUrl),
        contentNodes: extractDetailContentNodes(html, item.sourceUrl)
      };
    } catch (error) {
      return item;
    }
  }));
}

function parseIsoDateText(value = '') {
  const match = String(value).match(/\b(20\d{2})-(\d{1,2})-(\d{1,2})\b/);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) {
    return null;
  }
  return {
    year,
    month,
    day,
    monthKey: `${year}-${String(month).padStart(2, '0')}`,
    orderKey: year * 100 + month
  };
}

function shiftedMonthKey(now, offset = 0) {
  const date = new Date(now);
  date.setDate(1);
  date.setMonth(date.getMonth() - offset);
  const year = date.getFullYear();
  const month = date.getMonth() + 1;
  return {
    monthKey: `${year}-${String(month).padStart(2, '0')}`,
    orderKey: year * 100 + month
  };
}

function createRecentMonthWindow(now = new Date()) {
  const current = shiftedMonthKey(now, 0);
  const previous = shiftedMonthKey(now, 1);
  return {
    allowed: new Set([current.monthKey, previous.monthKey]),
    oldestOrderKey: previous.orderKey
  };
}

function isRecentMonthItem(item, window) {
  const parsed = parseIsoDateText(item.rawDateText);
  return parsed ? window.allowed.has(parsed.monthKey) : true;
}

function isOlderThanRecentWindow(item, window) {
  const parsed = parseIsoDateText(item.rawDateText);
  return parsed ? parsed.orderKey < window.oldestOrderKey : false;
}

function parkActivityPageUrl(baseUrl, page) {
  if (page <= 1) {
    return baseUrl;
  }
  try {
    const url = new URL(baseUrl);
    url.pathname = url.pathname.replace(/(?:index(?:_\d+)?\.html)?$/i, `index_${page}.html`);
    return url.toString();
  } catch (error) {
    return baseUrl.replace(/(?:index(?:_\d+)?\.html)?$/i, `index_${page}.html`);
  }
}

function cityWalkApiUrl(source, page, limit) {
  const url = new URL(source.apiUrl || 'https://api1.meet-in-shanghai.net/api/place/public/page');
  url.searchParams.set('current', String(page));
  url.searchParams.set('size', String(limit));
  url.searchParams.set('siteCode', 'cn');
  if (source.subjectId) {
    url.searchParams.set('subjectId', source.subjectId);
  } else {
    url.searchParams.set('subjectParentId', source.subjectParentId || '1039');
  }
  url.searchParams.set('sortName', source.apiSortName || 'ID');
  url.searchParams.set('order', 'desc');
  return url.toString();
}

async function collectParkActivityItems(source, fetcher, fetchTimeout, limit, now = new Date()) {
  const maxPages = source.maxPages || 6;
  const pageSize = source.pageSize || 15;
  const window = createRecentMonthWindow(now);
  const items = [];
  let pages = 0;

  for (let page = 1; page <= maxPages && items.length < limit; page += 1) {
    const pageUrl = parkActivityPageUrl(source.url, page);
    const html = await fetcher(pageUrl, { source, timeout: fetchTimeout, page });
    pages += 1;
    const pageItems = extractParkActivityItems(html, {
      ...source,
      url: pageUrl
    });

    if (pageItems.length === 0) {
      break;
    }

    const recentItems = pageItems.filter((item) => isRecentMonthItem(item, window));
    items.push(...recentItems);

    if (pageItems.some((item) => isOlderThanRecentWindow(item, window)) || pageItems.length < pageSize) {
      break;
    }
  }

  return {
    items: items.slice(0, limit),
    pages
  };
}

function extractGenericAnchors(html, source) {
  const anchors = html.match(/<a\b[\s\S]*?<\/a>/gi) || [];
  const sourceMeta = sourceSnapshot(source);
  return anchors.map((anchor) => {
    const href = getAttribute(anchor, 'href');
    const title = getAttribute(anchor, 'title') || stripTags(anchor);
    return {
      title,
      description: '',
      ...sourceMeta,
      sourceUrl: absoluteUrl(source.url, href),
      image: '',
      categoryHint: source.categoryHint
    };
  }).filter((item) => item.sourceUrl && looksLikeActivity(item.title, item.description));
}

function hashId(value) {
  return crypto.createHash('sha1').update(value).digest('hex').slice(0, 12);
}

function sourceSnapshot(source = {}) {
  return {
    sourceId: source.id || `source-${hashId(source.url || source.name || 'unknown')}`,
    sourceName: source.name || '',
    sourceType: source.sourceType || 'official',
    trustLevel: source.trustLevel || 'review',
    parserType: source.parserType || 'genericList',
    sourceDistrict: source.district || ''
  };
}

function findDistrict(text) {
  const lower = text.toLowerCase();
  const match = DISTRICT_KEYWORDS.find(([, keywords]) => (
    keywords.some((keyword) => lower.includes(keyword.toLowerCase()))
  ));
  return match ? match[0] : '';
}

function inferCategory(raw, district) {
  if (['公园活动', '城市漫步', '非遗古镇', 'A级景区', '生态露营'].includes(raw.categoryHint)) {
    return raw.categoryHint;
  }
  const text = `${raw.title} ${raw.description}`.toLowerCase();
  if (district) {
    return '本区热门';
  }
  if (/(附近|周边|社区|街角|around|nearby|corner|neighbourhood|neighborhood)/i.test(text)) {
    return '附近热门';
  }
  return raw.categoryHint || '本市热门';
}

function inferBubble(title) {
  const text = title.toLowerCase();
  if (/(非遗|古镇|古城|老街|水乡|传统村落)/i.test(text)) {
    return '非遗古镇';
  }
  if (/(city.?walk|漫步|街区|风景区|老街)/i.test(text)) {
    return '城市漫步';
  }
  if (/(park|公园|植物园|森林|花|绿化|园艺)/i.test(text)) {
    return '公园活动';
  }
  if (/(music|concert|音乐|演出)/i.test(text)) {
    return '音乐演出';
  }
  if (/(gallery|museum|exhibition|展|艺术|美术馆|博物馆)/i.test(text)) {
    return '展览';
  }
  if (/(market|市集)/i.test(text)) {
    return '市集';
  }
  if (/(park|公园|花园)/i.test(text)) {
    return '公园';
  }
  return '城市活动';
}

function inferTimeLabel(text) {
  const isoDate = text.match(/\b20\d{2}-\d{1,2}-\d{1,2}\b/);
  if (isoDate) {
    return isoDate[0];
  }
  const chineseDate = text.match(/(\d{1,2})月(\d{1,2})日/);
  if (chineseDate) {
    return `${chineseDate[1]}月${chineseDate[2]}日`;
  }
  const englishMonth = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+\d{1,2}\b/i);
  if (englishMonth) {
    return englishMonth[0].replace(/\./g, '');
  }
  const timeRange = text.match(/\b\d{1,2}:\d{2}\s*(AM|PM)?\b/i);
  if (timeRange) {
    return timeRange[0].toUpperCase();
  }
  return '近期活动';
}

function normalizeForKey(value = '') {
  return stripTags(value).toLowerCase().replace(/\s+/g, '');
}

function createDedupeKey(raw, district) {
  if (raw.sourceUrl) {
    return `url:${hashId(raw.sourceUrl)}`;
  }
  const title = normalizeForKey(raw.title);
  const date = normalizeForKey(raw.rawDateText || raw.timeLabel || '');
  const place = normalizeForKey(raw.place || district || '');
  return `text:${hashId(`${title}|${date}|${place}`)}`;
}

function statusForSource(source) {
  return source.trustLevel === 'whitelist' ? 'published' : 'pending';
}

function selectSources(sources, sourceIds, sourceLimit) {
  const selectedIds = Array.isArray(sourceIds) && sourceIds.length > 0
    ? new Set(sourceIds)
    : null;
  return sources
    .map(normalizeSourceConfig)
    .filter((source) => source.status === 'active')
    .filter((source) => !selectedIds || selectedIds.has(source.id))
    .slice(0, sourceLimit);
}

function sourceFromRaw(raw = {}) {
  return {
    id: raw.sourceId || '',
    name: raw.sourceName || '',
    district: raw.district || raw.sourceDistrict || '',
    sourceType: raw.sourceType,
    trustLevel: raw.trustLevel,
    categoryHint: raw.categoryHint,
    status: raw.sourceStatus || 'active'
  };
}

function normalizeActivity(raw, index = 0, source = {}) {
  const normalizedSource = normalizeSourceConfig({
    ...sourceFromRaw(raw),
    ...source
  });
  const title = stripTags(raw.title || '').slice(0, 36);
  const description = stripTags(raw.description || '来自上海公开活动信息，详情以来源页面为准。');
  const district = raw.district || normalizedSource.district || findDistrict(`${title} ${description}`);
  const text = `${title} ${description} ${district}`;
  const category = inferCategory({
    ...raw,
    categoryHint: raw.categoryHint || normalizedSource.categoryHint
  }, district);
  const quietFriendly = /(展|艺术|gallery|museum|exhibition|公园|花园|阅读|文化)/i.test(text);
  const free = /(免费|free|open to all|公益)/i.test(text);
  const noSignup = /(不用报名|无需报名|无需预约|免预约|no registration|required no registration|walk.?in)/i.test(text)
    || !/(报名|预约|register|registration|reservation|booking)/i.test(text);
  const walkMinutes = category === '附近热门' ? 8 : category === '本区热门' ? 14 : category === '公园活动' ? 12 : ['城市漫步', '非遗古镇'].includes(category) ? 18 : 18;
  const sourceName = raw.sourceName || normalizedSource.name || '';
  const sourceUrl = raw.sourceUrl || '';
  const address = stripTags(raw.address || raw.venueName || raw.place || '');
  const now = new Date().toISOString();
  const sourceTags = Array.isArray(raw.tags) ? raw.tags.filter(Boolean).slice(0, 4) : [];

  return {
    id: `remote-${hashId(sourceUrl || `${title}-${sourceName}`)}`,
    sortOrder: 1000 + index,
    title,
    bubble: inferBubble(title),
    walkMinutes,
    timeLabel: inferTimeLabel(`${text} ${raw.rawDateText || ''}`),
    place: district ? `上海 · ${district}` : '上海',
    tags: sourceTags.length ? sourceTags : [
      normalizedSource.trustLevel === 'whitelist' ? '可信来源' : '待确认',
      free ? '免费优先' : '查看详情',
      quietFriendly ? '适合慢逛' : '城市活动'
    ],
    level: raw.level || '',
    titleTag: raw.titleTag || (/^\d+A$/i.test(raw.level || '') ? raw.level : ''),
    hideListTags: raw.hideListTags === true || normalizedSource.hideListTags === true,
    description,
    free,
    noSignup,
    quietFriendly,
    lowPressureNote: '先看看详情，觉得合适再出发。',
    color: ['mint', 'green', 'peach'][index % 3],
    priceLabel: free ? '免费参加' : '查看详情',
    category,
    image: raw.image || (category === '公园活动' ? '/assets/events/park.png' : ''),
    sourceName,
    sourceUrl,
    district,
    address,
    mapX: 20 + (index % 4) * 18,
    mapY: 24 + (index % 5) * 12,
    status: statusForSource(normalizedSource),
    sourceId: normalizedSource.id,
    sourceType: normalizedSource.sourceType,
    trustLevel: normalizedSource.trustLevel,
    dedupeKey: createDedupeKey({ ...raw, sourceUrl }, district),
    rawTitle: stripTags(raw.title || ''),
    rawSummary: stripTags(raw.description || ''),
    rawDateText: raw.rawDateText || '',
    contentNodes: raw.contentNodes || [],
    startAt: raw.startAt || '',
    endAt: raw.endAt || '',
    lastSeenAt: now,
    reviewNote: '',
    syncedAt: now
  };
}

function dedupeActivities(items) {
  const seen = new Set();
  return items.filter((item) => {
    const key = item.dedupeKey || item.sourceUrl || item.id || item.title;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

async function syncActivities(options = {}) {
  const {
    sources = SOURCE_CONFIGS,
    fetcher = fetchText,
    fetchTimeout = 12000,
    writeActivity,
    limit = 30,
    now = new Date(),
    sourceLimit = sources.length,
    sourceIds
  } = options;
  const activeSources = selectSources(sources, sourceIds, sourceLimit);
  const sourceResults = [];
  const rawItems = [];

  for (const source of activeSources) {
    try {
      let extractedItems = [];
      let pageCount = 1;
      if (source.parserType === 'parkActivityList') {
        const collected = await collectParkActivityItems(source, fetcher, fetchTimeout, limit, now);
        extractedItems = collected.items;
        pageCount = collected.pages;
      } else if (source.parserType === 'cityWalkList') {
        const html = await fetcher(cityWalkApiUrl(source, 1, limit), { source, timeout: fetchTimeout, page: 1 });
        extractedItems = extractListItems(html, source);
      } else {
        const html = await fetcher(source.url, { source, timeout: fetchTimeout });
        extractedItems = extractListItems(html, source);
      }
      const enrichedItems = source.parserType === 'parkActivityList'
        ? await enrichParkActivityImages(extractedItems.slice(0, limit), source, fetcher, fetchTimeout)
        : extractedItems;
      const items = enrichedItems.map((item) => ({
        ...item,
        sourceId: source.id,
        sourceType: source.sourceType,
        trustLevel: source.trustLevel,
        district: item.district || source.district,
        categoryHint: item.categoryHint || source.categoryHint
      }));
      sourceResults.push({
        sourceId: source.id,
        name: source.name,
        url: source.url,
        pages: pageCount,
        count: items.length
      });
      rawItems.push(...items.map((item) => ({ item, source })));
    } catch (error) {
      sourceResults.push({
        sourceId: source.id,
        name: source.name,
        url: source.url,
        count: 0,
        error: error.message
      });
    }
  }

  const seen = new Set();
  const normalizedItems = [];
  for (const pair of rawItems) {
    const normalized = normalizeActivity(pair.item, normalizedItems.length, pair.source);
    const key = normalized.dedupeKey || normalized.sourceUrl || normalized.id;
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    normalizedItems.push(normalized);
    if (normalizedItems.length >= limit) {
      break;
    }
  }

  const writeErrors = [];

  if (writeActivity) {
    for (const item of normalizedItems) {
      try {
        await writeActivity(item);
      } catch (error) {
        writeErrors.push({
          id: item.id,
          title: item.title,
          message: error.message || '写入失败'
        });
      }
    }
  }

  const publishedCount = normalizedItems.filter((item) => item.status === 'published').length;
  const pendingCount = normalizedItems.filter((item) => item.status === 'pending').length;
  const errorCount = sourceResults.filter((source) => source.error).length;

  return {
    synced: normalizedItems.length,
    skipped: Math.max(rawItems.length - normalizedItems.length, 0),
    sourceCount: activeSources.length,
    fetchedCount: rawItems.length,
    publishedCount,
    pendingCount,
    errorCount,
    sources: sourceResults,
    writeErrors,
    items: normalizedItems
  };
}

module.exports = {
  SOURCE_CONFIGS,
  absoluteUrl,
  createDedupeKey,
  decodeHtml,
  dedupeActivities,
  extractListItems,
  extractDetailContentNodes,
  extractDetailHeroImage,
  fetchText,
  normalizeActivity,
  selectSources,
  stripTags,
  syncActivities
};
