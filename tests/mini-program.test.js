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
    ['首页', '热闹', '凑局', '我的']
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
  assert.ok(mock.activities.length >= 4, 'activities should include official items');
  assert.ok(mock.hotspots.length >= 4, 'hotspots should include nearby places');
  assert.ok(mock.routes.length >= 3, 'routes should include ready plans');
  assert.ok(mock.groups.length >= 3, 'groups should include temporary teams');
  assert.ok(mock.launchStates.length === 3, 'launch states should stay minimal');

  const activity = mock.activities[0];
  [
    'id',
    'title',
    'category',
    'district',
    'time',
    'place',
    'distance',
    'source',
    'tags',
    'description',
    'free',
    'quietFriendly'
  ].forEach((key) => assert.ok(Object.hasOwn(activity, key), `activity.${key}`));

  assert.equal(mock.preferences.maxDistance, 3);
  assert.ok(mock.checklist.includes('穿舒服的鞋'));
});

test('detail helper can find every mock item type', () => {
  const mock = require('../data/mock.js');
  const { findDetail } = require('../utils/format.js');

  assert.equal(findDetail('activity', mock.activities[0].id).title, mock.activities[0].title);
  assert.equal(findDetail('hotspot', mock.hotspots[0].id).title, mock.hotspots[0].title);
  assert.equal(findDetail('route', mock.routes[0].id).title, mock.routes[0].title);
  assert.equal(findDetail('group', mock.groups[0].id).title, mock.groups[0].title);
  assert.equal(findDetail('unknown', 'nope'), null);
});

test('home distance badge is a real centered component', () => {
  const wxml = fs.readFileSync(path.join(root, 'pages/home/home.wxml'), 'utf8');
  const wxss = fs.readFileSync(path.join(root, 'pages/home/home.wxss'), 'utf8');

  assert.match(wxml, /class="hero-distance"/);
  assert.match(wxss, /\.hero-distance\s*\{[^}]*display:\s*flex;/s);
  assert.match(wxss, /\.hero-distance\s*\{[^}]*align-items:\s*center;/s);
  assert.match(wxss, /\.hero-distance\s*\{[^}]*justify-content:\s*center;/s);
  assert.match(wxss, /\.hero-distance\s*\{[^}]*width:\s*110rpx;/s);
  assert.match(wxss, /\.hero-distance\s*\{[^}]*height:\s*110rpx;/s);
});

test('home clock formats date, weekday, and time for the hero', () => {
  const { formatHomeClock } = require('../utils/time.js');
  const clock = formatHomeClock(new Date('2026-05-20T15:11:00+08:00'));

  assert.equal(clock.currentDate, '2026年05月20日');
  assert.equal(clock.currentWeekday, '周三');
  assert.equal(clock.currentTime, '15:11');
});
