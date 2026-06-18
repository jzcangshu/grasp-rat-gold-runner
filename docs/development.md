# 开发与项目管理

## 分支与提交

- 默认主分支：`main`
- 每次功能或修复完成后提交一次清晰 commit。
- 提交前不要包含 `.env`、令牌、Cookie、localStorage 导出或浏览器配置文件。

## 版本流程

1. 修改 `src/grasp-rat-gold-runner.user.js`。
2. 更新 userscript 头部 `@version` 和 `package.json` 版本。
3. 更新 `docs/changelog.md`。
4. 同步发布版：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync-dist.ps1
```

5. 执行发布检查：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\release-check.ps1
```

6. 提交并推送：

```powershell
git status --short
git add .
git commit -m "..."
git push
```

## UI 性能规则

- HUD 使用普通半透明背景，不使用 `backdrop-filter` 或 `-webkit-backdrop-filter`。
- 连线和标记继续使用单个透明 canvas（画布）绘制。
- 不要把连线实现改回大量 DOM 或 SVG 重建。

## 发布文件

- `src/grasp-rat-gold-runner.user.js` 是开发源文件。
- `dist/grasp-rat-gold-runner.user.js` 是给篡改猴安装的发布文件。
- 发布前两者必须完全一致。
