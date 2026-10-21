import {build} from 'vite';
import {mkdtemp,readFile,writeFile,readdir,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const temp=await mkdtemp(join(tmpdir(),'dbr-portable-'));
try {
 await build({configFile:false,mode:'portable',publicDir:false,build:{outDir:temp,emptyOutDir:true,assetsInlineLimit:Infinity,cssCodeSplit:false,rollupOptions:{output:{format:'iife',inlineDynamicImports:true}}}});
 const assets=await readdir(join(temp,'assets'));
 const javascript=await readFile(join(temp,'assets',assets.find(f=>f.endsWith('.js'))),'utf8');
 const css=await readFile(join(temp,'assets',assets.find(f=>f.endsWith('.css'))),'utf8');
 const html=`<!doctype html><html lang="fa" dir="rtl"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#28533e"><title>DBR</title><style>${css.replace(/<\/style/gi,'<\\/style')}</style></head><body><div id="root"></div><noscript>برای اجرای برنامه، جاوااسکریپت مرورگر را فعال کنید.</noscript><script>${javascript.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
 await writeFile('DBR-Standalone.html',html);
 console.log('Standalone HTML generated:',Buffer.byteLength(html),'bytes; open directly without a server.');
} finally { await rm(temp,{recursive:true,force:true}); }
