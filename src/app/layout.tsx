import type { Metadata } from 'next';
import './globals.css';
// ERP pages are rendered per request. Builds must not query an uninitialized database.
export const dynamic = 'force-dynamic';
export const metadata:Metadata={title:'庫務 ERP｜進銷存管理',description:'商品、批次庫存、銷售與收款管理'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="zh-Hant"><body>{children}</body></html>;}
