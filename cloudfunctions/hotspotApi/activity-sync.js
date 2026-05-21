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
    return new URL(decodeHtml(value), base).toString();
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

function normalizeActivity(raw, index = 0, source = {}) {
  const normalizedSource = normalizeSourceConfig(source);
  const title = stripTags(raw.title || '').slice(0, 36);
  const description = stripTags(raw.description || '来自上海公开活动信息，详情以来源页面为准。').slice(0, 96);
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
  const walkMinutes = category === '附近热门' ? 8 : category === '本区热门' ? 14 : 18;
  const sourceName = raw.sourceName || normalizedSource.name || '';
  const sourceUrl = raw.sourceUrl || '';
  const now = new Date().toISOString();

  return {
    id: `remote-${hashId(sourceUrl || `${title}-${sourceName}`)}`,
    sortOrder: 1000 + index,
    title,
    bubble: inferBubble(title),
    walkMinutes,
    timeLabel: inferTimeLabel(`${text} ${raw.rawDateText || ''}`),
    place: district ? `上海 · ${district}` : '上海',
    tags: [
      normalizedSource.trustLevel === 'whitelist' ? '可信来源' : '待确认',
      free ? '免费优先' : '查看详情',
      quietFriendly ? '适合慢逛' : '城市活动'
    ],
    description,
    free,
    noSignup,
    quietFriendly,
    lowPressureNote: '先看看详情，觉得合适再出发。',
    color: ['mint', 'green', 'peach'][index % 3],
    priceLabel: free ? '免费参加' : '查看详情',
    category,
    image: raw.image || '',
    sourceName,
    sourceUrl,
    district,
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
    const key = item.sourceUrl || item.id || item.title;
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
    sourceLimit = sources.length,
    sourceIds
  } = options;
  const activeSources = selectSources(sources, sourceIds, sourceLimit);
  const sourceResults = [];
  const rawItems = [];

  for (const source of activeSources) {
    try {
      const html = await fetcher(source.url, { source, timeout: fetchTimeout });
      const items = extractListItems(html, source).map((item) => ({
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
  fetchText,
  normalizeActivity,
  selectSources,
  stripTags,
  syncActivities
};
