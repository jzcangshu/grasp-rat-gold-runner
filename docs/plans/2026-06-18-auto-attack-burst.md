# Auto Attack Burst Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Move auto attack into the top-left fire-control panel and change firing from single-shot timing to dense long-press bursts of 5-8 bullets.

**Architecture:** Keep auto attack as an independent fire-control switch with default-off state. The switch lives above `ATTACK BUFFER`, while stop/leave always disable it. Auto-fire target selection remains the same, but a firing decision now starts one burst: hold mouse down, update aim over 5-8 shot windows, then release and wait a randomized group cooldown.

**Tech Stack:** Tampermonkey userscript, page-context JavaScript, existing HUD and game canvas mouse event helpers.

---

### Task 1: Move Control

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Remove the auto-fire button from the bottom action row.
2. Add an auto-attack button above the attack lock list.
3. Keep default `autoFireMode=false`.
4. Keep stop/leave disabling auto attack.

### Task 2: Burst Fire

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Replace single click fire with long-press bursts.
2. Randomize each burst size from 5 to 8 bullets.
3. Keep group-internal fire cadence as a held press, not individual click rhythm.
4. Add coverage offsets around the predicted target path, especially for farther targets.
5. Allow bursts to drain stamina down to zero instead of conserving too aggressively.

### Task 3: Release

**Files:**
- Modify: `README.md`
- Modify: `docs/behavior.md`
- Modify: `docs/changelog.md`
- Modify: `AGENTS.md`
- Modify: `package.json`
- Modify: `dist/grasp-rat-gold-runner.user.js`

**Steps:**
1. Bump version.
2. Document independent top-left auto attack switch and burst behavior.
3. Sync `dist`.
4. Run release checks.
5. Commit and push.
