# Temporary Combat Mode Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a temporary combat mode that pauses coin cruising, dodges bullets, marks favorable close targets, and escalates low-HP safety behavior.

**Architecture:** Reuse the existing single-file userscript and its current priority chain. Combat mode becomes an explicit runner state that runs after universal safety checks and before coin planning. The visual layer remains the existing canvas overlay, with line rendering disabled while combat mode is active.

**Tech Stack:** Tampermonkey userscript, page-injected JavaScript, game globals `state`, `els`, and `sendVelocity`, canvas overlay for lightweight indicators.

---

### Task 1: UI State

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Replace the “自保传送” button with a “临时交战” toggle.
2. Add runner state for `combatMode`, dodge smoothing, and combat risk.
3. Ensure manual stop/destroy clears combat movement safely.

### Task 2: Combat Decision Loop

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Keep universal safety first: HP drop teleport, death stop, stamina stop.
2. In combat mode, pause coin planning and right-click target travel.
3. Detect projectile-like objects from known state collections and calculate a conservative dodge vector.
4. Smooth the dodge vector to avoid frequent reversals.
5. Teleport immediately when HP is 9 or below, reusing the existing teleport and stamina-fail leave flow.

### Task 3: Combat Visuals

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Disable all existing connector lines while combat mode is active.
2. Draw red inverted triangles above 170m enemies whose HP is lower than the player.
3. Reuse and intensify the red danger vignette when enemy HP exceeds player HP by 15% or player HP is 25 or below.

### Task 4: Docs And Release

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/behavior.md`
- Modify: `docs/changelog.md`
- Modify: `package.json`
- Sync: `dist/grasp-rat-gold-runner.user.js`

**Steps:**
1. Bump version.
2. Document combat mode and connector disabling.
3. Run syntax checks for src and dist.
4. Verify src and dist hashes match.
