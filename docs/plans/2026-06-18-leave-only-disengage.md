# Leave Only Disengage Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace enemy-safety teleport disengage with direct leave disengage, and increase combat low-HP detection frequency below 22 HP.

**Architecture:** Keep movement, route planning, hunt mode, and combat dodge behavior unchanged. Replace all automatic safety calls to teleport with `clickLeave()`, remove teleport stamina-fail gating from safety flow, and dynamically speed up the main loop while combat HP is under 22.

**Tech Stack:** Tampermonkey userscript, plain JavaScript timers, existing game page state (`state`, `els`) and HUD.

---

### Task 1: Safety Flow

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Change normal HP-drop safety from teleport to leave.
2. Change combat `HP<=9` safety from teleport to leave.
3. Remove teleport stamina-fail checks from the main safety loop.

### Task 2: Low-HP Combat Frequency

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Add normal and urgent step intervals.
2. Add a helper to switch the active step interval.
3. In combat mode, switch to urgent interval when `HP<22`; switch back otherwise.
4. Ensure `clickLeave()`, `stop()`, and combat mode exit do not leave an old interval running.

### Task 3: Docs And Release

**Files:**
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/behavior.md`
- Modify: `docs/changelog.md`
- Modify: `package.json`
- Modify: `dist/grasp-rat-gold-runner.user.js`

**Steps:**
1. Bump version to `1.6.13`.
2. Update docs to describe leave-only disengage.
3. Sync `dist`, run checks, commit, and push.
