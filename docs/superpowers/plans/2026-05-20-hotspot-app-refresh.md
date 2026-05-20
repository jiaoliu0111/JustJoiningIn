# Hotspot App Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the mini program from a group-matching prototype into a warm local hotspot discovery tool based on the uploaded design document.

**Architecture:** Keep the native WeChat Mini Program shell and existing page paths, but replace the data model and visible UI vocabulary. `data/mock.js` becomes the source for nearby moments and reason cards; `utils/format.js` resolves detail objects; each page renders the new low-pressure activity discovery flow.

**Tech Stack:** Native WeChat Mini Program WXML/WXSS/JS, CommonJS mock data, Node built-in test runner.

---

### Task 1: Red Tests

- [ ] Update `tests/mini-program.test.js` so app tab text is 首页/热闹/理由/我的.
- [ ] Assert `data/mock.js` exports `nearbyMoments` and `reasonCards`.
- [ ] Assert visible app files do not contain social-matching phrases.
- [ ] Run `node --test tests/mini-program.test.js` and verify failure against current implementation.

### Task 2: Data and Utilities

- [ ] Replace old launch/group data with nearby moment and reason-card data.
- [ ] Update detail lookup to support `moment`, `reason`, and `route`.

### Task 3: Pages

- [ ] Update app tab label to 理由.
- [ ] Refresh global colors to the new palette.
- [ ] Update home, bustle, group/reason, detail, and mine pages to the new product direction.

### Task 4: Verification

- [ ] Run Node tests.
- [ ] Run JSON parse checks.
- [ ] Run JS syntax checks.
- [ ] Commit the focused refresh.
