# FUNAI CARE｜守護者聯盟 · 多頁式品牌 IP 網站

本專案為 Bio-City 品牌 IP 展示網站。於 2026-10-24 由原有單頁提案改為中日雙語多頁式網站；保留原創音樂、故事、七組英雄、商品資料及 GTM 設定。

## 正式入口

- 繁體中文首頁：`FUNAI-CARE.html`
- 日文首頁：`FUNAI-CARE_jp.html`
- 專案根目錄：`index.html` 導向中文版

## 內容與路由

| 頁面 | 繁中 | 日本語 |
|---|---|---|
| 首頁 | `FUNAI-CARE.html` | `FUNAI-CARE_jp.html` |
| 世界觀 | `zh/world.html` | `ja/world.html` |
| 英雄圖鑑 | `zh/heroes.html` | `ja/heroes.html` |
| 核心故事 | `zh/story.html` | `ja/story.html` |
| 原創音樂 | `zh/music.html` | `ja/music.html` |
| 互動體驗 | `zh/play.html` | `ja/play.html` |
| 數位策略 | `zh/strategy.html` | `ja/strategy.html` |

## 共用與語系資產

- `assets/site.css`：全站共用 CSS，包含沿用角色元件的既有樣式及新版設計系統。
- `assets/site.js`：全站導覽、音源互斥、角色音樂、GA4 事件、日文注音切換。
- `assets/zh-play.js`、`assets/ja-play.js`：角色配對與 Canvas 遊戲。
- `images/`、`music/`：保留原有角色圖片及音檔，不覆蓋、不改名。

## 既有追蹤

沿用 GTM 容器 `GTM-5M4KVKNX`，正確 GA4 資源 ID 為 `534706548`。保留既有自訂事件：
`play_hero_audio` + `hero_name`、`play_ost_audio` + `ost_name`、`quiz_completed` + `recommended_hero`、`game_completed` + `hero_used`／`final_score`。

GTM 的內部事件參數對應及 GA4 實際接收，需使用預覽模式與 DebugView 測試；純網頁靜態檢查不能取代瀏覽器驗收。

## 不可任意變動

- 商品名稱、商品連結與已確認功效宣稱：未經明確要求不改。
- 已完成的音樂、影片、角色素材：不重新生成、不更動版權或來源標示。
- 中日語系必須維持相同路由結構、標籤用途和功能。
- 實際執行的數位策略需與規劃中的項目清楚區隔。

## 2026-10-24 維護整理

- 內容統一由 `content/zh/`、`content/ja/` 與 `content/site.json` 維護；使用 `node scripts/build.mjs` 產生 14 頁，`node scripts/build.mjs --check` 驗證一致性。
- 樣式：`assets/site.css` 為共用基礎，首頁與英雄卡片細節由 `assets/ui-refine-20261024.css` 補強；暫不刪除仍可能被使用的舊規則。
- 英雄圖片的鍵盤操作統一由 `assets/site.js` 控制；同步停止角色音訊時的播放狀態、假名按鈕語系。
- 展示站唯一 GA4 資源是 `534706548`，與 BV 購物網 `280518889` 不混用。
- 本輪維護前備份：`backup/pre-maintenance-20261024`。
- 桌機／手機、音樂影片及 GA4 DebugView 實際驗收仍待進行。

## 改版備份與還原

- 改版前保留分支：`backup/pre-redesign-20261024`。
- 多頁改版前保留分支：`backup/pre-multipage-20261024`。
- 本次工作分支：`redesign/multipage-20261024`。

## 驗收清單

- [x] 14 個內容頁已建立
- [x] 中日語言路由配對
- [x] 內部連結靜態檢查
- [x] 商品連結與原版逐項比對
- [x] 三份 JS 語法檢查
- [ ] 實際瀏覽器桌機／手機檢查
- [ ] YouTube 與 MP3 播放實測
- [ ] Canvas 遊戲與問答互動實測
- [ ] GTM Preview、GA4 DebugView 驗證
- [ ] 日文內容編校

## 2026-10-24 架構整理（20261024.6）

- 已將首頁與英雄頁的追加樣式併入 `assets/site.css`，不再載入第二份 `ui-refine-20261024.css`。舊檔保留供備份參考，未作正式引用。
- 建置器 `scripts/build.mjs` 只產出單一正式樣式引用；所有 14 個公開頁面同步升級快取版號。
- 共用 JavaScript 加入商品連結點擊 `product_link_click` 資料層事件（僅供本展示站 GTM 自行設置與分析），不變更 BV 購物網資源。
- 中日文遊戲加入鍵盤左右鍵與 Escape 返回選角操作，保留滑鼠和觸控操作。
- 本輪改版前備份：`backup/pre-architecture-hardening-20261024`。
- GTM 容器、商品名稱/連結/功效、音樂、原始角色圖片和劇情均未更動。
- 尚待人工驗收：多尺寸渲染、影音播放、實際 GA4 DebugView 及日文逐字校稿。

## 2026-10-24 結構驗收

- 建置檢查：`node scripts/build.mjs --check`，品質閘門：`node scripts/verify.mjs`。
- 14 頁、路由、語意、SEO、多語 meta、產品及素材連結由版本化檢查腳本覆核。
- 中日文趣味配對文案一致，兩題平手時以最後明確選擇的角色優先。
- `534706548` 為本站 GA4；驗證不使用 BV 購物網 `280518889`。
- 自動靜態檢查無法替代真實瀏覽器、播放及 GA4 DebugView 確認。

## 2026-10-24 媒體資產命名與維護

- 角色圖片與音樂檔案全部使用 ASCII 英文字母、小寫及連字號，避免 URL 百分比編碼；音樂目錄統一為 `music/`。
- 正式頁面、兩種語系來源、配對遊戲、首頁 OG 圖像、根目錄入口已同步使用新路徑。
- 不改動任何 PNG 或 MP3 內容；Git 內沿用相同檔案 blob，僅更動路徑。
- 任何對外發布過的舊媒體直連結在移除原路徑後會失效；舊版完整保存於 `backup/pre-asset-rename-20261024`。
- 往後新增圖片請同步提供可讀的 alt 文字；音檔需維持播放器標題及對應場景語意，不以檔名取代內容描述。


## 2026-10-24 主動畫敘事版型（v20261024.8）

- 首頁結構：品牌主視覺 → 官方主動畫 → Bio-City 四大探索入口 → 七組守護者集結 → 品牌 IP 企劃理念 → 延伸內容。
- 主動畫 YouTube ID 為 `Tbmg2LKTQVI`，首頁及核心故事頁共用；原故事頁影片 `A-2X3iLnUTI` 保留為延伸影片。
- 影片使用 YouTube 封面延遲載入：點擊後才建立 `youtube-nocookie.com` iframe；不在進站時自動播放或載入多個播放器。
- 原有四幕劇情逐幕保留，商品、音樂與角色 PNG 全部維持。
- 中日文內容分別由 `content/zh`、`content/ja` 維護；CSS 共用 `assets/site.css`，播放器由 `assets/site.js` 共用。
- 播放主動畫互動增加資料層事件 `story_video_play`，目前僅推送 dataLayer，正式 GA4 事件需另外檢查 GTM，僅使用本展示站資源 `534706548`。
- 備份：`backup/pre-main-film-redesign-20261024`。切勿改動其他網站的追蹤設定。

## 2026-10-24 頁尾導覽精簡（20261024.17）

- 移除與右下「返回頂端」箭頭重複的頁尾文字連結。
- 頁尾移除與頂部／底部導覽重複的導航文字，保留置中的品牌與製作資訊。
- 內容頁的三張「探索更多內容」卡片保留，提供上下文與延伸探索。
- 共用模板與中日雙語 14 頁同步更新，升級快取版號；未更動原始商品資料、角色素材、音樂或 GTM。

## 2026-10-24｜Bio-City 生命之城主視覺實際上線

- 「創作與應用」的創作核心改採單張電影級科幻都市風景，移除疊加的三位角色形象；保留其既有角色原圖於素材庫及其他使用區塊。
- 圖檔使用 `images/bio-city-living-city-20261024-1200.webp`，1200 × 960、320 KB，為生成原始圖的 WebP 網站最佳化版本；原本 `bio-city-concept-art.png` 與 `bio-city-living-city.svg` 均保留、不刪除。
- 桌機與手機共用 5:4 比例，避免手機版大量裁切中央生命能源核心；繁中／日文顯示相同圖像與對應替代文字。
- 後續由 `content/zh/strategy.html`、`content/ja/strategy.html` 管理內容，建置器同步輸出公開頁面。

## 2026-10-24｜世界觀文案與品牌 IP 理念優化

- 世界觀新增一段精簡、具故事感的導言，統一人體城市、熵能軍團與七組守護者的設定；微調現有三段敘事，保留角色與四位反派原設定。
- 「創作與應用」補充 Burner 姐語錄、外部拍攝且由內部剪輯後製的「酸痛掰掰舞」既有影音歷史，強化既有品牌 IP 資產重新整合的理念。
- 「內容先行」表述為後續經營方向，不宣稱尚未證實的已執行社群成果。
- 繁中／日文世界觀與創作頁的公開 HTML 同步更新；無新增 JS、CSS 或影音資產，14 頁共用產生器與快取版本不變。
