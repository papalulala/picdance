# 畫一個你，讓木都跳起來 · picdance AR

## GitHub Pages 網站

本儲存庫根目錄包含可直接透過 GitHub Pages 發布的網站檔案，不必解壓縮。
預計網址：https://papalulala.github.io/picdance/

- Three.js 嘉義木都場景，包含最新模型與單行標題。
- 自由繪圖，作品沿不同路線遊走並做波浪舞動。
- 多人共享作品：180 秒到期、最多 50 張、滿額淘汰最早作品。
- WebXR AR：支援裝置可將小鎮放到真實平面；不支援時保留一般 3D 瀏覽。

## 發布方式

Settings → Pages → Deploy from a branch → main → /(root)。
GitHub Pages 提供前端網頁；作品同步由既有的公開後端服務提供。這個版本不把瀏覽器本機資料當作多人同步。

## 編輯原始碼

Page.tsx、stage.tsx、motion.mjs、style.css、main.tsx 為可編輯程式碼。
index.template.html 為建置入口；index.html 為已建置的 Pages 入口。

```sh
npm install
npm run build
```

建置結果位於 dist，發布時將 dist 內容更新到儲存庫根目錄。
需要 Node.js 22.13 以上。AR 需 HTTPS、支援 WebXR 的裝置與使用者相機授權；尚未完成實機 AR 測試。

## 即時空間 AR
使用 iPhone Safari 或 Android Chrome，按「開啟空間 AR」，允許相機、掃描環境後點選放置。保留原本 Three.js 動畫、波浪扭動及多人作品同步，不使用快照。
使用 8th Wall Engine Binary 1.0.0（Niantic Spatial），按需自官方 CDN 載入 SLAM；授權見 XR-LICENSE.txt。特徵點定位是估計表面，不保證桌面精確辨識。光線不足、反光或單色表面會影響追蹤。
手機實機追蹤效果仍需 iPhone 和 Android 測試。

