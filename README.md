# Grasp Rat Gold Runner

一个用于 `https://grasp-rat-game.h-e.top/` 的篡改猴 userscript（用户脚本）。

目标是自动吃金币，同时在危险情况下规避敌人，并在受伤或低血量时点击“离开”脱战。

## 当前状态

- 当前脚本版本：`1.6.14`
- 源码入口：`src/grasp-rat-gold-runner.user.js`
- 发布脚本：`dist/grasp-rat-gold-runner.user.js`
- 原临时产物保留在旧会话目录，后续迭代以本项目为准。

## 功能概览

- 自动规划金币路线，不只追最近金币。
- 路线评分综合金币金额、连续多个金币之间的路程、附近金币密度、富敌安全距离、路径中点安全性和少走回头路。
- 视野 250m 内有黄色 `Drop` 数量大于 10 的敌人时，避免靠近其 200-250m 内危险区。
- 170m 紧急逃离只针对黄色 `Drop` 大于 10 的敌人，或 `Drop` 不超过 10 但最近 10 秒内移动过的敌人。
- 实时显示导航线：金色线指向当前目标，蓝色线指向 500m 内 Drop 大于 0 的敌人，红色线指向 170m 内 Drop 大于 0 的敌人。
- 连线层使用透明 canvas（画布）和 requestAnimationFrame（浏览器帧同步）绘制，减少 SVG DOM 重建导致的卡顿。
- 连线器和倒三角标记复用游戏原生 `worldToScreen`（世界到屏幕）换算，再按 HUD 右侧场景区裁剪显示，避免左侧官方面板造成整体偏移。
- 常态模式真正受到伤害后，直接点击“离开”脱战，不再传送。
- 左侧官方栏出现 `1h体力限制` 时，自动点击“离开”退出游戏。
- HUD（抬头显示）避开游戏左侧官方面板，自适应显示在右侧游戏场景区域。
- HUD 使用普通半透明背景，不使用 `backdrop-filter`（背景滤镜）毛玻璃，以减少渲染开销。
- HUD 增加 `DROP TOP 5` 全场排行榜，每 30 秒合并实体列表和 minimap（小地图）全场点，刷新 Drop 数最高的 5 名玩家；点击用户名可复制到剪贴板。
- 在游戏画布上点击鼠标右键，可以设置手动坐标目标并自动前往。
- 支持“自动追杀”：输入用户名片段后模糊匹配目标，按目标当前速度或最近运动轨迹做短时预判并自动追赶。
- 左下角“临时交战”开关会暂停金币巡航，禁用所有连线器，按游戏弹体的起点、方向、速度和 tick（游戏刻）预测弹道，并标记 170m 内低血敌人。
- 手动开启临时交战模式时会自动取消已有右键目的地；交战中再次右键仍可设置新的临时目标。
- 临时交战模式允许受伤，不触发常态全局受击离开；只有 HP 不超过 9 才立即点击“离开”脱战。
- 临时交战中右键坐标目标优先于自动远离危险敌人。
- 临时交战中手动 WASD/方向键输入优先，自动躲避不会和手动移动抢方向。
- 临时交战中自身血量低于近身敌人 15% 以上时显示红色呼吸灯；HP 不超过 25 时加强呼吸灯；HP 低于 22 时提高检测频次；HP 不超过 9 时立即点击“离开”脱战。

## 安装/更新

1. 打开篡改猴。
2. 新建脚本或编辑现有 `Grasp Rat Gold Runner`。
3. 使用 `dist/grasp-rat-gold-runner.user.js` 的内容覆盖保存。
4. 刷新游戏页面。

由于 Chrome 安全策略，agent 通常不能直接操作 `chrome-extension://...` 的篡改猴后台页面。若需要安装到扩展里，通常需要用户在篡改猴页面完成最后的保存确认。

## 开发

检查语法：

```powershell
node --check .\src\grasp-rat-gold-runner.user.js
node --check .\dist\grasp-rat-gold-runner.user.js
```

发布时同步源码到发布版：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync-dist.ps1
```

发布前完整检查：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\release-check.ps1
```

## 目录

```text
grasp-rat-gold-runner/
  AGENTS.md
  README.md
  src/
    grasp-rat-gold-runner.user.js
  dist/
    grasp-rat-gold-runner.user.js
  docs/
    behavior.md
    install.md
    changelog.md
    development.md
  scripts/
    release-check.ps1
    sync-dist.ps1
```
