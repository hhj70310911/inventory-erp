type Account={id:string;role:string;employeeRole:string|null;active:boolean};
export function employeeEditError(actor:Account,target:Account,next:{role:string;active:boolean}):string|null{
 if(!actor.active||(actor.role!=='ADMIN'&&actor.employeeRole!=='MANAGER'))return '沒有員工管理權限';
 if(target.role!=='ADMIN'&&!target.employeeRole)return '此帳號不是 ERP 員工';
 const current=target.role==='ADMIN'?'ADMIN':target.employeeRole;
 if(target.id===actor.id&&(next.role!==current||next.active!==target.active))return '不能變更自己的角色或啟用狀態';
 if(target.role==='ADMIN'){
  if(actor.role!=='ADMIN')return '只有系統管理員可以編輯管理員資料';
  if(next.role!=='ADMIN'||!next.active)return '系統管理員不能在此降權或停用';
 }else if(next.role==='ADMIN')return '不能透過員工編輯建立系統管理員';
 if(actor.role!=='ADMIN'){
  if(target.employeeRole==='MANAGER'&&target.id!==actor.id)return '主管不能編輯其他主管';
  if(next.role==='MANAGER'&&target.id!==actor.id)return '只有系統管理員可以指派主管';
 }
 return null;
}
