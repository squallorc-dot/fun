# Bio-City Arcade v2.0｜雙基準相容與 Phase 1A 安全清單

## 固定來源與受控界線
- 正式主站：`main` = `ad3894727c97c6a0536ffc74be6192bf5e597f1b`。只作唯讀對照，禁止改動。
- 好友版：PR #38 Draft HEAD = `96d7aa827f20800c350c2340dd16f6c2f8967d5f`，既有 8/8 CI Success。PR 原分支保持不動。
- Cloudflare Beta Release = `737cbe62fd94c3ef152846edfe7d5f61e8b8632e`；原回復點 = `beefccf8dbf34158ae854a4436040f4ecc321ea7`。
- v2.0 僅使用獨立 `feature/bio-city-v2-visual-gameplay` 分支；不碰 36 個 backup、GTM／GA4、Cloudflare 發版。
- G01～G05 六張場景中的前五張 WebP **不重新生成**；保留原 3D 底圖。Phase 1A **不重畫圖集**；Phase 1B 先製作 Burner 姐＋孢子爬獸樣板，定調後才擴展另外 6 英雄、3 怪物（最終 11×71＝781 格）。

## 實際差異：不能直接以 PR 當正式網站替代品
| 範圍 | `main` 目前狀態 | `96d7aa82` 目前狀態 | v2 必要驗收 |
|---|---|---|---|
| 繁中／日文正式單機入口 | `/zh/play.html`、`/ja/play.html`；另有正式頁內容及 PLAY 入口導覽；舊 `arcade/{lang}/index.html` 轉址至 PLAY | `arcade/{lang}/index.html` 是可玩獨立大廳 | 合併時不得將正式 PLAY 的內容、導覽、canonical、雙語入口及外層設定復原為舊版 |
| 單機底部 HUD | 較新正式版有較整潔的雙行資訊／排版改善 | PR 專注好友 HUD 和六款手機精修；不應覆寫正式單機排版 | 390×844、390×664、桌機均需截圖比對：資訊不黏字、不中斷、按鍵可點 |
| 遊戲語系 | 正式單機 G01/G03～G06 部分 HUD 已完整使用繁中／日文 | PR 共用引擎部分標題與 HUD 回到英文（例如 G05、G06 部分欄位） | 取兩支較完整的逐遊戲文案，不能把正式版繁中／日文覆蓋成英文 |
| `arcade/assets/games-core.js` | 原版單機核心 | 加入多人狀態與更新，實際核心內容有差異，尤其 G03/G04 snapshot 和 G06 雙人駕駛 | 同一 v2 核心不可倒退單機 HUD、角色技能、勝負或物理 |
| `assets/arcade-engine.js` | G02 正式射擊引擎，含正式單機控制相關細微差異 | G02 iframe 引擎版本並不完全一致，PR 另搭配 `g02-network-state.js`、`g02-network.js`、`shooter-bridge.js` | 正式與好友需對齊 G02 同一套引擎、三波、Boss、HUD、操控、暫停、iframe 高度及狀態驗證 |
| 角色、敵人與六張場景資產 | 與 PR Git blob SHA 完全一致 | 與 main 完全一致 | 升級後同一套圖集、Manifest、渲染資產供單機／好友使用 |

## 共用路線與嚴禁碰觸
- G01、G03、G04、G05、G06 共用 `arcade/assets/games-core.js`，G02 唯一例外為 iframe + `assets/arcade-engine.js`。
- 共用 `guardian-art.js`、`world-art.js` 與新 `visual-v2.js`；場景原圖、圖集原稿和碰撞資料保持既有版本。
- `visual-v2.js` 完全隔離於引擎序列化、P2P／ICE／APAC／Relay、32 KiB／128 KiB 背壓和 120Hz 模擬。畫質低／標準／高只改本機 Canvas 繪圖。
- 現有 G01 與 G05 Snapshot 中已有可序列化的特效；**新增 v2 視覺粒子只存於模組自己的有界池**，不能附加至遊戲的 effects / FX snapshot。
- 角色高解析圖片的原有 2x → 原版 → 載入錯誤提示回退不可修改；圖集尺寸、71 格時序、腳底 anchor 不變。
- G06 實際賽道與車體世界座標、檢查點、碰撞、勝負、六車 AI 不變；G05 只調 HUD 顯示座標；G01 第四章只淡化裝飾層。
- G02 單機 iframe 的上層按鈕須保留「操作設定」與「OST」正規入口；內層重複的兩個按鈕隱藏但維持原 DOM/處理器，內層暫停 `Ⅱ` 和退出按鈕不刪除；好友版仍使用既有父層網路控制。

## Phase 1A 自動化驗收
- 原八項 CI 工作流程與嚴格斷言完全保留；新增的 Node 視覺測試接到既有藝術測試工作。
- 相同 seed、固定輸入、各 120Hz step 比對低／標準／高三檔位的遊戲 Snapshot JSON、UTF-8 位元組、碰撞／排名／得分和勝負標記；不允許多出任何視覺欄位。
- 新視覺事件重送去重、有界池、render-only 頓幀、資源失敗回退和 G01/G06 繪圖 hook 須驗證。
- G05 Canvas 標題和比分 Y 座標不同且不重疊；G02 單機父／子工具列及 `Ⅱ` 暫停鍵、單機與多人可見設定入口驗證；G01 第四章裝飾透明度低於先前值。
- 下一輪開發前先獨立確認 v2 分支 CI；本輪只提交一個 Commit，**提交後不等待 CI，不部署 Beta**。
