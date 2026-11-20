# 2026-11-20｜舊版 Arcade 入口相依稽核（安全停止紀錄）

## 結論：本 PR 不修改兩個舊入口 HTML

從 `main=3857aa23d11d6efcc4886df9a3e089d3fc4e6011` 掃描了 repository tree 的 **41 個 HTML** 與 `scripts/` 內 **110 個 JS/MJS/CJS/PY 測試或建置程式**，另檢查 `arcade/assets/hub.js`、`arcade/assets/shooter-bridge.js`、`arcade/{zh,ja}/shooter.html` 的 G02 iframe 流程。

**硬性相依：** `scripts/build.mjs` 的 `makePlay(lang, source, c)` 直接用 `arcade/{zh,ja}/index.html` 作為正式 `{zh,ja}/play.html` 的來源模板（第 86–109 行），僅以字串取代、加 base／卡片等方式生成。若在舊 HTML 的 `<head>` 直接加入 `location.replace(...)`，下一次 `node scripts/build.mjs` 會把同一段跳轉繼承到正式 PLAY，形成正式頁自動重導／不可操作風險；此外 `node scripts/build.mjs --check` 的來源一致性會成為問題。

### 直接進入舊頁的測試／截圖相依

- `scripts/smoke.mjs`、`scripts/smoke-arcade.mjs`、`scripts/smoke-friends-entry-v16.mjs`
- `scripts/smoke-arcade-art.mjs`、`scripts/smoke-arcade-audio.mjs`、`scripts/smoke-arcade-controls.mjs`、`scripts/smoke-arcade-performance.mjs`、`scripts/smoke-arcade-session.mjs`、`scripts/smoke-arcade-visual.mjs`
- `scripts/smoke-g02-mobile.mjs`、`scripts/smoke-g06-racing.mjs`、`scripts/smoke-gameplay-campaign.mjs`、`scripts/smoke-guardian-art.mjs`
- `scripts/capture-arcade-rc.mjs`、`scripts/capture-arcade-visual.mjs`、`scripts/capture-g06-sequences.mjs`
- `scripts/lib/friends-browser.mjs` 和 `scripts/lib/` 其他通用開頁 helper 應在遷移時一起檢查其預設入口，避免只改呼叫端。
- `listen.html?page=arcade/zh/index.html` 被音樂／session 測試使用；轉址可能改變嵌入與音效測試語義。

### HTML 與 iframe 分界

- `arcade/{zh,ja}/index.html` 仍有指回舊網址的 canonical／hreflang／導覽，且是上述模板來源，因此這批**不修改 canonical 或嵌入重導**。
- `content/{zh,ja}/play.html` 保有舊 Arcade 連結文案／來源參照；`arcade/qa/friends-v16/index.html` 存在舊式返回連結，不能在未核對用途前全面取代。
- G02 實際 iframe 由 `arcade/assets/hub.js` 載入 `../{lang}/shooter.html`，對應 `arcade/{zh,ja}/shooter.html` 與 `arcade/assets/shooter-bridge.js`；`PLAY` 的 `<base href="../arcade/{lang}/">` 使此相對路徑保持一致。**G02 引擎本身不需要舊 `index.html` 作為 iframe 子頁**，但眾多瀏覽器回歸仍使用舊 index 頁作啟動入口。
- 本次不刪除舊 HTML、不更改 G02 iframe／引擎、不修改正式主站或 Beta 部署設定。

## 建議後續單獨 PR

1. 將「遊戲中心 HTML 源模板」從「舊的公開 URL」拆分，讓 `scripts/build.mjs --check` 仍能精確驗證兩語 PLAY。
2. 將使用舊 index 的 smoke／capture／嵌入音樂測試移至新的 PLAY，或明確保留只屬內部 QA 的原版 fixture。
3. 驗證 G02 iframe、六款遊戲與音效以及 `?game=g06`／`?hero=3`／hash 的保留。
4. 確認不會產生迴圈後，才在**舊公開 URL** 加 canonical 與保留 query/hash 的 `location.replace`；再跑六項 CI／部署後實測。

## 事件語義（本 PR 純前端收斂）

- `arcade_game_finish`：正式遊戲結束漏斗事件，`outcome` 僅使用 `win`／`loss`；原有引擎用 win/loss，G02 iframe 傳回 `victory` 時只在此事件轉成 `win`。
- `game_completed`：原始遊戲通關／結算事件（含 `final_score` 等歷史參數），G02 由 iframe 轉送，保留舊 `victory` 欄位以免破壞相依；**不可把 `game_completed` 和 `arcade_game_finish` 次數加總成遊戲完成數**。
- `language`：`arcade/assets/hub.js` 用 `language:currentLocale`，`assets/protocol-engine.js` 用 `language:lang`，值域均為 `zh`／`ja`。這只能驗證前端 `dataLayer`，不代表 GTM 的 GA4 參數映射已正確；本 PR 不修改 GTM／GA4。
- `quiz_started`：每次按「開始」新問卷送一次，上一題不新開 session；`quiz_completed`：只有當八題完成且之前未完成時送一次；重做重新開始一輪。
