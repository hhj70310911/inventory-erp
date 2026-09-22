# 庫務 ERP

Next.js + Prisma + PostgreSQL 的進銷存管理系統。第一版已提供 SKU、多倉庫、批次成本、採購入庫、FIFO 出貨、客戶帳款及員工操作紀錄。

## 本機啟動

1. 依 .env.example 設定獨立 ERP 資料庫，勿使用原官網連線。
2. 安裝依賴 npm ci；npm run db:check 檢查目標設定。
3. 經確認的空 ERP 資料庫使用 npm run db:migrate:deploy 建立資料表。
4. 設定管理員 Email／密碼後 npm run db:seed（不會覆寫既有帳號）。
5. npm run dev；NEXTAUTH_URL 必須與開發網址一致。本工作區目前使用 127.0.0.1:3100。

完整操作與部署說明見 [docs/erp-setup.md](docs/erp-setup.md)。

## 驗證

- npm run test:erp：離線測試。
- npm run test:erp:integration：僅限獨立開發／測試資料庫；建立並清除臨時測試 schema。
- npm run build：正式編譯。

不要執行複製過來的舊商城測試／資料修復 scripts；它們不屬於 ERP 初始化流程。
