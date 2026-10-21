import {domains,allPatterns,activeTasks,eligiblePatterns,domainProgress,isPatternActive,patternProgress,stagePercent,impactResults,agenda,fmt,type Store} from './model';
export function download(content:BlobPart,name:string,type='application/json'){const url=URL.createObjectURL(new Blob([content],{type}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),2000)}
export function reportRows(s:Store){const ps=allPatterns(s);return activeTasks(s).map(t=>[domains.find(d=>d.id===t.domainId)?.titleFa||'',ps.find(p=>p.id===t.patternId)?.titleFa||'',t.title,t.owner,t.kind,t.stage,stagePercent(t.stage),t.intervalDays,t.lastDate,t.notes])}
export async function exportReport(s:Store,type:string){
 if(type==='json'){download(JSON.stringify(s,null,2),'DBR-backup-v2.json');return}
 if(type==='pdf'){window.print();return}
 const headers=['دامنه','پترن','فعالیت','مسئول','نوع','وضعیت','پیشرفت درصد','بازه روز','تاریخ مبنا','شواهد و توضیحات'];
 const scope=domains.map(d=>[d.titleFa,s.activeDomains.includes(d.id)?'فعال':'غیرفعال',s.activeDomains.includes(d.id)?domainProgress(s,d.id):'',eligiblePatterns(s).filter(p=>p.domainId===d.id).length]);
 const active=reportRows(s);
 if(type==='xlsx'){
  const ExcelJS=await import('exceljs');const book=new ExcelJS.Workbook();
  const add=(name:string,head:string[],rows:(string|number)[][])=>{const sh=book.addWorksheet(name,{views:[{rightToLeft:true}]});sh.addRow(head);rows.forEach(r=>sh.addRow(r));sh.getRow(1).font={bold:true};sh.columns.forEach(c=>c.width=30);sh.autoFilter={from:{row:1,column:1},to:{row:Math.max(1,rows.length+1),column:head.length}}};
  add('دامنه و شمول',['دامنه','شمول','پیشرفت','پترن فعال'],scope);
  add('فعالیت‌های فعال',headers,active);
  add('پترن‌های فعال',['دامنه','پترن','پیشرفت'],eligiblePatterns(s).map(p=>[domains.find(d=>d.id===p.domainId)!.titleFa,p.titleFa,patternProgress(s,p.id)]));
  add('پترن‌های خارج از شمول',['دامنه','پترن','علت'],allPatterns(s).filter(p=>!isPatternActive(s,p)).map(p=>[domains.find(d=>d.id===p.domainId)!.titleFa,p.titleFa,s.activeDomains.includes(p.domainId)?'پترن غیرفعال':'دامنه غیرفعال']));
  add('موعدها',['عنوان','نوع','موعد','روز باقی‌مانده','مسئول'],agenda(s).map(a=>[a.title,a.kind,a.date,a.remaining,a.owner]));
  add('BIA',['فعالیت','دامنه','پترن','زمان اختلال ساعت','اثر وزنی','آستانه'],activeTasks(s).filter(t=>t.kind==='BIA').flatMap(t=>impactResults(t.bia).map(r=>[t.title,t.domainId,t.patternId,r.hours,r.score,t.bia.threshold])));
  download(await book.xlsx.writeBuffer() as ArrayBuffer,'DBR-report.xlsx','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');return;
 }
 const {Document,Packer,Paragraph,TextRun,Table,TableRow,TableCell}=await import('docx');
 const table=(head:string[],rows:(string|number)[][])=>new Table({rows:[head,...rows].map(row=>new TableRow({children:row.map(v=>new TableCell({children:[new Paragraph({bidirectional:true,children:[new TextRun({text:String(v),rightToLeft:true})]})]}))}))});
 const doc=new Document({sections:[{children:[new Paragraph({bidirectional:true,text:'DBR — گزارش تداوم کسب‌وکار'}),new Paragraph({bidirectional:true,text:s.organization}),new Paragraph({bidirectional:true,text:'فقط فعالیت‌های دامنه‌ها و پترن‌های فعال در محاسبات منظور شده‌اند. این گزارش گواهی انطباق ISO نیست.'}),table(['دامنه','شمول','پیشرفت','پترن فعال'],scope),new Paragraph({bidirectional:true,text:'فعالیت‌های در دامنه'}),table(headers,active),new Paragraph({bidirectional:true,text:'پترن‌های خارج از شمول'}),table(['دامنه','پترن'],allPatterns(s).filter(p=>!isPatternActive(s,p)).map(p=>[p.domainId,p.titleFa])),new Paragraph({bidirectional:true,text:'موعدهای بازنگری و آزمون'}),table(['عنوان','نوع','موعد','روز باقی‌مانده'],agenda(s).map(a=>[a.title,a.kind,a.date,a.remaining]))]}]});
 download(await Packer.toBlob(doc),'DBR-report.docx','application/vnd.openxmlformats-officedocument.wordprocessingml.document');
}
