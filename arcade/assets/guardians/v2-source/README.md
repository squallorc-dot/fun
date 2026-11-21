# Bio-City Arcade v2｜3D 關鍵姿勢輸入規範（Phase 1B-1）

此資料夾只供**尚未發布**的透明 3D 角色關鍵姿勢 PNG。正式的 `arcade/assets/guardians/*.png` 與 `arcade/assets/guardians/2x/*.png` 一律不得在烘焙階段覆寫。

## 輸入位置

每位角色各有一個子資料夾：

`arcade/assets/guardians/v2-source/<key>/`

`<key>` 必須是 `guardian-art.js` 既有的 11 個角色鍵：`burner-sister`、`mj-robot`、`moo-moo`、`ye-bao-ex`、`jelly-trio`、`veggie-kid`、`oracle-guardian`、`enemy-grunt`、`enemy-brute`、`enemy-ranged`、`enemy-boss`。

**所有關鍵姿勢：**角色須面向右方、RGBA 透明背景、沒有預先合成的殘影與外框、勿把兩種姿勢同時放在同一 PNG。建議各張圖片採一致鏡頭及角色比例，完整保留足部及武器。支援不超過 4096×4096 的非交錯 8-bit PNG（RGB、RGBA、灰階、索引色，來源必須含透明像素）。

| 必填 PNG 檔名 | 代表姿勢 |
|---|---|
| `K01-idle.png` | 待機 |
| `K02-walk-a.png` | 行走第一步 |
| `K03-walk-b.png` | 行走第二步 |
| `K04-jump.png` | 跳躍 |
| `K05-land.png` | 著地 |
| `K06-attack-windup.png` | 攻擊蓄力 |
| `K07-attack1-hit.png` | 第一段命中姿勢 |
| `K08-attack2-hit.png` | 第二段命中姿勢 |
| `K09-attack3-hit.png` | 第三段命中姿勢 |
| `K10-hurt.png` | 受擊 |
| `K11-dodge.png` | 閃避 |
| `K12-skill.png` | 技能 |

選填 0～4 張：`K13-ko.png`（倒地）、`K14-celebrate.png`（勝利）、`K15-walk-c.png`（第三步）、`K16-walk-d.png`（第四步）。不提供的姿勢會使用固定替代格，**絕不做跨姿勢半透明混合**。

## 執行烘焙

```bash
node scripts/bake-guardian-v2.cjs --key burner-sister --portable
# 如已依既有 scripts/build-guardian-art.cjs 的方式安裝 Sharp，可省略 --portable
# --effects 可選擇只在三段命中格加入獨立能量線，並非角色殘影
```

預設輸出至 `arcade/qa/guardian-v2-bake/<key>/`：`1x/<key>.png`（1280×1440，160px 單格）、`2x/<key>.png`（2560×2880，320px 單格）、各自 `manifest.json`，以及根目錄 `bake-report.json`。**敵人也保留 320px 母版，但目前實際載入仍維持既有 160px 流程。**第 72 格完全透明；71 格位置與既有 `BioGuardianArt.clips` 一致；命中格索引 24、30、37 為 **0-based**（第 25、31、38 格）。

像素處理遵循固定單姿勢抽格（hard-cut）、整組等比例縮放、腳底錨點 1x `(80,140)`／2x `(160,280)`。呼吸與步態為像素級微位移，跳躍格刻意離地；著地格由腳底向上壓縮。全流程只處理 PNG，不涉及遊戲碰撞、物理、計分、Snapshot、輸入、GTM／GA4 或正式發布。

## 檢驗

```bash
node scripts/test-bake-guardian-v2.cjs
node scripts/test-arcade-art.cjs
```

自動測試用合成透明 PNG 驗證全部有效格、留白格、錨點、單一姿勢顏色、命中索引、Manifest／SHA256、敵人雙密度以及正式資產覆寫防護。`guardian-art.js` 已共用於單機與多人；2x 圖失敗時會自動降至現有 1x 資產。新圖集未經另外驗收前，**不得修改或覆蓋現有正式圖集與載入 URL**。
