# 守護者聯盟｜Cloudflare 雲端自動部署｜免 Windows 指令
此文件只在 `release/bio-city-v161-stun-beta` 部署專用分支，不影響正式 `main` GitHub Pages。
此版本包含 Google 公開 STUN，**不包含任何 Cloudflare API 金鑰**，亦不新增 Worker 或刪除 Durable Objects。

## 一次性連接（需帳戶持有人從網頁授權）
Cloudflare Dashboard > Workers & Pages > 現有 `bio-city-v161-signaling` > Settings > Builds > Connect > GitHub；選擇 `squallorc-dot/fun`。
將 **production branch** 選為 `release/bio-city-v161-stun-beta`（**不是 main、也不是 feature PR 分支**），Root directory 留空／根目錄，Build command = `npm run build`，Deploy command = `npx wrangler deploy`。預覽建置請關閉；不要設定額外 route／custom domain；Worker Name 必須完全相符。Cloudflare 會替這個 Git integration 管理部署用 token，不需要把任何 API 金鑰貼給 ChatGPT 或 GitHub。
Cloudflare 的 GitHub 授權及首次連接無法透過目前已連接的 GitHub 操作權限替代，需帳戶持有人在 Cloudflare 頁面同意一次。

## 自動關卡
`npm run build` 會先向 GitHub 確認來源 PR #37 仍指向 8f01c110b88ccde5fbff964381607f3b10cf95e2，`FUNAI CARE bilingual quality gate` 與 `v1.6.1 signaling prototype` 都是 completed/success，且正式發布分支只多出一筆部署包裝提交（禁止修改遊戲程式）。任何條件不符會拒絕部署，不動既有 Worker。
CI 全綠後才能讓 Cloudflare 第一次正式執行建置或按 Retry。
發布資產清單來源是 `scripts/build-controlled-assets-v161.mjs`，獨立發布配置是本分支根目錄的 `wrangler.toml`。正式 Worker 的 `RATE_SECRET` 仍在 Cloudflare Secrets；此配置不包含密鑰與本機 IP 白名單。雲端 URL 不涉及任何私人房間 token。

## 部署成功後
瀏覽 https://bio-city-v161-signaling.squall-orc.workers.dev/arcade/friends/?lang=zh
網頁中按「建立房間」，系統會自動顯示可供手機掃描的 QR Code（**只有邀請者私下分享**；裡面包含入房憑證）。
先同 Wi-Fi Windows 房主／手機加入玩 G05 桌球至少 5 分鐘，再同 Wi-Fi 手機房主，最後手機行動網路重試。只截圖安全診斷中的 ICE 狀態及 host/srflx/relay 計數；不截房間碼、邀請網址、IP、SDP。
`srflx>0` 只證明 STUN 有取得網路候選，不能代表已連上；跨網若失敗可能要另評估 TURN。

## 停用及回復
在 Cloudflare Worker 的 Deployments/Versions 選用前一個受控版本 Roll back；若要暫停未來 Git Builds，於 Settings > Builds 停用或斷開 Git integration。之後正式發布分支推送前都必須重新先讓新 PR SHA 通過驗證。
請勿把此部署根目錄 `wrangler.toml` 合併到 `main`，它只供獨立 Beta Worker Git Builds 使用。
