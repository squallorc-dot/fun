# 守護者聯盟｜v1.6.1 公開 Beta 發布與回復
2026-10-31。此文件不等於已部署。PR #37 保留 Draft，正式 Pages 在 Worker 上線且最新 CI 成功前不得變更。

## 架構
* Beta 入口：https://bio-city-v161-signaling.squall-orc.workers.dev/arcade/friends/。同一既有 Worker 提供受白名單限制的遊戲靜態檔與 /rooms、WebSocket；所有房間與遊戲配對均在相同 origin。無須買網域，亦不需要把正式 GitHub Pages 與 Worker 跨網域串接。
* 正式遊戲中心將透過繁中／日文新連結導流至 Worker Beta；僅在 Worker 真正能用後才合併此 PR。
* 公開開關：BETA_PUBLIC_ENABLED=true、TEST_ENABLED=false、TEST_OPEN_WINDOW=false；必須精確符合 BETA_PUBLIC_ORIGIN 和 ALLOWED_ORIGINS；有效 Cloudflare CF-Connecting-IP；任一不符 403。預設所有開關均 false。
* 原有 RATE_SECRET、ROOMS、RATE_GATES 的名稱、遷移與既有密鑰保持不變。每 IP 12 次建房／分鐘、60 次 WebSocket／分鐘；Beta 另有跨 IP 全站 24 次建房／分鐘、96 次 WebSocket／分鐘上限。房主核准、獨立憑證、房間期限、資產白名單、CSP 與無第三方 STUN／TURN 都保留。
* 公開 Beta 可能斷線、不同 Wi-Fi／NAT 可能無法建立直連；邀請連結含憑證，不可貼公開社群；前端明確標示測試版。遊戲進度不保證跨裝置保存。

## 發布前不可跳過
1. PR #37 最**新完整 SHA**的六項品質 CI 和 WebRTC 專項都成功；Beta 模式、全站限速、繁中／日本語 UI 回歸通過。不能沿用較早 SHA 綠燈。
2. 先在 Cloudflare Dashboard 確認正確帳戶、既有 Worker 名稱、RO​OMS/RATE_GATES 綁定、RATE_SECRET 密鑰名稱、現有部署、免費額度與用量監控；不取得或公開密鑰內容，不自動升級付費。
3. Windows 下載最新 SHA ZIP（不能用原本舊 ZIP），執行 `node scripts/build-controlled-assets-v161.mjs`、`node scripts/test-public-beta-config-v161.mjs`；`npx.cmd --yes wrangler@4.156.0 deploy --dry-run --config signaling/worker/wrangler.beta.toml`，全部成功才可進入部署。
4. 在**本機複本**的 `signaling/worker/wrangler.beta.toml`，僅把 `workers_dev = true`、`BETA_PUBLIC_ENABLED = "true"`；保持 preview_urls=false、TEST_ENABLED=false、TEST_OPEN_WINDOW=false、無 routes／custom domain；再次乾跑後才允許正式 deploy。每次 deploy 都會更新既有 Worker，應先確認上一輪測試結束。
5. 雲端驗證：公開入口 HTML／JS 可載入、同網域建房／QR／手機加入至少一次、錯誤 origin 無法打 API、超速請求 429、不顯示私有 token／SDP／IP。不可把新房間憑證貼到 GitHub CI 或聊天。失敗則停止合併。
6. Cloudflare 可使用後，才申請合併 GitHub PR #37 到 main；檢查正式遊戲中心新 Beta 連結及原有單人遊戲正常。

## 回退
* 立即停 Beta：本地 beta.toml 設 `BETA_PUBLIC_ENABLED = "false"`、`workers_dev = false`，TEST_* 維持 false，dry-run 後重新部署既有 Worker。確認沒有其他公開 route／Preview。不得刪除 Durable Objects、migration、RATE_SECRET。
* 已建立的雙人 WebRTC 連線不一定因 Worker 關閉而立即中斷；通知雙方離房。
* 若官方 Pages Beta 連結有問題，恢復上個 Pages 版本或撤掉該連結；不影響單人遊戲。
* Cloudflare 免費方案亦有 Workers／Durable Objects 用量額度，公開部署前應查看帳戶狀況和警示。AI 無 Cloudflare 部署連線時只能提供使用者端命令，不聲稱已部署。
