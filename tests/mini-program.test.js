const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const root = path.resolve(__dirname, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(root, relativePath), 'utf8'));
}

function exists(relativePath) {
  return fs.existsSync(path.join(root, relativePath));
}

test('mini program shell files exist', () => {
  [
    'app.js',
    'app.json',
    'app.wxss',
    'project.config.json',
    'sitemap.json',
    'data/mock.js',
    'utils/format.js',
    'utils/time.js'
  ].forEach((file) => assert.equal(exists(file), true, `${file} should exist`));
});

test('app config registers detail page and four tabs', () => {
  const app = readJson('app.json');
  assert.deepEqual(app.pages, [
    'pages/home/home',
    'pages/bustle/bustle',
    'pages/group/group',
    'pages/mine/mine',
    'pages/detail/detail'
  ]);
  assert.equal(app.tabBar.list.length, 4);
  assert.deepEqual(
    app.tabBar.list.map((item) => item.text),
    ['首页', '热闹', '理由', '我的']
  );
});

test('all page component files exist', () => {
  ['home', 'bustle', 'group', 'mine', 'detail'].forEach((page) => {
    ['js', 'json', 'wxml', 'wxss'].forEach((extension) => {
      assert.equal(
        exists(`pages/${page}/${page}.${extension}`),
        true,
        `${page}.${extension} should exist`
      );
    });
  });
});

test('mock data exposes complete MVP content', () => {
  const mock = require('../data/mock.js');
  assert.ok(mock.nearbyMoments.length >= 5, 'nearby moments should include local small happenings');
  assert.ok(mock.reasonCards.length >= 3, 'reason cards should include low-pressure prompts');
  assert.ok(mock.routes.length >= 3, 'routes should include ready plans');

  const moment = mock.nearbyMoments[0];
  [
    'id',
    'title',
    'bubble',
    'walkMinutes',
    'timeLabel',
    'place',
    'tags',
    'description',
    'free',
    'noSignup',
    'lowPressureNote'
  ].forEach((key) => assert.ok(Object.hasOwn(moment, key), `moment.${key}`));

  assert.equal(mock.preferences.walkMinutes, 10);
  assert.equal(mock.preferences.freeOnly, true);
  assert.ok(mock.checklist.includes('穿舒服的鞋'));
});

test('detail helper can find every mock item type', () => {
  const mock = require('../data/mock.js');
  const { findDetail } = require('../utils/format.js');

  assert.equal(findDetail('moment', mock.nearbyMoments[0].id).title, mock.nearbyMoments[0].title);
  assert.equal(findDetail('reason', mock.reasonCards[0].id).title, mock.reasonCards[0].title);
  assert.equal(findDetail('route', mock.routes[0].id).title, mock.routes[0].title);
  assert.equal(findDetail('unknown', 'nope'), null);
});

test('home distance badge is a real centered component', () => {
  const wxml = fs.readFileSync(path.join(root, 'pages/home/home.wxml'), 'utf8');
  const wxss = fs.readFileSync(path.join(root, 'pages/home/home.wxss'), 'utf8');

  assert.match(wxml, /class="hero-distance"/);
  assert.match(wxss, /\.hero-distance\s*\{[^}]*display:\s*flex;/s);
  assert.match(wxss, /\.hero-distance\s*\{[^}]*align-items:\s*center;/s);
  assert.match(wxss, /\.hero-distance\s*\{[^}]*justify-content:\s*center;/s);
  assert.match(wxss, /\.hero-distance\s*\{[^}]*width:\s*132rpx;/s);
  assert.match(wxss, /\.hero-distance\s*\{[^}]*height:\s*132rpx;/s);
});

test('home clock formats date, weekday, and time for the hero', () => {
  const { formatHomeClock } = require('../utils/time.js');
  const clock = formatHomeClock(new Date('2026-05-20T15:11:00+08:00'));

  assert.equal(clock.currentDate, '05月20日');
  assert.equal(clock.currentWeekday, '周三');
  assert.equal(clock.currentTime, '15:11');
});

test('home hero keeps month-day next to the time badge', () => {
  const wxml = fs.readFileSync(path.join(root, 'pages/home/home.wxml'), 'utf8');

  assert.equal(/currentDate/.test(wxml), true);
  assert.match(wxml, /class="hero-time"[^>]*>\{\{currentTime\}\}/);
  assert.match(wxml, /class="hero-day"[^>]*>\{\{currentDate\}\} \{\{currentWeekday\}\}/);
  assert.equal(/hero-calendar/.test(wxml), false);
});

test('visible app copy follows hotspot discovery direction', () => {
  const visibleFiles = [
    'app.json',
    'data/mock.js',
    'pages/home/home.wxml',
    'pages/bustle/bustle.wxml',
    'pages/group/group.json',
    'pages/group/group.wxml',
    'pages/detail/detail.wxml',
    'pages/mine/mine.wxml'
  ];
  const text = visibleFiles
    .map((file) => fs.readFileSync(path.join(root, file), 'utf8'))
    .join('\n');

  ['匹配搭子', '发布凑局', '一键散局', '散局', '匿名结伴', '现成可以加入', '等 1 人', '等 2 人'].forEach((phrase) => {
    assert.equal(text.includes(phrase), false, `visible copy should not include ${phrase}`);
  });
  assert.match(text, /附近有什么免费小热闹/);
  assert.match(text, /给我一个出门理由/);
  assert.match(text, /路过看看也行/);
});
