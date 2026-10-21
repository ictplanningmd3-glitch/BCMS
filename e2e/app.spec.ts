import {test,expect} from '@playwright/test';
test('Persian workflow, persistence, export, responsive and offline',async({page,context})=>{
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('/');await expect(page.getByRole('heading',{name:'داشبورد مدیریتی'})).toBeVisible();
 await page.screenshot({path:'/tmp/dbr-desktop.png',fullPage:true});
 await page.getByRole('button',{name:'ثبت اقدام جدید',exact:true}).click();
 const dialog=page.getByRole('dialog');await dialog.getByLabel('عنوان',{exact:true}).fill('اقدام آزمایشی ذخیره‌سازی');await dialog.getByLabel('مسئول',{exact:true}).fill('مدیر آزمون');await dialog.getByRole('button',{name:'ذخیره اطلاعات'}).click();
 await page.reload();await page.getByRole('button',{name:'اقدامات اصلاحی و بهبود',exact:false}).first().click();await expect(page.getByRole('button',{name:'اقدام آزمایشی ذخیره‌سازی',exact:true})).toBeVisible();
 await page.getByRole('button',{name:'اقدام آزمایشی ذخیره‌سازی',exact:true}).click();await dialog.getByLabel('پیشرفت (درصد)').fill('90');await dialog.getByRole('button',{name:'ذخیره اطلاعات'}).click();
 await page.getByRole('button',{name:'رادار بلوغ DBR',exact:true}).click();await expect(page.getByRole('heading',{name:'حیات سازمانی و توان بقای اقتصادی',exact:true})).toBeVisible();await page.getByRole('button',{name:'ثبت ارزیابی دامنه'}).first().click();await dialog.getByLabel('بلوغ (۰ تا ۵)').fill('3');await dialog.getByRole('button',{name:'ذخیره اطلاعات'}).click();
 await page.getByRole('button',{name:'مدیریت داده و پشتیبان‌گیری',exact:true}).click();const download=page.waitForEvent('download');await page.getByRole('button',{name:'دریافت پشتیبان کامل'}).click();await (await download).saveAs('/tmp/dbr-backup.json');
 await page.getByRole('button',{name:'گزارش‌ها و تحلیل‌ها',exact:true}).click();for(const name of ['گزارش Word','دفتر اطلاعات Excel']){const card=page.locator('.domain-card').filter({has:page.getByRole('heading',{name,exact:true})});const d=page.waitForEvent('download');await card.getByRole('button').click();const file=await d;await file.saveAs('/tmp/'+file.suggestedFilename())}
 await page.getByRole('button',{name:'داشبورد مدیریتی',exact:true}).click();await page.getByRole('button',{name:'تغییر پوسته',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.reload();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');await page.getByRole('button',{name:'تغییر پوسته',exact:true}).click();
 await page.setViewportSize({width:390,height:844});await page.waitForFunction(()=>document.querySelector('.sidebar')!.getBoundingClientRect().left>=innerWidth-1);await page.screenshot({path:'/tmp/dbr-mobile.png',fullPage:true});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBeTruthy();
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.waitForFunction(()=>!!navigator.serviceWorker.controller);await context.setOffline(true);await page.reload();await expect(page.getByRole('heading',{name:'داشبورد مدیریتی'})).toBeVisible();expect(errors).toEqual([]);
});
test('backup import validates, previews, merges and replaces only after confirmation',async({page})=>{
 await page.goto('/');await page.getByRole('heading',{name:'داشبورد مدیریتی'}).waitFor();
 await page.getByRole('button',{name:'مدیریت داده و پشتیبان‌گیری',exact:true}).click();
 const input=page.getByLabel('انتخاب فایل پشتیبان');await input.setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from('{"schemaVersion":"999"}')});await expect(page.getByRole('status')).toContainText('فایل نامعتبر');
 await input.setInputFiles('/tmp/dbr-backup.json');await expect(page.getByText('پیش‌نمایش:',{exact:false})).toBeVisible();await page.getByRole('button',{name:'ادغام و حفظ رکوردهای موجود'}).click();await expect(page.getByRole('status')).toContainText('ادغام انجام شد');
 await input.setInputFiles('/tmp/dbr-backup.json');page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'جایگزینی با تأیید'}).click();await expect(page.getByRole('status')).toContainText('بازیابی کامل شد');
 await page.getByRole('button',{name:'اقدامات اصلاحی و بهبود',exact:false}).first().click();await page.getByRole('button',{name:'اقدام آزمایشی ذخیره‌سازی',exact:true}).click();page.once('dialog',d=>d.accept());await page.getByRole('dialog').getByRole('button',{name:'حذف',exact:true}).click();await expect(page.getByRole('button',{name:'اقدام آزمایشی ذخیره‌سازی',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'سازمان و دامنه BCMS',exact:true}).click();page.once('dialog',d=>d.accept());await page.getByRole('button',{name:'ایجاد سازمان خالی',exact:true}).click();await page.getByRole('button',{name:'داشبورد مدیریتی',exact:true}).click();await expect(page.locator('.demo-banner')).toHaveCount(0);await expect(page.locator('.kpi-value').first()).toContainText('۰');
 await page.pdf({path:'/tmp/DBR-print.pdf',format:'A4',printBackground:true});
});
