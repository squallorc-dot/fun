# Bio-City Arcade — 六款網頁遊戲正式入口（第一版可玩合集）

`arcade/zh/index.html`／`arcade/ja/index.html`。保留原本站 `zh/play.html`、`ja/play.html` 的 8 題情境決策分析與城市防衛戰。

## 六款遊戲
- G01：原創 2.5D 橫向格鬥。七組英雄、四種敵人使用實際 PNG 逐格圖集；包含三段連擊、命中幀、輸入緩衝、受擊中斷、閃避取消及三招式二階段 Boss。
- G02：整合既有守護者城市防衛戰引擎，保留三波和七英雄。
- G03：極限下樓梯，碰撞、移動平台、易碎平台、陷阱、深度目標。
- G04：能源彈珠競技，角度、力道、真實碰撞與反彈、射擊次數、破壞目標。
- G05：排球與桌球雙模式，分開處理跳躍、球體重力與桌球拍反彈，先得目標分數獲勝。
- G06：擬 3D 街機賽車，路線、加速、煞車、障礙、三圈及倒數。

## 系統
- 共用六首存量歌曲的 OST 控制、音量、循環、開始遊戲播放偏好。六首為候選；授權與商用條款仍須逐首確認。
- 音效獨立音量；瀏覽器不允許自動播放時由玩家自行啟動。切換到背景分頁即暫停。
- localStorage 儲存本機最高分與偏好，不建立帳號。共用 `window.dataLayer`，使用網站現有 GTM 容器。
- 遊戲戰鬥在固定視窗內，電腦鍵盤與手機觸控各有專用控制，免受網站捲軸干擾。

## 現階段品質界線
六款皆具備開始、操作、勝／敗判定、結算、重試。G01 已替換為原創向量原稿產生的 PNG 逐格圖集，每組 71 格、12 類動作；七位英雄外觀也接入新大廳的 G02。G01–G06 的最終美術、難度與手感仍需真人和真機驗收，沒有將工程測試視為 LF2 同級成品的人工認證。G02 在原網站獨立遊玩的既有行為保留。

動作驗收頁：`arcade/qa/animation-lab.html`（本機啟動 HTTP server 後開啟，未公開）；實際截圖、動畫 GIF 與工程紀錄見 `docs/14_七英雄逐格動畫與戰鬥整合_20261025.md`。

## 驗證
```
node scripts/verify-arcade.mjs
node scripts/test-arcade-engines.cjs
node scripts/test-g01-animation.cjs
node scripts/smoke-guardian-art.mjs
node scripts/build.mjs --check
node scripts/verify.mjs
```

上線前需檢查實際手機瀏覽器音訊解鎖、Android / iOS 遊戲鍵、旋轉方向、GA4 DebugView 和 OST 的授權範圍。
