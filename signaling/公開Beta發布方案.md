# 守護者聯盟｜v1.6.1 公開 Beta 發布與回復
2026-10-31。此文件不等於已部署。PR #37 保留 Draft，正式 Pages 在 Worker 上線且最新 CI 成功前不得變更。

## 架構
* Beta 入口：https://bio-city-v161-signaling.squall-orc.workers.dev/arcade/friends/。同一既有 Worker 提供受白名單限制的遊戲靜態檔與 /rooms、WebSocket；所有房間與遊戲配對均在相同 origin。無須買網域，亦不需要把正式 GitHub Pages 與 Worker 跨網域串接。
* 正式遊戲中心將透過繁中／日文新連結導流至 Worker Beta；僅在 Worker 真正能用後才合併此 PR。
* 公開開關：BETA_PUBLIC_ENABLED=true、TEST_ENABLED=false、TEST_OPEN_WINDOW=false；必須精確符合 BETA_PUBLIC_ORIGIN 和 ALLOWED_ORIGINS；有效 Cloudflare CF-Connecting-IP；任一不符 403。預設所有開關均 false。
* 原有 RATE_SECRET、ROOMS、RATE_GATES 的名稱、遷移與既有密鑰保持不變。每 IP 12 次建房／分鐘、60 次 WebSocket／分鐘；Beta 另有跨 IP 全站 24 次建房／分鐘、96 次 WebSocket／分鐘上限。房主核准、獨立憑證、房間期限、資產白名單與 CSP 保留。v1.6.1 公開 Beta 的**自動房間**經使用者同意加入 Google 公開 STUN：`stun:stun.l.google.com:19302`（只有 STUN、沒有付費 TURN）；手動 QA 大廳仍不使用 STUN。STUN 可能讓 Google 取得玩家對外 IP；不記錄 IP／SDP 到 GitHub／測試日誌。
* 公開 Beta 可能斷線、不同 Wi-Fi／NAT 可能無法建立直連；STUN 可以產生 `srflx` 候選但不保證 NAT 打洞，必要時需另外評估 TURN／隱私／成本。若 STUN 15 秒內沒有完成收集，已取得 `host` 候選時仍保留原本直連方式，不讓 STUN 故障全面阻擋同區網。邀請連結含憑證，不可貼公開社群；前端明確標示測試版。遊戲進度不保證跨裝置保存。

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


## 2026-11-01｜跨裝置 STUN 焦點驗收（不重測已通過遊戲引擎）

- 使用**新的 SHA** 打包並更新既有 Beta Worker，不沿用舊版 ZIP。重新開新房間並重新整理兩端（舊房間不會自動取得 STUN）。
- Windows Chrome／Edge 與手機 Chrome／Safari（先同 Wi-Fi），房主先 Windows 再對調手機房主。房主核准後觀察連線成功／失敗提示；失敗只回傳 `ICE` 狀態和 `host/srflx/relay` 計數，不貼房間碼、邀請連結、SDP 或候選 IP。
- 理想情況候選計數出現 `srflx>0`，但某些網路仍會為 `0`。只要雙方真正進入好友大廳、確認準備、G05 連續遊玩至少 5 分鐘，並能結算與返回大廳，就可算本情境連線成功；僅有 srflx 不代表 RTC 已成功。
- 如同 Wi-Fi 成功，再切手機行動網路重試一次；行動網路仍失敗時，不持續調整 8 秒斷線／30～45 秒配對計時，先判別 NAT 不可打洞／是否需要 TURN，需使用者再授權付費或自架 relay。
- 斷線時保持 350ms 輸入中立化、2.5s 安全暫停及已連線後 8 秒短暫恢復；故障不影響既有單人正式站。
