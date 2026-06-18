# Attack Target Lock Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a top-left enemy HP list for enemies inside 170m and allow clicking a row to lock the auto-fire target while the target remains visible.

**Architecture:** Extend the existing HUD with a small `ATTACK BUFFER` panel inside the right-side game scene area, reusing the existing HUD boundary logic. Add an attack-lock state separate from movement modes. Auto-fire should prefer the locked target while it remains alive and within 500m visibility, but should only shoot it when it is inside the 150m firing range; if the lock leaves visibility, clear the lock and resume automatic lowest-HP target selection.

**Tech Stack:** Tampermonkey userscript, page-context JavaScript, existing game globals and HUD canvas helpers.

---

### Task 1: HUD List

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Add a top-left HUD panel with a lock summary and a clickable list.
2. Populate the list from live enemies within 170m.
3. Show username, HP, and distance.
4. Highlight the currently locked target.

### Task 2: Lock State

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Add runner fields for locked target id, name, and last status.
2. Add click handler to set the lock from the list.
3. Clear the lock automatically if the target is no longer alive/visible within 500m.

### Task 3: Auto-Fire Priority

**Files:**
- Modify: `src/grasp-rat-gold-runner.user.js`

**Steps:**
1. Make auto-fire prefer the locked target if visible.
2. Do not shoot the locked target while it is outside 150m, but do not switch away.
3. When no visible locked target exists, fall back to HP ascending and distance ascending auto selection.

### Task 4: Release

**Files:**
- Modify: `README.md`
- Modify: `docs/behavior.md`
- Modify: `docs/changelog.md`
- Modify: `AGENTS.md`
- Modify: `package.json`
- Modify: `dist/grasp-rat-gold-runner.user.js`

**Steps:**
1. Bump version.
2. Document lock behavior and priority.
3. Sync `dist`.
4. Run release checks.
5. Commit and push.
