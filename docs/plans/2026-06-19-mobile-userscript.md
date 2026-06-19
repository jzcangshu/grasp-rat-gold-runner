# Mobile Userscript Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add an independent mobile Tampermonkey userscript for Grasp Rat Gold Runner without modifying the desktop script behavior.

**Architecture:** Keep the desktop userscript as the source of mature game-state automation logic, but ship mobile as a separate userscript file with its own runner key, panel id, touch input layer, and compact HUD. The mobile script intentionally removes desktop-only readout panels and replaces right-click/manual controls with long-press and side drawers.

**Tech Stack:** Plain JavaScript userscript, injected page context, DOM/CSS HUD, canvas overlay, PowerShell release scripts, Node syntax checks.

---

### Task 1: Add independent mobile script files

**Files:**
- Create: `src/grasp-rat-gold-runner-mobile.user.js`
- Create: `dist/grasp-rat-gold-runner-mobile.user.js`

**Steps:**
1. Create a separate userscript header with `Grasp Rat Gold Runner Mobile` and a separate runner key.
2. Replace the desktop HUD with compact mobile controls.
3. Replace right-click target selection with long-press target selection.
4. Verify `node --check` passes for both files.

### Task 2: Update release scripts

**Files:**
- Modify: `scripts/sync-dist.ps1`
- Modify: `scripts/release-check.ps1`
- Modify: `package.json`

**Steps:**
1. Sync both desktop and mobile source files into `dist`.
2. Check syntax for all four userscript files.
3. Compare each source file only against its matching dist file.
4. Keep the no-`backdrop-filter` check across both variants.

### Task 3: Document mobile tradeoffs

**Files:**
- Create: `docs/mobile.md`
- Modify: `README.md`
- Modify: `AGENTS.md`
- Modify: `docs/development.md`
- Modify: `docs/install.md`
- Modify: `docs/changelog.md`

**Steps:**
1. Document why mobile is separate from desktop.
2. List the mobile UI decisions and priority boundaries.
3. Update install/development docs with the mobile dist path.
4. Add changelog entry for the first mobile script version.
