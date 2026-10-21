import {spawnSync} from 'node:child_process';
const result=spawnSync('python3',['-c',String.raw`
from pathlib import Path
from zipfile import ZipFile,ZIP_DEFLATED
root=Path.cwd()
output=root/'DBR-Website.zip'
standalone=root/'DBR-Standalone.html'
if not standalone.is_file(): raise SystemExit('Run npm run build first')
skip={'.git','node_modules','test-results','playwright-report'}
guide='''راهنمای اجرای DBR

۱. فایل ZIP را کاملاً استخراج کنید (Extract All).
۲. فایل index.html کنار همین راهنما را با Edge یا Chrome باز کنید.
۳. نیازی به نصب Node.js، اجرای دستور یا اینترنت نیست.

فایل index.html در ریشه بسته، برنامه کامل تک‌فایلی است؛ فونت، کاتالوگ و ابزار گزارش‌گیری درون آن قرار دارند.
پوشه source برای توسعه‌دهندگان است. فایل source/index.html با دوبارکلیک اجرا نمی‌شود و به سرور توسعه نیاز دارد.

اطلاعات در مرورگر همین دستگاه ذخیره می‌شود. پیش از جابه‌جایی فایل یا پاک‌کردن داده مرورگر، از بخش مدیریت داده، پشتیبان JSON بگیرید.
در نسخه file://، نصب PWA و Service Worker فعال نیست؛ خود برنامه بدون اینترنت اجرا می‌شود.
برای چاپ PDF، از مرکز گزارش استفاده کنید و در پنجره چاپ، Save as PDF را انتخاب کنید.
'''
with ZipFile(output,'w',ZIP_DEFLATED,compresslevel=9) as z:
 z.write(standalone,'DBR-Website/index.html')
 z.writestr('DBR-Website/START-HERE.txt',guide)
 z.write(root/'public/assets/Yekan-LICENSE.txt','DBR-Website/Yekan-LICENSE.txt')
 for p in sorted(root.rglob('*')):
  rel=p.relative_to(root)
  if p.is_file() and not skip.intersection(rel.parts) and p.suffix not in {'.zip','.tsbuildinfo'} and p.name!='DBR-Standalone.html':
   z.write(p,Path('DBR-Website/source')/rel)
with ZipFile(output) as z:
 assert z.testzip() is None
 print('Packaged:',len(z.namelist()),'files;',output.stat().st_size,'bytes')
`],{stdio:'inherit'});
process.exit(result.status??1);
