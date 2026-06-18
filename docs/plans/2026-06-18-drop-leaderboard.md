# Drop Leaderboard Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a HUD leaderboard that refreshes every 30 seconds and shows the top five users by yellow `Drop` value, with click-to-copy usernames.

**Architecture:** Reuse the existing HUD body so the new UI does not cover the game center. Read `Drop` from the same entity fields used by threat detection, resolve usernames from entity names or `state.userNames`, and keep a dedicated timer independent from movement logic.

**Tech Stack:** Tampermonkey userscript, plain JavaScript DOM updates, browser clipboard API with textarea fallback.

---

### Task 1: UI Shell

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Add a compact leaderboard block under the hunt controls.
2. Style it with the existing semitransparent HUD language.
3. Add `data-crgr` handles for the list and refresh timestamp.

### Task 2: Data And Copy Logic

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Build `topDropUsers()` from live entities using `enemyDrop()`.
2. Resolve usernames from `entity.name` or `state.userNames`.
3. Render the top five by `Drop` descending.
4. Add click-to-copy for names with clipboard fallback.

### Task 3: Timers And Release

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`
- Modify: `README.md`
- Modify: `docs/behavior.md`
- Modify: `docs/changelog.md`
- Modify: `package.json`
- Modify: `dist/grasp-rat-gold-runner.user.js`

**Steps:**
1. Add a 30 second leaderboard timer and clear it in `destroy()`.
2. Bump version to `1.6.12`.
3. Sync `dist`, run release checks, commit, and push.
