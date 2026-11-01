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
本批遊戲來源：PR #38 的 `d99fca0c06615619f619c8677bd99a1c244c4f48`（六款 G01～G06 雙人版本、RTC/Relay）。
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

發布來源固定 PR #38 HEAD `d99fca0c06615619f619c8677bd99a1c244c4f48`，內容含 G03/G04 手機主畫布完整縮放及雙語返回 GitHub Pages `main` 新版遊戲中心。發布分支採非破壞性的雙親整合提交，保留原 release 歷史，樹內容由上述來源加**四個** Beta 專用設定檔構成；預檢以真實 GitHub compare 淨差異與兩項同 SHA CI 核准，不再依賴寫死的 commit 數量。

Cloudflare Git Builds 只應選用 `release/bio-city-v161-stun-beta` 為 Production branch，**關閉 Preview Builds**；PR #38 開發分支不含根目錄 `wrangler.toml` 是刻意隔離，PR 上的 Cloudflare Build failure 不能拿來代表 release 部署。正式站 main 保持不變。

只有 GitHub Build 成功且實際 Worker HTTPS 回應與最新版資產一致，才可請使用者開始 iPhone Safari 與 Samsung Chrome 實測。跨網域返回正式網站不保證 OST 真正無縫銜接。
