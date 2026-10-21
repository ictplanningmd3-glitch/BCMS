import {test,expect} from '@playwright/test';
import {mkdtempSync,readFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {execFileSync} from 'node:child_process';
test('ZIP root HTML is self-contained and runs offline including storage and exports',async({page,context})=>{
 const dir=mkdtempSync(join(tmpdir(),'DBR extracted فارسی '));
 try {
  execFileSync('python3',['-c','import zipfile,sys;zipfile.ZipFile(sys.argv[1]).extractall(sys.argv[2])',resolve('DBR-Website.zip'),dir]);
  const url='http://127.0.0.1:4173/portable-check/index.html';
  const html=readFileSync(join(dir,'DBR-Website','index.html'),'utf8');
  expect(html).not.toMatch(/<script[^>]+src=/i);expect(html).not.toMatch(/<link[^>]+(?:stylesheet|manifest)/i);
  await page.route(url,route=>route.fulfill({contentType:'text/html; charset=utf-8',body:html}));
  const errors:string[]=[],network:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url())&&r.url()!==url)network.push(r.url())});
  await context.setOffline(true);
  // Managed Chromium blocks file:// by administrator policy. Serve exactly the
  // extracted bytes through an allowed loopback route; all network is offline.
  await page.goto(url);
  await expect(page.getByRole('heading',{name:'داشبورد مدیریتی',exact:true})).toBeVisible();
  expect(await page.evaluate(()=>document.fonts.check('14px BYekan'))).toBeTruthy();
  await page.getByRole('button',{name:'ثبت اقدام جدید',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByLabel('عنوان',{exact:true}).fill('ثبت مستقیم از فایل بدون سرور');await dialog.getByLabel('مسئول',{exact:true}).fill('آزمون فایل');await dialog.getByRole('button',{name:'ذخیره اطلاعات'}).click();
  await page.reload();await page.getByRole('button',{name:'اقدامات اصلاحی و بهبود',exact:false}).first().click();await expect(page.getByRole('button',{name:'ثبت مستقیم از فایل بدون سرور',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'رادار بلوغ DBR',exact:true}).click();await expect(page.getByRole('heading',{name:'حیات سازمانی و توان بقای اقتصادی',exact:true})).toBeVisible();
  await page.getByRole('button',{name:'گزارش‌ها و تحلیل‌ها',exact:true}).click();
  for(const [name,ext] of [['گزارش Word','docx'],['دفتر اطلاعات Excel','xlsx']]){
   const card=page.locator('.domain-card').filter({has:page.getByRole('heading',{name,exact:true})});const wait=page.waitForEvent('download');await card.getByRole('button').click();const download=await wait;const dest=join(dir,'report.'+ext);await download.saveAs(dest);expect(readFileSync(dest).subarray(0,2).toString()).toBe('PK');
  }
  await page.getByRole('button',{name:'مدیریت داده و پشتیبان‌گیری',exact:true}).click();const wait=page.waitForEvent('download');await page.getByRole('button',{name:'دریافت پشتیبان کامل'}).click();const download=await wait;const backup=join(dir,'backup.json');await download.saveAs(backup);expect(JSON.parse(readFileSync(backup,'utf8')).rows.some((r:{title:string})=>r.title==='ثبت مستقیم از فایل بدون سرور')).toBeTruthy();
  await page.getByLabel('انتخاب فایل پشتیبان').setInputFiles(backup);await expect(page.getByText('پیش‌نمایش:',{exact:false})).toBeVisible();await page.getByRole('button',{name:'ادغام و حفظ رکوردهای موجود'}).click();await expect(page.getByRole('status')).toContainText('ادغام انجام شد');
  expect(network).toEqual([]);expect(errors).toEqual([]);
 } finally {rmSync(dir,{recursive:true,force:true})}
});
