import { z } from 'zod';
export const supplierImportRow = z.object({
 code:z.string().trim().min(1,'請填供應商編碼').max(160,'供應商編碼最多 160 字'),
 name:z.string().trim().min(1,'請填供應商名稱').max(160,'供應商名稱最多 160 字'),
 note:z.string().trim().max(2000,'備註最多 2000 字').default(''),
});
export const supplierImportRows=z.array(supplierImportRow).min(1).max(1000);
export type SupplierImportRow=z.infer<typeof supplierImportRow>;
export type SupplierPreviewRow=SupplierImportRow & {row:number;errors:string[]};
export function previewSuppliers(cells:unknown[][],existing:{code?:string}[]):SupplierPreviewRow[]{
 if(!['供應商編碼','供應商名稱','備註'].every((v,i)=>cells[0]?.[i]===v)||cells[0]?.slice(3).some(v=>v!=null&&v!==''))throw Error('請使用下載的模板，保留第一列「供應商編碼、供應商名稱、備註」。');
 const rows:SupplierPreviewRow[]=[];const seen=new Map<string,SupplierPreviewRow>();const codes=new Set(existing.map(c=>c.code));
 for(let i=1;i<cells.length;i++){
  const values=cells[i];if(values.every(v=>v==null||v===''))continue;
  if(rows.length>=1000)throw Error('每次最多匯入 1000 筆供應商，請分批上傳。');
  const errors:string[]=[];
  const text=(v:unknown)=>{if(v==null)return '';if(typeof v!=='string'&&typeof v!=='number'){errors.push('請填文字，不支援日期或其他格式');return '';}return String(v).trim();};
  const row={row:i+1,code:text(values[0]),name:text(values[1]),note:text(values[2]),errors};
  if(values.slice(3).some(v=>v!=null&&v!==''))errors.push('請勿在模板三欄以外填寫資料');
  const result=supplierImportRow.safeParse(row);if(!result.success)errors.push(...result.error.issues.map(v=>v.message));
  if(codes.has(row.code))errors.push('供應商編碼已存在');
  const previous=seen.get(row.code);if(previous){errors.push('檔案內供應商編碼重複');previous.errors.push('檔案內供應商編碼重複');}
  seen.set(row.code,row);rows.push(row);
 }
 if(!rows.length)throw Error('檔案沒有供應商資料，請從第二列開始填寫。');return rows;
}
