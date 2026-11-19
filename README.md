# PhishGuard · 二次元看板娘钓鱼检测

一个纯本地的钓鱼网址检测工具：3 位二次元看板娘（小樱 / 薄荷 / 天蓝）替你把网址拆成 12 项特征，
给出 0–100 的风险评分和逐条依据。所有分析都在浏览器里完成，**不联网、不上传网址**。

同一套检测引擎与视觉同时提供两种形态：

| 形态 | 位置 | 适用 |
| --- | --- | --- |
| 网页版 | `index.html` | 双击即用，任何现代浏览器 |
| 浏览器插件（Chromium） | `extension/chromium/` | Chrome / Edge / Vivaldi，Manifest V3 |
| 浏览器插件（Firefox） | `extension/firefox/` | Firefox 109+，Manifest V3 |
| 浏览器插件（Firefox 旧版） | `extension/firefox-mv2/` | Firefox 78–108，Manifest V2 |

插件弹窗固定 380×560，打开时会自动读取当前标签页的网址并立即检测。

---

## 一、快速开始

### 1. 网页版

直接双击 `index.html`。无需安装、无需服务器；断网也能检测（只有字体走网络，加载失败会自动回退到系统字体）。

### 2. Chrome / Edge / Vivaldi（MV3）

1. 打开扩展管理页：
   - Chrome：`chrome://extensions`
   - Edge：`edge://extensions`
   - Vivaldi：`vivaldi://extensions`
2. 打开右上角的 **开发者模式**。
3. 点击 **加载已解压的扩展程序**，选择 `extension/chromium` 文件夹（选到这一层，不要选 `extension/` 或 `extension/shared/`）。
4. 在工具栏的拼图菜单里把 **PhishGuard 看板娘钓鱼检测** 固定出来，点击图标即可弹出面板。

> Chrome 88 及以上可用。若提示清单错误，请确认选择的是 `extension/chromium`，该目录下必须有 `manifest.json`。

### 3. Firefox 109 及以上（MV3）

1. 地址栏输入 `about:debugging#/runtime/this-firefox`。
2. 点击 **临时载入附加组件…**。
3. 选择 `extension/firefox/manifest.json`。
4. 图标会出现在工具栏；临时载入的扩展在重启浏览器后失效，需要重新载入（正式安装需签名，见下方说明）。

### 4. Firefox 78–108（MV2 兼容包）

步骤同上，但选择 `extension/firefox-mv2/manifest.json`。

> 为什么单独做了一个 MV2 目录：Firefox 的 MV3 不接受 `browser_action`，而 MV2 只认 `browser_action`。
> 两个清单不能共存于同一目录，所以拆成 `firefox/`（MV3）与 `firefox-mv2/`（MV2）。功能完全一致。
>
> 想在 Firefox 里长期保留（非临时载入）：需要自行用 `web-ext sign` 或 AMO 签名；开发阶段也可在
> `about:config` 里把 `xpinstall.signatures.required` 设为 `false`（仅限 Firefox Developer Edition / Nightly）。

---

## 二、12 项检测与评分

命中即计分，单项权重固定；总分累加后 **上限 100**。

| # | 检查项 | 判定条件 | 命中 |
| --- | --- | --- | --- |
| 1 | URL 长度 | 超过 100 字符 / 超过 75 字符 | +30 / +15 |
| 2 | IP 地址主机 | 主机名是 IPv4 / IPv6 字面量 | +30 |
| 3 | @ 符号混淆 | 网址中出现 `@`（浏览器会忽略 `@` 前的部分） | +30 |
| 4 | HTTPS 加密 | 使用 `http://`，或输入未写协议 | +15 |
| 5 | 子域名层数 | 子域名超过 3 层（`a.b.c.d.example.com`） | +15 |
| 6 | 短链接跳转 | 命中内置短链服务名单（bit.ly、t.cn 等 14 个） | +15 |
| 7 | 特殊字符占比 | 路径与参数里 `-_=?&%#~+` ≥ 8 个且占比 ≥ 15% | +15 |
| 8 | 域名数字占比 | 域名主体数字 ≥ 3 个且占比 ≥ 30% | +15 |
| 9 | 高风险顶级域名 | `.xyz .top .club .info .work .icu .buzz .wang .tk .pw` | +15 |
| 10 | 品牌仿冒 | 域名含品牌词，但不是该品牌官方域名（15 个品牌） | +30 |
| 11 | 路径双斜杠 | 路径中出现 `//`，可能用于跳转或绕过校验 | +15 |
| 12 | 域名年龄 | 纯前端无法查询注册时间，标 **不适用**，不计分 | 0 |

**等级**：0–30 安全（绿） / 31–60 可疑（琥珀） / 61–100 危险（珊瑚红）。

> 补充规则：单项 +30 的高危特征单独命中时，分数只有 30，会落进「安全」区间，语义上不合理。
> 因此只要有任意高危项命中，等级至少提升为**可疑**（分数不变）。

第 10 项的品牌词按 `.` `-` `_` 切分后比对，并先校验官方域名白名单，
所以 `www.apple.com`、`paypal.me` 不会误报，而 `apple-id-verify.xyz` 会命中。
内置品牌：PayPal、Apple、Google、淘宝、支付宝、工商银行、微信、QQ、京东、Amazon、
Microsoft、Netflix、Steam、银行类（中行 / 建行 / 农行 / 招行 / 交行 / 光大 / 邮储 等）。

> 评分是**特征加权总分**，表示「这个网址有多像钓鱼站」，不是被攻击的概率，也不是杀毒引擎结论。

---

## 三、界面与角色

- **3 位看板娘**：小樱（元气担当 / 樱粉双马尾）、薄荷（冷静担当 / 薄荷绿短发 + 发箍）、
  天蓝（认真担当 / 天蓝长发 + 大蝴蝶结）。右上角或结果面板底部可随时切换，选择会记住。
- **预设聊天**：右下角气泡按钮打开对话面板，内置「什么是钓鱼网站 / 分数怎么算 / HTTPS 就一定安全吗 /
  域名怎么判断 / 你是谁 / 数据会被上传吗」等问答，回答随当前角色与最近一次检测结果变化。
- **主题**：樱粉 / 薄荷 / 天蓝三套配色，顶栏圆点一键切换。
- **音效**：可开关的检测提示音（Web Audio 合成，无音频文件）；首次交互后才发声。
- **历史**：本地保留最近 40 条检测记录，显示分数、等级、网址与时间；支持单条删除与「清空全部」（需点两次确认）。
- **立绘**：透明底 PNG。弹窗与网页版都用 5:7 全身立绘，按情绪切换 neutral / happy / sad 三层；
  弹窗里人物完整站在卡片右侧，角色切换按钮、聊天头像使用同角色的圆头像。
- **动效**：待机呼吸、表情切换、思考态旋转星环；危险结果会让看板娘抖一下。
  已尊重 `prefers-reduced-motion`，系统开启「减少动态效果」时自动收敛动画。

---

## 四、目录结构

```
PhishGuard-看板娘钓鱼检测/
├── index.html                  # 网页版（CSS / JS 全部内联，图片走 assets/）
├── assets/chara/               # 网页版角色 PNG
├── README.md
├── src/                        # 源码与拼装脚本（二次开发用）
│   ├── core.js                 # 检测引擎 + 看板娘渲染 + 台词 + 存储
│   ├── assets/chara/           # 角色 PNG：全身立绘（含表情）/ 圆头像
│   ├── ui-common.js            # 主题 / 评分环 / 数字滚动 / 音效 / 历史行
│   ├── web.js                  # 网页版交互
│   ├── popup.js                # 插件版交互
│   ├── style.css               # 全部样式（两版共用）
│   ├── web-body.html           # 网页版结构
│   ├── popup-body.html         # 弹窗结构
│   ├── manifest.mv2.json       # MV2 清单源
│   └── build.py                # 拼装脚本
└── extension/
    ├── chromium/               # Chrome / Edge / Vivaldi（MV3）
    │   ├── manifest.json
    │   ├── background.js       # 首次安装写入默认偏好
    │   ├── popup.html / popup.css / popup.js
    │   └── icons/              # 16 / 48 / 128 PNG
    ├── firefox/                # Firefox 109+（MV3）
    ├── firefox-mv2/            # Firefox 78–108（MV2）
    └── shared/                 # 与两版完全一致的公共副本，便于比对
```

`index.html` 与各 `popup.js` 是**拼装产物**，不要直接改：修改 `src/` 后执行

```bash
cd "PhishGuard-看板娘钓鱼检测/src"
python3 build.py
```

会重新生成 `index.html`、`extension/*/popup.*` 与 `firefox-mv2/`，保证三个版本的检测引擎逐字节一致。

---

## 五、隐私与权限

- **不发起任何网络请求**：没有 Whois、没有云端评分、没有埋点。断网时检测照常工作。
- 网页版历史存在 `localStorage`（键 `phishguard.history.v1`），插件版存在 `chrome.storage.local` / `browser.storage.local`。
- 插件只申请 `tabs`、`activeTab`、`storage`：`tabs` 用于读取当前标签页网址并填入输入框，`storage` 存主题 / 角色 / 音效 / 历史。
  **不申请 `<all_urls>`，不注入脚本、不修改页面、不拦截访问**。
- 卸载扩展或清除扩展数据即可彻底删除历史。

---

## 六、已知限制

1. **域名年龄不可得**：第 12 项需要 Whois，纯前端做不到，因此固定标「不适用」且不计分（关于弹窗里也写明了）。
2. **只做静态特征判断**：不是实时黑名单，也不是沙箱；仿冒域名做得足够干净时可能得低分。
3. **品牌词表有限**：未收录的品牌不会被判仿冒，可按下方方式自行扩充。
4. **不拦截页面**：本工具只回答「像不像钓鱼站」，不会替你关闭网页或阻止提交表单。
5. **无协议时按 http 处理**：输入 `example.com` 会补成 `http://` 并命中第 4 项，这是刻意的保守策略。

---

## 七、二次开发

| 想改什么 | 改哪里 |
| --- | --- |
| 配色 / 圆角 / 字号 | `src/style.css` 顶部的 `:root` 与 `[data-theme]` 三段 |
| 品牌词与官方域名 | `src/core.js` 的 `BRANDS` |
| 短链服务 / 高风险 TLD | `src/core.js` 的 `SHORT_LINKS`、`RISKY_TLDS` |
| 12 项判定阈值与权重 | `src/core.js` 的 `analyze()`，每个 `push(...)` 一处 |
| 看板娘台词 | `src/core.js` 的 `LINES`（按角色 × 情绪） |
| 立绘 | 替换 `src/assets/chara/` 下的 PNG；`src/core.js` 的 `charSVG()` 控制弹窗/网页版取图 |
| 弹窗尺寸 | `src/style.css` 的 `.mode-popup` 与 `body` 宽高 |

改完记得跑一次 `python3 build.py`。

---

## 八、兼容性说明

- 检测和界面只用原生 JS 与标准 DOM API，无框架、无外部依赖、无内联脚本，符合 MV3 的 CSP 要求。
- 扩展代码统一走 `browserAPI` 兼容层（`chrome.*` 与 `browser.*` 自动选择），没有直接写 `chrome.`。
- Chromium 版为 `action` + `service_worker`；Firefox 版为 `action` + `background.scripts`，
  并带 `browser_specific_settings.gecko.id = phishguard@doubao.app`，满足 Firefox 对 MV3 的清单要求。
- 插件版刻意不使用远程字体（避免离线与 CSP 问题），统一走系统字体栈；网页版才会加载 ZCOOL KuaiLe 等字体。

---

## 九、常见问题

**加载时提示「清单文件缺失或不可读」**
确认选中的目录里直接有 `manifest.json`：Chromium 选 `extension/chromium`，Firefox 选 `extension/firefox`
（旧版选 `extension/firefox-mv2`）。

**点图标没有反应 / 弹窗空白**
先看扩展管理页有没有报错；再确认 `popup.html`、`popup.css`、`popup.js`、`icons/` 是否与该清单在同一目录。

**Firefox 提示「扩展未验证」**
临时载入（about:debugging）不受影响；要长期安装需要签名，或使用 Developer Edition / Nightly 关闭签名校验。

**评分和别的工具不一样**
本工具是 12 项静态特征的加权分，不是云端黑名单比对，口径不同属正常。
