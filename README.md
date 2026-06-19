# Grasp Rat Gold Runner

给 Grasp Rat Game 写的篡改猴 userscript（用户脚本）。

不止会呆呆吃金币，还可以当高达开！

想挂机？自动巡航吃金币！  怕挨打？敌人靠近自动跑！

快似了？濒死自动当逃兵！  想猛攻？交战模式自动闪避+火控自瞄！（自瞄目前还不好用Orz）

游戏入口：`https://grasp-rat-game.h-e.top/`

原始玩法请见主帖：`https://linux.do/t/topic/2290514`


## 安装

搭配 Tampermonkey（篡改猴）使用：`https://www.tampermonkey.net/`

安装脚本位于[dist/grasp-rat-gold-runner.user.js](https://github.com/jzcangshu/grasp-rat-gold-runner/blob/main/dist/grasp-rat-gold-runner.user.js)。

------

## 核心功能玩法（一定要看哦）

### 1. 自动挂机吃金币

脚本会持续扫描金币，并自动规划一小段效率最高的顺路路线。

规划时会同时考虑：

- 金币金额和距离。
- 附近有没有金币团。
- 连续吃多个金币是不是会少走回头路。
- 路线附近有没有高 Drop 敌人。
- 当前目标是否还值得继续追。

### 2. 危险规避

游戏里黄色 `Drop` 数代表敌人死亡后可能掉落的金币。本脚本以此来分辨僵尸玩家（因为不活跃而被迫加入战场的佬友）和活跃玩家（可能有攻击性），并据此规避潜在危险玩家。

- 以 170m 作为危险缓冲区（略大于子弹射程范围）。
- Drop 大于 10 的~资产阶级~敌人会被当作高风险目标。
- Drop 不高但最近 10 秒曾移动过的敌人，进入 170m 也会触发紧急远离。

常态巡航下，如果被左右夹击实在躲不开挨打了，脚本会自动退出游戏当怯战蜥蜴。

另外，当触发游戏的 `1h体力限制` 时，也会自动离开。

### 3. 猛攻模式（临时交战前开启）

常态巡航吃金币模式下，脚本会自动规避危险敌人，所以特意为猛攻哥开发了这个战斗辅助模式。
开启后，金币巡航会暂停，脚本进入战斗辅助状态（此模式依旧支持手动操控）：

- 识别游戏弹体，按弹体起点、方向、速度和游戏 tick（游戏刻）预测轨迹。
- 选择尽量远离弹道的移动方向，但不会和你的 WASD 手动输入抢控制权。
- 趁弹体压力较低时，把你和近身敌人的距离拉回 100-150m。
- 给 170m 内血量低于你的敌人头上画红色倒三角。
- 血量较低时加重红色呼吸灯提醒。
- HP 不超过 9 时立即点击“离开”脱战。

战斗中受伤是正常的！所以它不会复用常态巡航的“HP 一掉就逃跑”规则。

### 4. 自动攻击（默认关闭）

- 屏幕左上角为“自动攻击”功能区，支持锁定攻击对象（若未锁定则自动攻击最近&HP最低的敌人）。

- 开启后，脚本会根据目标移动轨迹、距离和估算子弹速度做短时预判。
- 攻击方法为长按连发覆盖：每组压住鼠标发 5-8 发，让远距离目标附近形成更密的弹幕覆盖（说人话就是更难躲）。
- `ATTACK BUFFER` 列表会显示 170m 内敌人的用户名、HP 和距离，点击锁定攻击对象！

### 5. 辅助移动方式：“追杀模式”与“一键前往”

地图太大了，对于真人玩家来说跑图真的很累，所以我开发了两种辅助移动模式！

#### 追杀模式
- 页面的左下角会列出本局游戏中金币数最高的五位玩家，你可以点击复制其用户名，然后用“追杀”开关自动追击！

- 支持输入用户名片段并开启“自动追杀”。匹配后会根据目标最近运动轨迹做短时预判并追赶。

#### 一键前往（右键选点）

- 你可以在游戏画布上右键单击，设置一个临时前往坐标（类似LOL）。右键目标优先于金币巡航，但低于受伤离开、死亡停止、体力检查和必要的安全规避。

## 连线指示器

- 灵感来自于吃鸡外挂，可以帮助玩家识别潜在危险玩家

- 金色线指示当前脚本的行进目标；
- 蓝色线标记视野范围内有潜在威胁的敌人（僵尸玩家不会被标记）；
- 红色线标记 170m 内（略大于射程范围）危险敌人。

------

## 项目结构

```text
grasp-rat-gold-runner/
  src/
    grasp-rat-gold-runner.user.js   # 源码，开发改这里
  dist/
    grasp-rat-gold-runner.user.js   # 发布版，安装到篡改猴用这里
  docs/
    behavior.md                     # 详细行为规则和优先级
    install.md                      # 安装说明
    development.md                  # 开发与发布流程
    changelog.md                    # 版本记录
  scripts/
    sync-dist.ps1                   # 同步 src 到 dist
    release-check.ps1               # 发布前检查
  AGENTS.md                         # 给后续 agent 的项目手册
```

## 开发

改功能时优先改 `src/grasp-rat-gold-runner.user.js`。发布前同步到 `dist`：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\sync-dist.ps1
```

语法检查：

```powershell
node --check .\src\grasp-rat-gold-runner.user.js
node --check .\dist\grasp-rat-gold-runner.user.js
```

完整发布检查：

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File .\scripts\release-check.ps1
```

## 给下一位维护者

这个项目最容易踩坑的地方不是语法，而是各个自动化层的优先级：

- 生命安全高于移动目标。
- 临时交战高于金币巡航。
- 自动攻击是独立火控层，不应该改变移动分支。
- 连线和倒三角必须使用游戏原生坐标换算，不能按屏幕中心硬猜。
- Drop 判断只能看黄色 Drop 对应字段，不能用账户金币字段。

详细规则请先读 `AGENTS.md` 和 `docs/behavior.md`，再动源码。

---

## 🔗 LinuxDo 社区

<div align="center">
  <a href="https://linux.do" target="_blank">
    <img src="https://cdn3.ldstatic.com/original/4X/c/c/d/ccd8c210609d498cbeb3d5201d4c259348447562.png" alt="LinuxDo" height="60">
  </a>
  <p>
    <a href="https://linux.do" target="_blank"><strong>LinuxDo 社区</strong></a><br>
  </p>
    <p>@蕉灼の仓鼠</p>
    <p>本人长期活跃于L站;</p>
    <p>这里的人很好说话又好听;</p>
    <p>欢迎都来加入L站大家庭。 </p>

</div>
