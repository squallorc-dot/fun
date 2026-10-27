# Bio-City Arcade — 六款網頁遊戲正式入口（第一版可玩合集）

`arcade/zh/index.html`／`arcade/ja/index.html`。保留原本站 `zh/play.html`、`ja/play.html` 的 8 題情境決策分析與城市防衛戰。

v1.4 第 4A 批：G02 合併戰場資訊列、擴大手機橫向可視空間，保留完整正方形世界與原難度；第 3 批閃避驗收改以同次瀏覽器執行驗證立即動作。實測數據與裝置難度比對見 [G02 手機戰場與低幀率補驗](docs/32_v1.4_第4A批_G02手機戰場與低幀率補驗_20261027.md)。

第 5A 批：G06 六車正式起跑、AI 過彎與超車、尾流／氮氣競爭、前三名通關與全場正式結算。五章既有路線、場景與道路投影保留；詳見 [真正競速實作與驗收](docs/33_v1.5_第5A批_G06真正競速_20261027.md)。本批以 PR #18 的 G02 優化為基礎，相依順序記錄於驗收文件。

第 4B 批：依實際顯示大小配置 Canvas 像素、六款地面與物件分層、G03 鏡像接合背景、G06 天空裁切與一致光影；七英雄由現有向量原稿重製可選用的 2x 圖集。背景缺少高解析原稿的限制、同種子前後圖及量測見 [場景分層與解析度驗收](docs/34_v1.5_第4B批_場景分層與解析度_20261027.md)。保留 G02 手機戰場、G06 競速和 G05 桌球視角。

第 5B 批：修正 G01 遠程敵人退出可攻擊範圍、G02 Boss 提前結算與提示時脈、G03 移動平台承載、G05 桌球 AI 重複抽取接球成功率，以及第五章失敗重試／重複結算／儲存失敗。七模式的真實通關矩陣、未調整的 G06 空操作平衡限制與 Cloud 瀏覽器診斷見 [玩法與闖關精修驗收](docs/35_v1.5_第5B批_六款遊戲玩法與闖關精修_20261027.md)。

2026-10-25 上線後修正：大型遊戲／選角卡、中日文完整操作指南、G03–G06 七英雄圖集、排球網高與發球軌跡、快速點按保留。工程結果與待人工項目見 [視覺與操作修正紀錄](docs/19_上線後大廳視覺與球類操作修正_20261025.md)。

2026-10-25 第二批更新：六款場景、四種怪物、固定遊戲尺度、依玩法配置觸控；G06 封閉透視賽道與五輛對手、G03 單層下穿及補給、G04 收球。詳見 [場景、怪物與操作更新](docs/20_六款場景怪物賽道與觸控更新_20261025.md)。

v1.4 第 1 批：保留既有 OST 與完整動態，補音樂狀態／重試、共用 G02 音效、必要素材預載及 3 秒恢復倒數。詳見 [本批實作與驗收界線](docs/28_v1.4_第1批_OST與啟動恢復穩定性_20261026.md)。

2026-10-26 修復：賽車接地車體、坡頂遮擋與道路近裁切、路旁物件間距、各款接地與動態回饋、手機選單及每關隨機 OST。詳見 [分階段修復與驗證](docs/26_遊戲接地賽道與OST修復_20261026.md)。

## 六款遊戲
- G01：原創 2.5D 橫向格鬥。七組英雄、四種敵人使用實際 PNG 逐格圖集；包含三段連擊、命中幀、輸入緩衝、受擊中斷、閃避取消及三招式二階段 Boss。
- G02：整合既有守護者城市防衛戰引擎，保留三波和七英雄。
- G03：極限下樓梯，碰撞、移動平台、易碎平台、陷阱、深度目標。
- G04：能源彈珠競技，角度、力道、真實碰撞與反彈、射擊次數、破壞目標。
- G05：排球與桌球雙模式，分開處理跳躍、球體重力與桌球拍反彈，先得目標分數獲勝。
- G06：擬 3D 封閉賽道，五位具不同駕駛特性的 AI、正式起跑倒數、過彎超車、尾流與氮氣；第一章三圈、後續兩圈，前三名通關，結算正式名次／總時間／最佳單圈／超車紀錄。

## 系統
- 遊戲 OST 僅提供使用者指定的四首：覺醒時刻（熱血女聲版）、Burner 姐召喚（搖滾男聲版）、MJ 刻む日文 A／B。提供音量、循環、開始遊戲播放偏好；其他歌曲不列入遊戲播放清單。
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
node scripts/smoke-arcade-visual.mjs
node scripts/test-g05-volley.cjs
node scripts/test-arcade-sprites.cjs
node scripts/build.mjs --check
node scripts/verify.mjs
node scripts/test-g06-racing.cjs
node scripts/smoke-g06-racing.mjs
node scripts/test-arcade-art.cjs
node scripts/smoke-arcade-art.mjs
node scripts/test-gameplay-regressions.cjs
node scripts/test-campaign-integrity.cjs
node scripts/test-gameplay-matrix.cjs
node scripts/smoke-gameplay-campaign.mjs
```

上線前需檢查實際手機瀏覽器音訊解鎖、Android / iOS 遊戲鍵、旋轉方向、GA4 DebugView 和 OST 的授權範圍。
