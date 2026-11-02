# PLAY v3.4｜GTM／GA4 事件規範與驗收（PR #44）

> 範圍：GitHub Pages 正式站 `https://squallorc-dot.github.io/fun/` 的繁中／日文 PLAY 與站內互動。多人 Cloudflare Beta 不裝正式 GTM。**本文件為 GTM 後台待套用設定與驗收標準；程式 `dataLayer.push` 不等於 GA4 已收到。**

## 1. 保留的基礎設定

- 現有 GTM 容器：`GTM-5M4KVKNX`。不重複直埋 `gtag.js` 或新增第二個 GA4 設定標籤。
- 使用既有 GTM GA4 Google tag；確認每個正式頁面只產生一次 `page_view`。錨點 `#game-list`、遊戲舞台開關、SPA 式 UI 操作**不另送** `page_view`。
- 路徑：`/zh/play.html`、`/ja/play.html` 為官方 PLAY；`/arcade/{zh,ja}/index.html` 是內部建置素材，避免將舊路徑另立為內容導覽入口。
- `arcade/zh/shooter.html`、`arcade/ja/shooter.html`（G02 iframe）、Cloudflare Friends Beta 不另設正式 GA4 標籤，G02 遊戲事件由父頁接收單次轉送。
- GTM 的連結點擊型觸發器與本站自訂 `dataLayer` 事件**不要同時作為同一個 GA4 事件的來源**。

## 2. 事件對照

| dataLayer 自訂事件 | 意義 | 建議分析維度 |
|---|---|---|
| `site_navigation_click` | Header、Bottom、Explore 導覽點擊 | `navigation_label`、`navigation_position`、`navigation_target_url`、`language` |
| `site_language_switch` | 由頁面 A 語言切到 B 語言 | `language_from`、`language_to` |
| `arcade_catalog_click` | 首屏或焦點區前往六款遊戲列表 | `entry_point`、`language` |
| `arcade_feature_click` | 焦點 G06 的點擊 | `game_id`、`feature_id`、`language` |
| `arcade_game_select` | 點擊 G01～G06 遊戲卡／G06 焦點，但尚未開始 | `game_id`、`entry_point`、`language` |
| `arcade_game_start` | 實際啟動遊戲（進入舞台） | `game_id`、`hero_id`、`difficulty`、`chapter`、`mode`、`language` |
| `arcade_game_finish` | 遊戲結束，成功／失敗 | `game_id`、`outcome`、`final_score`、`chapter`、`language` |
| `arcade_campaign_stage` | 五章章節完成／失敗 | `game_id`、`chapter`、`outcome`、`language` |
| `arcade_game_exit` | 離開遊戲舞台返回 PLAY | `game_id`、`language` |
| `arcade_help_open` | 開啟遊戲操作說明 | `game_id`、`language` |
| `arcade_ost_select` | 選擇 OST 曲目／關閉音樂 | `track_id`、`language` |
| `arcade_friends_beta_click` | 正式站點入多人 Beta | `entry_point`、`language`、`navigation_target_url` |

目前另有舊事件 `game_started`、`game_completed`，不得把它們與 `arcade_game_start`、`arcade_game_finish` **加總**為遊戲開始或完成次數。建議優先以 `arcade_* `系列做遊戲行為漏斗；`game_completed` 可暫保留相容用途但不要建立第二個同義 KPI。

## 3. GTM 工作區待設定／核對（後台）

1. 進入 GTM `GTM-5M4KVKNX`，檢查唯一 Google tag（既有 GA4 測量 ID）與「所有頁面」觸發器。不要先建立同名、重複的 Google tag。
2. 每個表列事件以「自訂事件」建立觸發器，名稱與 `dataLayer.event` **完全相同**。觸發器命名可用 `CE - arcade_game_select`。
3. 對應 GA4 事件標籤命名如 `GA4 - arcade_game_select`，帶入相關資料層變數。變數名稱如 `DLV - game_id`，資料層變數名稱必須是 `game_id`（版本 2）。
4. 同名欄位需檢查為各事件提供的可用參數（未傳時應省略），避免跨事件殘留上一個 `game_id`、`hero_id`。如使用共用資料層變數，GTM 事件標籤需明確限定送出的參數清單。
5. 在 GA4 管理員建立所需事件範圍自訂維度；注意 `game_id`、`hero_id` 等如已存在，不要重複建立。參數名稱應保持英文、不帶空格。
6. 不把 `arcade_game_select`、`arcade_feature_click`、`site_navigation_click` 設為購買轉換。若需關鍵事件，待實際使用數據與 KPI 定義確認後再決定。

## 4. 手機／桌機驗收條件

- 中／日文分別測首頁 → PLAY、上方／下方／探索選單、切語言、G06 焦點、G01 遊戲卡、跳轉六款列表、Friends Beta。
- 點一次 G06 焦點應各有 `arcade_feature_click` 與 `arcade_game_select` 各一次，但 **不得**直接產生 `arcade_game_start`；進入遊戲後才送開始。
- G01～G06 任一遊戲：`select` → `start` → `finish` 或 `exit`，追蹤正確 `game_id`；重賽是新一局開始，不能當作首次選擇。
- G02 iframe 單次遊戲完成時，由父頁回傳一次正式結束事件，不另由 iframe 的 GTM 重複送出。
- 離開到 Friends Beta 前可計一次出口點擊；Beta 端**不得**送正式 GA4。
- GTM Preview 先核對觸發一次及參數，再在 GA4 DebugView 核對到站；必要時等待一般報表處理，勿以 DebugView 當作每日報表數據。
- 正式版程式發布前需六項 CI 全綠；GTM 容器發布為獨立後台變更，另外記錄容器版本、日期及驗收證據。

## 5. 報表漏斗

`PLAY page_view` → `arcade_game_select` → `arcade_game_start` → `arcade_game_finish`（拆 `outcome`），輔以 `site_language_switch`、`arcade_friends_beta_click`。

備註：上述事件計數不等於「不重複使用者數」。比較轉換率請統一使用事件數或使用者數的分母；不同日期或返回重玩的玩家可能產生多次事件。
