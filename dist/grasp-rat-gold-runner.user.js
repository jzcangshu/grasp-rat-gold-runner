// ==UserScript==
// @name         Grasp Rat Gold Runner
// @namespace    https://grasp-rat-game.h-e.top/
// @version      1.7.3
// @description  Auto collect coin drops with HP-drop leave safety and combat dodge support.
// @match        https://grasp-rat-game.h-e.top/*
// @run-at       document-end
// @grant        unsafeWindow
// ==/UserScript==

(function () {
  "use strict";

  const code = `(${pageMain.toString()})();`;

  try {
    if (typeof unsafeWindow !== "undefined" && unsafeWindow.eval) {
      unsafeWindow.eval(code);
      return;
    }
  } catch (_) {
    // Fall back to a page script element below.
  }

  const script = document.createElement("script");
  script.textContent = code;
  (document.documentElement || document.head || document.body).appendChild(script);
  script.remove();

  function pageMain() {
    "use strict";

    const RUNNER_KEY = "__codexRatGoldRunner";
    const PANEL_ID = "codex-rat-gold-runner-panel";
    const RICH_ENEMY_MIN_DROP = 10;
    const RICH_ENEMY_SCAN_CM = 25000;
    const RICH_ENEMY_KEEP_CM = 22000;
    const RICH_ENEMY_ESCAPE_CM = 17000;
    const ENEMY_LINE_SCAN_CM = 50000;
    const ENEMY_LINE_MIN_DROP = 1;
    const COMBAT_SCAN_CM = 17000;
    const COMBAT_LOW_HP = 9;
    const COMBAT_FAST_CHECK_HP = 22;
    const COMBAT_CRITICAL_HP = 25;
    const COMBAT_DODGE_SCAN_CM = 36000;
    const COMBAT_DODGE_SPEED_CMPS = 1300;
    const COMBAT_DODGE_SWITCH_MS = 650;
    const COMBAT_SPACING_SCAN_CM = 19000;
    const COMBAT_RANGE_HARD_MIN_CM = 8500;
    const COMBAT_RANGE_MIN_CM = 10000;
    const COMBAT_RANGE_IDEAL_CM = 12500;
    const COMBAT_RANGE_MAX_CM = 15000;
    const COMBAT_CLOSE_PROJECTILE_PRESSURE = 520;
    const AUTO_FIRE_RANGE_CM = 15000;
    const AUTO_FIRE_DEFAULT_PROJECTILE_SPEED_CMPS = 10000;
    const AUTO_FIRE_MAX_RATE_MS = 100;
    const AUTO_FIRE_LOOP_MS = 100;
    const AUTO_FIRE_STAMINA_COST_MILLI = 500;
    const AUTO_FIRE_STAMINA_MAX_MILLI = 10000;
    const AUTO_FIRE_LEAD_MIN_MS = 60;
    const AUTO_FIRE_LEAD_MAX_MS = 1150;
    const AUTO_FIRE_BURST_MIN_SHOTS = 5;
    const AUTO_FIRE_BURST_MAX_SHOTS = 8;
    const AUTO_FIRE_BURST_SHOT_MS = AUTO_FIRE_MAX_RATE_MS;
    const PROJECTILE_MEMORY_MS = 1800;
    const MOVING_ENEMY_MEMORY_MS = 10000;
    const ENEMY_MOVE_EPSILON_CM = 30;
    const LINE_CANVAS_MAX_DPR = 1.75;
    const DROP_CLUSTER_CM = 9000;
    const ROUTE_CLUSTER_CM = 13000;
    const ROUTE_LINK_CM = 15000;
    const ROUTE_MAX_LINK_CM = 22000;
    const ROUTE_ANCHOR_LIMIT = 22;
    const ROUTE_POOL_LIMIT = 72;
    const ROUTE_MAX_POINTS_DENSE = 6;
    const ROUTE_MAX_POINTS_MID = 4;
    const ROUTE_MAX_POINTS_SPARSE = 2;
    const ROUTE_SWITCH_FACTOR = 1.14;
    const REPLAN_MS = 1800;
    const DROP_LEADERBOARD_REFRESH_MS = 10000;
    const DROP_LEADERBOARD_ENTRY_REFRESH_DELAY_MS = 3000;
    const STEP_TICK_MS = 150;
    const COMBAT_FAST_TICK_MS = 50;
    const AXIS_DOMINANCE_RATIO = 1.65;
    const HUNT_REACHED_CM = 260;
    const HUNT_LOST_MEMORY_MS = 12000;
    const HUNT_PREDICT_MIN_MS = 350;
    const HUNT_PREDICT_MAX_MS = 1300;
    const HUNT_PREDICT_DISTANCE_DIVISOR = 9000;
    const DANGER_ID = "codex-rat-danger-vignette";
    const MANUAL_TARGET_REACHED_CM = 160;
    const MOVE_KEYS = ["w", "a", "s", "d", "arrowup", "arrowdown", "arrowleft", "arrowright"];

    if (window[RUNNER_KEY] && typeof window[RUNNER_KEY].destroy === "function") {
      window[RUNNER_KEY].destroy("replaced");
    } else if (window[RUNNER_KEY] && typeof window[RUNNER_KEY].stop === "function") {
      window[RUNNER_KEY].stop("replaced");
    }

      const existingPanel = document.getElementById(PANEL_ID);
      if (existingPanel) existingPanel.remove();
      const existingDanger = document.getElementById(DANGER_ID);
      if (existingDanger) existingDanger.remove();

    const ready = () => {
      try {
        return typeof state !== "undefined"
          && typeof els !== "undefined"
          && typeof sendVelocity === "function"
          && state
          && els;
      } catch (_) {
        return false;
      }
    };

    let waitTimer = 0;
    let waitCount = 0;

    function waitForGame() {
      if (ready()) {
        clearInterval(waitTimer);
        setupRunner();
        return;
      }
      waitCount += 1;
      if (waitCount > 240) {
        console.warn("[RatGoldRunner] Game variables not found. Reload the game page and try again.");
        clearInterval(waitTimer);
      }
    }

    waitTimer = window.setInterval(waitForGame, 500);
    waitForGame();

    function setupRunner() {
      const root = document.createElement("section");
      root.id = PANEL_ID;
      root.innerHTML = [
        '<div class="crgr-frame">',
        '  <canvas class="crgr-lines" data-crgr="line-canvas" aria-hidden="true"></canvas>',
        '  <div class="crgr-corner c1"></div>',
        '  <div class="crgr-corner c2"></div>',
        '  <div class="crgr-corner c3"></div>',
        '  <div class="crgr-corner c4"></div>',
        '  <div class="crgr-head">',
        '    <span class="crgr-tag">RAT GOLD RUNNER</span>',
        '    <strong data-crgr="mode">STANDBY</strong>',
        '    <button type="button" data-crgr="collapse" title="折叠/展开">HUD</button>',
        '  </div>',
        '  <div class="crgr-attack-lock">',
        '    <button type="button" class="crgr-auto-attack" data-crgr="auto-fire">自动攻击</button>',
        '    <div class="crgr-attack-head"><span>ATTACK BUFFER</span><small data-crgr="attack-lock-summary">AUTO</small></div>',
        '    <div class="crgr-attack-list" data-crgr="attack-list"><button type="button" disabled>扫描中</button></div>',
        '  </div>',
        '  <div class="crgr-core">',
        '    <div class="crgr-reticle"><span></span><span></span><span></span><span></span></div>',
        '    <div class="crgr-action" data-crgr="action">等待启动</div>',
        '    <div class="crgr-grid">',
        '      <div><b data-crgr="hp">--</b><small>HP</small></div>',
        '      <div><b data-crgr="gain">+0</b><small>GAIN</small></div>',
        '      <div><b data-crgr="target">--</b><small>TARGET</small></div>',
        '      <div><b data-crgr="move">idle</b><small>MOVE</small></div>',
        '    </div>',
        '    <div class="crgr-line"><span>THREAT</span><b data-crgr="threat">--</b></div>',
        '    <div class="crgr-line"><span>STAMINA</span><b data-crgr="stamina">--</b></div>',
        '    <div class="crgr-line"><span>SAFETY</span><b data-crgr="safety">LEAVE 0 / EVADE 0</b></div>',
        '  </div>',
        '  <div class="crgr-body">',
        '    <div class="crgr-hunt-row">',
        '      <label>追杀用户名 <input data-crgr="hunt-query" placeholder="用户名片段" /></label>',
        '      <button type="button" data-crgr="hunt">追杀</button>',
        '    </div>',
        '    <div class="crgr-drop-board">',
        '      <div class="crgr-drop-head"><span>DROP TOP 5</span><small data-crgr="drop-refresh">--</small></div>',
        '      <ol data-crgr="drop-list"><li>扫描中</li></ol>',
        '    </div>',
        '    <div class="crgr-actions">',
        '      <button type="button" data-crgr="start">启动</button>',
        '      <button type="button" data-crgr="stop">停止</button>',
        '      <button type="button" data-crgr="combat">临时交战</button>',
        '      <button type="button" data-crgr="leave">离开</button>',
        '    </div>',
        '    <pre data-crgr="status">READY</pre>',
        '  </div>',
        '</div>',
      ].join("");
      document.body.appendChild(root);

      const style = document.createElement("style");
      style.textContent = `
        #${PANEL_ID} {
          position: fixed;
          top: 0;
          right: 0;
          bottom: 0;
          left: var(--crgr-scene-left, 384px);
          z-index: 2147483647;
          color: #e5edf8;
          font: clamp(14px, 0.72vw, 20px)/1.35 "Microsoft YaHei", "Microsoft YaHei UI", "SimHei", "Heiti SC", Arial, sans-serif;
          pointer-events: none;
          text-shadow: 0 0 10px rgba(125, 211, 252, .45);
        }
        #${PANEL_ID} .crgr-frame {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(90deg, rgba(34, 211, 238, .035), transparent 16%, transparent 84%, rgba(34, 211, 238, .035)),
            linear-gradient(180deg, rgba(14, 165, 233, .04), transparent 18%, transparent 82%, rgba(14, 165, 233, .03));
          box-shadow: inset 0 0 36px rgba(14, 165, 233, .045);
        }
        #${PANEL_ID} .crgr-lines {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          display: block;
          pointer-events: none;
          z-index: 0;
        }
        #${PANEL_ID}.collapsed .crgr-core,
        #${PANEL_ID}.collapsed .crgr-body {
          display: none;
        }
        #${PANEL_ID} .crgr-corner {
          position: absolute;
          width: 72px;
          height: 44px;
          border-color: rgba(103, 232, 249, .38);
          pointer-events: none;
        }
        #${PANEL_ID} .c1 { left: 14px; top: 14px; border-left: 2px solid; border-top: 2px solid; }
        #${PANEL_ID} .c2 { right: 14px; top: 14px; border-right: 2px solid; border-top: 2px solid; }
        #${PANEL_ID} .c3 { left: 14px; bottom: 14px; border-left: 2px solid; border-bottom: 2px solid; }
        #${PANEL_ID} .c4 { right: 14px; bottom: 14px; border-right: 2px solid; border-bottom: 2px solid; }
        #${PANEL_ID} .crgr-head {
          position: absolute;
          left: 50%;
          top: 16px;
          transform: translateX(-50%);
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 10px;
          min-width: 270px;
          padding: 7px 12px;
          color: #a5f3fc;
          letter-spacing: .08em;
          background: rgba(2, 6, 23, .46);
          border: 1px solid rgba(125, 211, 252, .16);
        }
        #${PANEL_ID} .crgr-tag {
          color: rgba(186, 230, 253, .78);
          font-size: 11px;
        }
        #${PANEL_ID} .crgr-head strong {
          color: #f8fafc;
          font-size: clamp(15px, .78vw, 22px);
        }
        #${PANEL_ID} .crgr-core {
          position: absolute;
          inset: 0;
        }
        #${PANEL_ID} .crgr-reticle {
          display: none;
        }
        #${PANEL_ID} .crgr-action {
          position: absolute;
          left: 50%;
          top: 122px;
          transform: translateX(-50%);
          width: min(680px, calc(100% - 40px));
          min-height: 46px;
          padding: 9px 14px;
          color: #fef9c3;
          font-size: clamp(21px, 1.08vw, 32px);
          font-weight: 700;
          text-align: center;
          text-transform: uppercase;
          background: rgba(2, 6, 23, .42);
          border: 1px solid rgba(250, 204, 21, .14);
        }
        #${PANEL_ID} .crgr-grid {
          position: absolute;
          left: 50%;
          bottom: 20px;
          transform: translateX(-50%);
          width: min(720px, calc(100% - 40px));
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
        }
        #${PANEL_ID} .crgr-grid div,
        #${PANEL_ID} .crgr-line {
          background: rgba(2, 6, 23, .38);
          border: 1px solid rgba(125, 211, 252, .14);
          box-shadow: inset 0 0 18px rgba(14, 165, 233, .05);
        }
        #${PANEL_ID} .crgr-grid div {
          display: grid;
          gap: 2px;
          min-height: 64px;
          place-items: center;
          padding: 8px;
          background: rgba(2, 6, 23, .36);
        }
        #${PANEL_ID} .crgr-grid b {
          color: #e0f2fe;
          font-size: clamp(20px, 1.05vw, 30px);
          max-width: 100%;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        #${PANEL_ID} small,
        #${PANEL_ID} .crgr-line span {
          color: rgba(186, 230, 253, .62);
          font-size: clamp(11px, .58vw, 16px);
          letter-spacing: .12em;
        }
        #${PANEL_ID} .crgr-line {
          position: relative;
          display: flex;
          justify-content: space-between;
          gap: 10px;
          min-width: min(330px, calc(100% - 36px));
          max-width: min(560px, calc(100% - 36px));
          padding: 7px 10px;
          background: rgba(2, 6, 23, .36);
        }
        #${PANEL_ID} .crgr-line b {
          color: #cffafe;
          font-weight: 600;
          font-size: clamp(15px, .78vw, 22px);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        #${PANEL_ID} .crgr-line:nth-of-type(4) {
          position: absolute;
          left: 18px;
          top: 78px;
        }
        #${PANEL_ID} .crgr-line:nth-of-type(5) {
          position: absolute;
          right: 18px;
          top: 78px;
        }
        #${PANEL_ID} .crgr-line:nth-of-type(6) {
          position: absolute;
          right: 18px;
          bottom: 86px;
        }
        #${PANEL_ID} .crgr-attack-lock {
          position: absolute;
          left: 18px;
          top: 184px;
          width: min(360px, calc(100% - 36px));
          max-height: min(38vh, 360px);
          display: grid;
          gap: 6px;
          padding: 8px;
          color: rgba(226, 232, 240, .82);
          background: rgba(2, 6, 23, .38);
          border: 1px solid rgba(125, 211, 252, .14);
          pointer-events: auto;
        }
        #${PANEL_ID} .crgr-auto-attack {
          min-height: 36px;
          color: #bae6fd;
          background: rgba(8, 47, 73, .34);
          border-color: rgba(56, 189, 248, .42);
          font-weight: 700;
          letter-spacing: .08em;
        }
        #${PANEL_ID} .crgr-auto-attack.active {
          color: #ecfeff;
          background: rgba(8, 47, 73, .62);
          box-shadow: inset 0 0 18px rgba(56, 189, 248, .16), 0 0 18px rgba(56, 189, 248, .1);
        }
        #${PANEL_ID} .crgr-attack-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          color: rgba(186, 230, 253, .72);
        }
        #${PANEL_ID} .crgr-attack-head span {
          color: #fecaca;
          font-size: clamp(12px, .62vw, 18px);
          font-weight: 700;
          letter-spacing: .08em;
        }
        #${PANEL_ID} .crgr-attack-head small {
          min-width: 0;
          color: rgba(254, 249, 195, .82);
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        #${PANEL_ID} .crgr-attack-list {
          display: grid;
          gap: 4px;
          max-height: min(30vh, 280px);
          overflow: auto;
        }
        #${PANEL_ID} .crgr-attack-list button {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(46px, auto) minmax(48px, auto);
          gap: 6px;
          align-items: center;
          min-height: 28px;
          padding: 0 7px;
          color: rgba(226, 232, 240, .86);
          text-align: left;
          background: rgba(15, 23, 42, .18);
          border-color: rgba(125, 211, 252, .12);
        }
        #${PANEL_ID} .crgr-attack-list button.active {
          color: #fff7ed;
          background: rgba(127, 29, 29, .42);
          border-color: rgba(248, 113, 113, .46);
        }
        #${PANEL_ID} .crgr-attack-name {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        #${PANEL_ID} .crgr-attack-hp {
          color: #fecaca;
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        #${PANEL_ID} .crgr-attack-dist {
          color: rgba(186, 230, 253, .72);
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        #${PANEL_ID} .crgr-body {
          position: absolute;
          left: 18px;
          bottom: 86px;
          width: min(520px, calc(100% - 36px));
          display: grid;
          grid-template-columns: 1fr;
          gap: 8px;
          align-items: end;
          padding: 8px;
          background: rgba(2, 6, 23, .42);
          border: 1px solid rgba(125, 211, 252, .14);
          pointer-events: auto;
        }
        #${PANEL_ID} label { display: grid; gap: 4px; color: #b9c7d8; }
        #${PANEL_ID} .crgr-hunt-row {
          display: grid;
          grid-template-columns: 1fr minmax(82px, auto);
          gap: 6px;
          align-items: end;
        }
        #${PANEL_ID} .crgr-drop-board {
          padding: 7px 8px;
          background: rgba(2, 6, 23, .28);
          border: 1px solid rgba(125, 211, 252, .12);
        }
        #${PANEL_ID} .crgr-drop-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 8px;
          margin-bottom: 5px;
          color: rgba(186, 230, 253, .74);
        }
        #${PANEL_ID} .crgr-drop-head span {
          color: #fef3c7;
          font-size: clamp(12px, .62vw, 18px);
          font-weight: 700;
          letter-spacing: .08em;
        }
        #${PANEL_ID} .crgr-drop-head small {
          color: rgba(186, 230, 253, .55);
          letter-spacing: 0;
          white-space: nowrap;
        }
        #${PANEL_ID} .crgr-drop-board ol {
          display: grid;
          gap: 3px;
          margin: 0;
          padding: 0;
          list-style: none;
        }
        #${PANEL_ID} .crgr-drop-board li {
          display: grid;
          grid-template-columns: 24px minmax(0, 1fr) minmax(44px, auto);
          gap: 6px;
          align-items: center;
          min-height: 26px;
          color: rgba(226, 232, 240, .78);
          font-size: clamp(12px, .62vw, 18px);
        }
        #${PANEL_ID} .crgr-drop-rank {
          color: rgba(250, 204, 21, .78);
          text-align: right;
          font-variant-numeric: tabular-nums;
        }
        #${PANEL_ID} .crgr-drop-name {
          min-width: 0;
          height: 26px;
          padding: 0 6px;
          color: #e0f2fe;
          text-align: left;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          background: rgba(15, 23, 42, .16);
          border-color: rgba(125, 211, 252, .12);
        }
        #${PANEL_ID} .crgr-drop-name:hover {
          color: #fef9c3;
          background: rgba(113, 63, 18, .4);
        }
        #${PANEL_ID} .crgr-drop-name[disabled] {
          color: rgba(148, 163, 184, .72);
          cursor: default;
        }
        #${PANEL_ID} .crgr-drop-value {
          color: #fde68a;
          text-align: right;
          font-weight: 700;
          font-variant-numeric: tabular-nums;
        }
        #${PANEL_ID} input {
          width: 100%;
          height: 26px;
          padding: 0 8px;
          color: #eaf3ff;
          background: rgba(15, 23, 42, .22);
          border: 1px solid rgba(148, 163, 184, .22);
          border-radius: 4px;
          outline: none;
          font: inherit;
        }
        #${PANEL_ID} .crgr-actions {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
        }
        #${PANEL_ID} button {
          min-height: 34px;
          color: #eaf3ff;
          background: rgba(15, 23, 42, .2);
          border: 1px solid rgba(125, 211, 252, .22);
          border-radius: 4px;
          cursor: pointer;
          font: inherit;
          pointer-events: auto;
        }
        #${PANEL_ID} button:hover { background: rgba(8, 47, 73, .72); }
        #${PANEL_ID} button.crgr-drop-name {
          min-height: 26px;
        }
        #${PANEL_ID} button[data-crgr="start"] { border-color: rgba(74, 222, 128, .45); color: #bbf7d0; }
        #${PANEL_ID} button[data-crgr="stop"] { border-color: rgba(251, 191, 36, .45); color: #fde68a; }
        #${PANEL_ID} button[data-crgr="combat"] { border-color: rgba(248, 113, 113, .42); color: #fecaca; }
        #${PANEL_ID} button[data-crgr="hunt"] { border-color: rgba(250, 204, 21, .42); color: #fef3c7; }
        #${PANEL_ID} button[data-crgr="combat"].active {
          color: #fff7ed;
          background: rgba(127, 29, 29, .42);
          box-shadow: inset 0 0 18px rgba(248, 113, 113, .16), 0 0 18px rgba(248, 113, 113, .1);
        }
        #${PANEL_ID} button[data-crgr="hunt"].active {
          color: #fffbeb;
          background: rgba(113, 63, 18, .44);
          box-shadow: inset 0 0 18px rgba(250, 204, 21, .14), 0 0 18px rgba(250, 204, 21, .08);
        }
        #${PANEL_ID} button[data-crgr="leave"] { border-color: rgba(248, 113, 113, .55); color: #fecaca; }
        #${PANEL_ID} pre {
          grid-column: 1 / -1;
          margin: 0;
          padding: 0;
          color: rgba(186, 230, 253, .74);
          background: transparent;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          font-size: clamp(12px, .62vw, 18px);
        }
        #${PANEL_ID}.running .crgr-frame {
          box-shadow: inset 0 0 40px rgba(45, 212, 191, .045);
        }
        #${PANEL_ID}.danger .crgr-frame {
          box-shadow: inset 0 0 52px rgba(127, 29, 29, .22);
        }
        @media (max-width: 760px) {
          #${PANEL_ID} {
            left: 0;
          }
          #${PANEL_ID} .crgr-head {
            top: 10px;
            min-width: 220px;
          }
          #${PANEL_ID} .crgr-action {
            top: 48px;
          }
          #${PANEL_ID} .crgr-line {
            min-width: 0;
            max-width: calc(50vw - 24px);
          }
          #${PANEL_ID} .crgr-body {
            width: calc(100vw - 36px);
          }
          #${PANEL_ID} .crgr-grid {
            grid-template-columns: repeat(2, 1fr);
            bottom: 10px;
            width: min(360px, calc(100vw - 36px));
          }
        }
        #${DANGER_ID} {
          position: fixed;
          inset: 0;
          z-index: 2147483646;
          pointer-events: none;
          opacity: 0;
          transition: opacity .22s ease;
          box-shadow:
            inset 0 0 0 2px rgba(248, 113, 113, .38),
            inset 0 0 48px 18px rgba(127, 29, 29, .38),
            inset 0 0 110px 42px rgba(69, 10, 10, .34);
        }
        #${DANGER_ID}.active {
          opacity: 1;
          animation: crgr-danger-pulse 1.15s ease-in-out infinite;
        }
        #${DANGER_ID}.critical {
          opacity: 1;
          animation: crgr-danger-critical .62s ease-in-out infinite;
        }
        @keyframes crgr-danger-pulse {
          0%, 100% {
            box-shadow:
              inset 0 0 0 2px rgba(248, 113, 113, .28),
              inset 0 0 44px 16px rgba(127, 29, 29, .28),
              inset 0 0 94px 36px rgba(69, 10, 10, .24);
          }
          50% {
            box-shadow:
              inset 0 0 0 3px rgba(248, 113, 113, .62),
              inset 0 0 74px 28px rgba(127, 29, 29, .56),
              inset 0 0 140px 58px rgba(69, 10, 10, .5);
          }
        }
        @keyframes crgr-danger-critical {
          0%, 100% {
            box-shadow:
              inset 0 0 0 3px rgba(248, 113, 113, .38),
              inset 0 0 88px 34px rgba(127, 29, 29, .48),
              inset 0 0 180px 76px rgba(69, 10, 10, .44);
          }
          50% {
            box-shadow:
              inset 0 0 0 5px rgba(248, 113, 113, .78),
              inset 0 0 132px 54px rgba(127, 29, 29, .72),
              inset 0 0 250px 108px rgba(69, 10, 10, .62);
          }
        }
      `;
      document.head.appendChild(style);

      const danger = document.createElement("div");
      danger.id = DANGER_ID;
      document.body.appendChild(danger);

      const ui = {
        huntQuery: root.querySelector('[data-crgr="hunt-query"]'),
        hunt: root.querySelector('[data-crgr="hunt"]'),
        attackLockSummary: root.querySelector('[data-crgr="attack-lock-summary"]'),
        attackList: root.querySelector('[data-crgr="attack-list"]'),
        lineCanvas: root.querySelector('[data-crgr="line-canvas"]'),
        dropRefresh: root.querySelector('[data-crgr="drop-refresh"]'),
        dropList: root.querySelector('[data-crgr="drop-list"]'),
        start: root.querySelector('[data-crgr="start"]'),
        stop: root.querySelector('[data-crgr="stop"]'),
        combat: root.querySelector('[data-crgr="combat"]'),
        autoFire: root.querySelector('[data-crgr="auto-fire"]'),
        leave: root.querySelector('[data-crgr="leave"]'),
        collapse: root.querySelector('[data-crgr="collapse"]'),
        mode: root.querySelector('[data-crgr="mode"]'),
        action: root.querySelector('[data-crgr="action"]'),
        hp: root.querySelector('[data-crgr="hp"]'),
        gain: root.querySelector('[data-crgr="gain"]'),
        target: root.querySelector('[data-crgr="target"]'),
        move: root.querySelector('[data-crgr="move"]'),
        threat: root.querySelector('[data-crgr="threat"]'),
        stamina: root.querySelector('[data-crgr="stamina"]'),
        safety: root.querySelector('[data-crgr="safety"]'),
        status: root.querySelector('[data-crgr="status"]')
      };

      function updateHudSceneBounds() {
        const side = document.querySelector(".side");
        const rect = side ? side.getBoundingClientRect() : null;
        const sideRight = rect && rect.width > 0 ? Math.ceil(rect.right + 28) : 384;
        root.style.setProperty("--crgr-scene-left", sideRight + "px");
      }

      updateHudSceneBounds();
      window.addEventListener("resize", updateHudSceneBounds);

      const runner = {
        running: false,
        timer: 0,
        statusTimer: 0,
        sidebarSafetyTimer: 0,
        dropLeaderboardTimer: 0,
        dropLeaderboardEntryTimer: 0,
        dropLeaderboardEntryRefreshScheduled: false,
        lineRaf: 0,
        lineCtx: ui.lineCanvas ? ui.lineCanvas.getContext("2d") : null,
        lineDpr: 1,
        tickMs: STEP_TICK_MS,
        startedAt: 0,
        targetId: null,
        targetScore: 0,
        routeIds: [],
        routeScore: 0,
        routeValue: 0,
        routeTravelSeconds: 0,
        routeKind: "",
        routeAdvanced: false,
        navTarget: null,
        planNextAt: 0,
        manualTarget: null,
        huntMode: false,
        huntQuery: "",
        huntTargetId: null,
        huntTargetName: "",
        huntLastSeen: null,
        huntLastSeenAt: 0,
        combatMode: false,
        combatRisk: "clear",
        combatProjectiles: 0,
        combatTargets: 0,
        combatSpacingState: "none",
        combatSpacingMeters: null,
        autoFireMode: false,
        autoFireLastAt: 0,
        autoFireNextBurstAt: 0,
        autoFireBursting: false,
        autoFireBurstTimers: [],
        autoFireBurstClient: null,
        autoFireShots: 0,
        autoFireTarget: "",
        autoFireStatus: "OFF",
        attackLockUserId: null,
        attackLockName: "",
        attackLockStatus: "AUTO",
        lastCombatDodge: { dx: 0, dy: 0, score: 0 },
        lastCombatSwitchAt: 0,
        combatManualOverride: false,
        userMoveKeys: new Set(),
        scriptMoveKeys: new Set(),
        lastMoveMode: "idle",
        lastHp: null,
        stoppedHpBaseline: null,
        lastBalance: null,
        deltaBalance: 0,
        leaves: 0,
        avoidances: 0,
        hourlyLimitLeaveTriggered: false,
        lastThreat: null,
        enemyMotion: new Map(),
        projectileMotion: new Map(),
        lastAction: "ready",
        lastError: "",
        log: [],
        root,
        danger,
        style
      };

      window[RUNNER_KEY] = runner;

      const nowText = () => new Date().toLocaleTimeString();
      const push = message => {
        runner.lastAction = message;
        runner.log.push(nowText() + " " + message);
        if (runner.log.length > 80) runner.log.shift();
      };

      function getMe() {
        return state.entities.find(entity => Number(entity.user_id) === Number(state.currentUserId));
      }

      function clearScriptMoveKeys(send) {
        for (const key of runner.scriptMoveKeys) {
          state.keys.delete(key);
        }
        runner.scriptMoveKeys.clear();
        if (send) sendVelocity(true);
      }

      function addScriptMoveKey(key) {
        runner.scriptMoveKeys.add(key);
        state.keys.add(key);
      }

      function setVelocity(dx, dy, options) {
        const preserveUser = options && options.preserveUser;
        if (preserveUser) {
          clearScriptMoveKeys(false);
        } else {
          for (const key of MOVE_KEYS) {
            state.keys.delete(key);
          }
          runner.scriptMoveKeys.clear();
        }
        if (dx < 0) addScriptMoveKey("a");
        if (dx > 0) addScriptMoveKey("d");
        if (dy < 0) addScriptMoveKey("w");
        if (dy > 0) addScriptMoveKey("s");
        sendVelocity(true);
      }

      function stopMove() {
        setVelocity(0, 0);
        runner.lastMoveMode = "idle";
        runner.navTarget = null;
      }

      function movementKeyFromEvent(event) {
        const key = String(event && event.key || "").toLowerCase();
        return MOVE_KEYS.includes(key) ? key : "";
      }

      function isTypingTarget(target) {
        const tag = String(target && target.tagName || "").toLowerCase();
        return tag === "input"
          || tag === "textarea"
          || tag === "select"
          || !!(target && target.isContentEditable);
      }

      function handleMovementKeyDown(event) {
        if (isTypingTarget(event.target)) return;
        const key = movementKeyFromEvent(event);
        if (!key) return;
        runner.userMoveKeys.add(key);
        if (runner.combatMode) {
          clearScriptMoveKeys(true);
          runner.combatManualOverride = true;
          runner.lastMoveMode = "manual-combat";
        }
      }

      function handleMovementKeyUp(event) {
        const key = movementKeyFromEvent(event);
        if (!key) return;
        runner.userMoveKeys.delete(key);
        if (runner.combatMode) clearScriptMoveKeys(true);
      }

      function clearUserMoveKeys() {
        runner.userMoveKeys.clear();
      }

      function manualMoveVector() {
        const keys = new Set(runner.userMoveKeys);
        for (const key of MOVE_KEYS) {
          if (state.keys.has(key) && !runner.scriptMoveKeys.has(key)) keys.add(key);
        }
        const dx = (keys.has("d") || keys.has("arrowright") ? 1 : 0)
          - (keys.has("a") || keys.has("arrowleft") ? 1 : 0);
        const dy = (keys.has("s") || keys.has("arrowdown") ? 1 : 0)
          - (keys.has("w") || keys.has("arrowup") ? 1 : 0);
        return { active: dx !== 0 || dy !== 0, dx, dy };
      }

      function setNavigationTarget(x, y, type) {
        const nx = Number(x);
        const ny = Number(y);
        if (!Number.isFinite(nx) || !Number.isFinite(ny)) {
          runner.navTarget = null;
          return;
        }
        runner.navTarget = {
          x: nx,
          y: ny,
          type: type || "target"
        };
      }

      function clearManualTarget(reason) {
        if (!runner.manualTarget) return;
        runner.manualTarget = null;
        clearCoinRoute();
        runner.planNextAt = 0;
        push("手动坐标目标已清除" + (reason ? "：" + reason : ""));
      }

      function setManualTarget(x, y) {
        if (runner.huntMode) {
          setHuntMode(false, "右键坐标接管");
        }
        runner.manualTarget = {
          x: Math.round(Number(x)),
          y: Math.round(Number(y)),
          setAt: Date.now()
        };
        clearCoinRoute();
        runner.planNextAt = 0;
        push("右键坐标目标 " + runner.manualTarget.x + "," + runner.manualTarget.y);
        if (!runner.running) start();
        renderStatus();
      }

      function huntQueryText() {
        return String((ui.huntQuery && ui.huntQuery.value) || runner.huntQuery || "").trim();
      }

      function clearCoinRoute() {
        runner.targetId = null;
        runner.targetScore = 0;
        runner.routeIds = [];
        runner.routeScore = 0;
        runner.routeValue = 0;
        runner.routeTravelSeconds = 0;
        runner.routeKind = "";
        runner.routeAdvanced = false;
        if (runner.navTarget && runner.navTarget.type === "coin") runner.navTarget = null;
      }

      function adoptCoinRoute(route) {
        const ids = route && Array.isArray(route.ids) ? route.ids.filter(id => Number.isFinite(Number(id))) : [];
        if (!route || !route.target || !ids.length) {
          clearCoinRoute();
          return;
        }
        runner.routeIds = ids.map(id => Number(id));
        runner.targetId = Number(route.target.drop_id);
        runner.targetScore = Number(route.score) || 0;
        runner.routeScore = runner.targetScore;
        runner.routeValue = Number(route.value) || 0;
        runner.routeTravelSeconds = Number(route.travelSeconds) || 0;
        runner.routeKind = route.kind || "";
        runner.routeAdvanced = false;
        runner.planNextAt = Date.now() + REPLAN_MS;
      }

      function clearHuntTarget() {
        runner.huntTargetId = null;
        runner.huntTargetName = "";
        runner.huntLastSeen = null;
        runner.huntLastSeenAt = 0;
      }

      function setHuntMode(active, reason) {
        const next = !!active;
        const query = huntQueryText();
        if (next && !query) {
          runner.lastAction = "追杀：请输入用户名片段";
          renderStatus();
          return;
        }
        if (runner.huntMode === next && (!next || runner.huntQuery === query)) return;
        runner.huntMode = next;
        runner.huntQuery = next ? query : "";
        clearHuntTarget();
        clearCoinRoute();
        runner.planNextAt = 0;
        if (next) {
          if (runner.manualTarget) clearManualTarget("开启自动追杀");
          push("自动追杀已开启：用户名包含 " + query);
          if (!runner.running) start();
        } else {
          if (runner.navTarget && runner.navTarget.type === "hunt") runner.navTarget = null;
          push("自动追杀已关闭" + (reason ? "：" + reason : ""));
        }
        renderLines();
        renderStatus();
      }

      function toggleHuntMode() {
        setHuntMode(!runner.huntMode, "manual");
      }

      function driveManualTarget(me, label, options) {
        if (!runner.manualTarget) return false;
        const manual = manualMoveVector();
        if (options && options.respectUserInput && manual.active) {
          clearScriptMoveKeys(true);
          runner.combatManualOverride = true;
          runner.lastMoveMode = "manual-combat";
          runner.lastAction = (label || "手动") + "：WASD 接管，右键坐标保留 "
            + runner.manualTarget.x + "," + runner.manualTarget.y;
          return true;
        }
        const rx = Number(runner.manualTarget.x) - Number(me.x);
        const ry = Number(runner.manualTarget.y) - Number(me.y);
        const dist = Math.hypot(rx, ry);
        if (dist <= MANUAL_TARGET_REACHED_CM) {
          stopMove();
          clearManualTarget("已到达");
          return true;
        }
        moveToward(rx, ry, options && options.preserveUser ? { preserveUser: true } : undefined);
        setNavigationTarget(runner.manualTarget.x, runner.manualTarget.y, "manual");
        runner.lastAction = (label || "前往") + "右键坐标 "
          + runner.manualTarget.x + "," + runner.manualTarget.y
          + "，距离 " + Math.round(dist);
        clearCoinRoute();
        return true;
      }

      function handleContextMenu(event) {
        const target = event.target;
        const worldCanvas = typeof canvas !== "undefined" ? canvas : document.getElementById("world");
        if (worldCanvas && target !== worldCanvas) return;
        event.preventDefault();
        try {
          if (typeof setPointerFromClient === "function") {
            setPointerFromClient(event.clientX, event.clientY);
          }
          const point = state.pointerWorld;
          if (!point || !Number.isFinite(Number(point.x)) || !Number.isFinite(Number(point.y))) {
            throw new Error("pointerWorld unavailable");
          }
          setManualTarget(point.x, point.y);
        } catch (err) {
          runner.lastError = "右键坐标读取失败：" + String(err && err.message || err);
          push(runner.lastError);
          renderStatus();
        }
      }

      function setDanger(active, level) {
        danger.classList.toggle("active", !!active);
        danger.classList.toggle("critical", !!active && level === "critical");
        root.classList.toggle("danger", !!active);
      }

      function steerVector(rx, ry) {
        const ax = Math.abs(rx);
        const ay = Math.abs(ry);
        if (ax < 35 && ay < 35) return { dx: 0, dy: 0, mode: "stop" };
        if (ay < 35 || ax / Math.max(1, ay) >= AXIS_DOMINANCE_RATIO) {
          return { dx: Math.sign(rx), dy: 0, mode: "x-axis" };
        }
        if (ax < 35 || ay / Math.max(1, ax) >= AXIS_DOMINANCE_RATIO) {
          return { dx: 0, dy: Math.sign(ry), mode: "y-axis" };
        }
        return { dx: Math.sign(rx), dy: Math.sign(ry), mode: "diagonal" };
      }

      function moveToward(rx, ry, options) {
        const move = steerVector(rx, ry);
        setVelocity(move.dx, move.dy, options);
        runner.lastMoveMode = move.mode;
        return move;
      }

      function enemyDrop(enemy) {
        const value = Number(enemy.death_reward_preview ?? enemy.death_drop_coins ?? 0);
        return Number.isFinite(value) ? value : 0;
      }

      function numberFrom(obj, keys, fallback) {
        for (const key of keys) {
          const value = Number(obj && obj[key]);
          if (Number.isFinite(value)) return value;
        }
        return fallback;
      }

      function enemyKey(enemy) {
        return String(enemy.user_id ?? enemy.id ?? enemy.name ?? "");
      }

      function trackEnemyMotion(now) {
        now = Number.isFinite(Number(now)) ? Number(now) : Date.now();
        const seen = new Set();
        for (const entity of state.entities || []) {
          if (Number(entity.user_id) === Number(state.currentUserId)) continue;
          if (entity.life !== "Alive") continue;
          const key = enemyKey(entity);
          if (!key) continue;
          const x = Number(entity.x);
          const y = Number(entity.y);
          if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
          seen.add(key);
          const last = runner.enemyMotion.get(key);
          const moved = last && Math.hypot(x - last.x, y - last.y) >= ENEMY_MOVE_EPSILON_CM;
          const dt = last ? Math.max(0, (now - last.lastSeenAt) / 1000) : 0;
          const vxCmps = last && dt >= 0.05 ? (x - last.x) / dt : (last ? last.vxCmps || 0 : 0);
          const vyCmps = last && dt >= 0.05 ? (y - last.y) / dt : (last ? last.vyCmps || 0 : 0);
          runner.enemyMotion.set(key, {
            x,
            y,
            vxCmps,
            vyCmps,
            lastSeenAt: now,
            lastMovedAt: moved ? now : (last ? last.lastMovedAt : 0)
          });
        }
        for (const [key, value] of runner.enemyMotion) {
          if (!seen.has(key) && now - value.lastSeenAt > MOVING_ENEMY_MEMORY_MS * 3) {
            runner.enemyMotion.delete(key);
          }
        }
      }

      function enemyMovedRecently(enemy, now) {
        const motion = runner.enemyMotion.get(enemyKey(enemy));
        return !!motion && motion.lastMovedAt > 0 && now - motion.lastMovedAt <= MOVING_ENEMY_MEMORY_MS;
      }

      function cleanUserName(value, userId) {
        const name = String(value || "").trim();
        const generatedSuffix = String(userId || "").trim();
        if (!name || !generatedSuffix) return name;
        const lower = name.toLowerCase();
        if (name === generatedSuffix
          || lower === ("user " + generatedSuffix).toLowerCase()
          || lower === ("#" + generatedSuffix).toLowerCase()) {
          return "";
        }
        return name;
      }

      function knownNameForUser(userId) {
        const id = Number(userId);
        if (state.userNames && typeof state.userNames.get === "function") {
          const name = state.userNames.get(id) || state.userNames.get(String(userId));
          if (name) return cleanUserName(name, userId);
        }
        return "";
      }

      function huntNameFromEntity(entity, userId) {
        return cleanUserName(entity && entity.name, userId) || knownNameForUser(userId);
      }

      function leaderboardNameFromEntity(entity, userId) {
        const name = huntNameFromEntity(entity, userId);
        return {
          name: name || ("未知用户 #" + userId),
          copyName: name
        };
      }

      function leaderboardNameForUser(userId) {
        const name = knownNameForUser(userId);
        return {
          name: name || ("未知用户 #" + userId),
          copyName: name
        };
      }

      function mergeDropLeaderboardUser(byUser, userId, drop, names, source) {
        const id = Number(userId);
        const amount = Number(drop);
        if (!Number.isFinite(id) || !(amount > 0)) return;
        const existing = byUser.get(id);
        if (!existing || amount > existing.drop || (!existing.copyName && names.copyName)) {
          byUser.set(id, {
            userId: id,
            drop: amount,
            name: names.name,
            copyName: names.copyName,
            source
          });
        }
      }

      function topDropUsers() {
        const byUser = new Map();
        for (const entity of state.entities || []) {
          const userId = Number(entity && entity.user_id);
          if (!Number.isFinite(userId)) continue;
          if (entity.life && entity.life !== "Alive") continue;
          mergeDropLeaderboardUser(byUser, userId, enemyDrop(entity), leaderboardNameFromEntity(entity, userId), "entity");
        }
        const minimapPoints = state.minimap && Array.isArray(state.minimap.points) ? state.minimap.points : [];
        for (const point of minimapPoints) {
          const userId = Number(point && (point.u ?? point.user_id));
          const drop = Number(point && (point.d ?? point.drop ?? point.death_reward_preview ?? point.death_drop_coins));
          mergeDropLeaderboardUser(byUser, userId, drop, leaderboardNameForUser(userId), "minimap");
        }
        return Array.from(byUser.values())
          .sort((a, b) => b.drop - a.drop || String(a.name).localeCompare(String(b.name)))
          .slice(0, 5);
      }

      function formatClock(ms) {
        const date = new Date(Number.isFinite(Number(ms)) ? Number(ms) : Date.now());
        const pad = value => String(value).padStart(2, "0");
        return pad(date.getHours()) + ":" + pad(date.getMinutes()) + ":" + pad(date.getSeconds());
      }

      function copyText(text) {
        const value = String(text || "");
        if (!value) return Promise.reject(new Error("empty text"));
        if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
          return navigator.clipboard.writeText(value);
        }
        return new Promise((resolve, reject) => {
          try {
            const textarea = document.createElement("textarea");
            textarea.value = value;
            textarea.setAttribute("readonly", "");
            textarea.style.position = "fixed";
            textarea.style.left = "-9999px";
            textarea.style.top = "0";
            document.body.appendChild(textarea);
            textarea.select();
            textarea.setSelectionRange(0, value.length);
            const ok = document.execCommand("copy");
            textarea.remove();
            if (ok) resolve();
            else reject(new Error("copy command failed"));
          } catch (err) {
            reject(err);
          }
        });
      }

      function renderDropLeaderboard() {
        if (!ui.dropList || !ui.dropRefresh) return;
        const rows = topDropUsers();
        const fragment = document.createDocumentFragment();
        if (!rows.length) {
          const item = document.createElement("li");
          item.textContent = "暂无 Drop 数据";
          fragment.appendChild(item);
        } else {
          rows.forEach((row, index) => {
            const item = document.createElement("li");
            const rank = document.createElement("span");
            const name = document.createElement("button");
            const value = document.createElement("span");
            rank.className = "crgr-drop-rank";
            rank.textContent = "#" + (index + 1);
            name.type = "button";
            name.className = "crgr-drop-name";
            name.textContent = row.name;
            name.title = row.copyName ? "点击复制并填入追杀用户名" : "未识别到真实用户名";
            if (row.copyName) name.dataset.copyName = row.copyName;
            else name.disabled = true;
            value.className = "crgr-drop-value";
            value.textContent = String(Math.round(row.drop));
            item.appendChild(rank);
            item.appendChild(name);
            item.appendChild(value);
            fragment.appendChild(item);
          });
        }
        ui.dropList.replaceChildren(fragment);
        ui.dropRefresh.textContent = "刷新 " + formatClock(Date.now());
      }

      function fillHuntQueryFromLeaderboard(name) {
        const value = String(name || "").trim();
        if (!value || !ui.huntQuery) return false;
        ui.huntQuery.value = value;
        ui.huntQuery.dispatchEvent(new Event("input", { bubbles: true }));
        ui.huntQuery.dispatchEvent(new Event("change", { bubbles: true }));
        if (runner.huntQuery !== value) {
          if (runner.huntMode) clearHuntTarget();
          runner.huntQuery = value;
        }
        return true;
      }

      function handleDropLeaderboardClick(event) {
        const button = event.target && event.target.closest ? event.target.closest(".crgr-drop-name") : null;
        if (!button || !ui.dropList || !ui.dropList.contains(button) || !button.dataset.copyName) return;
        const name = button.dataset.copyName;
        fillHuntQueryFromLeaderboard(name);
        copyText(name)
          .then(() => {
            runner.lastAction = "已复制并填入追杀用户名：" + name;
            runner.lastError = "";
            ui.dropRefresh.textContent = "已填入 " + formatClock(Date.now());
            renderStatus();
          })
          .catch(err => {
            runner.lastAction = "已填入追杀用户名：" + name;
            runner.lastError = "复制用户名失败：" + String(err && err.message || err);
            renderStatus();
          });
      }

      function scheduleEntryDropLeaderboardRefresh() {
        if (runner.dropLeaderboardEntryRefreshScheduled || !getMe()) return;
        runner.dropLeaderboardEntryRefreshScheduled = true;
        runner.dropLeaderboardEntryTimer = window.setTimeout(() => {
          runner.dropLeaderboardEntryTimer = 0;
          renderDropLeaderboard();
          if (ui.dropRefresh) ui.dropRefresh.textContent = "进入刷新 " + formatClock(Date.now());
        }, DROP_LEADERBOARD_ENTRY_REFRESH_DELAY_MS);
      }

      function renderAttackLockList(me) {
        if (!ui.attackList || !ui.attackLockSummary) return;
        const locked = me ? lockedAttackTarget(me) : null;
        if (locked) {
          const rangeText = locked.dist <= AUTO_FIRE_RANGE_CM ? "射程内" : "视野内";
          ui.attackLockSummary.textContent = "LOCK " + (locked.displayName || runner.attackLockName)
            + " / HP " + (Number.isFinite(locked.hpForFire) ? Math.round(locked.hpForFire) : "--")
            + " / " + Math.round(locked.dist / 100) + "m"
            + " / " + rangeText;
        } else {
          ui.attackLockSummary.textContent = "AUTO";
        }

        const enemies = me ? attackBufferEnemies(me) : [];
        const fragment = document.createDocumentFragment();
        if (!enemies.length) {
          const empty = document.createElement("button");
          empty.type = "button";
          empty.disabled = true;
          empty.textContent = "170m 内无敌人";
          fragment.appendChild(empty);
        } else {
          enemies.forEach(enemy => {
            const button = document.createElement("button");
            const name = document.createElement("span");
            const hp = document.createElement("span");
            const dist = document.createElement("span");
            const userId = Number(enemy.user_id);
            button.type = "button";
            button.dataset.userId = String(userId);
            button.classList.toggle("active", runner.attackLockUserId !== null && Number(runner.attackLockUserId) === userId);
            button.title = "点击锁定攻击对象";
            name.className = "crgr-attack-name";
            hp.className = "crgr-attack-hp";
            dist.className = "crgr-attack-dist";
            name.textContent = enemy.displayName || ("#" + userId);
            hp.textContent = "HP " + (Number.isFinite(enemy.hpForFire) ? Math.round(enemy.hpForFire) : "--");
            dist.textContent = Math.round(enemy.dist / 100) + "m";
            button.appendChild(name);
            button.appendChild(hp);
            button.appendChild(dist);
            fragment.appendChild(button);
          });
        }
        ui.attackList.replaceChildren(fragment);
      }

      function handleAttackListClick(event) {
        const button = event.target && event.target.closest ? event.target.closest("button[data-user-id]") : null;
        if (!button || !ui.attackList || !ui.attackList.contains(button)) return;
        const me = getMe();
        if (!me) return;
        const target = visibleAttackTargetById(me, Number(button.dataset.userId));
        if (!target) return;
        setAttackLock(target, "手动选择");
      }

      function huntCandidateFromEntity(entity, me) {
        const userId = Number(entity && entity.user_id);
        const x = Number(entity && entity.x);
        const y = Number(entity && entity.y);
        if (!Number.isFinite(userId) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
        if (Number(userId) === Number(state.currentUserId)) return null;
        if (entity.life && entity.life !== "Alive") return null;
        const name = huntNameFromEntity(entity, userId);
        if (!name) return null;
        return {
          source: "entity",
          userId,
          name,
          x,
          y,
          raw: entity,
          dist: Math.hypot(x - Number(me.x), y - Number(me.y)),
          sourcePenalty: 0
        };
      }

      function huntCandidateFromMinimap(point, me, liveIds) {
        const userId = Number(point && (point.u ?? point.user_id));
        const x = Number(point && point.x);
        const y = Number(point && point.y);
        if (!Number.isFinite(userId) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
        if (Number(userId) === Number(state.currentUserId)) return null;
        if (liveIds && liveIds.has(userId)) return null;
        const name = knownNameForUser(userId);
        if (!name) return null;
        return {
          source: "minimap",
          userId,
          name,
          x,
          y,
          raw: point,
          dist: Math.hypot(x - Number(me.x), y - Number(me.y)),
          sourcePenalty: 240000
        };
      }

      function huntCandidates(me) {
        const out = [];
        const liveIds = new Set();
        for (const entity of state.entities || []) {
          const candidate = huntCandidateFromEntity(entity, me);
          if (!candidate) continue;
          liveIds.add(candidate.userId);
          out.push(candidate);
        }

        const bestMinimapById = new Map();
        const points = state.minimap && Array.isArray(state.minimap.points) ? state.minimap.points : [];
        for (const point of points) {
          const candidate = huntCandidateFromMinimap(point, me, liveIds);
          if (!candidate || !Number.isFinite(candidate.dist)) continue;
          const existing = bestMinimapById.get(candidate.userId);
          if (!existing || candidate.dist < existing.dist) bestMinimapById.set(candidate.userId, candidate);
        }
        for (const candidate of bestMinimapById.values()) out.push(candidate);
        return out.filter(candidate => Number.isFinite(candidate.dist));
      }

      function huntMatchRank(candidate, query) {
        const name = cleanUserName(candidate && candidate.name).toLowerCase();
        const needle = String(query || "").trim().toLowerCase();
        if (!needle) return Infinity;
        if (!name) return Infinity;
        if (name === needle) return 0;
        if (name.startsWith(needle)) return 1;
        if (name.includes(needle)) return 2;
        return Infinity;
      }

      function findHuntTarget(me, query) {
        const candidates = huntCandidates(me)
          .map(candidate => ({
            ...candidate,
            matchRank: huntMatchRank(candidate, query)
          }))
          .filter(candidate => Number.isFinite(candidate.matchRank));
        if (!candidates.length) return null;

        if (runner.huntTargetId !== null) {
          const current = candidates.find(candidate => Number(candidate.userId) === Number(runner.huntTargetId));
          if (current) return current;
        }

        return candidates.sort((a, b) =>
          a.matchRank - b.matchRank
          || a.sourcePenalty - b.sourcePenalty
          || a.dist - b.dist
          || a.userId - b.userId
        )[0];
      }

      function entityVelocityCmps(entity, userId) {
        const rawVx = numberFrom(entity, ["vx", "vel_x", "velocity_x", "velocityX", "speed_x", "speedX"], NaN);
        const rawVy = numberFrom(entity, ["vy", "vel_y", "velocity_y", "velocityY", "speed_y", "speedY"], NaN);
        if (Number.isFinite(rawVx) && Number.isFinite(rawVy) && Math.hypot(rawVx, rawVy) > 0.01) {
          const tickMs = Math.max(1, Number(state.serverTickMs) || 50);
          const rawSpeed = Math.hypot(rawVx, rawVy);
          const scale = rawSpeed <= 250 ? 1000 / tickMs : 1;
          return { vx: rawVx * scale, vy: rawVy * scale };
        }
        const motion = runner.enemyMotion.get(String(userId ?? (entity && entity.user_id) ?? enemyKey(entity)));
        if (motion && (Math.abs(motion.vxCmps || 0) > 0.01 || Math.abs(motion.vyCmps || 0) > 0.01)) {
          return { vx: motion.vxCmps || 0, vy: motion.vyCmps || 0 };
        }
        return { vx: 0, vy: 0 };
      }

      function huntVelocityCmps(candidate) {
        return entityVelocityCmps(candidate.raw, candidate.userId);
      }

      function predictedHuntPoint(candidate, me) {
        const dist = Math.hypot(Number(candidate.x) - Number(me.x), Number(candidate.y) - Number(me.y));
        const leadMs = Math.min(
          HUNT_PREDICT_MAX_MS,
          Math.max(HUNT_PREDICT_MIN_MS, dist / HUNT_PREDICT_DISTANCE_DIVISOR * 1000)
        );
        const velocity = huntVelocityCmps(candidate);
        const leadSeconds = leadMs / 1000;
        return {
          x: Number(candidate.x) + velocity.vx * leadSeconds,
          y: Number(candidate.y) + velocity.vy * leadSeconds,
          leadMs,
          speed: Math.hypot(velocity.vx, velocity.vy)
        };
      }

      function liveEnemies(me, limitCm) {
        const now = Date.now();
        return (state.entities || [])
          .filter(entity => Number(entity.user_id) !== Number(state.currentUserId))
          .filter(entity => entity.life === "Alive")
          .map(entity => ({
            ...entity,
            dropForAvoid: enemyDrop(entity),
            movedRecently: enemyMovedRecently(entity, now),
            dist: Math.hypot(Number(entity.x) - Number(me.x), Number(entity.y) - Number(me.y))
          }))
          .filter(entity => Number.isFinite(entity.dist) && entity.dist <= limitCm)
          .sort((a, b) => a.dist - b.dist);
      }

      function enemyHpForDisplay(enemy) {
        return numberFrom(enemy, ["hp", "health", "life_value", "current_hp"], NaN);
      }

      function enemyDisplayName(enemy) {
        const userId = Number(enemy && enemy.user_id);
        return huntNameFromEntity(enemy, userId) || ("未知用户 #" + userId);
      }

      function decorateAttackEnemy(enemy) {
        if (!enemy) return null;
        return {
          ...enemy,
          displayName: enemyDisplayName(enemy),
          hpForFire: enemyHpForDisplay(enemy)
        };
      }

      function attackBufferEnemies(me) {
        return liveEnemies(me, RICH_ENEMY_ESCAPE_CM)
          .map(decorateAttackEnemy)
          .filter(Boolean)
          .sort((a, b) => a.dist - b.dist);
      }

      function visibleAttackTargetById(me, userId) {
        const id = Number(userId);
        if (!Number.isFinite(id)) return null;
        const target = liveEnemies(me, ENEMY_LINE_SCAN_CM)
          .find(enemy => Number(enemy.user_id) === id);
        return decorateAttackEnemy(target);
      }

      function clearAttackLock(reason) {
        if (runner.attackLockUserId === null) return;
        const name = runner.attackLockName || ("#" + runner.attackLockUserId);
        runner.attackLockUserId = null;
        runner.attackLockName = "";
        runner.attackLockStatus = "AUTO";
        if (reason) push("攻击锁定已解除：" + name + " / " + reason);
      }

      function setAttackLock(enemy, reason) {
        const target = decorateAttackEnemy(enemy);
        const userId = Number(target && target.user_id);
        if (!Number.isFinite(userId)) return;
        runner.attackLockUserId = userId;
        runner.attackLockName = target.displayName || ("#" + userId);
        runner.attackLockStatus = "LOCK";
        runner.autoFireTarget = runner.attackLockName;
        push("攻击目标已锁定：" + runner.attackLockName + (reason ? " / " + reason : ""));
        renderStatus();
      }

      function lockedAttackTarget(me) {
        if (runner.attackLockUserId === null) return null;
        const target = visibleAttackTargetById(me, runner.attackLockUserId);
        if (!target) {
          clearAttackLock("目标离开500m视野或已不存活");
          return null;
        }
        runner.attackLockName = target.displayName || runner.attackLockName;
        runner.attackLockStatus = target.dist <= AUTO_FIRE_RANGE_CM ? "LOCK" : "LOCK-OUT";
        return {
          ...target,
          locked: true,
          inFireRange: target.dist <= AUTO_FIRE_RANGE_CM
        };
      }

      function richEnemies(me, limitCm) {
        return liveEnemies(me, limitCm)
          .filter(entity => entity.dropForAvoid > RICH_ENEMY_MIN_DROP)
          .sort((a, b) => a.dist - b.dist);
      }

      function escapeEnemies(me, limitCm) {
        return liveEnemies(me, limitCm)
          .filter(entity => entity.dropForAvoid > RICH_ENEMY_MIN_DROP
            || (entity.dropForAvoid <= RICH_ENEMY_MIN_DROP && entity.movedRecently))
          .sort((a, b) => a.dist - b.dist);
      }

      function combatEnemies(me) {
        return liveEnemies(me, COMBAT_SCAN_CM)
          .map(enemy => ({
            ...enemy,
            hpForCombat: numberFrom(enemy, ["hp", "health", "life_value", "current_hp"], 0)
          }));
      }

      function combatSpacingEnemies(me) {
        return liveEnemies(me, COMBAT_SPACING_SCAN_CM);
      }

      function projectileSources() {
        const directKeys = ["bullets", "projectiles", "shots", "missiles", "arrows"];
        const sources = [];
        if (typeof getRenderBullets === "function") {
          try {
            const rendered = getRenderBullets();
            if (Array.isArray(rendered) && rendered.length) {
              sources.push({ name: "renderBullets", items: rendered });
            }
          } catch (_) {}
        }
        for (const key of directKeys) {
          const value = state[key];
          if (Array.isArray(value)) {
            sources.push({ name: key, items: value });
          } else if (value instanceof Map) {
            sources.push({ name: key, items: Array.from(value.values()) });
          } else if (value && typeof value === "object") {
            sources.push({ name: key, items: Object.values(value) });
          }
        }
        const entityProjectiles = (state.entities || []).filter(entity => {
          const label = String(entity.type || entity.kind || entity.entity_type || entity.role || "").toLowerCase();
          return label.includes("bullet")
            || label.includes("projectile")
            || label.includes("shot")
            || label.includes("missile");
        });
        if (entityProjectiles.length) sources.push({ name: "entities", items: entityProjectiles });
        return sources;
      }

      function projectileKey(raw, source, index) {
        return String(raw.projectile_id ?? raw.bullet_id ?? raw.shot_id ?? raw.id ?? raw.uid ?? (source + ":" + index));
      }

      function projectileOwner(raw) {
        return numberFrom(raw, ["owner_user_id", "owner_id", "shooter_user_id", "shooter_id", "from_user_id", "user_id"], NaN);
      }

      function projectileVelocity(raw, previous, now) {
        let vx = numberFrom(raw, ["vx", "vel_x", "velocity_x", "velocityX", "speed_x", "speedX", "dx", "dir_x", "direction_x"], NaN);
        let vy = numberFrom(raw, ["vy", "vel_y", "velocity_y", "velocityY", "speed_y", "speedY", "dy", "dir_y", "direction_y"], NaN);
        if ((!Number.isFinite(vx) || !Number.isFinite(vy)) && previous) {
          const dt = Math.max(0.05, (now - previous.seenAt) / 1000);
          vx = (numberFrom(raw, ["x", "pos_x", "world_x", "cx"], previous.x) - previous.x) / dt;
          vy = (numberFrom(raw, ["y", "pos_y", "world_y", "cy"], previous.y) - previous.y) / dt;
        }
        if (!Number.isFinite(vx) || !Number.isFinite(vy)) return { vx: 0, vy: 0 };
        return { vx, vy };
      }

      function renderTickForProjectile(raw) {
        const localNowTick = Number(raw.local_now_tick);
        if (Number.isFinite(localNowTick)) return localNowTick;
        if (typeof getRenderTick === "function") {
          try {
            const tick = Number(getRenderTick());
            if (Number.isFinite(tick)) return tick;
          } catch (_) {}
        }
        const localStartTick = Number(raw.localStartTick);
        const localStartedAt = Number(raw.localStartedAt);
        const tickMs = Number(state.serverTickMs);
        if (Number.isFinite(localStartTick)
          && Number.isFinite(localStartedAt)
          && Number.isFinite(tickMs)
          && tickMs > 0
          && typeof performance !== "undefined") {
          return localStartTick + (performance.now() - localStartedAt) / tickMs;
        }
        return Number(raw.created_tick);
      }

      function projectileFromKinematics(raw) {
        const startX = numberFrom(raw, ["start_x", "origin_x", "from_x"], NaN);
        const startY = numberFrom(raw, ["start_y", "origin_y", "from_y"], NaN);
        const createdTick = Number(raw.created_tick);
        if (!Number.isFinite(startX) || !Number.isFinite(startY) || !Number.isFinite(createdTick)) return null;

        const tick = renderTickForProjectile(raw);
        if (!Number.isFinite(tick)) return null;
        const expireTick = Number(raw.expire_tick);
        if (Number.isFinite(expireTick) && tick > expireTick + 0.5) return null;

        let dx = Number(raw.dir_x_micros) / 1000000;
        let dy = Number(raw.dir_y_micros) / 1000000;
        if (!Number.isFinite(dx) || !Number.isFinite(dy) || Math.hypot(dx, dy) < 0.001) {
          dx = numberFrom(raw, ["target_x", "to_x"], startX) - startX;
          dy = numberFrom(raw, ["target_y", "to_y"], startY) - startY;
          const length = Math.hypot(dx, dy);
          if (length < 1) return null;
          dx /= length;
          dy /= length;
        } else {
          const length = Math.hypot(dx, dy);
          dx /= length;
          dy /= length;
        }

        const speedPerTick = numberFrom(raw, ["speed_per_tick", "speedPerTick"], 500);
        const range = numberFrom(raw, ["range_cm", "range", "max_range_cm"], 15000);
        const ageTicks = Math.max(0, tick - createdTick);
        const travelled = Math.min(Math.max(0, range), Math.max(0, ageTicks * speedPerTick));
        const tickMs = Math.max(1, Number(state.serverTickMs) || 50);
        const speedPerSecond = speedPerTick * 1000 / tickMs;

        return {
          x: startX + dx * travelled,
          y: startY + dy * travelled,
          vx: dx * speedPerSecond,
          vy: dy * speedPerSecond
        };
      }

      function normalizeProjectile(raw, previous, now) {
        const kinematic = projectileFromKinematics(raw);
        if (kinematic) return kinematic;

        const x = numberFrom(raw, ["x", "pos_x", "world_x", "cx"], NaN);
        const y = numberFrom(raw, ["y", "pos_y", "world_y", "cy"], NaN);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        const velocity = projectileVelocity(raw, previous, now);
        return {
          x,
          y,
          vx: velocity.vx,
          vy: velocity.vy
        };
      }

      function activeProjectiles(me, now) {
        const seen = new Set();
        const projectiles = [];
        for (const source of projectileSources()) {
          source.items.forEach((raw, index) => {
            if (!raw || typeof raw !== "object") return;
            const owner = projectileOwner(raw);
            if (Number.isFinite(owner) && Number(owner) === Number(state.currentUserId)) return;
            const key = projectileKey(raw, source.name, index);
            if (seen.has(key)) return;
            const previous = runner.projectileMotion.get(key);
            const normalized = normalizeProjectile(raw, previous, now);
            if (!normalized) return;
            const dist = Math.hypot(normalized.x - Number(me.x), normalized.y - Number(me.y));
            if (!Number.isFinite(dist) || dist > COMBAT_DODGE_SCAN_CM) return;
            runner.projectileMotion.set(key, {
              x: normalized.x,
              y: normalized.y,
              vx: normalized.vx,
              vy: normalized.vy,
              seenAt: now
            });
            seen.add(key);
            projectiles.push({
              key,
              x: normalized.x,
              y: normalized.y,
              vx: normalized.vx,
              vy: normalized.vy,
              dist
            });
          });
        }
        for (const [key, value] of runner.projectileMotion) {
          if (!seen.has(key) && now - value.seenAt > PROJECTILE_MEMORY_MS) {
            runner.projectileMotion.delete(key);
          }
        }
        return projectiles.sort((a, b) => a.dist - b.dist);
      }

      function projectileRisk(projectile, point, seconds) {
        const speed = Math.hypot(projectile.vx, projectile.vy);
        if (speed < 20) {
          const dist = Math.hypot(Number(point.x) - projectile.x, Number(point.y) - projectile.y);
          return Math.max(0, 1 - dist / 6500) * 120;
        }
        const ux = projectile.vx / speed;
        const uy = projectile.vy / speed;
        const bulletX = projectile.x + projectile.vx * seconds;
        const bulletY = projectile.y + projectile.vy * seconds;
        const relX = Number(point.x) - bulletX;
        const relY = Number(point.y) - bulletY;
        const along = relX * ux + relY * uy;
        const perp = Math.abs(relX * uy - relY * ux);
        const proximity = Math.hypot(relX, relY);
        const forward = along > -1200 ? 1 : 0.28;
        const perpRisk = Math.max(0, 1 - perp / 5600) * 190 * forward;
        const nearRisk = Math.max(0, 1 - proximity / 4600) * 260;
        return perpRisk + nearRisk;
      }

      function combatProjectilePressure(projectiles, me) {
        const point = { x: Number(me.x), y: Number(me.y) };
        let pressure = 0;
        for (const projectile of projectiles.slice(0, 5)) {
          pressure += projectileRisk(projectile, point, 0.1);
          pressure += projectileRisk(projectile, point, 0.35) * 0.75;
        }
        return pressure;
      }

      function combatSpacingState(enemies) {
        const nearest = (enemies || []).find(enemy => Number.isFinite(Number(enemy.dist)));
        if (!nearest) return { state: "none", distance: Infinity };
        const distance = Number(nearest.dist);
        if (distance < COMBAT_RANGE_MIN_CM) return { state: "too-close", distance };
        if (distance > COMBAT_RANGE_MAX_CM) return { state: "too-far", distance };
        return { state: "band", distance };
      }

      function combatRangeError(dist) {
        if (!Number.isFinite(dist)) return 0;
        if (dist < COMBAT_RANGE_HARD_MIN_CM) {
          return (COMBAT_RANGE_MIN_CM - dist) * 1.8
            + (COMBAT_RANGE_HARD_MIN_CM - dist) * 3.2
            + 4200;
        }
        if (dist < COMBAT_RANGE_MIN_CM) return (COMBAT_RANGE_MIN_CM - dist) * 1.8 + 900;
        if (dist > COMBAT_RANGE_MAX_CM) return (dist - COMBAT_RANGE_MAX_CM) * 0.72;
        return Math.abs(dist - COMBAT_RANGE_IDEAL_CM) * 0.16;
      }

      function combatSpacingScore(me, dir, enemies) {
        if (!enemies || !enemies.length) return 0;
        const next = {
          x: Number(me.x) + dir.dx * COMBAT_DODGE_SPEED_CMPS,
          y: Number(me.y) + dir.dy * COMBAT_DODGE_SPEED_CMPS
        };
        let score = 0;
        enemies.slice(0, 3).forEach((enemy, index) => {
          const currentDist = Number(enemy.dist);
          const nextDist = Math.hypot(next.x - Number(enemy.x), next.y - Number(enemy.y));
          if (!Number.isFinite(currentDist) || !Number.isFinite(nextDist)) return;
          const weight = index === 0 ? 1 : index === 1 ? 0.48 : 0.26;
          const improvement = combatRangeError(currentDist) - combatRangeError(nextDist);
          score += improvement * weight / 13;

          if (nextDist < COMBAT_RANGE_HARD_MIN_CM) {
            score -= (720 + (COMBAT_RANGE_HARD_MIN_CM - nextDist) / 12) * weight;
          } else if (nextDist < COMBAT_RANGE_MIN_CM) {
            score -= (310 + (COMBAT_RANGE_MIN_CM - nextDist) / 24) * weight;
          } else if (nextDist <= COMBAT_RANGE_MAX_CM) {
            score += (190 - Math.abs(nextDist - COMBAT_RANGE_IDEAL_CM) / 44) * weight;
          } else {
            score -= Math.min(180, (nextDist - COMBAT_RANGE_MAX_CM) / 42) * weight;
          }

          if (currentDist < COMBAT_RANGE_MIN_CM && nextDist < currentDist - 80) score -= 420 * weight;
          if (currentDist > COMBAT_RANGE_MAX_CM && nextDist > currentDist + 80) score -= 210 * weight;
        });
        return score;
      }

      function scoreCombatDirection(me, dir, projectiles, spacingEnemies, options) {
        const horizons = [0.25, 0.5, 0.85, 1.2];
        let score = 0;
        for (const seconds of horizons) {
          const point = {
            x: Number(me.x) + dir.dx * COMBAT_DODGE_SPEED_CMPS * seconds,
            y: Number(me.y) + dir.dy * COMBAT_DODGE_SPEED_CMPS * seconds
          };
          for (const projectile of projectiles) {
            score -= projectileRisk(projectile, point, seconds);
          }
        }
        const spacingWeight = options && Number.isFinite(options.spacingWeight) ? options.spacingWeight : 1;
        score += combatSpacingScore(me, dir, spacingEnemies) * spacingWeight;
        const last = runner.lastCombatDodge || { dx: 0, dy: 0 };
        if (dir.dx === last.dx && dir.dy === last.dy) {
          score += projectiles.length ? 180 : 90;
        } else {
          score -= Date.now() - runner.lastCombatSwitchAt < COMBAT_DODGE_SWITCH_MS ? 210 : 70;
          if (dir.dx === -last.dx && dir.dy === -last.dy) score -= 180;
        }
        return score;
      }

      function chooseCombatDodge(me, projectiles, spacingEnemies) {
        const spacing = combatSpacingState(spacingEnemies);
        if (!projectiles.length && spacing.state !== "too-close" && spacing.state !== "too-far") {
          return { dx: 0, dy: 0, score: 0, count: 0, spacingState: spacing.state, spacingDistance: spacing.distance };
        }
        const dirs = [
          { dx: 0, dy: 0 },
          { dx: 1, dy: 0 },
          { dx: -1, dy: 0 },
          { dx: 0, dy: 1 },
          { dx: 0, dy: -1 },
          { dx: 1, dy: 1 },
          { dx: 1, dy: -1 },
          { dx: -1, dy: 1 },
          { dx: -1, dy: -1 }
        ];
        const pressure = combatProjectilePressure(projectiles, me);
        const closeProjectile = pressure >= COMBAT_CLOSE_PROJECTILE_PRESSURE
          || projectiles.some(projectile => projectile.dist < COMBAT_RANGE_MIN_CM);
        const options = {
          spacingWeight: closeProjectile ? 0.42 : projectiles.length ? 0.86 : 1.35
        };
        let best = {
          dx: 0,
          dy: 0,
          score: -Infinity,
          count: projectiles.length,
          spacingState: spacing.state,
          spacingDistance: spacing.distance
        };
        for (const dir of dirs) {
          const score = scoreCombatDirection(me, dir, projectiles, spacingEnemies, options);
          if (score > best.score) {
            best = { ...dir, score, count: projectiles.length, spacingState: spacing.state, spacingDistance: spacing.distance };
          }
        }
        const last = runner.lastCombatDodge || { dx: 0, dy: 0, score: -Infinity };
        if ((best.dx !== last.dx || best.dy !== last.dy) && Date.now() - runner.lastCombatSwitchAt < COMBAT_DODGE_SWITCH_MS) {
          const lastScore = scoreCombatDirection(me, last, projectiles, spacingEnemies, options);
          if (lastScore > best.score - 260) {
            best = {
              dx: last.dx,
              dy: last.dy,
              score: lastScore,
              count: projectiles.length,
              spacingState: spacing.state,
              spacingDistance: spacing.distance
            };
          }
        }
        return best;
      }

      function autoFireTarget(me) {
        const locked = lockedAttackTarget(me);
        if (locked) return locked;
        return liveEnemies(me, AUTO_FIRE_RANGE_CM)
          .map(decorateAttackEnemy)
          .filter(enemy => Number.isFinite(enemy.hpForFire) && enemy.hpForFire > 0)
          .sort((a, b) => a.hpForFire - b.hpForFire || a.dist - b.dist || Number(a.user_id) - Number(b.user_id))[0] || null;
      }

      function observedProjectileSpeedCmps() {
        const speeds = [];
        for (const projectile of runner.projectileMotion.values()) {
          const speed = Math.hypot(Number(projectile.vx), Number(projectile.vy));
          if (Number.isFinite(speed) && speed > 1000) speeds.push(speed);
        }
        if (!speeds.length) return NaN;
        speeds.sort((a, b) => a - b);
        return speeds[Math.floor(speeds.length / 2)];
      }

      function autoFireProjectileSpeedCmps() {
        const direct = numberFrom(state, [
          "bullet_speed_cmps",
          "bulletSpeedCmps",
          "projectile_speed_cmps",
          "projectileSpeedCmps"
        ], NaN);
        if (Number.isFinite(direct) && direct > 1000) return direct;
        const perTick = numberFrom(state, [
          "bullet_speed_per_tick",
          "bulletSpeedPerTick",
          "projectile_speed_per_tick",
          "projectileSpeedPerTick",
          "speed_per_tick",
          "speedPerTick"
        ], NaN);
        if (Number.isFinite(perTick) && perTick > 0) {
          const tickMs = Math.max(1, Number(state.serverTickMs) || 50);
          return perTick * 1000 / tickMs;
        }
        const observed = observedProjectileSpeedCmps();
        return Number.isFinite(observed) ? observed : AUTO_FIRE_DEFAULT_PROJECTILE_SPEED_CMPS;
      }

      function interceptLeadSeconds(me, target, velocity, projectileSpeed) {
        const rx = Number(target.x) - Number(me.x);
        const ry = Number(target.y) - Number(me.y);
        const vx = Number(velocity.vx) || 0;
        const vy = Number(velocity.vy) || 0;
        const speed = Math.max(1, Number(projectileSpeed) || AUTO_FIRE_DEFAULT_PROJECTILE_SPEED_CMPS);
        const a = vx * vx + vy * vy - speed * speed;
        const b = 2 * (rx * vx + ry * vy);
        const c = rx * rx + ry * ry;
        let lead = Math.sqrt(c) / speed;
        if (Math.abs(a) > 0.001) {
          const disc = b * b - 4 * a * c;
          if (disc >= 0) {
            const root = Math.sqrt(disc);
            const t1 = (-b - root) / (2 * a);
            const t2 = (-b + root) / (2 * a);
            const positive = [t1, t2].filter(value => Number.isFinite(value) && value > 0).sort((x, y) => x - y)[0];
            if (Number.isFinite(positive)) lead = positive;
          }
        } else if (Math.abs(b) > 0.001) {
          const linear = -c / b;
          if (Number.isFinite(linear) && linear > 0) lead = linear;
        }
        return Math.min(AUTO_FIRE_LEAD_MAX_MS / 1000, Math.max(AUTO_FIRE_LEAD_MIN_MS / 1000, lead));
      }

      function randomBetween(min, max) {
        return min + Math.random() * (max - min);
      }

      function randomInt(min, max) {
        return Math.floor(randomBetween(min, max + 1));
      }

      function predictedAutoFirePoint(me, target, extraLeadSeconds, offset) {
        const velocity = entityVelocityCmps(target, target.user_id);
        const projectileSpeed = autoFireProjectileSpeedCmps();
        const leadSeconds = interceptLeadSeconds(me, target, velocity, projectileSpeed);
        const totalLeadSeconds = leadSeconds + Math.max(0, Number(extraLeadSeconds) || 0);
        const ox = Number(offset && offset.x) || 0;
        const oy = Number(offset && offset.y) || 0;
        return {
          x: Number(target.x) + velocity.vx * totalLeadSeconds + ox,
          y: Number(target.y) + velocity.vy * totalLeadSeconds + oy,
          leadMs: Math.round(totalLeadSeconds * 1000),
          projectileSpeed,
          targetSpeed: Math.hypot(velocity.vx, velocity.vy)
        };
      }

      function autoFireBurstCooldownMs(me, target, shots) {
        const stamina = Number(me && me.stamina_5s_remaining_milli);
        const ratio = Number.isFinite(stamina) ? Math.max(0, Math.min(1, stamina / AUTO_FIRE_STAMINA_MAX_MILLI)) : 0.5;
        const farBias = target && Number(target.dist) > 11000 ? -80 : 0;
        const shotBias = Math.max(0, Number(shots) - AUTO_FIRE_BURST_MIN_SHOTS) * 24;
        if (ratio >= 0.65) return Math.max(90, randomBetween(120, 260) + farBias + shotBias);
        if (ratio >= 0.35) return Math.max(120, randomBetween(240, 520) + farBias + shotBias);
        if (ratio >= 0.16) return Math.max(180, randomBetween(430, 760) + farBias + shotBias);
        return randomBetween(620, 980) + shotBias;
      }

      function autoFireClientPoint(me, point) {
        const toClient = worldToClientFactory(me, root.getBoundingClientRect());
        const client = toClient(point);
        const x = Number(client && client.x);
        const y = Number(client && client.y);
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        const rect = canvasRect();
        const margin = 4;
        if (x < rect.left - margin || x > rect.right + margin || y < rect.top - margin || y > rect.bottom + margin) {
          return null;
        }
        return { x, y };
      }

      function worldCanvasElement() {
        return (typeof canvas !== "undefined" ? canvas : document.getElementById("world")) || document.body;
      }

      function autoFireCoverageOffsets(me, target, count) {
        const velocity = entityVelocityCmps(target, target.user_id);
        const targetSpeed = Math.hypot(velocity.vx, velocity.vy);
        const rx = Number(target.x) - Number(me.x);
        const ry = Number(target.y) - Number(me.y);
        const dist = Math.max(1, Math.hypot(rx, ry));
        const moveBasis = targetSpeed > 80
          ? { x: velocity.vx / targetSpeed, y: velocity.vy / targetSpeed }
          : { x: rx / dist, y: ry / dist };
        const perp = { x: -moveBasis.y, y: moveBasis.x };
        const along = moveBasis;
        const spread = Math.min(980, Math.max(220, dist * 0.038 + targetSpeed * 0.075));
        const pattern = [0, -0.85, 0.85, -0.42, 0.42, -1.22, 1.22, 0.18];
        const mid = (count - 1) / 2;
        const offsets = [];
        for (let i = 0; i < count; i += 1) {
          const lateral = (pattern[i] ?? randomBetween(-1.15, 1.15)) * spread;
          const forward = (i - mid) * spread * 0.18 + randomBetween(-0.12, 0.12) * spread;
          offsets.push({
            x: perp.x * lateral + along.x * forward,
            y: perp.y * lateral + along.y * forward
          });
        }
        return offsets;
      }

      function autoFireBurstClient(me, target, offset, shotIndex) {
        const freshTarget = visibleAttackTargetById(me, target.user_id) || target;
        const extraLeadSeconds = Math.max(0, Number(shotIndex) || 0) * AUTO_FIRE_BURST_SHOT_MS / 1000;
        return autoFireClientPoint(me, predictedAutoFirePoint(me, freshTarget, extraLeadSeconds, offset));
      }

      function dispatchAutoFireMouse(client, type, buttons) {
        const target = worldCanvasElement();
        if (typeof setPointerFromClient === "function") {
          try {
            setPointerFromClient(client.x, client.y);
          } catch (_) {}
        }
        const common = {
          bubbles: true,
          cancelable: true,
          view: window,
          clientX: client.x,
          clientY: client.y,
          screenX: Math.round(window.screenX + client.x),
          screenY: Math.round(window.screenY + client.y)
        };
        target.dispatchEvent(new MouseEvent(type, { ...common, button: 0, buttons }));
      }

      function clearAutoFireBurst(release) {
        for (const timer of runner.autoFireBurstTimers || []) {
          clearTimeout(timer);
        }
        runner.autoFireBurstTimers = [];
        if (release && runner.autoFireBurstClient) {
          dispatchAutoFireMouse(runner.autoFireBurstClient, "mouseup", 0);
          dispatchAutoFireMouse(runner.autoFireBurstClient, "click", 0);
        }
        runner.autoFireBursting = false;
        runner.autoFireBurstClient = null;
      }

      function scheduleAutoFireBurst(fn, delayMs) {
        const timer = window.setTimeout(() => {
          runner.autoFireBurstTimers = runner.autoFireBurstTimers.filter(item => item !== timer);
          fn();
        }, Math.max(0, delayMs));
        runner.autoFireBurstTimers.push(timer);
      }

      function startAutoFireBurst(me, target, targetName) {
        const stamina = Number(me && me.stamina_5s_remaining_milli);
        if (Number.isFinite(stamina) && stamina < AUTO_FIRE_STAMINA_COST_MILLI) {
          runner.autoFireStatus = "体力不足";
          return false;
        }
        const shots = randomInt(AUTO_FIRE_BURST_MIN_SHOTS, AUTO_FIRE_BURST_MAX_SHOTS);
        const offsets = autoFireCoverageOffsets(me, target, shots);
        const firstClient = autoFireBurstClient(me, target, offsets[0], 0);
        if (!firstClient) {
          runner.autoFireStatus = "目标超出画面";
          return false;
        }

        clearAutoFireBurst(false);
        runner.autoFireBursting = true;
        runner.autoFireBurstClient = firstClient;
        runner.autoFireLastAt = Date.now();
        runner.autoFireShots += shots;
        runner.autoFireTarget = targetName;
        runner.autoFireStatus = "连发 " + shots + " 发 " + targetName
          + " / " + Math.round(target.dist / 100) + "m";

        dispatchAutoFireMouse(firstClient, "mousemove", 0);
        dispatchAutoFireMouse(firstClient, "mousedown", 1);

        for (let i = 1; i < shots; i += 1) {
          scheduleAutoFireBurst(() => {
            const currentMe = getMe();
            if (!currentMe || !runner.autoFireBursting) return;
            const client = autoFireBurstClient(currentMe, target, offsets[i], i);
            if (!client) return;
            runner.autoFireBurstClient = client;
            dispatchAutoFireMouse(client, "mousemove", 1);
          }, i * AUTO_FIRE_BURST_SHOT_MS);
        }

        const holdMs = shots * AUTO_FIRE_BURST_SHOT_MS + randomBetween(55, 130);
        scheduleAutoFireBurst(() => {
          const releaseClient = runner.autoFireBurstClient || firstClient;
          dispatchAutoFireMouse(releaseClient, "mouseup", 0);
          dispatchAutoFireMouse(releaseClient, "click", 0);
          runner.autoFireBursting = false;
          runner.autoFireBurstClient = null;
          runner.autoFireNextBurstAt = Date.now() + autoFireBurstCooldownMs(getMe() || me, target, shots);
          runner.autoFireStatus = "连发完成 " + shots + " 发，等待下一组";
          renderStatus();
        }, holdMs);
        return true;
      }

      function handleAutoFire(me) {
        if (!runner.autoFireMode) return false;
        if (runner.autoFireBursting) {
          return true;
        }
        if (!me || me.life !== "Alive" || Number(me.hp || 0) <= COMBAT_LOW_HP) {
          runner.autoFireStatus = "SAFE";
          return false;
        }
        const target = autoFireTarget(me);
        if (!target) {
          runner.autoFireTarget = "";
          runner.autoFireStatus = "无目标";
          return false;
        }
        const targetName = target.displayName || target.name || ("#" + target.user_id);
        if (target.locked && !target.inFireRange) {
          runner.autoFireTarget = targetName;
          runner.autoFireStatus = "锁定超出射程 " + Math.round(target.dist / 100) + "m";
          return false;
        }
        if (!Number.isFinite(target.hpForFire) || !(target.hpForFire > 0)) {
          runner.autoFireTarget = targetName;
          runner.autoFireStatus = "锁定目标HP未知";
          return false;
        }
        const now = Date.now();
        if (now < runner.autoFireNextBurstAt) {
          runner.autoFireTarget = targetName;
          runner.autoFireStatus = "组间等待 " + Math.max(0, Math.ceil(runner.autoFireNextBurstAt - now)) + "ms";
          return false;
        }
        return startAutoFireBurst(me, target, targetName);
      }

      function minRichEnemyDistanceAt(x, y, enemies) {
        if (!enemies.length) return Infinity;
        return Math.min(...enemies.map(enemy => Math.hypot(Number(enemy.x) - x, Number(enemy.y) - y)));
      }

      function travelTicks(fromX, fromY, toX, toY) {
        const ax = Math.abs(Number(toX) - Number(fromX));
        const ay = Math.abs(Number(toY) - Number(fromY));
        const diagonal = Math.min(ax, ay);
        const axis = Math.max(ax, ay) - diagonal;
        return diagonal / 35 + axis / 50;
      }

      function dropAmount(drop) {
        return Math.max(1, Number(drop && drop.amount || 1));
      }

      function travelSeconds(fromX, fromY, toX, toY) {
        return Math.max(0.2, travelTicks(fromX, fromY, toX, toY) * 0.05);
      }

      function dropClusterValue(drop, candidates, radius, weight) {
        const scanRadius = radius || DROP_CLUSTER_CM;
        const valueWeight = weight == null ? 0.65 : weight;
        let sum = 0;
        for (const other of candidates || []) {
          if (Number(other.drop_id) === Number(drop.drop_id)) continue;
          const dist = Math.hypot(Number(other.x) - Number(drop.x), Number(other.y) - Number(drop.y));
          if (dist > scanRadius) continue;
          sum += dropAmount(other) * (1 - dist / scanRadius) * valueWeight;
        }
        return sum;
      }

      function scoreDrop(drop, me, threats, candidates) {
        const amount = dropAmount(drop);
        const seconds = travelSeconds(Number(me.x), Number(me.y), Number(drop.x), Number(drop.y));
        const cluster = dropClusterValue(drop, candidates);
        const targetSafety = minRichEnemyDistanceAt(Number(drop.x), Number(drop.y), threats);
        const midSafety = minRichEnemyDistanceAt(
          (Number(drop.x) + Number(me.x)) / 2,
          (Number(drop.y) + Number(me.y)) / 2,
          threats
        );
        const safety = Math.min(targetSafety, midSafety);
        if (safety < RICH_ENEMY_KEEP_CM) return -Infinity;
        const safetyFactor = safety < RICH_ENEMY_SCAN_CM
          ? 0.55 + 0.45 * ((safety - RICH_ENEMY_KEEP_CM) / (RICH_ENEMY_SCAN_CM - RICH_ENEMY_KEEP_CM))
          : 1;
        const sameTargetBias = Number(drop.drop_id) === Number(runner.targetId) ? 1.12 : 1;
        return ((amount + cluster) / (seconds + 1.6)) * safetyFactor * sameTargetBias;
      }

      function routeClusterStats(drop, candidates) {
        let count = 0;
        let amount = 0;
        let weighted = 0;
        for (const other of candidates) {
          if (Number(other.drop_id) === Number(drop.drop_id)) continue;
          const dist = Math.hypot(Number(other.x) - Number(drop.x), Number(other.y) - Number(drop.y));
          if (dist > ROUTE_CLUSTER_CM) continue;
          const value = dropAmount(other);
          count += 1;
          amount += value;
          weighted += value * (1 - dist / ROUTE_CLUSTER_CM);
        }
        return { count, amount, weighted };
      }

      function coinCandidates(me, enemies) {
        const threats = enemies || richEnemies(me, RICH_ENEMY_SCAN_CM);
        const drops = Array.isArray(state.coinDrops) ? state.coinDrops : [];
        const candidates = drops
          .map(drop => ({
            ...drop,
            amountValue: dropAmount(drop),
            dist: Math.hypot(Number(drop.x) - Number(me.x), Number(drop.y) - Number(me.y)),
            richEnemyDist: minRichEnemyDistanceAt(Number(drop.x), Number(drop.y), threats)
          }))
          .filter(drop => Number.isFinite(drop.dist) && Number.isFinite(Number(drop.x)) && Number.isFinite(Number(drop.y)));
        const safeBase = (threats.length
          ? candidates.filter(drop => drop.richEnemyDist >= RICH_ENEMY_KEEP_CM)
          : candidates);
        const safe = safeBase
          .map(drop => ({
            ...drop,
            score: scoreDrop(drop, me, threats, safeBase),
            routeCluster: routeClusterStats(drop, safeBase)
          }))
          .filter(drop => Number.isFinite(drop.score));
        return safe;
      }

      function routeLimitForAnchor(anchor) {
        const count = anchor && anchor.routeCluster ? anchor.routeCluster.count : 0;
        if (count >= 7) return ROUTE_MAX_POINTS_DENSE;
        if (count >= 3) return ROUTE_MAX_POINTS_MID;
        if (count >= 1) return ROUTE_MAX_POINTS_SPARSE;
        return 1;
      }

      function routeLegSafetyFactor(fromX, fromY, toX, toY, threats) {
        const targetSafety = minRichEnemyDistanceAt(toX, toY, threats);
        const midSafety = minRichEnemyDistanceAt((fromX + toX) / 2, (fromY + toY) / 2, threats);
        const safety = Math.min(targetSafety, midSafety);
        if (safety < RICH_ENEMY_KEEP_CM) return 0;
        if (safety >= RICH_ENEMY_SCAN_CM) return 1;
        return 0.55 + 0.45 * ((safety - RICH_ENEMY_KEEP_CM) / (RICH_ENEMY_SCAN_CM - RICH_ENEMY_KEEP_CM));
      }

      function routeTurnFactor(prevDx, prevDy, nextDx, nextDy) {
        const prevLen = Math.hypot(prevDx, prevDy);
        const nextLen = Math.hypot(nextDx, nextDy);
        if (prevLen < 1 || nextLen < 1) return 1;
        const cos = (prevDx * nextDx + prevDy * nextDy) / (prevLen * nextLen);
        if (cos < -0.45) return 0.58;
        if (cos < -0.12) return 0.76;
        if (cos > 0.72) return 1.08;
        return 1;
      }

      function routeStepScore(drop, currentX, currentY, prevDx, prevDy, remaining, threats, linkLimit) {
        const dx = Number(drop.x) - currentX;
        const dy = Number(drop.y) - currentY;
        const legDist = Math.hypot(dx, dy);
        const allowLongValue = drop.amountValue >= 10 && legDist <= ROUTE_MAX_LINK_CM;
        if (legDist > linkLimit && !allowLongValue) return null;
        const safetyFactor = routeLegSafetyFactor(currentX, currentY, Number(drop.x), Number(drop.y), threats);
        if (safetyFactor <= 0) return null;
        const seconds = travelSeconds(currentX, currentY, Number(drop.x), Number(drop.y));
        const localCluster = Math.min(drop.amountValue * 2.4, dropClusterValue(drop, remaining, ROUTE_CLUSTER_CM, 0.38));
        const turnFactor = routeTurnFactor(prevDx, prevDy, dx, dy);
        const score = ((drop.amountValue + localCluster) / (seconds + 0.75)) * safetyFactor * turnFactor;
        return { drop, dx, dy, legDist, seconds, safetyFactor, score };
      }

      function chooseNextRouteDrop(currentX, currentY, prevDx, prevDy, remaining, threats, linkLimit) {
        let best = null;
        for (const drop of remaining.values()) {
          const scored = routeStepScore(drop, currentX, currentY, prevDx, prevDy, remaining.values(), threats, linkLimit);
          if (!scored) continue;
          if (!best || scored.score > best.score || (scored.score === best.score && scored.legDist < best.legDist)) {
            best = scored;
          }
        }
        return best;
      }

      function buildRouteFromAnchor(anchor, candidates, me, threats) {
        const maxPoints = routeLimitForAnchor(anchor);
        const linkLimit = anchor.routeCluster.count >= 5 ? ROUTE_MAX_LINK_CM : ROUTE_LINK_CM;
        const remaining = new Map(candidates.map(drop => [Number(drop.drop_id), drop]));
        const route = [];
        let currentX = Number(me.x);
        let currentY = Number(me.y);
        let prevDx = 0;
        let prevDy = 0;
        let totalValue = 0;
        let totalSeconds = 0;
        let minSafetyFactor = 1;

        for (let step = 0; step < maxPoints; step += 1) {
          const next = step === 0
            ? routeStepScore(anchor, currentX, currentY, prevDx, prevDy, remaining.values(), threats, Infinity)
            : chooseNextRouteDrop(currentX, currentY, prevDx, prevDy, remaining, threats, linkLimit);
          if (!next) break;
          if (step > 0) {
            const currentEfficiency = totalValue / Math.max(0.8, totalSeconds);
            const densityAllowance = anchor.routeCluster.count >= 5 ? 0.30 : 0.43;
            if (next.score < currentEfficiency * densityAllowance) break;
          }
          route.push(next.drop);
          remaining.delete(Number(next.drop.drop_id));
          totalValue += next.drop.amountValue;
          totalSeconds += next.seconds;
          minSafetyFactor = Math.min(minSafetyFactor, next.safetyFactor);
          currentX = Number(next.drop.x);
          currentY = Number(next.drop.y);
          prevDx = next.dx;
          prevDy = next.dy;
        }

        if (!route.length) return null;
        const ids = route.map(drop => Number(drop.drop_id));
        const densityBonus = Math.min(
          totalValue * 0.75,
          route.reduce((sum, drop) => sum + Math.min(drop.amountValue * 2, drop.routeCluster.weighted) * 0.18, 0)
        );
        const countBonus = 1 + Math.min(0.18, (route.length - 1) * 0.045);
        const sameRouteBias = ids[0] === Number(runner.targetId) ? 1.08 : 1;
        const kind = route.length >= 3 ? "cluster" : route.length === 2 ? "pair" : "single";
        const score = ((totalValue + densityBonus) / (totalSeconds + 1.4)) * minSafetyFactor * countBonus * sameRouteBias;
        return {
          ids,
          target: route[0],
          drops: route,
          score,
          value: totalValue,
          travelSeconds: totalSeconds,
          kind
        };
      }

      function uniqueDrops(groups, limit) {
        const anchors = new Map();
        for (const group of groups) {
          for (const drop of group) {
            const id = Number(drop.drop_id);
            if (!anchors.has(id)) anchors.set(id, drop);
            if (anchors.size >= limit) return Array.from(anchors.values());
          }
        }
        return Array.from(anchors.values());
      }

      function uniqueAnchors(groups) {
        return uniqueDrops(groups, ROUTE_ANCHOR_LIMIT);
      }

      function bestDropRoute(me, enemies) {
        const threats = enemies || richEnemies(me, RICH_ENEMY_SCAN_CM);
        const candidates = coinCandidates(me, threats);
        if (!candidates.length) return null;
        const bySingleAll = [...candidates].sort((a, b) => b.score - a.score || a.dist - b.dist);
        const bySingle = bySingleAll.slice(0, 12);
        const byCluster = [...candidates]
          .sort((a, b) =>
            ((b.amountValue + b.routeCluster.weighted) / (travelSeconds(Number(me.x), Number(me.y), Number(b.x), Number(b.y)) + 1.4))
            - ((a.amountValue + a.routeCluster.weighted) / (travelSeconds(Number(me.x), Number(me.y), Number(a.x), Number(a.y)) + 1.4))
            || a.dist - b.dist
          )
        const byNearAll = [...candidates].sort((a, b) => a.dist - b.dist);
        const byAmountAll = [...candidates].sort((a, b) => b.amountValue - a.amountValue || a.dist - b.dist);
        const byNear = byNearAll.slice(0, 6);
        const byAmount = byAmountAll.slice(0, 6);
        const current = runner.targetId
          ? candidates.filter(drop => Number(drop.drop_id) === Number(runner.targetId))
          : [];
        const routePool = uniqueDrops([
          current,
          bySingleAll.slice(0, 36),
          byCluster.slice(0, 36),
          byNearAll.slice(0, 18),
          byAmountAll.slice(0, 18)
        ], ROUTE_POOL_LIMIT);
        const anchors = uniqueAnchors([current, bySingle, byCluster, byNear, byAmount]);
        let best = null;
        for (const anchor of anchors) {
          const route = buildRouteFromAnchor(anchor, routePool, me, threats);
          if (!route) continue;
          if (!best || route.score > best.score || (route.score === best.score && route.travelSeconds < best.travelSeconds)) {
            best = route;
          }
        }
        return best;
      }

      function currentCoinRouteTarget(me, threats) {
        const drops = Array.isArray(state.coinDrops) ? state.coinDrops : [];
        while (runner.routeIds && runner.routeIds.length) {
          const id = Number(runner.routeIds[0]);
          const target = drops.find(drop => Number(drop.drop_id) === id);
          if (!target) {
            runner.routeIds.shift();
            runner.routeAdvanced = true;
            runner.planNextAt = 0;
            runner.targetScore *= 0.68;
            continue;
          }
          if (minRichEnemyDistanceAt(Number(target.x), Number(target.y), threats) < RICH_ENEMY_KEEP_CM) {
            clearCoinRoute();
            return null;
          }
          runner.targetId = id;
          return {
            ...target,
            amountValue: dropAmount(target),
            dist: Math.hypot(Number(target.x) - Number(me.x), Number(target.y) - Number(me.y)),
            score: runner.targetScore
          };
        }

        if (runner.targetId) {
          const target = drops.find(drop => Number(drop.drop_id) === Number(runner.targetId));
          if (!target || minRichEnemyDistanceAt(Number(target.x), Number(target.y), threats) < RICH_ENEMY_KEEP_CM) {
            clearCoinRoute();
            return null;
          }
          return {
            ...target,
            amountValue: dropAmount(target),
            dist: Math.hypot(Number(target.x) - Number(me.x), Number(target.y) - Number(me.y)),
            score: runner.targetScore
          };
        }

        clearCoinRoute();
        return null;
      }

      function nearestDrop(me, enemies) {
        const route = bestDropRoute(me, enemies);
        return route ? route.target : null;
      }

      function fleeFrom(enemy, me, reason, urgent) {
        const rx = Number(me.x) - Number(enemy.x);
        const ry = Number(me.y) - Number(enemy.y);
        moveToward(rx || 1, ry);
        const length = Math.max(1, Math.hypot(rx, ry));
        setNavigationTarget(
          Number(me.x) + (rx || 1) / length * 12000,
          Number(me.y) + ry / length * 12000,
          "evade"
        );
        setDanger(urgent);
        clearCoinRoute();
        runner.avoidances += 1;
        runner.lastThreat = {
          name: enemy.name || ("User " + enemy.user_id),
          drop: enemy.dropForAvoid,
          dist: Math.round(enemy.dist)
        };
        runner.lastAction = reason + "：" + runner.lastThreat.name
          + " 距离 " + runner.lastThreat.dist + "cm Drop " + runner.lastThreat.drop;
      }

      function driveHuntTarget(me) {
        if (!runner.huntMode) return false;
        const query = huntQueryText();
        if (!query) {
          clearHuntTarget();
          stopMove();
          runner.lastAction = "追杀：请输入用户名片段";
          return true;
        }
        if (query !== runner.huntQuery) {
          runner.huntQuery = query;
          clearHuntTarget();
        }

        const now = Date.now();
        const target = findHuntTarget(me, query);
        let point = null;
        let label = "";
        let source = "";
        let distToEntity = 0;

        if (target) {
          const predicted = predictedHuntPoint(target, me);
          point = predicted;
          label = target.name + " #" + target.userId;
          source = target.source === "entity" ? "实时" : "快照";
          distToEntity = target.dist;
          runner.huntTargetId = target.userId;
          runner.huntTargetName = target.name;
          runner.huntLastSeen = {
            userId: target.userId,
            name: target.name,
            x: Number(target.x),
            y: Number(target.y),
            predictedX: Number(point.x),
            predictedY: Number(point.y),
            source: target.source
          };
          runner.huntLastSeenAt = now;
        } else if (runner.huntLastSeen && now - runner.huntLastSeenAt <= HUNT_LOST_MEMORY_MS) {
          point = {
            x: Number(runner.huntLastSeen.predictedX || runner.huntLastSeen.x),
            y: Number(runner.huntLastSeen.predictedY || runner.huntLastSeen.y),
            leadMs: 0,
            speed: 0
          };
          label = runner.huntLastSeen.name + " #" + runner.huntLastSeen.userId;
          source = "记忆";
          distToEntity = Math.hypot(point.x - Number(me.x), point.y - Number(me.y));
        } else {
          clearHuntTarget();
          stopMove();
          clearCoinRoute();
          runner.lastAction = "追杀：未找到匹配用户名 " + query;
          return true;
        }

        const rx = Number(point.x) - Number(me.x);
        const ry = Number(point.y) - Number(me.y);
        const dist = Math.hypot(rx, ry);
        clearCoinRoute();
        setDanger(false);
        setNavigationTarget(point.x, point.y, "hunt");

        if (!Number.isFinite(dist)) {
          stopMove();
          runner.lastAction = "追杀：" + label + " 坐标异常";
          return true;
        }
        if (dist <= HUNT_REACHED_CM) {
          stopMove();
          runner.lastAction = "追杀：" + label + " 已贴近，保持观察";
          return true;
        }

        moveToward(rx, ry);
        runner.lastAction = "追杀：" + label
          + " / " + source
          + " / 距离 " + Math.round(distToEntity || dist)
          + " / 预判 " + Math.round(point.leadMs || 0) + "ms";
        return true;
      }

      function canvasRect() {
        const worldCanvas = typeof canvas !== "undefined" ? canvas : document.getElementById("world");
        if (worldCanvas && typeof worldCanvas.getBoundingClientRect === "function") {
          const rect = worldCanvas.getBoundingClientRect();
          if (rect.width > 0 && rect.height > 0) return rect;
        }
        return document.body.getBoundingClientRect();
      }

      function overlaySceneRect(rootRect) {
        if (rootRect && rootRect.width > 0 && rootRect.height > 0) return rootRect;
        return canvasRect();
      }

      function renderWorldPoint(point) {
        const userId = Number(point && point.user_id);
        const currentUserId = Number(state.currentUserId);
        if (Number.isFinite(userId) && Number.isFinite(currentUserId) && userId === currentUserId) {
          const visual = state.localVisual;
          if (visual && Number.isFinite(Number(visual.x)) && Number.isFinite(Number(visual.y))) {
            return { ...point, x: Number(visual.x), y: Number(visual.y) };
          }
        }
        const visuals = state.visualEntities;
        if (Number.isFinite(userId) && visuals && typeof visuals.get === "function") {
          const visual = visuals.get(userId);
          if (visual && Number.isFinite(Number(visual.x)) && Number.isFinite(Number(visual.y))) {
            return { ...point, x: Number(visual.x), y: Number(visual.y) };
          }
        }
        return point;
      }

      function gameScreenCenter(rect) {
        if (typeof screenCenter === "function") {
          try {
            const point = screenCenter();
            const x = Number(point && point.x);
            const y = Number(point && point.y);
            if (Number.isFinite(x) && Number.isFinite(y)) {
              return { x: rect.left + x, y: rect.top + y };
            }
          } catch (_) {}
        }
        const reservedLeft = window.matchMedia("(max-aspect-ratio: 1/1)").matches
          ? 0
          : Math.min(368, Math.max(0, rect.width - 320));
        return {
          x: rect.left + reservedLeft + (rect.width - reservedLeft) / 2,
          y: rect.top + rect.height / 2
        };
      }

      function gameCameraCenter(me) {
        const visual = state.localVisual;
        if (visual && Number.isFinite(Number(visual.x)) && Number.isFinite(Number(visual.y))) {
          return { x: Number(visual.x), y: Number(visual.y) };
        }
        return {
          x: Number(me.x),
          y: Number(me.y)
        };
      }

      function fallbackWorldToClient(me, rect) {
        const shortSide = Math.max(1, Math.min(rect.width, rect.height));
        const viewRadius = Number(state.viewRadiusCm);
        const units = Number.isFinite(viewRadius) && viewRadius > 0
          ? (viewRadius * 2) / shortSide
          : (ENEMY_LINE_SCAN_CM * 2) / shortSide;
        const origin = gameScreenCenter(rect);
        const camera = gameCameraCenter(me);
        return point => ({
          x: origin.x + (Number(point.x) - camera.x) / units,
          y: origin.y + (Number(point.y) - camera.y) / units
        });
      }

      function worldToClientFactory(me, rootRect) {
        const rect = canvasRect();
        if (typeof viewParams === "function" && typeof worldToScreen === "function") {
          try {
            const view = viewParams();
            return point => {
              const screenPoint = worldToScreen(Number(point.x), Number(point.y), view);
              return {
                x: rect.left + Number(screenPoint.x),
                y: rect.top + Number(screenPoint.y)
              };
            };
          } catch (_) {}
        }
        if (!rect || rect.width <= 0 || rect.height <= 0) return fallbackWorldToClient(me, overlaySceneRect(rootRect));
        return fallbackWorldToClient(me, rect);
      }

      function clientPoint(worldPoint, toClient, rootRect) {
        const clientPoint = toClient(renderWorldPoint(worldPoint));
        const x = Number(clientPoint.x) - rootRect.left;
        const y = Number(clientPoint.y) - rootRect.top;
        if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
        return { x, y };
      }

      function lineMayBeVisible(a, b, width, height) {
        const margin = 120;
        if (a.x < -margin && b.x < -margin) return false;
        if (a.y < -margin && b.y < -margin) return false;
        if (a.x > width + margin && b.x > width + margin) return false;
        if (a.y > height + margin && b.y > height + margin) return false;
        return true;
      }

      function prepareLineCanvas(rootRect) {
        const canvasEl = ui.lineCanvas;
        const ctx = runner.lineCtx;
        if (!canvasEl || !ctx) return null;
        const width = Math.max(1, Math.round(rootRect.width));
        const height = Math.max(1, Math.round(rootRect.height));
        const dpr = Math.min(LINE_CANVAS_MAX_DPR, Math.max(1, Number(window.devicePixelRatio || 1)));
        const pixelWidth = Math.max(1, Math.round(width * dpr));
        const pixelHeight = Math.max(1, Math.round(height * dpr));
        if (canvasEl.width !== pixelWidth || canvasEl.height !== pixelHeight) {
          canvasEl.width = pixelWidth;
          canvasEl.height = pixelHeight;
          canvasEl.style.width = width + "px";
          canvasEl.style.height = height + "px";
        }
        runner.lineDpr = dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.clearRect(0, 0, width, height);
        return { ctx, width, height };
      }

      function clearLineCanvas() {
        const canvasEl = ui.lineCanvas;
        const ctx = runner.lineCtx;
        if (!canvasEl || !ctx) return;
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      }

      function drawLine(ctx, a, b, type) {
        const styles = {
          enemy: {
            color: "rgba(56, 189, 248, .72)",
            width: 1.6,
            glow: "rgba(56, 189, 248, .62)",
            blur: 8,
            dash: []
          },
          danger: {
            color: "rgba(248, 113, 113, .95)",
            width: 2.4,
            glow: "rgba(248, 113, 113, .72)",
            blur: 10,
            dash: []
          },
          target: {
            color: "rgba(250, 204, 21, .95)",
            width: 2.3,
            glow: "rgba(250, 204, 21, .72)",
            blur: 10,
            dash: [10, 8]
          }
        };
        const style = styles[type] || styles.enemy;
        ctx.save();
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = "rgba(2, 6, 23, .42)";
        ctx.lineWidth = Math.max(4, style.width + 3);
        ctx.setLineDash([]);
        ctx.shadowBlur = 0;
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(a.x, a.y);
        ctx.lineTo(b.x, b.y);
        ctx.strokeStyle = style.color;
        ctx.lineWidth = style.width;
        ctx.setLineDash(style.dash);
        ctx.shadowBlur = style.blur;
        ctx.shadowColor = style.glow;
        ctx.stroke();
        ctx.restore();
      }

      function drawCombatTriangle(ctx, point) {
        ctx.save();
        ctx.translate(point.x, point.y - 30);
        ctx.beginPath();
        ctx.moveTo(0, 12);
        ctx.lineTo(-12, -9);
        ctx.lineTo(12, -9);
        ctx.closePath();
        ctx.fillStyle = "rgba(248, 38, 38, .92)";
        ctx.shadowBlur = 14;
        ctx.shadowColor = "rgba(248, 38, 38, .8)";
        ctx.fill();
        ctx.lineWidth = 1.5;
        ctx.strokeStyle = "rgba(254, 226, 226, .85)";
        ctx.stroke();
        ctx.restore();
      }

      function drawCombatOverlay(surface, me, toClient, rootRect) {
        const meHp = numberFrom(me, ["hp", "health", "life_value", "current_hp"], 0);
        if (meHp <= 0) return;
        const enemies = combatEnemies(me);
        runner.combatTargets = 0;
        for (const enemy of enemies) {
          if (!(enemy.hpForCombat > 0) || enemy.hpForCombat >= meHp) continue;
          const point = clientPoint(enemy, toClient, rootRect);
          if (!point || point.x < -40 || point.y < -40 || point.x > rootRect.width + 40 || point.y > rootRect.height + 40) continue;
          drawCombatTriangle(surface.ctx, point);
          runner.combatTargets += 1;
        }
      }

      function currentNavigationTarget() {
        if (!runner.running) return null;
        if (runner.manualTarget) return runner.manualTarget;
        if (runner.navTarget) return runner.navTarget;
        if (runner.targetId) {
          const target = state.coinDrops.find(drop => Number(drop.drop_id) === Number(runner.targetId));
          if (target) return target;
        }
        return null;
      }

      function renderLines() {
        try {
          const me = getMe();
          if (!me) {
            clearLineCanvas();
            return;
          }
          const now = Date.now();
          trackEnemyMotion(now);
          const rootRect = root.getBoundingClientRect();
          if (rootRect.width <= 0 || rootRect.height <= 0 || document.hidden) {
            clearLineCanvas();
            return;
          }
          const surface = prepareLineCanvas(rootRect);
          if (!surface) return;
          const toClient = worldToClientFactory(me, rootRect);
          const mePoint = clientPoint(me, toClient, rootRect);
          if (!mePoint) return;

          if (runner.combatMode) {
            drawCombatOverlay(surface, me, toClient, rootRect);
            return;
          }

          const enemies = liveEnemies(me, ENEMY_LINE_SCAN_CM)
            .filter(enemy => enemy.dropForAvoid >= ENEMY_LINE_MIN_DROP);
          const dangerEnemies = [];
          for (const enemy of enemies) {
            const enemyPoint = clientPoint(enemy, toClient, rootRect);
            if (!enemyPoint || !lineMayBeVisible(mePoint, enemyPoint, rootRect.width, rootRect.height)) continue;
            drawLine(surface.ctx, mePoint, enemyPoint, "enemy");
            if (enemy.dist <= RICH_ENEMY_ESCAPE_CM) dangerEnemies.push(enemyPoint);
          }
          for (const enemyPoint of dangerEnemies) {
            drawLine(surface.ctx, mePoint, enemyPoint, "danger");
          }

          const target = currentNavigationTarget();
          const targetPoint = target ? clientPoint(target, toClient, rootRect) : null;
          if (targetPoint && lineMayBeVisible(mePoint, targetPoint, rootRect.width, rootRect.height)) {
            drawLine(surface.ctx, mePoint, targetPoint, "target");
          }
        } catch (_) {
          clearLineCanvas();
        }
      }

      function renderLineFrame() {
        runner.lineRaf = 0;
        renderLines();
        if (root.isConnected) {
          runner.lineRaf = window.requestAnimationFrame(renderLineFrame);
        }
      }

      function startLineLoop() {
        if (!runner.lineRaf) {
          runner.lineRaf = window.requestAnimationFrame(renderLineFrame);
        }
      }

      function leftSidebarText() {
        const side = document.querySelector(".side");
        if (!side) return "";
        return side.innerText || side.textContent || "";
      }

      function hasHourlyStaminaLimit() {
        return leftSidebarText().includes("1h体力限制");
      }

      function checkHourlyStaminaLimitLeave() {
        if (!hasHourlyStaminaLimit()) {
          runner.hourlyLimitLeaveTriggered = false;
          return false;
        }
        if (runner.hourlyLimitLeaveTriggered) return true;
        runner.hourlyLimitLeaveTriggered = true;
        clickLeave("左侧边栏检测到1h体力限制");
        return true;
      }

      function clickLeave(reason) {
        stopMove();
        setDanger(false);
        runner.leaves += 1;
        runner.running = false;
        runner.combatMode = false;
        runner.huntMode = false;
        runner.autoFireMode = false;
        runner.autoFireStatus = "OFF";
        const me = getMe();
        runner.stoppedHpBaseline = me ? Number(me.hp || 0) : null;
        clearAutoFireBurst(true);
        clearAttackLock("离开脱战");
        clearHuntTarget();
        clearCoinRoute();
        runner.combatRisk = "clear";
        if (runner.timer) {
          clearInterval(runner.timer);
          runner.timer = 0;
        }
        runner.tickMs = STEP_TICK_MS;
        try {
          const button = els.leaveBtn
            || Array.from(document.querySelectorAll("button")).find(btn => (btn.textContent || "").trim() === "离开");
          if (!button) throw new Error("leave button not found");
          button.click();
          push("已点击离开脱战：" + reason);
        } catch (err) {
          runner.lastError = String(err && err.message || err);
          push("离开失败：" + runner.lastError);
        }
        renderStatus();
      }

      function monitorStoppedDamage() {
        const me = getMe();
        if (runner.running) {
          runner.stoppedHpBaseline = me ? Number(me.hp || 0) : null;
          return false;
        }
        if (!me) {
          runner.stoppedHpBaseline = null;
          return false;
        }
        const hp = Number(me.hp || 0);
        if (!Number.isFinite(hp)) return false;
        if (runner.stoppedHpBaseline === null || me.life !== "Alive" || hp <= 0) {
          runner.stoppedHpBaseline = hp;
          return false;
        }
        if (hp < runner.stoppedHpBaseline) {
          const previousHp = runner.stoppedHpBaseline;
          runner.stoppedHpBaseline = hp;
          clickLeave("停止模式血量下降 " + previousHp + " -> " + hp);
          return true;
        }
        if (hp > runner.stoppedHpBaseline) runner.stoppedHpBaseline = hp;
        return false;
      }

      function setStepInterval(ms) {
        const next = Number(ms) || STEP_TICK_MS;
        if (runner.tickMs === next && runner.timer) return;
        runner.tickMs = next;
        if (!runner.running || !runner.timer) return;
        clearInterval(runner.timer);
        runner.timer = window.setInterval(step, runner.tickMs);
      }

      function setAutoFireMode(active, reason) {
        const next = !!active;
        if (runner.autoFireMode === next) return;
        runner.autoFireMode = next;
        runner.autoFireLastAt = 0;
        runner.autoFireNextBurstAt = 0;
        runner.autoFireStatus = next ? "待机" : "OFF";
        runner.autoFireTarget = "";
        if (next) {
          push("自动攻击已开启：使用长按连发覆盖目标");
          if (!runner.running) start();
          else setStepInterval(AUTO_FIRE_LOOP_MS);
        } else {
          clearAutoFireBurst(true);
          push("自动攻击已关闭" + (reason ? "：" + reason : ""));
          if (runner.running && !runner.combatMode) setStepInterval(STEP_TICK_MS);
        }
        renderStatus();
      }

      function toggleAutoFireMode() {
        setAutoFireMode(!runner.autoFireMode, "manual");
      }

      function setCombatMode(active, reason) {
        const next = !!active;
        if (runner.combatMode === next) return;
        const clearedManualTarget = next && reason === "manual" && !!runner.manualTarget;
        if (clearedManualTarget) {
          clearManualTarget("手动开启临时交战");
        }
        runner.combatMode = next;
        clearCoinRoute();
        runner.planNextAt = 0;
        runner.navTarget = null;
        runner.lastCombatDodge = { dx: 0, dy: 0, score: 0 };
        runner.lastCombatSwitchAt = 0;
        runner.combatManualOverride = false;
        runner.combatProjectiles = 0;
        runner.combatTargets = 0;
        runner.combatRisk = next ? "watch" : "clear";
        runner.combatSpacingState = "none";
        runner.combatSpacingMeters = null;
        if (next) {
          clearScriptMoveKeys(true);
          push("临时交战已开启，暂停金币巡航" + (clearedManualTarget ? "，已取消右键目标" : ""));
          if (!runner.running) start();
        } else {
          runner.projectileMotion.clear();
          setStepInterval(STEP_TICK_MS);
          stopMove();
          setDanger(false);
          push("临时交战已关闭，恢复金币巡航" + (reason ? "：" + reason : ""));
        }
        renderLines();
        renderStatus();
      }

      function toggleCombatMode() {
        setCombatMode(!runner.combatMode, "manual");
      }

      function combatDangerLevel(me, enemies) {
        const hp = numberFrom(me, ["hp", "health", "life_value", "current_hp"], 0);
        if (hp <= COMBAT_CRITICAL_HP) return "critical";
        const outmatched = enemies.some(enemy => enemy.hpForCombat > 0 && enemy.hpForCombat >= hp * 1.15);
        return outmatched ? "outmatched" : "clear";
      }

      function applyCombatDodge(me, spacingEnemies) {
        const now = Date.now();
        const projectiles = activeProjectiles(me, now);
        runner.combatProjectiles = projectiles.length;
        const manual = manualMoveVector();
        if (manual.active) {
          clearScriptMoveKeys(true);
          runner.combatManualOverride = true;
          runner.lastMoveMode = "manual-combat";
          runner.combatSpacingState = combatSpacingState(spacingEnemies).state;
          runner.combatSpacingMeters = null;
          return projectiles.length;
        }
        runner.combatManualOverride = false;
        const dodge = chooseCombatDodge(me, projectiles, spacingEnemies);
        const changed = dodge.dx !== runner.lastCombatDodge.dx || dodge.dy !== runner.lastCombatDodge.dy;
        if (changed) runner.lastCombatSwitchAt = now;
        runner.lastCombatDodge = dodge;
        runner.combatSpacingState = dodge.spacingState || "none";
        runner.combatSpacingMeters = Number.isFinite(dodge.spacingDistance)
          ? Math.round(dodge.spacingDistance / 100)
          : null;
        if (dodge.dx === 0 && dodge.dy === 0) {
          setVelocity(0, 0, { preserveUser: true });
          runner.lastMoveMode = projectiles.length ? "combat-hold" : "combat-spacing-hold";
        } else {
          setVelocity(dodge.dx, dodge.dy, { preserveUser: true });
          runner.lastMoveMode = projectiles.length ? "combat-dodge" : "combat-spacing";
        }
        return projectiles.length;
      }

      function handleCombatMode(me, hp) {
        if (!runner.combatMode) return false;
        setStepInterval(hp < COMBAT_FAST_CHECK_HP ? COMBAT_FAST_TICK_MS : (runner.autoFireMode ? AUTO_FIRE_LOOP_MS : STEP_TICK_MS));
        clearCoinRoute();
        runner.planNextAt = 0;
        runner.navTarget = null;

        const enemies = combatEnemies(me);
        const spacingEnemies = combatSpacingEnemies(me);
        runner.combatTargets = enemies.filter(enemy => enemy.hpForCombat > 0 && enemy.hpForCombat < hp).length;

        if (hp <= COMBAT_LOW_HP) {
          runner.combatRisk = "critical";
          setDanger(true, "critical");
          clickLeave("临时交战血量≤" + COMBAT_LOW_HP + "：" + hp);
          return true;
        }

        runner.combatRisk = combatDangerLevel(me, enemies);
        if (runner.combatRisk === "critical") {
          setDanger(true, "critical");
        } else if (runner.combatRisk === "outmatched") {
          setDanger(true);
        } else {
          setDanger(false);
        }

        handleAutoFire(me);

        if (runner.manualTarget) {
          runner.combatProjectiles = activeProjectiles(me, Date.now()).length;
          runner.combatSpacingState = combatSpacingState(spacingEnemies).state;
          runner.combatSpacingMeters = null;
          runner.combatManualOverride = false;
          if (driveManualTarget(me, "临时交战：前往", { preserveUser: true, respectUserInput: true })) {
            return true;
          }
        }

        const projectileCount = applyCombatDodge(me, spacingEnemies);
        const spacingText = runner.combatSpacingMeters === null
          ? ""
          : "，距离 " + runner.combatSpacingMeters + "m";
        runner.lastAction = runner.combatManualOverride
          ? "临时交战：手动 WASD 接管，自动躲避暂停，标记 " + runner.combatTargets + " 个低血目标"
          : projectileCount
          ? "临时交战：躲避 " + projectileCount + " 个弹体" + spacingText + "，标记 " + runner.combatTargets + " 个低血目标"
          : runner.lastMoveMode === "combat-spacing"
          ? "临时交战：调整距离到100-150m" + spacingText + "，标记 " + runner.combatTargets + " 个低血目标"
          : "临时交战：未识别到弹体，保持观察" + spacingText + "，标记 " + runner.combatTargets + " 个低血目标";
        return true;
      }

      function step() {
        try {
          if (checkHourlyStaminaLimitLeave()) return;

          const me = getMe();
          if (!me) {
            stopMove();
            runner.lastAction = "等待玩家实体";
            return;
          }

          const hp = Number(me.hp || 0);
          const balance = Number(me.external_balance_snapshot || 0);

          if (runner.lastHp === null) runner.lastHp = hp;
          if (runner.lastBalance === null) runner.lastBalance = balance;

          if (balance > runner.lastBalance) {
            runner.deltaBalance += balance - runner.lastBalance;
            push("收益 +" + (balance - runner.lastBalance) + "，本次累计 +" + runner.deltaBalance);
          }
          runner.lastBalance = balance;

          if (hp < runner.lastHp && !runner.combatMode) {
            setDanger(false);
            clickLeave("常态血量下降 " + runner.lastHp + " -> " + hp);
            runner.lastHp = hp;
            return;
          }
          runner.lastHp = hp;

          if (me.life !== "Alive" || hp <= 0) {
            stopMove();
            setDanger(false);
            runner.lastAction = "非存活状态，停止移动";
            return;
          }

          if (Number(me.stamina_5s_remaining_milli || 0) <= 0) {
            stopMove();
            setDanger(false);
            runner.lastAction = "短时体力耗尽，等待恢复";
            return;
          }

          trackEnemyMotion(Date.now());

          if (handleCombatMode(me, hp)) return;

          if (runner.autoFireMode) {
            setStepInterval(AUTO_FIRE_LOOP_MS);
            handleAutoFire(me);
          } else {
            setStepInterval(STEP_TICK_MS);
          }

          if (driveHuntTarget(me)) return;

          const threats = richEnemies(me, RICH_ENEMY_SCAN_CM);
          const urgentThreat = escapeEnemies(me, RICH_ENEMY_ESCAPE_CM)[0];
          if (urgentThreat) {
            const reason = urgentThreat.dropForAvoid > RICH_ENEMY_MIN_DROP
              ? "高Drop敌人进入170m射程缓冲，立即逃离"
              : "低Drop移动敌人进入170m射程缓冲，立即逃离";
            fleeFrom(urgentThreat, me, reason, true);
            return;
          }
          setDanger(false);

          const keepawayThreat = threats.find(enemy => enemy.dist < RICH_ENEMY_KEEP_CM);
          if (keepawayThreat) {
            fleeFrom(keepawayThreat, me, "富敌过近，拉开到200-250m外", false);
            return;
          }

          if (driveManualTarget(me, "前往")) return;

          let target = currentCoinRouteTarget(me, threats);

          const shouldReplan = !target || Date.now() >= runner.planNextAt;
          if (shouldReplan) {
            const planned = bestDropRoute(me, threats);
            const switchFactor = runner.routeAdvanced ? 0.98 : ROUTE_SWITCH_FACTOR;
            if (planned && (!target || planned.score > runner.targetScore * switchFactor)) {
              adoptCoinRoute(planned);
              target = currentCoinRouteTarget(me, threats);
              push("规划金币路线 " + runner.routeIds.join(">")
                + " / " + (runner.routeKind || "single")
                + " / " + planned.drops.length + "点"
                + " / 总额 " + Math.round(planned.value)
                + " / 路程 " + planned.travelSeconds.toFixed(1) + "s"
                + " / 评分 " + planned.score.toFixed(3));
            } else {
              runner.planNextAt = Date.now() + REPLAN_MS;
            }
            runner.routeAdvanced = false;
          }

          if (!target) {
            stopMove();
            runner.lastAction = threats.length
              ? "富敌250m内，无安全金币，保持距离"
              : "视野内没有金币";
            return;
          }

          const rx = Number(target.x) - Number(me.x);
          const ry = Number(target.y) - Number(me.y);
          const dist = Math.hypot(rx, ry);

          if (dist < 45) {
            stopMove();
            runner.lastAction = "贴近金币 " + runner.targetId + "，等待入账";
            return;
          }

          const move = moveToward(rx, ry);
          setNavigationTarget(target.x, target.y, "coin");
          runner.lastAction = "前往金币 " + runner.targetId
            + "，距离 " + Math.round(dist)
            + "，路线 " + Math.max(1, runner.routeIds.length) + "点";
        } catch (err) {
          runner.lastError = String(err && err.message || err);
          stopMove();
          setDanger(false);
          push("循环错误：" + runner.lastError);
        }
      }

      function start() {
        if (runner.running) return;
        const me = getMe();
        runner.running = true;
        runner.startedAt = Date.now();
        runner.lastHp = me ? Number(me.hp || 0) : null;
        runner.stoppedHpBaseline = runner.lastHp;
        runner.lastBalance = me ? Number(me.external_balance_snapshot || 0) : null;
        runner.hourlyLimitLeaveTriggered = false;
        clearCoinRoute();
        runner.planNextAt = 0;
        runner.tickMs = STEP_TICK_MS;
        runner.timer = window.setInterval(step, runner.tickMs);
        push("已启动");
        step();
        renderStatus();
      }

      function stop(reason) {
        runner.running = false;
        runner.combatMode = false;
        runner.huntMode = false;
        clearHuntTarget();
        runner.combatRisk = "clear";
        runner.combatProjectiles = 0;
        runner.combatTargets = 0;
        runner.combatManualOverride = false;
        runner.autoFireMode = false;
        runner.autoFireStatus = "OFF";
        runner.autoFireTarget = "";
        clearAutoFireBurst(true);
        clearAttackLock("停止脚本");
        runner.projectileMotion.clear();
        if (runner.timer) {
          clearInterval(runner.timer);
          runner.timer = 0;
        }
        runner.tickMs = STEP_TICK_MS;
        const me = getMe();
        runner.stoppedHpBaseline = me ? Number(me.hp || 0) : null;
        stopMove();
        setDanger(false);
        push("已停止" + (reason ? "：" + reason : ""));
        renderLines();
        renderStatus();
      }

      function destroy(reason) {
        stop(reason || "destroy");
        if (runner.statusTimer) clearInterval(runner.statusTimer);
        if (runner.sidebarSafetyTimer) clearInterval(runner.sidebarSafetyTimer);
        if (runner.dropLeaderboardTimer) clearInterval(runner.dropLeaderboardTimer);
        if (runner.dropLeaderboardEntryTimer) clearTimeout(runner.dropLeaderboardEntryTimer);
        if (runner.lineRaf) {
          window.cancelAnimationFrame(runner.lineRaf);
          runner.lineRaf = 0;
        }
        window.removeEventListener("resize", updateHudSceneBounds);
        window.removeEventListener("contextmenu", handleContextMenu, true);
        window.removeEventListener("keydown", handleMovementKeyDown, true);
        window.removeEventListener("keyup", handleMovementKeyUp, true);
        window.removeEventListener("blur", clearUserMoveKeys);
        root.remove();
        danger.remove();
        style.remove();
      }

      function snapshot() {
        const me = getMe();
        const enemies = me ? richEnemies(me, RICH_ENEMY_SCAN_CM) : [];
        const drop = me && !runner.combatMode && !runner.huntMode ? nearestDrop(me, enemies) : null;
        const threat = enemies[0] || runner.lastThreat;
        const manual = runner.manualTarget;
        const huntLabel = runner.huntMode
          ? ("HUNT " + (runner.huntTargetName || (runner.huntLastSeen && runner.huntLastSeen.name) || runner.huntQuery || "-"))
          : "";
        return {
          running: runner.running,
          combatMode: runner.combatMode,
          huntMode: runner.huntMode,
          huntQuery: runner.huntQuery,
          huntTargetId: runner.huntTargetId,
          huntTargetName: runner.huntTargetName || (runner.huntLastSeen && runner.huntLastSeen.name) || "",
          huntLastSeen: runner.huntLastSeen,
          combatRisk: runner.combatRisk,
          combatProjectiles: runner.combatProjectiles,
          combatTargets: runner.combatTargets,
          combatManualOverride: runner.combatManualOverride,
          autoFireMode: runner.autoFireMode,
          autoFireStatus: runner.autoFireStatus,
          autoFireTarget: runner.autoFireTarget,
          autoFireShots: runner.autoFireShots,
          attackLockUserId: runner.attackLockUserId,
          attackLockName: runner.attackLockName,
          attackLockStatus: runner.attackLockStatus,
          hp: me && me.hp,
          life: me && me.life,
          balance: me && me.external_balance_snapshot,
          value: me && me.coin_value_snapshot,
          delta: runner.deltaBalance,
          leaves: runner.leaves,
          avoidances: runner.avoidances,
          target: huntLabel || (manual ? (manual.x + "," + manual.y) : runner.targetId),
          nearest: drop ? Math.round(drop.dist) : "-",
          targetScore: runner.targetScore ? runner.targetScore.toFixed(3) : "-",
          routeCount: runner.routeIds ? runner.routeIds.length : 0,
          routeKind: runner.routeKind || "",
          routeValue: runner.routeValue || 0,
          routeTravelSeconds: runner.routeTravelSeconds || 0,
          moveMode: runner.lastMoveMode,
          manualTarget: manual ? { x: manual.x, y: manual.y } : null,
          threat: threat ? {
            name: threat.name || "unknown",
            drop: threat.dropForAvoid ?? threat.drop,
            dist: Math.round(threat.dist)
          } : null,
          stamina5s: me && Math.round((me.stamina_5s_remaining_milli || 0) / 1000),
          stamina1h: me && Math.round((me.stamina_1h_remaining_milli || 0) / 1000),
          action: runner.lastAction,
          error: runner.lastError
        };
      }

      function renderStatus() {
        monitorStoppedDamage();
        const s = snapshot();
        scheduleEntryDropLeaderboardRefresh();
        renderAttackLockList(getMe());
        root.classList.toggle("running", !!s.running);
        ui.mode.textContent = s.combatMode ? "COMBAT" : s.huntMode ? "HUNT" : (s.running ? "ACTIVE" : "STANDBY");
        ui.action.textContent = s.error ? ("ERROR: " + s.error) : (s.action || "等待指令");
        ui.hp.textContent = s.hp ? String(s.hp) : "--";
        ui.gain.textContent = "+" + (s.delta || 0);
        ui.target.textContent = s.combatMode ? "COMBAT" : s.huntMode ? ("HUNT " + (s.huntTargetName || s.huntQuery || "-")) : (s.target ? String(s.target) : "--");
        ui.move.textContent = s.moveMode || "idle";
        ui.threat.textContent = s.combatMode
          ? ((s.combatManualOverride ? "手动 / " : "") + "弹体 " + s.combatProjectiles + " / 标记 " + s.combatTargets + " / " + s.combatRisk)
          : s.threat
          ? (s.threat.name + " / " + s.threat.dist + "cm / Drop " + s.threat.drop)
          : s.autoFireMode
          ? ("射击 " + (s.autoFireTarget || "-") + " / " + s.autoFireStatus)
          : "clear";
        ui.stamina.textContent = "5s " + (s.stamina5s ?? "--") + " / 1h " + (s.stamina1h ?? "--");
        ui.safety.textContent = "LEAVE " + s.leaves + " / EVADE " + s.avoidances;
        ui.status.textContent = s.combatMode
          ? ("COMBAT / " + (s.combatManualOverride ? "MANUAL / " : "") + "BULLETS " + s.combatProjectiles + " / TARGETS " + s.combatTargets
            + (s.autoFireMode ? " / FIRE " + s.autoFireStatus : ""))
          : s.huntMode
          ? ("HUNT / QUERY " + (s.huntQuery || "-") + " / TARGET " + (s.huntTargetName || "-")
            + (s.autoFireMode ? " / FIRE " + s.autoFireStatus : ""))
          : "BAL " + (s.balance ?? "--")
            + " / VALUE " + (s.value ?? "--")
            + " / NEAREST " + s.nearest
            + " / ROUTE " + (s.routeKind || "single") + ":" + (s.routeCount || 0)
            + " / SCORE " + s.targetScore
            + (s.autoFireMode ? " / FIRE " + s.autoFireStatus : "");
        ui.combat.classList.toggle("active", !!s.combatMode);
        ui.combat.textContent = s.combatMode ? "交战 ON" : "临时交战";
        ui.autoFire.classList.toggle("active", !!s.autoFireMode);
        ui.autoFire.textContent = s.autoFireMode ? "攻击 ON" : "自动攻击";
        ui.hunt.classList.toggle("active", !!s.huntMode);
        ui.hunt.textContent = s.huntMode ? "追杀 ON" : "追杀";
      }

      runner.start = start;
      runner.stop = stop;
      runner.destroy = destroy;
      runner.leave = reason => clickLeave(reason || "manual");
      runner.setCombatMode = setCombatMode;
      runner.setHuntMode = setHuntMode;
      runner.setAutoFireMode = setAutoFireMode;
      runner.setManualTarget = setManualTarget;
      runner.clearManualTarget = clearManualTarget;
      runner.status = snapshot;

      window.addEventListener("contextmenu", handleContextMenu, true);
      window.addEventListener("keydown", handleMovementKeyDown, true);
      window.addEventListener("keyup", handleMovementKeyUp, true);
      window.addEventListener("blur", clearUserMoveKeys);
      ui.start.addEventListener("click", start);
      ui.stop.addEventListener("click", () => stop("manual"));
      ui.combat.addEventListener("click", toggleCombatMode);
      ui.autoFire.addEventListener("click", toggleAutoFireMode);
      ui.hunt.addEventListener("click", toggleHuntMode);
      ui.huntQuery.addEventListener("keydown", event => {
        if (event.key === "Enter") {
          event.preventDefault();
          setHuntMode(true, "enter");
        }
      });
      ui.leave.addEventListener("click", () => clickLeave("manual"));
      ui.dropList.addEventListener("click", handleDropLeaderboardClick);
      ui.attackList.addEventListener("click", handleAttackListClick);
      ui.collapse.addEventListener("click", () => {
        root.classList.toggle("collapsed");
        ui.collapse.textContent = root.classList.contains("collapsed") ? "SHOW" : "HUD";
      });

      runner.statusTimer = window.setInterval(renderStatus, 500);
      runner.sidebarSafetyTimer = window.setInterval(checkHourlyStaminaLimitLeave, 1000);
      runner.dropLeaderboardTimer = window.setInterval(renderDropLeaderboard, DROP_LEADERBOARD_REFRESH_MS);
      startLineLoop();
      checkHourlyStaminaLimitLeave();
      renderDropLeaderboard();
      renderStatus();
    }
  }
})();
