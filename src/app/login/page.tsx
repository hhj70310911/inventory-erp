import { LoginForm } from './LoginForm';
export default function Login(){return <main className="erp-login"><div className="erp-mark">庫</div><p className="erp-eyebrow">INVENTORY WORKSPACE</p><h1>庫務 ERP</h1><p>登入員工帳號，開始管理庫存與訂單。</p><LoginForm callbackUrl="/erp"/></main>;}
