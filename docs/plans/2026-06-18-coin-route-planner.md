# Coin Route Planner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Upgrade coin cruising from single-target scoring to short multi-drop route planning that reduces backtracking and favors dense coin clusters when efficient.

**Architecture:** Keep the existing safety priority chain unchanged. Build a safe coin candidate pool, generate several short route candidates from high-value, nearby, and dense-cluster anchors, then execute the best route one drop at a time while periodically replanning.

**Tech Stack:** Tampermonkey userscript, plain JavaScript, existing game page state (`state.coinDrops`, `state.entities`) and movement helpers.

---

### Task 1: Route State

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Add route state fields beside the existing coin target fields.
2. Add `clearCoinRoute()` and `adoptCoinRoute()` helpers.
3. Replace coin target resets in movement mode switches with route resets.

### Task 2: Route Scoring

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Reuse existing safe coin filtering and rich-enemy safety checks.
2. Add cluster metrics for nearby coin count and weighted nearby amount.
3. Build short greedy routes from anchor drops; dense clusters can plan more stops, sparse areas plan fewer stops.
4. Score route efficiency by expected value per travel time, with safety, route stability, and anti-backtracking factors.

### Task 3: Main Loop Integration

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Replace `bestDrop()` use in the cruise branch with `bestDropRoute()`.
2. Follow the first live drop in the current route.
3. When a route drop disappears, advance to the next route drop and allow immediate replanning.
4. Keep manual target, hunt mode, combat mode, enemy escape, stamina, and HP safety priorities unchanged.

### Task 4: Docs And Release

**Files:**
- Modify: `README.md`
- Modify: `docs/behavior.md`
- Modify: `docs/changelog.md`
- Modify: `package.json`
- Modify: `dist/grasp-rat-gold-runner.user.js`

**Steps:**
1. Bump version to `1.6.11`.
2. Document the route planner behavior.
3. Sync `dist`.
4. Run release checks and commit.
