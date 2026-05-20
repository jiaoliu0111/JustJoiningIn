# 凑热闹微信小程序 MVP Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a runnable native WeChat mini program MVP for “凑热闹” with a homepage loop, bustle browsing, temporary groups, detail views, and low-pressure preferences.

**Architecture:** The app uses native WeChat Mini Program files with local CommonJS mock data. Pages read shared data from `data/mock.js`, navigate through a reusable `pages/detail/detail` route, and keep state local for prototype interactions such as matching and dissolving groups.

**Tech Stack:** Native WeChat Mini Program (`WXML`, `WXSS`, `JS`, `JSON`), local mock data, Node.js built-in `node:test` for structural validation.

---

## File Structure

- `app.js`: global app state for preferences and active group.
- `app.json`: page registration, tab bar, window theme.
- `app.wxss`: shared theme tokens, card, button, tag, list styles.
- `project.config.json`: WeChat Developer Tools project config.
- `sitemap.json`: allow all pages for local preview.
- `data/mock.js`: official activities, hotspots, routes, groups, preferences, launch states.
- `utils/format.js`: detail lookup helpers, tag formatting, progress text helpers.
- `tests/mini-program.test.js`: Node validation for structure, data, and page references.
- `pages/home/*`: homepage closed loop and route/group entry points.
- `pages/bustle/*`: filterable bustle/activity/route list.
- `pages/group/*`: publish panel, quiet toggle, matching success, dissolve group.
- `pages/mine/*`: preferences and checklist.
- `pages/detail/*`: reusable detail rendering for activity, hotspot, route, group.

## Tasks

### Task 1: Verification Harness

**Files:**
- Create: `tests/mini-program.test.js`

- [ ] Write failing Node tests that assert required mini program files exist, JSON files parse, `app.json` registers 5 pages and 4 tab items, mock data has required arrays, and all tab page files exist.
- [ ] Run `/Users/song/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/bin/node --test tests/mini-program.test.js` and confirm it fails because app files do not exist yet.

### Task 2: App Shell and Shared Data

**Files:**
- Create: `app.js`, `app.json`, `app.wxss`, `project.config.json`, `sitemap.json`
- Create: `data/mock.js`, `utils/format.js`

- [ ] Add native mini program shell with 4 tabs: 首页、热闹、凑局、我的.
- [ ] Add local mock data for activities, hotspots, routes, groups, preferences, launch states, and checklist.
- [ ] Add lookup helpers for detail pages.
- [ ] Run the Node tests and confirm shell/data assertions pass while page assertions still fail.

### Task 3: Home Page

**Files:**
- Create: `pages/home/home.js`, `pages/home/home.json`, `pages/home/home.wxml`, `pages/home/home.wxss`

- [ ] Build homepage hero, lightweight reminder, instant group CTA, WXSS map-feel block, active groups, official activities, ready routes, checklist.
- [ ] Wire navigation to detail pages and group tab.
- [ ] Run tests and fix page file registration issues.

### Task 4: Bustle and Detail Pages

**Files:**
- Create: `pages/bustle/bustle.js`, `pages/bustle/bustle.json`, `pages/bustle/bustle.wxml`, `pages/bustle/bustle.wxss`
- Create: `pages/detail/detail.js`, `pages/detail/detail.json`, `pages/detail/detail.wxml`, `pages/detail/detail.wxss`

- [ ] Build filter chips for 免费、3km 内、周末、静音友好、公园活动、社区活动.
- [ ] Render mixed activity/hotspot/route cards.
- [ ] Build reusable detail view with type-specific meta and primary action.
- [ ] Run tests and inspect page paths.

### Task 5: Group and Mine Pages

**Files:**
- Create: `pages/group/group.js`, `pages/group/group.json`, `pages/group/group.wxml`, `pages/group/group.wxss`
- Create: `pages/mine/mine.js`, `pages/mine/mine.json`, `pages/mine/mine.wxml`, `pages/mine/mine.wxss`

- [ ] Build three launch statuses, quiet toggle, duration selector, publish/matching success, one-click dissolve.
- [ ] Build preference switches, distance choices, weekend reminder, and checklist.
- [ ] Run full tests and fix issues.

### Task 6: Final Validation

**Files:**
- Modify files only if validation finds issues.

- [ ] Run Node tests.
- [ ] Run JSON parse checks across all `.json` files.
- [ ] Run `node --check` on JS files.
- [ ] Check git status and review diff.
- [ ] Commit implementation.
