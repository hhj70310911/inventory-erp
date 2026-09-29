const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/user/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({headless:true,executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium-1223/chrome-win64/chrome.exe'});try{
 const page=await browser.newPage({viewport:{width:1440,height:1000}});
 await page.goto('http://127.0.0.1:3106/login');await page.getByLabel('Email',{exact:true}).fill('admin@customer-test.invalid');await page.getByLabel('密碼',{exact:true}).fill('Test12345');await page.getByRole('button',{name:'登入',exact:true}).click();
 await page.getByRole('heading',{name:'營運總覽',exact:true}).waitFor({timeout:60000});await page.locator('nav').getByRole('button',{name:/基礎資料/}).click();
 const panel=page.locator('.customer-management:not(.supplier-management)');
 const downloaded=page.waitForEvent('download');await panel.getByRole('link',{name:/下載 Excel 模板/}).click();const file=await downloaded;assert.equal(file.suggestedFilename(),'客戶匯入模板.xlsx');await file.saveAs('artifacts/customer-template/download.xlsx');
 await panel.getByLabel('上傳已填寫的 Excel').setInputFiles('scripts/fixtures/customer-import.xlsx');
 await panel.getByRole('button',{name:'確認匯入 25 位客戶'}).waitFor({timeout:30000});
 await page.screenshot({path:'artifacts/customer-import-desktop.png',fullPage:true});
 await panel.getByRole('button',{name:'確認匯入 25 位客戶'}).click();await panel.getByRole('heading',{name:'匯入預覽',exact:true}).waitFor({state:'detached',timeout:60000});
 await panel.getByLabel('搜尋客戶',{exact:true}).fill('00001');assert.match(await panel.innerText(),/測試客戶1/);
 await panel.getByLabel('搜尋客戶',{exact:true}).fill('');await panel.getByRole('button',{name:'下一頁',exact:true}).click();assert.match(await panel.innerText(),/第 2 \/ 2 頁/);
 await panel.getByLabel('上傳已填寫的 Excel').setInputFiles('scripts/fixtures/customer-import.xlsx');await panel.getByText(/25 筆需修正/).waitFor();assert.ok(await panel.getByRole('button',{name:'確認匯入 25 位客戶'}).isDisabled());
 await page.setViewportSize({width:390,height:844});await panel.scrollIntoViewIfNeeded();await page.screenshot({path:'artifacts/customer-import-mobile.png'});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
 await panel.getByRole('button',{name:'取消匯入'}).click();await page.getByRole('navigation',{name:'手機主要導覽'}).getByRole('button',{name:'銷售',exact:true}).click();await page.getByRole('button',{name:/新增銷售單/}).first().click();await page.getByLabel('搜尋開單客戶').fill('00025');assert.match(await page.locator('select[name=customerId]').innerText(),/測試客戶25/);assert.equal(await page.locator('select[name=customerId] option').count(),2);
 console.log('PASS: download, actual XLSX preview/import, duplicate rejection, pagination, mobile width and searchable sales customer.');
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1;});
