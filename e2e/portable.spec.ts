import {test,expect} from '@playwright/test';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
test('standalone ZIP is clean, self-contained and handles scoped actions entirely offline',async({page,context})=>{
 const dir=mkdtempSync(join(tmpdir(),'DBR extracted فارسی '));
 try{
 execFileSync('python3',['-c','import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',resolve('DBR-Website.zip'),dir]);const html=readFileSync(join(dir,'DBR-Website/index.html'),'utf8');expect(html).not.toMatch(/<script[^>]+src=/i);expect(html).not.toMatch(/<link[^>]+(?:stylesheet|manifest)/i);
 const url='http://127.0.0.1:4173/portable-check/index.html';await page.route(url,route=>route.fulfill({contentType:'text/html; charset=utf-8',body:html}));const errors:string[]=[],network:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&r.url()!==url)network.push(r.url())});await context.setOffline(true);await page.goto(url);await expect(page.getByRole('heading',{name:'داشبورد رادار',exact:true})).toBeVisible();expect(await page.evaluate(()=>document.fonts.check('14px BYekan'))).toBeTruthy();await expect(page.locator('.kpi strong').first()).toHaveText('۰');
 await page.locator('.sidebar').getByRole('button',{name:'تحلیل اثر کسب‌وکار',exact:true}).click();const domain=page.locator('.domain-card').first();await domain.getByRole('checkbox').check();await domain.getByRole('button',{name:'مشاهده پترن‌ها'}).click();const pattern=page.locator('.pattern-card').first();await pattern.getByRole('checkbox').check();await pattern.getByRole('button',{name:'ورود به پترن و BIA'}).click();await page.getByRole('button',{name:'فعالیت جدید',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByLabel('عنوان فعالیت',{exact:true}).fill('فعالیت مستقل');await dialog.getByLabel('وضعیت',{exact:true}).selectOption('اجرایی شده');await dialog.getByRole('button',{name:'ذخیره فعالیت'}).click();await page.reload();await page.locator('.sidebar').getByRole('button',{name:'اقدامات و پیگیری',exact:true}).click();await expect(page.getByRole('button',{name:'فعالیت مستقل',exact:true})).toBeVisible();
 await page.locator('.sidebar').getByRole('button',{name:'گزارش‌ها و تحلیل‌ها',exact:true}).click();for(const [label,ext] of [['Word','docx'],['Excel','xlsx']]){const dl=page.waitForEvent('download');await page.locator('.export-card').filter({hasText:label}).click();const file=await dl,dest=join(dir,'report.'+ext);await file.saveAs(dest);expect(readFileSync(dest).subarray(0,2).toString()).toBe('PK')}
 expect(errors).toEqual([]);expect(network).toEqual([]);
 }finally{rmSync(dir,{recursive:true,force:true})}
});
