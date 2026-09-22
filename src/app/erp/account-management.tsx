'use client';
import { useRef, useState } from 'react';
type Employee={id:string;email:string;displayName:string;role:string;active:boolean;employeeRole:string|null};
export default function AccountManagement({user,employees}:{user:{id:string;email:string;admin:boolean};employees:Employee[]}){
 const [busy,setBusy]=useState(false),[message,setMessage]=useState(''),[error,setError]=useState('');const sending=useRef(false);
 const targets=employees.filter(e=>e.active&&e.role!=='ADMIN'&&e.employeeRole&&e.id!==user.id);
 async function submit(e:React.FormEvent<HTMLFormElement>,action:'changePassword'|'resetEmployeePassword'){
  e.preventDefault();if(sending.current)return;
  const form=e.currentTarget;const f=new FormData(form);setError('');setMessage('');
  if(f.get('newPassword')!==f.get('confirmPassword')){setError('兩次輸入的新密碼不一致');return;}
  sending.current=true;setBusy(true);
  try{const response=await fetch('/api/erp/password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action,...Object.fromEntries(f)})});const result=await response.json();if(!response.ok)throw Error(result.error||'密碼更新失敗');form.reset();if(result.reauthenticate){window.location.assign('/login');return;}setMessage('員工密碼已重設，請將新密碼安全交給本人；原登入狀態已失效。');}
  catch(e){setError(e instanceof Error?e.message:'連線失敗，請稍後重試');}finally{sending.current=false;setBusy(false);}
 }
 const passwords=<><label>新密碼（至少 8 碼）<input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required/></label><label>確認新密碼<input name="confirmPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required/></label></>;
 return <>{error&&<div className="notice error" role="alert">{error}</div>}{message&&<div className="notice" role="status">{message}</div>}
 <section className="panel"><h2>修改自己的密碼</h2><p>登入帳號：{user.email}</p><p>密碼至少 8 碼。修改成功後會返回登入頁，請使用新密碼重新登入。</p><form onSubmit={e=>void submit(e,'changePassword')}><fieldset disabled={busy}><div className="form-grid"><label>目前密碼<input name="currentPassword" type="password" autoComplete="current-password" required/>{/* Never prefill existing passwords. */}</label>{passwords}</div><button className="primary" disabled={busy}>{busy?'處理中…':'儲存新密碼'}</button></fieldset></form></section>
 {user.admin&&<section className="panel"><h2>管理員重設員工密碼</h2><p>選擇員工並設定新密碼。為確認是本人操作，請輸入你自己的管理員密碼。</p>{targets.length?<form onSubmit={e=>void submit(e,'resetEmployeePassword')}><fieldset disabled={busy}><div className="form-grid"><label>員工帳號<select name="employeeId" defaultValue="" required><option value="" disabled>請選擇員工</option>{targets.map(e=><option key={e.id} value={e.id}>{e.displayName||e.email} · {e.email}</option>)}</select></label><label>管理員目前密碼<input name="currentPassword" type="password" autoComplete="current-password" required/></label>{passwords}</div><button className="primary" disabled={busy}>{busy?'處理中…':'重設員工密碼'}</button></fieldset></form>:<p className="empty">目前沒有可重設的員工帳號。請先到「基礎資料 → 員工與權限」建立員工。</p>}</section>}</>;
}
