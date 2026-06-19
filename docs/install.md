# 安装与更新

## 手动安装到篡改猴

1. 打开 Chrome 的篡改猴管理面板。
2. 新建脚本。
3. PC 版粘贴 `dist/grasp-rat-gold-runner.user.js`；手机端粘贴 `dist/grasp-rat-gold-runner-mobile.user.js`。
4. 保存。
5. 打开或刷新 `https://grasp-rat-game.h-e.top/`。

## 更新现有脚本

1. 打开篡改猴里的 `Grasp Rat Gold Runner`。
2. PC 版用 `dist/grasp-rat-gold-runner.user.js` 覆盖；手机端用 `dist/grasp-rat-gold-runner-mobile.user.js` 覆盖。
3. 保存。
4. 刷新游戏页面。

## 为什么 agent 不能总是直接安装

Chrome 对 `chrome-extension://...` 扩展后台页面有安全限制。agent 可以打开 userscript 安装中转页，但通常不能自动点击篡改猴内部页面的保存/安装按钮。

如果自动安装失败，用户需要手动在篡改猴里保存脚本。

