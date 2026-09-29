'use client';
import {useRef,useState} from 'react';
import {previewSuppliers,type SupplierPreviewRow} from '@/lib/erp/supplier-import';
type Supplier={id:string;code?:string;name:string;note?:string};
type Props={suppliers:Supplier[];manage:boolean;busy:boolean;save:(input:Record<string,unknown>,form?:HTMLFormElement)=>Promise<boolean>};
export default function SupplierManagement({suppliers,manage,busy,save}:Props){
 const [query,setQuery]=useState(''),[page,setPage]=useState(0),[preview,setPreview]=useState<SupplierPreviewRow[]>([]),[previewPage,setPreviewPage]=useState(0),[error,setError]=useState(''),[loading,setLoading]=useState(false),[filename,setFilename]=useState('');
 const upload=useRef<HTMLInputElement>(null);const reading=useRef(false);
 const matches=suppliers.filter(c=>[c.code,c.name,c.note].join(' ').toLowerCase().includes(query.trim().toLowerCase()));
 const pages=Math.max(1,Math.ceil(matches.length/20));const current=Math.min(page,pages-1);const errors=preview.filter(r=>r.errors.length).length;
 async function read(file?:File){
  if(!file||reading.current)return;reading.current=true;setLoading(true);setError('');setPreview([]);setFilename(file.name);setPreviewPage(0);
  try{
   if(!file.name.toLowerCase().endsWith('.xlsx'))throw Error('請上傳 Excel .xlsx 檔案。');
   if(file.size>2*1024*1024)throw Error('檔案不得超過 2 MB。');
   const {readSheet}=await import('read-excel-file/browser');
   const cells=await readSheet(file,'供應商資料');
   setPreview(previewSuppliers(cells,suppliers));
  }catch(e){setError(e instanceof Error?e.message:'Excel 讀取失敗，請重新下載模板填寫。');}finally{setLoading(false);reading.current=false;if(upload.current)upload.current.value='';}
 }
 async function confirm(){
  const ok=await save({action:'importSuppliers',rows:preview.map(({code,name,note})=>({code,name,note}))});
  if(ok){setPreview([]);setFilename('');setQuery('');setPage(0);}
 }
 return <section className="panel customer-management supplier-management"><div className="section-heading"><h2>供應商 <small>{suppliers.length} 位</small></h2>{manage&&<a className="quiet customer-template" href="/templates/supplier-import.xlsx" download="供應商匯入模板.xlsx">下載 Excel 模板 ↓</a>}</div>
 {manage&&<><form onSubmit={e=>{e.preventDefault();const form=e.currentTarget;const values=new FormData(form);void save({action:'supplier',code:values.get('code'),name:values.get('name'),note:values.get('note')},form);}}><div className="form-grid"><label>編碼<input name="code" required maxLength={160}/></label><label>名稱<input name="name" required maxLength={160}/></label><label>備註（選填）<input name="note" maxLength={2000}/></label></div><button className="primary" disabled={busy||loading}>新增供應商</button></form>
 <div className="customer-import"><h3>批次匯入供應商</h3><p>下載模板，在「供應商資料」填入編碼、名稱及備註後上傳。每次最多 1000 位，限 2 MB 的 .xlsx；只新增，不覆蓋既有資料。</p><label>上傳已填寫的 Excel<input ref={upload} type="file" accept=".xlsx" disabled={busy||loading} onChange={e=>void read(e.target.files?.[0])}/></label>{loading&&<p role="status">正在讀取 Excel…</p>}{error&&<p role="alert" className="notice error">{error}</p>}
 {preview.length>0&&<div><h3>匯入預覽</h3><p>{filename} · 共 {preview.length} 筆 · {errors?`${errors} 筆需修正，請修改 Excel 後重新上傳`:'檢查通過，確認後才會寫入系統'}</p><div className="table-scroll"><table><thead><tr><th>Excel 列</th><th>供應商編碼</th><th>供應商名稱</th><th>備註</th><th>檢查</th></tr></thead><tbody>{preview.slice(previewPage*20,(previewPage+1)*20).map(r=><tr key={r.row}><td>{r.row}</td><td>{r.code}</td><td>{r.name}</td><td>{r.note||'—'}</td><td>{r.errors.length?r.errors.join('；'):'可新增'}</td></tr>)}</tbody></table></div><div className="customer-pagination"><button type="button" className="quiet" disabled={previewPage===0||busy} onClick={()=>setPreviewPage(previewPage-1)}>上一頁預覽</button><span>{previewPage+1} / {Math.ceil(preview.length/20)}</span><button type="button" className="quiet" disabled={(previewPage+1)*20>=preview.length||busy} onClick={()=>setPreviewPage(previewPage+1)}>下一頁預覽</button></div><div className="customer-pagination"><button type="button" className="primary" disabled={busy||loading||errors>0} onClick={()=>void confirm()}>{busy?'匯入中…':`確認匯入 ${preview.length} 位供應商`}</button><button type="button" className="quiet" disabled={busy} onClick={()=>{setPreview([]);setFilename('');}}>取消匯入</button></div></div>}</div></>}
 <label>搜尋供應商<input type="search" placeholder="輸入編碼、名稱或備註" value={query} onChange={e=>{setQuery(e.target.value);setPage(0);}}/></label><div className="table-scroll"><table><thead><tr><th>編碼</th><th>名稱</th><th>備註</th></tr></thead><tbody>{matches.slice(current*20,(current+1)*20).map(c=><tr key={c.id}><td>{c.code}</td><td>{c.name}</td><td>{c.note||'—'}</td></tr>)}</tbody></table></div>{!matches.length&&<p className="empty">沒有符合條件的供應商。</p>}<div className="customer-pagination"><span>共 {matches.length} 位 · 第 {current+1} / {pages} 頁</span><button type="button" className="quiet" disabled={current===0} onClick={()=>setPage(current-1)}>上一頁</button><button type="button" className="quiet" disabled={current+1>=pages} onClick={()=>setPage(current+1)}>下一頁</button></div>
 </section>;
}
