const assert=require('node:assert/strict');const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const base='http://127.0.0.1:3101';
async function login(page,email,password){await page.goto(base+'/login');await page.getByLabel('Email',{exact:true}).fill(email);await page.getByLabel('密碼',{exact:true}).fill(password);await page.getByRole('button',{name:'登入',exact:true}).click();await page.getByRole('heading',{name:'營運總覽',exact:true}).waitFor({timeout:60000});console.log('Test browser login passed.');}
(async()=>{
 for(let i=0;i<40;i++){try{const r=await fetch(base+'/login');if(r.ok)break;}catch{}await new Promise(r=>setTimeout(r,500));}
 const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'});
 try{
 const adminContext=await browser.newContext({viewport:{width:1440,height:1000}});const workerContext=await browser.newContext({viewport:{width:1440,height:1000}});const admin=await adminContext.newPage(),worker=await workerContext.newPage();
 await login(admin,'admin@account-test.invalid','Old12345');await login(worker,'employee@account-test.invalid','Reset123');
 if(process.env.ERP_ACCOUNT_RESET_ONLY!=='1'){
 await worker.locator('nav').getByRole('button',{name:'09帳號管理'}).click();assert.equal(await worker.getByRole('heading',{name:'管理員重設員工密碼'}).count(),0);
 await worker.getByLabel('目前密碼',{exact:true}).fill('Reset123');await worker.getByLabel('新密碼（至少 8 碼）',{exact:true}).fill('Eight888');await worker.getByLabel('確認新密碼',{exact:true}).fill('Eight888');const changeResponse=worker.waitForResponse(r=>new URL(r.url()).pathname==='/api/erp/password');await worker.getByRole('button',{name:'儲存新密碼'}).click();const changed=await changeResponse;assert.equal(changed.status(),200,changed.status()!==200?await changed.text():'');await worker.waitForURL('**/login',{timeout:60000});assert.equal((await worker.request.get(base+'/api/erp')).status(),401);console.log('Old session rejected after password update.');
 await login(worker,'employee@account-test.invalid','Eight888');
 }
 await admin.locator('nav').getByRole('button',{name:'09帳號管理'}).click();const section=admin.locator('section').filter({has:admin.getByRole('heading',{name:'管理員重設員工密碼'})});await section.locator('select[name="employeeId"]').selectOption({label:'employee@account-test.invalid · employee@account-test.invalid'});await section.getByLabel('管理員目前密碼',{exact:true}).fill('Old12345');await section.getByLabel('新密碼（至少 8 碼）',{exact:true}).fill('Fresh123');await section.getByLabel('確認新密碼',{exact:true}).fill('Fresh123');await section.getByRole('button',{name:'重設員工密碼'}).click();await admin.getByRole('status').filter({hasText:'員工密碼已重設'}).waitFor({timeout:60000});await admin.screenshot({path:'artifacts/account-management-desktop.png',fullPage:true});
 assert.equal((await worker.request.get(base+'/api/erp')).status(),401);
 await worker.goto(base+'/login');await worker.waitForLoadState('networkidle');await worker.getByLabel('Email',{exact:true}).fill('employee@account-test.invalid');await worker.getByLabel('密碼',{exact:true}).fill(process.env.ERP_ACCOUNT_RESET_ONLY==='1'?'Reset123':'Eight888');const denied=worker.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname==='/login');await worker.getByRole('button',{name:'登入',exact:true}).click();await denied;assert.equal((await worker.request.get(base+'/api/erp')).status(),401);assert.equal(new URL(worker.url()).pathname,'/login');
 await login(worker,'employee@account-test.invalid','Fresh123');await worker.locator('nav').getByRole('button',{name:'09帳號管理'}).click();await worker.setViewportSize({width:390,height:844});assert.equal(await worker.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);await worker.screenshot({path:'artifacts/account-management-mobile.png',fullPage:true});
 const blocked=await admin.request.post(base+'/api/erp/password',{headers:{Origin:'https://untrusted.example'},data:{}});assert.equal(blocked.status(),403);
 console.log('PASS: employee self-change and re-login, ADMIN reset and old-session rejection, obsolete-password rejection, fixed 09 navigation, employee permissions, origin protection, desktop/mobile.');
 }finally{await browser.close()}
})().catch(e=>{console.error(e.message);process.exitCode=1});
