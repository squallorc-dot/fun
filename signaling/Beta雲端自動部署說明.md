# 守護者聯盟 Bio-City Arcade v2.0｜Cloudflare Beta 原生 Git 自動部署

僅使用既有 `release/bio-city-v161-stun-beta` 分支與既有 Cloudflare Worker `bio-city-v161-signaling`。正式站 `main` 與獨立 UI/UX PR #42 均不受影響；不使用 GitHub Actions 部署、`CLOUDFLARE_API_TOKEN` 或新增分支。

## Git 自動部署設定
在 Cloudflare Dashboard → Workers & Pages → `bio-city-v161-signaling` → Settings → Builds 綁定 `squallorc-dot/fun`。
- Production branch：`release/bio-city-v161-stun-beta`
- Root：儲存庫根目錄
- Build command：`npm run build`
- Deploy command：`npx wrangler deploy`
- Preview builds：建議關閉；不要新增 route、custom domain 或 Worker。

## 來源與發布關卡
本批遊戲來源：PR #38 的 `c06eeacad9dc9fc8beee4e32c7c1e1bc6e7eecdb`（六款 G01～G06 雙人版本、RTC/Relay）。
`scripts/cloudflare-beta-build-v161.mjs` 在 Cloudflare 執行期間重新確認：
1. PR #38 仍為 Draft、未合併，且 HEAD 精確等於上述 SHA。
2. 同 SHA 的六項品質 CI：`verify`、`browser`、`arcade-engines`、`arcade-controls-browser`、`arcade-performance-browser`、`arcade-session-browser` 全部成功。
3. 同 SHA 的 RTC 專項：`signaling-local-rtc`、`g02-cross-engine` 全部成功。
4. 發布來源與發布提交的淨差異僅為四個專用檔案：`package.json`、`scripts/cloudflare-beta-build-v161.mjs`、`signaling/Beta雲端自動部署說明.md`、`wrangler.toml`。
5. 保留 Worker、Durable Objects 與安全設定，完成受控靜態資產建置。任一檢查失敗就停止部署。

## Beta 實機驗收
僅在 GitHub Cloudflare Workers Builds 顯示 **Success** 且線上 Beta 內容已更新後開始。
Beta 入口：https://bio-city-v161-signaling.squall-orc.workers.dev/arcade/friends/?lang=zh
- iPhone 13 Safari 與 Samsung S26 Chrome：輪流當房主及來賓；先同 Wi-Fi，後跨 Wi-Fi／行動網路。
- 逐款驗收 G01～G06 的雙人操作、同步畫面、分數／進度、共同結算、返回大廳及重新配對。
- 特別注意 G02 iPhone Safari 啟動同步、G03/G04 權威進度、G05 對戰、G06 賽車及 WebSocket Relay 降級行為。
- 不在工單或公開截圖中張貼房間碼、邀請網址、入房憑證、IP、SDP。

`srflx > 0` 只證明 STUN 候選取得，不等於已能跨網路連線；請以實際雙人操作與同步為準。

## 回復與隔離
若需要回復，於 Cloudflare Worker → Deployments/Versions 選擇先前可用版本 Roll back。若暫停自動發版，至 Settings → Builds 停用 Git integration。請勿將上述 Beta 專用設定檔合併至 `main`。
## 2026-11-02｜第三批回歸修復發布基準

發布來源固定 PR #38 HEAD `c06eeacad9dc9fc8beee4e32c7c1e1bc6e7eecdb`，內容含 G03/G04 手機主畫布完整縮放及雙語返回 GitHub Pages `main` 新版遊戲中心。發布分支採非破壞性的雙親整合提交，保留原 release 歷史，樹內容由上述來源加**四個** Beta 專用設定檔構成；預檢以真實 GitHub compare 淨差異與兩項同 SHA CI 核准，不再依賴寫死的 commit 數量。

Cloudflare Git Builds 只應選用 `release/bio-city-v161-stun-beta` 為 Production branch，**關閉 Preview Builds**；PR #38 開發分支不含根目錄 `wrangler.toml` 是刻意隔離，PR 上的 Cloudflare Build failure 不能拿來代表 release 部署。正式站 main 保持不變。

只有 GitHub Build 成功且實際 Worker HTTPS 回應與最新版資產一致，才可請使用者開始 iPhone Safari 與 Samsung Chrome 實測。跨網域返回正式網站不保證 OST 真正無縫銜接。

## 2026-11-02｜G03 雙人與單機按鈕順序一致

候選來源 PR #38：`c06eeacad9dc9fc8beee4e32c7c1e1bc6e7eecdb`，配合 G03 手機上方對手即時縮圖列以及單機一致的動作按鍵位置。G03 右側**向下（左）／跳躍（右）**，沿用 BioControlProfiles 的共用位置計算；G04／G05／G06 的按鍵排列維持原有規則。補上觸控手機上實際畫面座標測試與腳本版次更新。僅在來源六項品質 CI 與 RTC/WebKit 雙項專項同版 8/8 SUCCESS，才發布此 Beta。正式 main 不變。

## 2026-11-02｜第四批：G03/G04 雙人手機可視空間優化

PR #38 受測來源 `c06eeacad9dc9fc8beee4e32c7c1e1bc6e7eecdb`。將 G03/G04 手機直式的上方對手縮圖、標題、收合按鍵改為精簡單列，操作區縮為實際需要的高度，留白返還主畫面。G03 在足夠高的直式裝置提供 640×640 或 640×720 **純顯示擴展**，繪製期間暫時增加顯示高度並在 finally 還原 640×480 權威物理世界；場景增加真實可見下方平台，不拉伸角色、不修改碰撞、狀態封包或深度計分。G04 保持原 640×480 射擊與瞄準座標。新增長版 Samsung 及短版 iPhone、縮圖列/操作按鍵與 G03/G04 同步不變的回歸測試，並更新資產版本。只有來源同 SHA 的六項品質與兩項 RTC/WebKit CI 8/8 Success 才可部署 release 分支，正式 main 不變。

## 2026-11-02｜第5批手機單機式長形＋G06 操作，CI 測試驅動修正版

PR #38 latest tested source `f28ca911a6e9affc7dbea9ea3932811b0fb0a3b6`，必須全部同 SHA 八項必要 CI 8/8 Success 才可發布；release branch 不允許 force push。G03/G04 使用與單機相同的遊戲世界尺寸 480×720／600×720，聯機雙端一致，TAG v4 拒絕舊端，對手縮圖等比裁切，G06 煞車左氮氣右。本版修復獨立 `arcade-controls-browser` 的 QR/Worker 測試配置錯誤，改為在 Chromium 下單獨驗證 G03/G04 長形比例與 G06 中日文按鍵，原本 QR+真 RTC 驗收仍在 signaling CI 完整執行。G01 真 RTC 合作關卡的自動遊玩加入隊友倒地救援、空中近戰避失誤、遇攻擊預警閃避，紀錄雙端實際按鍵指令，**保留真正 Boss 擊敗、雙人相同結果與恢復遊戲**作為必要門檻。正式 main 不合併；Cloudflare release Build 必須回報 Success 才通知實測。

## 2026-11-03｜好友大廳返回 PLAY 路徑修復

Beta 使用者回報「返回遊戲」指向舊版 Arcade，已統一指向正式 GitHub Pages `/zh/play.html` 與 `/ja/play.html`。涵蓋好友大廳主按鈕、次要入口、HTML fallback、Worker 對舊 `/arcade/{zh,ja}/(index.html)` 之 302 no-store 轉址，以及瀏覽器／Worker／候選資產測試。此修正不變更 RTC、Room、RateGate、Cloudflare 環境權限，不併入 `main`。

經核准的 PR #38 新來源 SHA：`ef4fe865ba7b6893ea2f10e8af951dbeb6b74aaa`。僅當此 SHA 的六項品質 CI 與兩項 RTC CI **全部 Success**，才允許發布分支更新。本分支仍由此完整來源樹加四個 Beta 專用設定檔構成；保留此前 release commit 為父節點，並記錄本 SHA 為另一父節點，以避免重新寫入歷史。

## 2026-11-21｜多人傳輸診斷與方案 A 背壓修復受控發布

本次來源固定為 PR #38 Draft HEAD `cfb81e79413bc7999acdd777e8b1add8e5748a44`；GitHub Actions Run `44863448709` 與 `44863448719` 的六項品質及兩項 RTC 專項全部為 Success（8/8）。
只在保留原 Beta 回復點 `beefccf8dbf34158ae854a4436040f4ecc321ea7` 為第一父節點、以上驗收來源為第二父節點的受控整合提交上發版。相對 PR 來源的淨差異仍只允許四個既有 Beta 專用檔案。
新增遊戲內 P2P／Relay、RTT、ACK、Dropped／Buffered 與 Snapshot 大小診斷；方案 A 僅在實際傳輸緩衝壅塞時丟棄一般非可靠幀（32 KiB），可靠控制維持 128 KiB 失敗保護。沒有修改正式 `main`、GTM／GA4、遊戲物理或勝負規則。
Cloudflare Git Builds 必須由 `release/bio-city-v161-stun-beta` 觸發，先執行 `npm run build` 的同 SHA CI/四檔案預檢，再由 `npx wrangler deploy` 發布；Build 必須顯示 Success 且確認線上內容更新後才進行真機實測。

## 2026-11-21｜APAC Relay 中繼優化及切換原因診斷受控發版

來源固定 PR #38 Draft HEAD `e1386701037e43b5788067f15a56c3b5faa575d3`；六項品質與兩項 RTC CI：Run `44872651225`、`44872651235`，合計 8/8 Success。
本次只更新受測來源的七個程式／測試檔案：Room 新房間 `locationHint:'apac'`、授權 Relay 熱路徑的快取與休眠恢復、純本機 Relay 切換原因診斷及回歸測試。保留既有 32 KiB 一般幀及 128 KiB 控制保護、房間驗證與到期、速率限制，不涉及 G01～G06 Snapshot 結構或遊戲規則。
本版第一父節點為既有 Beta `9879c093ed962b3ecd36e9aa563563388a72497d`（含原回復點 `beefccf8dbf34158ae854a4436040f4ecc321ea7`），第二父節點為已驗收 PR 來源 `e1386701037e43b5788067f15a56c3b5faa575d3`；發布樹相對來源僅有四個 Beta 專用設定檔差異，禁止合併至正式 `main`。
Cloudflare Workers Build（`bio-city-v161-signaling`）需顯示 Success 並確認線上版號對應本版後才開始跨網路實測。保持 PR Draft。

## 2026-11-21｜手機遊戲診斷單行與預設收合說明受控發布

本次受測 PR #38 Draft HEAD `a83b9feb67e2c564e0380ddcd6ceb97895e30fc4`，六項品質 CI Run `44880734409` 與 RTC 專項 Run `44880734247` 均已完成且 8/8 Success。此版針對手機直式僅顯示精簡單行 P2P／Relay 診斷、保留 Relay 轉換原因、操作說明預設收合並可按鈕展開，桌機與品質詳情仍保存完整指標；含繁體中文／日文及觸控防遮擋回歸測試。
保留既有 P2P、ICE Gathering、APAC 位置提示、Relay 記憶體快取及背壓安全門檻，未修改遊戲勝負、碰撞、得分、Snapshot 結構或配對安全規則。此次從 Beta `1e1692c3ee9669b8186ffea785473d99ef377f5c` 非破壞性接續，保留原回復點 `beefccf8dbf34158ae854a4436040f4ecc321ea7`，並以通過 CI 的來源 `a83b9feb67e2c564e0380ddcd6ceb97895e30fc4` 作為第二父節點；與來源相比僅允許四個 Beta 專用部署檔案差異。
正式 `main`、36 個備份分支與 GTM／GA4 不修改，PR #38 維持 Draft。須等 Cloudflare 官方 Worker Build `bio-city-v161-signaling` Success 再進行新版實機驗收。

## 2026-11-21｜六款手機版面集中精修、ACK 分布診斷與 G06 真碰撞驗收受控發布

本次固定受測來源為 PR #38 Draft HEAD `96d7aa827f20800c350c2340dd16f6c2f8967d5f`。GitHub Actions 品質工作流程 Run `44894850061` 六項全部 Success，RTC 工作流程 Run `44894850053` 兩項全部 Success（合計 **8/8 Success**），並從原始日誌確認：`scripts/smoke-g06-friends-6c.mjs` 的真正雙人 RTC／三圈／九關卡完賽和引擎實錄碰撞，以及 `scripts/test-friend-ui-v161.mjs` 六款繁中／日文、390×844、390×664、1280×800 UI 矩陣都完整 PASS。

內容包括：ACK p50／p95、最近 30 秒尖峰與最大 Snapshot 到達間隔診斷；G06 手機角色與 HUD 精修；G01/G02/G05 操作區節省高度、G03/G04 HUD 防黏字與截斷；G01/G02 合作角色雙語提示；G06 真實方向鍵短暫切入未撞路障、碰撞後恢復原駕駛測試。保持六款遊戲物理、碰撞、勝負、Snapshot 結構、P2P/ICE/APAC、Relay 快取、32 KiB 一般幀與 128 KiB 可靠控制門檻完全不變，不引入 TURN。

Beta 第一父節點保留前版 `ef98cd2e0fd5a208370fb1fac268152bb4efe732`，第二父節點為 8/8 驗收來源 `96d7aa827f20800c350c2340dd16f6c2f8967d5f`，保留原回復點 `beefccf8dbf34158ae854a4436040f4ecc321ea7` 和所有既有 Beta 歷史。發布樹與受測來源相比只能有原先四個 Beta 專屬部署檔案（`package.json`、`wrangler.toml`、`scripts/cloudflare-beta-build-v161.mjs`、本文件），`main`、36 個 `backup/`、GTM／GA4 與 PR Draft 不修改。須先確認 `bio-city-v161-signaling` Cloudflare Build Success，再於正式網址進行六款真機雙端驗收。
